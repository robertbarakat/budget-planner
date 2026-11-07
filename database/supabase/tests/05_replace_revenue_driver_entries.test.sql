-- BP-60: test pgTAP di replace_revenue_driver_entries. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_function('public', 'replace_revenue_driver_entries', array['integer', 'integer', 'integer', 'integer', 'jsonb'],
  'esiste la funzione replace_revenue_driver_entries');

-- Fixture: righe di origini diverse dentro e fuori dall'intervallo 2026-05 .. 2026-08
insert into public.macro_areas (name) values ('t_macro');
insert into public.budget_items (macro_area_id, name) select id, 't_income' from public.macro_areas where name = 't_macro';
insert into public.budget_entries (budget_item_id, year, month, amount, source)
  select b.id, v.year, v.month, v.amount, v.source::public.budget_entry_source
  from public.budget_items b,
       (values (2026, 5, 100, 'manual'),          -- dentro, manuale: invariata
               (2026, 6, 200, 'revenue_driver'),  -- dentro, driver: sostituita
               (2026, 7, 300, 'revenue_driver'),  -- dentro, driver: sostituita
               (2026, 6, 400, 'recurrence'),      -- dentro, ricorrenza: invariata
               (2026, 7, 500, 'tax'),             -- dentro, fiscale: invariata
               (2026, 3, 600, 'revenue_driver'),  -- prima dell'intervallo: invariata
               (2026, 9, 700, 'revenue_driver'),  -- dopo l'intervallo: invariata
               (2025, 6, 800, 'revenue_driver')   -- stesso mese ma altro anno: invariata
       ) as v(year, month, amount, source)
  where b.name = 't_income';

-- Sostituzione riuscita: cancella 2 righe driver nell'intervallo, ne inserisce 3 nuove
select results_eq(
  $$select * from public.replace_revenue_driver_entries(2026, 5, 2026, 8, jsonb_build_array(
      jsonb_build_object('budget_item_id', (select id from public.budget_items where name = 't_income'), 'year', 2026, 'month', 5, 'amount', 11.5),
      jsonb_build_object('budget_item_id', (select id from public.budget_items where name = 't_income'), 'year', 2026, 'month', 6, 'amount', 22),
      jsonb_build_object('budget_item_id', (select id from public.budget_items where name = 't_income'), 'year', 2026, 'month', 8, 'amount', 33)
  ))$$,
  $$values (2, 3)$$,
  'restituisce righe cancellate e inserite');

select is((select count(*)::int from public.budget_entries where source = 'manual'), 1, 'riga manuale nell''intervallo invariata (conteggio)');
select is((select amount from public.budget_entries where source = 'manual'), 100.00::numeric, 'riga manuale nell''intervallo invariata (importo)');
select is((select amount from public.budget_entries where source = 'recurrence'), 400.00::numeric, 'riga ricorrenza nell''intervallo invariata');
select is((select amount from public.budget_entries where source = 'tax'), 500.00::numeric, 'riga fiscale nell''intervallo invariata');
select is((select count(*)::int from public.budget_entries where source = 'revenue_driver' and year = 2026 and month in (3, 9)), 2, 'righe driver fuori dall''intervallo (altri mesi) invariate');
select is((select amount from public.budget_entries where source = 'revenue_driver' and year = 2025 and month = 6), 800.00::numeric, 'riga driver dello stesso mese di un altro anno invariata');
select is((select count(*)::int from public.budget_entries where source = 'revenue_driver' and year = 2026 and month between 5 and 8), 3, 'nell''intervallo ci sono solo le 3 righe nuove');
select is((select amount from public.budget_entries where source = 'revenue_driver' and year = 2026 and month = 7), null, 'la vecchia riga driver di luglio è stata sostituita (non c''è più)');

-- Idempotenza: rieseguire con le stesse righe non crea doppioni
select lives_ok($$select * from public.replace_revenue_driver_entries(2026, 5, 2026, 8, jsonb_build_array(
    jsonb_build_object('budget_item_id', (select id from public.budget_items where name = 't_income'), 'year', 2026, 'month', 5, 'amount', 11.5)))$$,
  'rieseguire la sostituzione funziona');
select is((select count(*)::int from public.budget_entries where source = 'revenue_driver' and year = 2026 and month between 5 and 8), 1, 'nessun doppione dopo la riesecuzione');

-- Intervallo a cavallo di due anni (incasso di gennaio da lavoro dell'anno prima)
select results_eq(
  $$select * from public.replace_revenue_driver_entries(2025, 11, 2026, 1, '[]'::jsonb)$$,
  $$values (0, 0)$$,
  'intervallo a cavallo di due anni senza righe: 0 cancellate, 0 inserite');
select is((select count(*)::int from public.budget_entries where source = 'revenue_driver' and year = 2025 and month = 6), 1, 'giugno 2025 (fuori da nov 2025 - gen 2026) invariato');

-- Atomicità: errore dopo la cancellazione (voce inesistente) -> i dati restano com'erano
select throws_ok($$select * from public.replace_revenue_driver_entries(2026, 5, 2026, 8, jsonb_build_array(
    jsonb_build_object('budget_item_id', -1, 'year', 2026, 'month', 6, 'amount', 1)))$$,
  '23503', null, 'voce inesistente: errore a metà operazione');
select is((select count(*)::int from public.budget_entries where source = 'revenue_driver' and year = 2026 and month between 5 and 8), 1, 'dopo l''errore le righe driver dell''intervallo sono rimaste');
select is((select amount from public.budget_entries where source = 'revenue_driver' and year = 2026 and month = 5), 11.50::numeric, 'dopo l''errore l''importo è quello di prima');

-- Validazioni
select throws_ok($$select * from public.replace_revenue_driver_entries(2026, 8, 2026, 5, '[]'::jsonb)$$, '22023', null, 'intervallo con inizio dopo la fine rifiutato');
select throws_ok($$select * from public.replace_revenue_driver_entries(2026, 0, 2026, 5, '[]'::jsonb)$$, '22023', null, 'mese 0 rifiutato');
select throws_ok($$select * from public.replace_revenue_driver_entries(2026, 5, 2026, 13, '[]'::jsonb)$$, '22023', null, 'mese 13 rifiutato');
select throws_ok($$select * from public.replace_revenue_driver_entries(2026, 5, 2026, 8, '{}'::jsonb)$$, '22023', null, 'p_entries non array rifiutato');
select throws_ok($$select * from public.replace_revenue_driver_entries(2026, 5, 2026, 8, jsonb_build_array(
    jsonb_build_object('budget_item_id', (select id from public.budget_items where name = 't_income'), 'year', 2026, 'month', 9, 'amount', 1)))$$,
  '22023', null, 'riga fuori dall''intervallo rifiutata');
select is((select count(*)::int from public.budget_entries where source = 'revenue_driver' and year = 2026 and month = 5), 1, 'una richiesta rifiutata non cancella nulla');

-- Accesso: anon non può chiamarla; un utente autenticato sì
set local role anon;
select throws_ok($$select * from public.replace_revenue_driver_entries(2026, 5, 2026, 8, '[]'::jsonb)$$, '42501', null, 'anon non può chiamare la funzione');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select * from public.replace_revenue_driver_entries(2026, 5, 2026, 8, '[]'::jsonb)$$, 'un utente autenticato può chiamare la funzione');
reset role;

select * from finish();
rollback;
