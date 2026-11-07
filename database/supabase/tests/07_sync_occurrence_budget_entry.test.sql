-- BP-86: test pgTAP dei trigger che allineano la riga di budget alla scadenza. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_trigger('public', 'recurrence_occurrences', 'recurrence_occurrences_sync_amount', 'esiste il trigger di aggiornamento importo');
select has_trigger('public', 'recurrence_occurrences', 'recurrence_occurrences_delete_entry', 'esiste il trigger di cancellazione');

-- Fixture: una ricorrenza con 3 scadenze (via apply_recurrence) e una riga manuale della stessa voce e mese
insert into public.macro_areas (name) values ('t_macro');
insert into public.budget_items (macro_area_id, name) select id, 't_rent' from public.macro_areas where name = 't_macro';
insert into public.accounts (name) values ('t_account');
insert into public.recurrences (name, budget_item_id, account_id, base_amount, frequency, start_date)
  select 't_monthly', b.id, a.id, -100.00, 'monthly', date '2026-01-15'
  from public.budget_items b, public.accounts a where b.name = 't_rent' and a.name = 't_account';
select public.apply_recurrence((select id from public.recurrences where name = 't_monthly'),
  array[date '2026-01-15', date '2026-02-15', date '2026-03-15']);
insert into public.budget_entries (budget_item_id, year, month, amount, source)
  select id, 2026, 2, -999.00, 'manual' from public.budget_items where name = 't_rent';

-- Modifica dell'importo di una scadenza: cambia solo la sua riga
update public.recurrence_occurrences set amount = -250.00 where due_date = date '2026-02-15';
select is((select b.amount from public.recurrence_occurrences o join public.budget_entries b on b.id = o.budget_entry_id where o.due_date = date '2026-02-15'),
  -250.00::numeric, 'la riga collegata alla scadenza modificata ha il nuovo importo');
select is((select count(*)::int from public.budget_entries where source = 'recurrence' and amount = -100.00), 2, 'le righe delle altre scadenze sono invariate');
select is((select amount from public.budget_entries where source = 'manual'), -999.00::numeric, 'la riga manuale dello stesso mese è invariata');

-- Le altre scadenze e l'importo base restano invariati
select is((select count(*)::int from public.recurrence_occurrences where amount = -100.00), 2, 'le altre scadenze sono invariate');
select is((select base_amount from public.recurrences where name = 't_monthly'), -100.00::numeric, 'l''importo base della ricorrenza è invariato');

-- Aggiornare un'altra colonna o lo stesso importo non tocca la riga di budget
update public.budget_entries set amount = -1.00 where id = (select budget_entry_id from public.recurrence_occurrences where due_date = date '2026-01-15');
update public.recurrence_occurrences set amount = amount where due_date = date '2026-01-15';
select is((select b.amount from public.recurrence_occurrences o join public.budget_entries b on b.id = o.budget_entry_id where o.due_date = date '2026-01-15'),
  -1.00::numeric, 'un update senza cambio di importo non riscrive la riga di budget');
update public.budget_entries set amount = -100.00 where id = (select budget_entry_id from public.recurrence_occurrences where due_date = date '2026-01-15');

-- Cancellazione: sparisce la riga collegata e nessun'altra
select is((select count(*)::int from public.budget_entries), 4, 'prima della cancellazione: 3 righe di ricorrenza + 1 manuale');
delete from public.recurrence_occurrences where due_date = date '2026-02-15';
select is((select count(*)::int from public.budget_entries where source = 'recurrence'), 2, 'cancellata la riga collegata (restano 2 righe di ricorrenza)');
select is((select count(*)::int from public.budget_entries where source = 'manual'), 1, 'la riga manuale non è stata cancellata');
select is((select count(*)::int from public.recurrence_occurrences), 2, 'restano le altre 2 scadenze');
select is((select count(*)::int from public.budget_entries b where b.source = 'recurrence' and b.month = 2), 0, 'nessuna riga di ricorrenza a febbraio');
select is((select count(*)::int from public.budget_entries b where b.source = 'recurrence' and b.amount = -100.00), 2, 'le righe delle altre scadenze sono invariate');

-- Scadenza senza riga collegata: modifica e cancellazione funzionano senza errori
insert into public.recurrence_occurrences (recurrence_id, due_date, amount)
  select id, date '2026-06-15', -10.00 from public.recurrences where name = 't_monthly';
select lives_ok($$update public.recurrence_occurrences set amount = -20.00 where due_date = date '2026-06-15'$$, 'modifica di una scadenza senza riga collegata');
select lives_ok($$delete from public.recurrence_occurrences where due_date = date '2026-06-15'$$, 'cancellazione di una scadenza senza riga collegata');
select is((select count(*)::int from public.budget_entries), 3, 'nessuna riga toccata dalle scadenze senza collegamento');

select * from finish();
rollback;
