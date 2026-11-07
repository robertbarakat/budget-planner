-- BP-98: test pgTAP di tax_parameters. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_table('public', 'tax_parameters', 'esiste la tabella tax_parameters');
select ok(relrowsecurity, 'RLS attiva su tax_parameters') from pg_class where oid = 'public.tax_parameters'::regclass;
select is((select count(*)::int from public.tax_parameters), 0, 'la migrazione non inserisce valori fiscali');

select lives_ok($$insert into public.tax_parameters
  (year, profitability_coefficient, inps_rate, substitute_tax_rate, activity_start_year)
  values (2031, 67, 26.07, 15, 2025)$$, 'riga valida accettata (valori di prova)');
select is((select is_startup from public.tax_parameters where year = 2031), false, 'is_startup di default false');
select is((select has_other_pension_coverage from public.tax_parameters where year = 2031), false, 'has_other_pension_coverage di default false');
select throws_ok($$insert into public.tax_parameters
  (year, profitability_coefficient, inps_rate, substitute_tax_rate, activity_start_year)
  values (2031, 78, 26.07, 15, 2025)$$, '23505', null, 'due righe per lo stesso anno rifiutate');
select throws_ok($$insert into public.tax_parameters
  (year, profitability_coefficient, inps_rate, substitute_tax_rate, activity_start_year)
  values (2032, 100.01, 26.07, 15, 2025)$$, '23514', null, 'coefficiente > 100 rifiutato (100.01)');
select throws_ok($$insert into public.tax_parameters
  (year, profitability_coefficient, inps_rate, substitute_tax_rate, activity_start_year)
  values (2033, 67, 100.5, 15, 2025)$$, '23514', null, 'aliquota INPS > 100 rifiutata');
select throws_ok($$insert into public.tax_parameters
  (year, profitability_coefficient, inps_rate, substitute_tax_rate, activity_start_year)
  values (2034, 67, 26.07, -1, 2025)$$, '23514', null, 'imposta sostitutiva negativa rifiutata');
select throws_ok($$insert into public.tax_parameters
  (year, profitability_coefficient, inps_rate, substitute_tax_rate, activity_start_year)
  values (2035, 101, 26.07, 15, 2025)$$, '23514', null, 'coefficiente 101 rifiutato');
select throws_ok($$insert into public.tax_parameters
  (year, profitability_coefficient, inps_rate, substitute_tax_rate, activity_start_year)
  values (2020, 67, 26.07, 15, 2025)$$, '23514', null, 'anno di inizio attività successivo all''anno rifiutato');

set local role anon;
select throws_ok('select * from public.tax_parameters', '42501', null, 'anon non legge tax_parameters');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.tax_parameters), 1, 'authenticated legge tax_parameters');
reset role;

select * from finish();
rollback;
