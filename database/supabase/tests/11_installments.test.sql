-- BP-99: test pgTAP di installment_plans e installments. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_table('public', 'installment_plans', 'esiste installment_plans');
select has_table('public', 'installments', 'esiste installments');
select ok(relrowsecurity, 'RLS attiva su installment_plans') from pg_class where oid = 'public.installment_plans'::regclass;
select ok(relrowsecurity, 'RLS attiva su installments') from pg_class where oid = 'public.installments'::regclass;

select lives_ok($$insert into public.installment_plans (description, total_amount, tax_type, reference_year)
  values ('t_plan', 3000, 'inps_balance', 2031)$$, 'rateizzazione valida accettata');
select is((select archived from public.installment_plans where description = 't_plan'), false, 'archived di default false');
select throws_ok($$insert into public.installment_plans (description, total_amount, tax_type, reference_year)
  values ('t_bad', 0, 'inps', 2031)$$, '23514', null, 'importo rateizzato 0 rifiutato');
select throws_ok($$insert into public.installment_plans (description, total_amount, tax_type, reference_year)
  values ('t_bad', 100, 'iva', 2031)$$, '22P02', null, 'tributo non previsto rifiutato');

select lives_ok($$insert into public.installments (plan_id, number, due_date, amount)
  select id, 1, '2031-06-30', 1000 from public.installment_plans where description = 't_plan'$$, 'rata valida accettata');
select throws_ok($$insert into public.installments (plan_id, number, due_date, amount)
  select id, 1, '2031-07-31', 1000 from public.installment_plans where description = 't_plan'$$,
  '23505', null, 'due rate con lo stesso numero nella stessa rateizzazione rifiutate');
select lives_ok($$insert into public.installments (plan_id, number, due_date, amount)
  select id, 2, '2031-07-31', 1050.50 from public.installment_plans where description = 't_plan'$$,
  'numero diverso accettato; la somma delle rate può superare l''importo (interessi)');
select throws_ok($$insert into public.installments (plan_id, number, due_date, amount)
  select id, 3, '2031-08-31', 0 from public.installment_plans where description = 't_plan'$$,
  '23514', null, 'importo rata 0 rifiutato');
select throws_ok($$insert into public.installments (plan_id, number, due_date, amount)
  select id, 3, '2031-08-31', -5 from public.installment_plans where description = 't_plan'$$,
  '23514', null, 'importo rata negativo rifiutato');
select throws_ok($$insert into public.installments (plan_id, number, due_date, amount)
  select id, 0, '2031-08-31', 5 from public.installment_plans where description = 't_plan'$$,
  '23514', null, 'numero rata 0 rifiutato');
select throws_ok($$insert into public.installments (plan_id, number, due_date, amount) values (-1, 1, '2031-08-31', 5)$$,
  '23503', null, 'rata di una rateizzazione inesistente rifiutata');
select throws_ok($$delete from public.installment_plans where description = 't_plan'$$,
  '23503', null, 'rateizzazione con rate non eliminabile');

set local role anon;
select throws_ok('select * from public.installment_plans', '42501', null, 'anon non legge installment_plans');
select throws_ok('select * from public.installments', '42501', null, 'anon non legge installments');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.installments), 2, 'authenticated legge installments');
reset role;

select * from finish();
rollback;
