-- BP-22: test pgTAP dei vincoli dello schema (esegui con `npx supabase test db`, da database/).
-- Tutto gira in una transazione annullata a fine file: nessun dato resta nel database.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- Esistenza delle tabelle e RLS attiva (almeno un test per tabella)
select has_table('public', t, 'esiste la tabella ' || t)
from unnest(array['macro_areas','budget_items','categories','accounts','opening_balances',
                  'transactions','budget_entries','recurrences','recurrence_occurrences','closed_months']) as t;
select ok(c.relrowsecurity, 'RLS attiva su ' || c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';

-- Fixture
insert into public.macro_areas (name) values ('t_macro');
insert into public.budget_items (macro_area_id, name) select id, 't_voce'  from public.macro_areas where name = 't_macro';
insert into public.budget_items (macro_area_id, name) select id, 't_voce2' from public.macro_areas where name = 't_macro';
insert into public.categories (budget_item_id, name) select id, 't_cat' from public.budget_items where name = 't_voce';
insert into public.accounts (name) values ('t_a'), ('t_b');
insert into public.opening_balances (account_id, year, amount) select id, 2026, 10 from public.accounts where name = 't_a';

-- Classificazione (BP-13)
select throws_ok($$insert into public.categories (budget_item_id, name) select id, 'T_CAT' from public.budget_items where name = 't_voce'$$,
  '23505', null, 'nome categoria duplicato (non archiviata) rifiutato');
select throws_ok($$insert into public.budget_items (macro_area_id, name) select id, 'T_VOCE' from public.macro_areas where name = 't_macro'$$,
  '23505', null, 'nome voce duplicato rifiutato');
select throws_ok($$insert into public.macro_areas (name) values ('T_MACRO')$$,
  '23505', null, 'nome macro-area duplicato rifiutato');
select throws_ok($$delete from public.budget_items where name = 't_voce'$$,
  '23503', null, 'voce con categorie non eliminabile');
select throws_ok($$delete from public.macro_areas where name = 't_macro'$$,
  '23503', null, 'macro-area con voci non eliminabile');
update public.categories set archived = true where name = 't_cat';
select is((select count(*)::int from public.categories where name = 't_cat' and archived), 1, 'categoria archiviata resta leggibile');
select lives_ok($$insert into public.categories (budget_item_id, name) select id, 't_cat' from public.budget_items where name = 't_voce'$$,
  'il nome di una categoria archiviata si può riusare');

-- Conti e saldi (BP-14)
select throws_ok($$insert into public.accounts (name) values ('T_A')$$, '23505', null, 'nome conto duplicato rifiutato');
select throws_ok($$insert into public.opening_balances (account_id, year, amount) select id, 2026, 1 from public.accounts where name = 't_a'$$,
  '23505', null, 'secondo saldo per stesso conto e anno rifiutato');
select throws_ok($$insert into public.opening_balances (account_id, year, amount, source) select id, 2027, 1, 'altro' from public.accounts where name = 't_a'$$,
  '22P02', null, 'origine saldo non prevista rifiutata');
select throws_ok($$delete from public.accounts where name = 't_a'$$, '23503', null, 'conto con saldi non eliminabile');

-- Movimenti (BP-15)
select throws_ok($$insert into public.transactions (type, transaction_date, amount, account_id, destination_account_id)
  select 'transfer', current_date, 5, id, id from public.accounts where name = 't_a'$$,
  '23514', null, 'trasferimento con destinazione = origine rifiutato');
select throws_ok($$insert into public.transactions (type, transaction_date, amount, account_id)
  select 'expense', current_date, 5, id from public.accounts where name = 't_a'$$,
  '23514', null, 'spesa senza categoria rifiutata');
select throws_ok($$insert into public.transactions (type, transaction_date, amount, account_id, category_id, budget_item_id)
  select 'expense', current_date, 0, a.id, c.id, v.id from public.accounts a, public.categories c, public.budget_items v
  where a.name = 't_a' and c.name = 't_cat' and v.name = 't_voce'$$,
  '23514', null, 'importo 0 rifiutato');
select throws_ok($$insert into public.transactions (type, transaction_date, amount, account_id, category_id, budget_item_id)
  select 'expense', current_date, -1, a.id, c.id, v.id from public.accounts a, public.categories c, public.budget_items v
  where a.name = 't_a' and c.name = 't_cat' and v.name = 't_voce'$$,
  '23514', null, 'importo negativo rifiutato');
select throws_ok($$insert into public.transactions (type, transaction_date, amount, account_id, destination_account_id, category_id, budget_item_id)
  select 'income', current_date, 5, a.id, b.id, c.id, v.id from public.accounts a, public.accounts b, public.categories c, public.budget_items v
  where a.name = 't_a' and b.name = 't_b' and c.name = 't_cat' and v.name = 't_voce'$$,
  '23514', null, 'entrata con conto di destinazione rifiutata');
select lives_ok($$insert into public.transactions (type, transaction_date, amount, account_id, destination_account_id)
  select 'transfer', current_date, 5, a.id, b.id from public.accounts a, public.accounts b where a.name = 't_a' and b.name = 't_b'$$,
  'trasferimento valido accettato');
select lives_ok($$insert into public.transactions (type, transaction_date, amount, account_id, category_id, budget_item_id)
  select 'expense', current_date, 5, b.id, c.id, v.id from public.accounts b, public.categories c, public.budget_items v
  where b.name = 't_b' and c.name = 't_cat' and v.name = 't_voce'$$,
  'spesa valida accettata');
select throws_ok($$delete from public.accounts where name = 't_b'$$, '23503', null, 'conto con movimenti non eliminabile');
select throws_ok($$delete from public.categories where name = 't_cat'$$, '23503', null, 'categoria con movimenti non eliminabile');

-- Righe di budget (BP-16)
select throws_ok($$insert into public.budget_entries (budget_item_id, year, month, amount) select id, 2026, 13, 1 from public.budget_items where name = 't_voce2'$$,
  '23514', null, 'mese 13 rifiutato');
select throws_ok($$insert into public.budget_entries (budget_item_id, year, month, amount, source) select id, 2026, 1, 1, 'altro' from public.budget_items where name = 't_voce2'$$,
  '22P02', null, 'origine riga budget non prevista rifiutata');
select lives_ok($$insert into public.budget_entries (budget_item_id, year, month, amount) select id, 2031, 6, 100 from public.budget_items where name = 't_voce2'$$,
  'riga per un anno futuro senza righe precedenti accettata');
select throws_ok($$delete from public.budget_items where name = 't_voce2'$$, '23503', null, 'voce con righe di budget non eliminabile');

-- Ricorrenze (BP-17)
insert into public.recurrences (name, budget_item_id, account_id, base_amount, frequency, start_date)
  select 't_ric', v.id, a.id, 100, 'monthly', date '2026-01-01' from public.budget_items v, public.accounts a where v.name = 't_voce2' and a.name = 't_a';
insert into public.recurrence_occurrences (recurrence_id, due_date, amount)
  select id, d, 100 from public.recurrences, (values (date '2026-01-01'), (date '2026-02-01')) as s(d) where name = 't_ric';
update public.recurrence_occurrences set amount = 150 where due_date = '2026-01-01';
select is((select amount from public.recurrence_occurrences where due_date = '2026-02-01'), 100.00::numeric, 'modificare una scadenza non cambia le altre');
select is((select base_amount from public.recurrences where name = 't_ric'), 100.00::numeric, 'modificare una scadenza non cambia l''importo base');
select throws_ok($$insert into public.recurrences (name, budget_item_id, account_id, base_amount, frequency, start_date)
  select 't_x', v.id, a.id, 1, 'settimanale', date '2026-01-01' from public.budget_items v, public.accounts a where v.name = 't_voce2' and a.name = 't_a'$$,
  '22P02', null, 'periodicità non prevista rifiutata');
select throws_ok($$insert into public.recurrences (name, budget_item_id, account_id, base_amount, frequency, start_date, end_date)
  select 't_y', v.id, a.id, 1, 'monthly', date '2026-02-01', date '2026-01-01' from public.budget_items v, public.accounts a where v.name = 't_voce2' and a.name = 't_a'$$,
  '23514', null, 'data fine precedente alla data inizio rifiutata');
select throws_ok($$insert into public.recurrence_occurrences (recurrence_id, due_date, amount) select id, date '2026-01-01', 1 from public.recurrences where name = 't_ric'$$,
  '23505', null, 'scadenza duplicata per la stessa data rifiutata');
select throws_ok($$delete from public.recurrences where name = 't_ric'$$, '23503', null, 'ricorrenza con scadenze non eliminabile');

-- Mesi chiusi (BP-18)
insert into public.closed_months (year, month) values (2026, 1);
select throws_ok($$insert into public.closed_months (year, month) values (2026, 1)$$, '23505', null, 'chiudere due volte lo stesso mese rifiutato');
select throws_ok($$insert into public.closed_months (year, month) values (2026, 13)$$, '23514', null, 'mese 13 rifiutato');
select throws_ok($$insert into public.closed_months (year, month) values (2026, 0)$$, '23514', null, 'mese 0 rifiutato');

select * from finish();
rollback;
