-- BP-92: test pgTAP di register_due_recurrence_transactions. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_function('public', 'register_due_recurrence_transactions', array['date'], 'esiste la funzione');

insert into public.macro_areas (name) values ('t_macro');
insert into public.budget_items (macro_area_id, name, kind)
  select id, n, k::public.budget_item_kind from public.macro_areas, (values ('t_rent', 'expense'), ('t_empty', 'expense')) v(n, k) where name = 't_macro';
insert into public.categories (budget_item_id, name) select id, 't_cat' from public.budget_items where name = 't_rent';
insert into public.accounts (name) values ('t_account');
insert into public.recurrences (name, budget_item_id, account_id, base_amount, frequency, start_date, end_date)
  select 't_rent_rec', b.id, a.id, 100.00, 'monthly', date '2026-01-05', date '2026-04-05'
  from public.budget_items b, public.accounts a where b.name = 't_rent' and a.name = 't_account';
insert into public.recurrences (name, budget_item_id, account_id, base_amount, frequency, start_date, end_date)
  select 't_empty_rec', b.id, a.id, 5.00, 'monthly', date '2026-01-05', date '2026-01-05'
  from public.budget_items b, public.accounts a where b.name = 't_empty' and a.name = 't_account';
select public.apply_recurrence((select id from public.recurrences where name = 't_rent_rec'),
  array[date '2026-01-05', date '2026-02-05', date '2026-03-05', date '2026-04-05']);
select public.apply_recurrence((select id from public.recurrences where name = 't_empty_rec'), array[date '2026-01-05']);
update public.recurrence_occurrences set amount = 120.00 where due_date = date '2026-02-05';

-- Fino al 5 marzo: 3 movimenti (recupera i giorni passati); 4 aprile non ancora; la voce senza categoria si salta
select is(public.register_due_recurrence_transactions(date '2026-03-05'), 3, 'crea 3 movimenti');
select is((select count(*)::int from public.transactions), 3, '3 movimenti in tabella');
select is((select amount from public.transactions where transaction_date = date '2026-02-05'), 120.00, 'usa l''importo modificato della scadenza');
select is((select count(*)::int from public.transactions where type = 'expense' and comment = 't_rent_rec'
           and account_id = (select id from public.accounts where name = 't_account')), 3, 'tipo spesa, conto e commento corretti');
select is((select count(*)::int from public.recurrence_occurrences where registered_at is not null and transaction_id is not null), 3, 'scadenze collegate ai movimenti');

-- Idempotente
select is(public.register_due_recurrence_transactions(date '2026-03-05'), 0, 'seconda esecuzione: nessun doppione');

-- Movimento cancellato: la scadenza non viene ricreata
delete from public.transactions where transaction_date = date '2026-01-05';
select is(public.register_due_recurrence_transactions(date '2026-03-05'), 0, 'un movimento cancellato non si ricrea');

-- Ricorrenza archiviata: niente movimenti
update public.recurrences set archived = true where name = 't_rent_rec';
select is(public.register_due_recurrence_transactions(date '2026-12-31'), 0, 'le ricorrenze archiviate non generano movimenti');

select * from finish();
rollback;
