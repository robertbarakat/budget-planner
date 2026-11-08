-- BP-124: test pgTAP di import_transactions. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_function('public', 'import_transactions', array['jsonb'], 'esiste la funzione import_transactions');
select ok(not has_function_privilege('anon', 'public.import_transactions(jsonb)', 'execute'), 'anon non può eseguirla');
select ok(has_function_privilege('authenticated', 'public.import_transactions(jsonb)', 'execute'), 'authenticated può eseguirla');

-- Fixture
insert into public.macro_areas (name) values ('t_macro');
insert into public.budget_items (macro_area_id, name, kind)
  select id, v.name, v.kind::public.budget_item_kind from public.macro_areas, (values ('t_spese', 'expense'), ('t_ricavi', 'income')) as v(name, kind)
  where macro_areas.name = 't_macro';
insert into public.categories (budget_item_id, name) select id, 't_cat_spesa' from public.budget_items where name = 't_spese';
insert into public.categories (budget_item_id, name) select id, 't_cat_entrata' from public.budget_items where name = 't_ricavi';
insert into public.accounts (name) values ('t_conto_a'), ('t_conto_b');

-- Transazione che gira solo se la tabella è vuota (nel DB di test lo è: tutto è in transazione annullata)
select is((select count(*)::int from public.transactions), 0, 'fixture: transactions vuota');

-- Import riuscito: totali per tipo e conteggio coincidono con le righe passate
select results_eq(
  $$select * from public.import_transactions('[
    {"type":"expense","transaction_date":"2026-03-10","amount":12.5,"account":"T_CONTO_A ","category":"t_cat_spesa","budget_item":"t_spese","comment":" cena ","tag":null},
    {"type":"expense","transaction_date":"2026-03-11","amount":7.5,"account":"t_conto_a","category":"t_cat_spesa","budget_item":"t_spese"},
    {"type":"income","transaction_date":"2026-03-12","amount":100,"account":"t_conto_b","category":"t_cat_entrata","budget_item":"t_ricavi"},
    {"type":"transfer","transaction_date":"2026-03-13","amount":30,"account":"t_conto_b","destination_account":"t_conto_a"}
  ]'::jsonb)$$,
  $$values (4, 20.00::numeric, 100.00::numeric, 30.00::numeric)$$,
  'restituisce conteggio e totali per tipo');
select is((select count(*)::int from public.transactions), 4, 'inseriti 4 movimenti');
select is((select comment from public.transactions where amount = 12.5), 'cena', 'commento ripulito dagli spazi');
select is((select count(*)::int from public.transactions where type = 'transfer' and category_id is null and budget_item_id is null), 1, 'trasferimento senza categoria né voce');

-- Con transactions non vuota fallisce (errcode 55000) e non scrive
select throws_ok(
  $$select * from public.import_transactions('[{"type":"income","transaction_date":"2026-04-01","amount":1,"account":"t_conto_a","category":"t_cat_entrata","budget_item":"t_ricavi"}]'::jsonb)$$,
  '55000', null, 'con transactions non vuota fallisce');
select is((select count(*)::int from public.transactions), 4, 'nessun movimento aggiunto dopo il rifiuto');

-- Svuota per i test successivi (dentro la transazione di test)
delete from public.transactions;

-- Errore sulla seconda riga: annulla anche la prima
select throws_ok(
  $$select * from public.import_transactions('[
    {"type":"expense","transaction_date":"2026-03-10","amount":5,"account":"t_conto_a","category":"t_cat_spesa","budget_item":"t_spese"},
    {"type":"expense","transaction_date":"2026-03-10","amount":5,"account":"conto_inesistente","category":"t_cat_spesa","budget_item":"t_spese"}
  ]'::jsonb)$$,
  '23503', 'Movimento 2: conto inesistente', 'conto inesistente: errore con posizione');
select is((select count(*)::int from public.transactions), 0, 'errore a metà: nessun movimento inserito');

-- Categoria che non appartiene alla voce indicata
select throws_ok(
  $$select * from public.import_transactions('[{"type":"expense","transaction_date":"2026-03-10","amount":5,"account":"t_conto_a","category":"t_cat_spesa","budget_item":"t_ricavi"}]'::jsonb)$$,
  '23503', null, 'categoria non appartenente alla voce: errore');

-- Input non valido
select throws_ok($$select * from public.import_transactions('{"a":1}'::jsonb)$$, '22023', null, 'non un array: errore');
select throws_ok(
  $$select * from public.import_transactions('[{"type":"expense","transaction_date":"2026-03-10","amount":0,"account":"t_conto_a","category":"t_cat_spesa","budget_item":"t_spese"}]'::jsonb)$$,
  '22023', null, 'importo 0: errore');
select throws_ok(
  $$select * from public.import_transactions('[{"type":"boh","transaction_date":"2026-03-10","amount":5,"account":"t_conto_a"}]'::jsonb)$$,
  '22023', null, 'tipo sconosciuto: errore');
select throws_ok(
  $$select * from public.import_transactions('[{"type":"transfer","transaction_date":"2026-03-10","amount":5,"account":"t_conto_a","destination_account":"t_conto_a"}]'::jsonb)$$,
  '23514', null, 'trasferimento con origine = destinazione: vincolo della tabella');
select is((select count(*)::int from public.transactions), 0, 'dopo gli errori nessun movimento inserito');

-- Un elenco vuoto è valido: 0 inseriti
select results_eq(
  $$select * from public.import_transactions('[]'::jsonb)$$,
  $$values (0, 0::numeric, 0::numeric, 0::numeric)$$, 'elenco vuoto: 0 inseriti');

select * from finish();
rollback;
