-- BP-46: test pgTAP di reclassify_category_history. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_function('public', 'reclassify_category_history', array['bigint', 'bigint', 'date', 'date'],
  'esiste la funzione reclassify_category_history');

-- Fixture: due categorie, due voci (A e B), tre movimenti per la categoria t_cat1, uno per t_cat2, un trasferimento
insert into public.macro_areas (name) values ('t_macro');
insert into public.budget_items (macro_area_id, name, kind)
  select id, v.name, 'expense' from public.macro_areas, (values ('t_item_a'), ('t_item_b')) as v(name) where macro_areas.name = 't_macro';
insert into public.categories (budget_item_id, name)
  select id, 't_cat1' from public.budget_items where name = 't_item_a';
insert into public.categories (budget_item_id, name)
  select id, 't_cat2' from public.budget_items where name = 't_item_a';
insert into public.accounts (name) values ('t_acc'), ('t_acc2');
insert into public.transactions (type, transaction_date, amount, account_id, category_id, budget_item_id, comment)
  select 'expense', v.d::date, 10, a.id, c.id, i.id, v.k
  from public.accounts a, public.categories c, public.budget_items i,
       (values ('2026-01-15', 't_cat1', 'c1_gen'), ('2026-03-10', 't_cat1', 'c1_mar'), ('2026-05-20', 't_cat1', 'c1_mag'),
               ('2026-03-12', 't_cat2', 'c2_mar')) as v(d, cat, k)
  where a.name = 't_acc' and c.name = v.cat and i.name = 't_item_a';
insert into public.transactions (type, transaction_date, amount, account_id, destination_account_id, comment)
  select 'transfer', '2026-03-11', 5, a.id, b.id, 't_trasf' from public.accounts a, public.accounts b where a.name = 't_acc' and b.name = 't_acc2';

-- Senza intervallo: cambiano solo i 3 movimenti della categoria
select is(public.reclassify_category_history(
    (select id from public.categories where name = 't_cat1'),
    (select id from public.budget_items where name = 't_item_b')),
  3, 'restituisce il numero di movimenti aggiornati');
select is((select count(*)::int from public.transactions where comment like 'c1\_%' and budget_item_id = (select id from public.budget_items where name = 't_item_b')), 3,
  'i movimenti della categoria sono sulla nuova voce');
select is((select budget_item_id from public.transactions where comment = 'c2_mar'), (select id from public.budget_items where name = 't_item_a'),
  'il movimento di un''altra categoria non cambia');
select is((select budget_item_id from public.transactions where comment = 't_trasf'), null, 'il trasferimento non cambia');
select is((select budget_item_id from public.categories where name = 't_cat1'), (select id from public.budget_items where name = 't_item_a'),
  'la categoria non viene spostata dalla funzione');

-- Idempotenza: rieseguire non modifica nulla
select is(public.reclassify_category_history(
    (select id from public.categories where name = 't_cat1'),
    (select id from public.budget_items where name = 't_item_b')),
  0, 'rieseguire restituisce 0');

-- Intervallo di date (estremi inclusi): riporto tutto su A, poi solo marzo-aprile su B
select public.reclassify_category_history((select id from public.categories where name = 't_cat1'), (select id from public.budget_items where name = 't_item_a'));
select is(public.reclassify_category_history(
    (select id from public.categories where name = 't_cat1'), (select id from public.budget_items where name = 't_item_b'),
    '2026-03-10', '2026-04-30'),
  1, 'con intervallo cambia solo il movimento dentro (estremo iniziale incluso)');
select is((select budget_item_id from public.transactions where comment = 'c1_mar'), (select id from public.budget_items where name = 't_item_b'), 'il movimento di marzo è su B');
select is((select budget_item_id from public.transactions where comment = 'c1_gen'), (select id from public.budget_items where name = 't_item_a'), 'gennaio (prima) invariato');
select is((select budget_item_id from public.transactions where comment = 'c1_mag'), (select id from public.budget_items where name = 't_item_a'), 'maggio (dopo) invariato');

-- Solo data iniziale / solo data finale
select is(public.reclassify_category_history(
    (select id from public.categories where name = 't_cat1'), (select id from public.budget_items where name = 't_item_b'), '2026-05-01'),
  1, 'solo data iniziale: cambia maggio');
select is(public.reclassify_category_history(
    (select id from public.categories where name = 't_cat1'), (select id from public.budget_items where name = 't_item_b'), null, '2026-01-15'),
  1, 'solo data finale (estremo incluso): cambia gennaio');

-- Validazioni
select throws_ok($$select public.reclassify_category_history(-1, (select id from public.budget_items where name = 't_item_b'))$$,
  '23503', null, 'categoria inesistente rifiutata');
select throws_ok($$select public.reclassify_category_history((select id from public.categories where name = 't_cat1'), -1)$$,
  '23503', null, 'voce inesistente rifiutata');
select throws_ok($$select public.reclassify_category_history(null, 1)$$, '22023', null, 'categoria null rifiutata');
select throws_ok($$select public.reclassify_category_history(
    (select id from public.categories where name = 't_cat1'), (select id from public.budget_items where name = 't_item_b'), '2026-05-01', '2026-01-01')$$,
  '22023', null, 'intervallo invertito rifiutato');

-- Accesso: anon non può chiamarla; un utente autenticato sì
set local role anon;
select throws_ok($$select public.reclassify_category_history(1, 1)$$, '42501', null, 'anon non può chiamare la funzione');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.reclassify_category_history((select id from public.categories where name = 't_cat1'), (select id from public.budget_items where name = 't_item_b'))$$,
  'un utente autenticato può chiamare la funzione');
reset role;

select * from finish();
rollback;
