-- BP-22: test pgTAP di RLS e ruoli (BP-19). Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- anon: nessun accesso in lettura a nessuna tabella
set local role anon;
select throws_ok(format('select * from public.%I', t), '42501', null, 'anon non legge ' || t)
from unnest(array['macro_areas','budget_items','categories','accounts','opening_balances',
                  'transactions','budget_entries','recurrences','recurrence_occurrences','closed_months']) as t;
-- anon: nessuna scrittura
select throws_ok($$insert into public.accounts (name) values ('x')$$, '42501', null, 'anon non scrive in conti');
select throws_ok($$insert into public.closed_months (year, month) values (2026, 1)$$, '42501', null, 'anon non scrive in mesi_chiusi');
reset role;

-- authenticated: lettura e scrittura funzionano
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.accounts (name) values ('rls_test')$$, 'authenticated inserisce');
select is((select count(*)::int from public.accounts where name = 'rls_test'), 1, 'authenticated legge');
select lives_ok($$update public.accounts set sort_order = 7 where name = 'rls_test'$$, 'authenticated aggiorna');
select lives_ok($$delete from public.accounts where name = 'rls_test'$$, 'authenticated elimina');
reset role;

select * from finish();
rollback;
