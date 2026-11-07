-- BP-100: test pgTAP di f24_deadlines. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_table('public', 'f24_deadlines', 'esiste f24_deadlines');
select ok(relrowsecurity, 'RLS attiva su f24_deadlines') from pg_class where oid = 'public.f24_deadlines'::regclass;

-- Fixture: due conti, un movimento (trasferimento), una rateizzazione con una rata
insert into public.accounts (name) values ('t_a'), ('t_b');
insert into public.transactions (type, transaction_date, amount, account_id, destination_account_id)
  select 'transfer', '2031-06-30', 100, a.id, b.id from public.accounts a, public.accounts b where a.name = 't_a' and b.name = 't_b';
insert into public.installment_plans (description, total_amount, tax_type, reference_year)
  values ('t_plan', 3000, 'inps_balance', 2031);
insert into public.installments (plan_id, number, due_date, amount)
  select id, 1, '2031-06-30', 1000 from public.installment_plans where description = 't_plan';

select lives_ok($$insert into public.f24_deadlines (reference_year, tax_type, due_date, amount)
  values (2031, 'substitute_tax_balance', '2031-06-30', 500)$$, 'scadenza senza collegamenti accettata');
select lives_ok($$insert into public.f24_deadlines (reference_year, tax_type, due_date, amount, transaction_id, installment_id)
  select 2031, 'inps_balance', '2031-06-30', 1000, t.id, i.id from public.transactions t, public.installments i limit 1$$,
  'scadenza collegata a movimento e rata accettata');
select throws_ok($$insert into public.f24_deadlines (reference_year, tax_type, due_date, amount)
  values (2031, 'substitute_tax_balance', '2031-06-30', 600)$$, '23505', null, 'duplicato anno + tributo + scadenza rifiutato');
select throws_ok($$insert into public.f24_deadlines (reference_year, tax_type, due_date, amount)
  values (2031, 'iva', '2031-07-31', 100)$$, '22P02', null, 'tributo non previsto rifiutato');
select throws_ok($$insert into public.f24_deadlines (reference_year, tax_type, due_date, amount)
  values (2031, 'inps', '2031-07-31', 0)$$, '23514', null, 'importo 0 rifiutato');
select throws_ok($$insert into public.f24_deadlines (reference_year, tax_type, due_date, amount, transaction_id)
  values (2031, 'inps', '2031-07-31', 100, -1)$$, '23503', null, 'movimento inesistente rifiutato');
select throws_ok($$insert into public.f24_deadlines (reference_year, tax_type, due_date, amount, installment_id)
  values (2031, 'inps', '2031-07-31', 100, -1)$$, '23503', null, 'rata inesistente rifiutata');
select throws_ok($$delete from public.transactions$$, '23503', null, 'movimento collegato a una scadenza non eliminabile');
select throws_ok($$delete from public.installments$$, '23503', null, 'rata collegata a una scadenza non eliminabile');

set local role anon;
select throws_ok('select * from public.f24_deadlines', '42501', null, 'anon non legge f24_deadlines');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.f24_deadlines), 2, 'authenticated legge f24_deadlines');
reset role;

select * from finish();
rollback;
