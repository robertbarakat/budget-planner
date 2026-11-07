-- BP-154: test pgTAP del tipo entrata/spesa delle voci e degli importi di budget non negativi.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_column('public', 'budget_items', 'kind', 'budget_items ha la colonna kind');
select col_not_null('public', 'budget_items', 'kind', 'kind è obbligatorio');
select enum_has_labels('public', 'budget_item_kind', array['income', 'expense'], 'enum budget_item_kind con income ed expense');

insert into public.macro_areas (name) values ('t_macro');
select lives_ok($$insert into public.budget_items (macro_area_id, name, kind) select id, 't_in', 'income' from public.macro_areas where name = 't_macro'$$, 'voce di entrata accettata');
select lives_ok($$insert into public.budget_items (macro_area_id, name, kind) select id, 't_out', 'expense' from public.macro_areas where name = 't_macro'$$, 'voce di spesa accettata');
select throws_ok($$insert into public.budget_items (macro_area_id, name) select id, 't_none' from public.macro_areas where name = 't_macro'$$, '23502', null, 'voce senza tipo rifiutata');
select throws_ok($$insert into public.budget_items (macro_area_id, name, kind) select id, 't_bad', 'altro' from public.macro_areas where name = 't_macro'$$, '22P02', null, 'tipo non previsto rifiutato');

select lives_ok($$insert into public.budget_entries (budget_item_id, year, month, amount) select id, 2026, 1, 0 from public.budget_items where name = 't_out'$$, 'importo di budget 0 accettato');
select lives_ok($$insert into public.budget_entries (budget_item_id, year, month, amount) select id, 2026, 2, 123.45 from public.budget_items where name = 't_out'$$, 'importo di budget positivo accettato');
select throws_ok($$insert into public.budget_entries (budget_item_id, year, month, amount) select id, 2026, 3, -1 from public.budget_items where name = 't_out'$$, '23514', null, 'importo di budget negativo rifiutato');

insert into public.accounts (name) values ('t_account');
select throws_ok($$insert into public.recurrences (name, budget_item_id, account_id, base_amount, frequency, start_date)
  select 't_neg', b.id, a.id, -10, 'monthly', date '2026-01-01' from public.budget_items b, public.accounts a where b.name = 't_out' and a.name = 't_account'$$,
  '23514', null, 'importo base di ricorrenza negativo rifiutato');
insert into public.recurrences (name, budget_item_id, account_id, base_amount, frequency, start_date)
  select 't_rec', b.id, a.id, 10, 'monthly', date '2026-01-01' from public.budget_items b, public.accounts a where b.name = 't_out' and a.name = 't_account';
select throws_ok($$insert into public.recurrence_occurrences (recurrence_id, due_date, amount)
  select id, date '2026-01-01', -10 from public.recurrences where name = 't_rec'$$,
  '23514', null, 'importo di scadenza negativo rifiutato');

select * from finish();
rollback;
