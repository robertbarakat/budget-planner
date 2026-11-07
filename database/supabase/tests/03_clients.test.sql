-- BP-57: test pgTAP di clients e client_rates. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_table('public', t, 'esiste la tabella ' || t) from unnest(array['clients', 'client_rates']) as t;
select ok(c.relrowsecurity, 'RLS attiva su ' || c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('clients', 'client_rates');

-- Fixture
insert into public.macro_areas (name) values ('t_macro');
insert into public.budget_items (macro_area_id, name) select id, 't_income' from public.macro_areas where name = 't_macro';
insert into public.clients (name, budget_item_id, collection_delay_months)
  select 't_client', id, 2 from public.budget_items where name = 't_income';
insert into public.client_rates (client_id, daily_rate, valid_from_year, valid_from_month)
  select id, 300, 2026, 1 from public.clients where name = 't_client';

select throws_ok($$insert into public.client_rates (client_id, daily_rate, valid_from_year, valid_from_month)
  select id, 280, 2026, 1 from public.clients where name = 't_client'$$,
  '23505', null, 'tariffa con lo stesso mese di inizio per lo stesso cliente rifiutata');
select lives_ok($$insert into public.client_rates (client_id, daily_rate, valid_from_year, valid_from_month)
  select id, 280, 2026, 7 from public.clients where name = 't_client'$$,
  'seconda tariffa con altro mese di inizio accettata (cambio di tariffa nel tempo)');
select throws_ok($$insert into public.client_rates (client_id, daily_rate, valid_from_year, valid_from_month)
  select id, 280, 2026, 13 from public.clients where name = 't_client'$$,
  '23514', null, 'mese di inizio fuori da 1-12 rifiutato');
select throws_ok($$insert into public.client_rates (client_id, daily_rate, valid_from_year, valid_from_month)
  select id, -1, 2027, 1 from public.clients where name = 't_client'$$,
  '23514', null, 'tariffa negativa rifiutata');
select throws_ok($$insert into public.clients (name, budget_item_id, collection_delay_months)
  select 't_neg', id, -1 from public.budget_items where name = 't_income'$$,
  '23514', null, 'ritardo negativo rifiutato');
select throws_ok($$insert into public.clients (name, budget_item_id)
  select 'T_CLIENT', id from public.budget_items where name = 't_income'$$,
  '23505', null, 'nome cliente duplicato (non archiviato) rifiutato');
select throws_ok($$delete from public.clients where name = 't_client'$$,
  '23503', null, 'cliente con tariffe collegate non eliminabile');
select throws_ok($$delete from public.budget_items where name = 't_income'$$,
  '23503', null, 'voce di budget con clienti collegati non eliminabile');

-- Accesso: anon bloccato, authenticated ok
set local role anon;
select throws_ok('select * from public.clients', '42501', null, 'anon non legge clients');
select throws_ok('select * from public.client_rates', '42501', null, 'anon non legge client_rates');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.clients), 1, 'authenticated legge clients');
reset role;

select * from finish();
rollback;
