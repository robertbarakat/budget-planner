-- BP-58: test pgTAP di worked_days. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_table('public', 'worked_days', 'esiste la tabella worked_days');
select ok(relrowsecurity, 'RLS attiva su worked_days') from pg_class where oid = 'public.worked_days'::regclass;

-- Fixture
insert into public.macro_areas (name) values ('t_macro');
insert into public.budget_items (macro_area_id, name, kind) select id, 't_income', 'income' from public.macro_areas where name = 't_macro';
insert into public.clients (name, budget_item_id) select 't_client', id from public.budget_items where name = 't_income';

select lives_ok($$insert into public.worked_days (client_id, year, month, days)
  select id, 2031, 7, 21.5 from public.clients where name = 't_client'$$,
  'mese futuro senza righe precedenti accettato, anche con frazioni di giornata');
select throws_ok($$insert into public.worked_days (client_id, year, month, days)
  select id, 2031, 7, 10 from public.clients where name = 't_client'$$,
  '23505', null, 'due righe per lo stesso cliente, anno e mese rifiutate');
select throws_ok($$insert into public.worked_days (client_id, year, month, days)
  select id, 2031, 8, -1 from public.clients where name = 't_client'$$,
  '23514', null, 'giorni negativi rifiutati');
select throws_ok($$insert into public.worked_days (client_id, year, month, days)
  select id, 2031, 8, 32 from public.clients where name = 't_client'$$,
  '23514', null, 'più di 31 giorni rifiutati');
select throws_ok($$insert into public.worked_days (client_id, year, month, days)
  select id, 2031, 13, 5 from public.clients where name = 't_client'$$,
  '23514', null, 'mese 13 rifiutato');
select throws_ok($$insert into public.worked_days (client_id, year, month, days)
  select id, 2031, 0, 5 from public.clients where name = 't_client'$$,
  '23514', null, 'mese 0 rifiutato');
select throws_ok($$delete from public.clients where name = 't_client'$$,
  '23503', null, 'cliente con giorni lavorati collegati non eliminabile');

set local role anon;
select throws_ok('select * from public.worked_days', '42501', null, 'anon non legge worked_days');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.worked_days), 1, 'authenticated legge worked_days');
reset role;

select * from finish();
rollback;
