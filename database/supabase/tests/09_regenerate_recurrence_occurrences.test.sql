-- BP-87: test pgTAP di regenerate_recurrence_occurrences e archive_recurrence. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_function('public', 'regenerate_recurrence_occurrences', array['bigint', 'date[]', 'date'], 'esiste regenerate_recurrence_occurrences');
select has_function('public', 'archive_recurrence', array['bigint', 'date'], 'esiste archive_recurrence');
select has_column('public', 'recurrence_occurrences', 'is_manually_modified', 'esiste l''indicazione "modificata a mano"');

-- Fixture: ricorrenza mensile 2026-01-15 .. 2026-12-15, oggi = 2026-04-01
insert into public.macro_areas (name) values ('t_macro');
insert into public.budget_items (macro_area_id, name, kind) select id, 't_rent', 'expense' from public.macro_areas where name = 't_macro';
insert into public.accounts (name) values ('t_account');
insert into public.recurrences (name, budget_item_id, account_id, base_amount, frequency, start_date, end_date)
  select 't_monthly', b.id, a.id, 100.00, 'monthly', date '2026-01-15', date '2026-12-15'
  from public.budget_items b, public.accounts a where b.name = 't_rent' and a.name = 't_account';
select public.apply_recurrence((select id from public.recurrences where name = 't_monthly'),
  (select array_agg(d::date) from generate_series(date '2026-01-15', date '2026-12-15', interval '1 month') d));
select is((select count(*)::int from public.recurrence_occurrences where is_manually_modified), 0, 'all''inizio nessuna scadenza è modificata a mano');

-- Modifiche a mano: una passata (febbraio) e una futura (agosto)
update public.recurrence_occurrences set amount = 222.00 where due_date = date '2026-02-15';
update public.recurrence_occurrences set amount = 888.00 where due_date = date '2026-08-15';
select is((select count(*)::int from public.recurrence_occurrences where is_manually_modified), 2, 'le due modifiche sono marcate a mano');
select is((select is_manually_modified from public.recurrence_occurrences where due_date = date '2026-08-15'), true, 'agosto marcata a mano');

-- Accorcio la fine a giugno e cambio l'importo base
update public.recurrences set end_date = date '2026-06-15', base_amount = 120.00 where name = 't_monthly';
select results_eq(
  $$select * from public.regenerate_recurrence_occurrences(
      (select id from public.recurrences where name = 't_monthly'),
      array[date '2026-01-15', date '2026-02-15', date '2026-03-15', date '2026-04-15', date '2026-05-15', date '2026-06-15'],
      date '2026-04-01')$$,
  $$values (5, 3, 0)$$,
  'cancellate 5 (lug, set-dic), aggiornate 3 (apr-giu), create 0 (agosto modificata non conta)');

-- Accorciando la fine spariscono solo le future non modificate oltre la nuova fine
select is((select count(*)::int from public.recurrence_occurrences where due_date in (date '2026-07-15', date '2026-09-15', date '2026-10-15', date '2026-11-15', date '2026-12-15')), 0, 'sparite le future non modificate oltre la fine');
select is((select count(*)::int from public.budget_entries b where b.source = 'recurrence' and b.month in (7, 9, 10, 11, 12)), 0, 'spariscono anche le righe di budget collegate');
select is((select count(*)::int from public.recurrence_occurrences where due_date = date '2026-08-15'), 1, 'la scadenza modificata a mano oltre la fine resta');

-- Scadenza modificata a mano: conserva l'importo (scadenza e riga di budget)
select is((select amount from public.recurrence_occurrences where due_date = date '2026-08-15'), 888.00::numeric, 'agosto conserva l''importo');
select is((select b.amount from public.recurrence_occurrences o join public.budget_entries b on b.id = o.budget_entry_id where o.due_date = date '2026-08-15'), 888.00::numeric, 'la riga di agosto conserva l''importo');

-- Le scadenze future non modificate prendono il nuovo importo base, anche nelle righe di budget, senza essere marcate a mano
select is((select count(*)::int from public.recurrence_occurrences where due_date between date '2026-04-15' and date '2026-06-15' and amount = 120.00 and not is_manually_modified), 3, 'apr-giu aggiornate al nuovo importo base e non marcate');
select is((select count(*)::int from public.recurrence_occurrences o join public.budget_entries b on b.id = o.budget_entry_id where o.due_date between date '2026-04-15' and date '2026-06-15' and b.amount = 120.00), 3, 'righe di budget di apr-giu aggiornate');

-- Le scadenze passate non cambiano mai (importo, anche se diverso dal nuovo base; riga di budget)
select is((select amount from public.recurrence_occurrences where due_date = date '2026-01-15'), 100.00::numeric, 'gennaio passata invariata');
select is((select amount from public.recurrence_occurrences where due_date = date '2026-03-15'), 100.00::numeric, 'marzo passata invariata');
select is((select amount from public.recurrence_occurrences where due_date = date '2026-02-15'), 222.00::numeric, 'febbraio passata e modificata invariata');
select is((select count(*)::int from public.budget_entries b where b.source = 'recurrence' and b.month in (1, 3) and b.amount = 100.00), 2, 'righe di budget passate invariate');

-- Date nuove: allungo la fine, vengono create solo le future mancanti; le passate nell'elenco sono ignorate
update public.recurrences set end_date = date '2026-09-15' where name = 't_monthly';
select results_eq(
  $$select * from public.regenerate_recurrence_occurrences(
      (select id from public.recurrences where name = 't_monthly'),
      array[date '2026-01-15', date '2026-02-15', date '2026-03-15', date '2026-04-15', date '2026-05-15', date '2026-06-15',
            date '2026-07-15', date '2026-08-15', date '2026-09-15'],
      date '2026-04-01')$$,
  $$values (0, 0, 2)$$,
  'create luglio e settembre; agosto (modificata) non toccata');
select is((select amount from public.recurrence_occurrences where due_date = date '2026-07-15'), 120.00::numeric, 'le nuove scadenze hanno l''importo base attuale');

-- Idempotenza
select results_eq(
  $$select * from public.regenerate_recurrence_occurrences(
      (select id from public.recurrences where name = 't_monthly'),
      array[date '2026-04-15', date '2026-05-15', date '2026-06-15', date '2026-07-15', date '2026-08-15', date '2026-09-15'],
      date '2026-04-01')$$,
  $$values (0, 0, 0)$$,
  'rieseguire non cambia nulla');

-- Atomicità: una data fuori periodo fa fallire tutto, anche la cancellazione già fatta
select throws_ok(
  $$select * from public.regenerate_recurrence_occurrences(
      (select id from public.recurrences where name = 't_monthly'),
      array[date '2026-04-15', date '2027-01-15'], date '2026-04-01')$$,
  '22023', null, 'data fuori periodo rifiutata');
select is((select count(*)::int from public.recurrence_occurrences where due_date >= date '2026-04-01'), 6, 'dopo l''errore le scadenze future sono quelle di prima');

-- Validazioni
select throws_ok($$select * from public.regenerate_recurrence_occurrences(-1, array[]::date[], date '2026-04-01')$$, 'P0002', null, 'ricorrenza inesistente');
select throws_ok($$select * from public.regenerate_recurrence_occurrences((select id from public.recurrences where name = 't_monthly'), null, date '2026-04-01')$$, '22023', null, 'elenco null rifiutato');
select throws_ok($$select * from public.regenerate_recurrence_occurrences((select id from public.recurrences where name = 't_monthly'), array[]::date[], null)$$, '22023', null, 'data di riferimento null rifiutata');

-- Archiviazione: elimina le future non modificate, mantiene le passate (e le modificate) con le loro righe
select is(public.archive_recurrence((select id from public.recurrences where name = 't_monthly'), date '2026-06-01'), 3, 'archiviare elimina 3 future non modificate (giu, lug, set)');
select is((select archived from public.recurrences where name = 't_monthly'), true, 'la ricorrenza è archiviata');
select is((select count(*)::int from public.recurrence_occurrences where due_date < date '2026-06-01'), 5, 'le 5 scadenze passate restano (gen-mag)');
select is((select count(*)::int from public.recurrence_occurrences where due_date = date '2026-08-15'), 1, 'la scadenza futura modificata a mano resta');
select is((select count(*)::int from public.budget_entries where source = 'recurrence'), 6, 'restano le righe di budget delle scadenze rimaste (5 passate + agosto)');
select is((select amount from public.recurrence_occurrences where due_date = date '2026-02-15'), 222.00::numeric, 'le scadenze passate non cambiano');
select throws_ok($$select public.archive_recurrence(-1, date '2026-06-01')$$, 'P0002', null, 'archiviare una ricorrenza inesistente');
select throws_ok($$select * from public.regenerate_recurrence_occurrences((select id from public.recurrences where name = 't_monthly'), array[]::date[], date '2026-06-01')$$, '22023', null, 'rigenerare una ricorrenza archiviata rifiutato');

-- Accesso
set local role anon;
select throws_ok($$select public.archive_recurrence(1, date '2026-06-01')$$, '42501', null, 'anon non può chiamare archive_recurrence');
select throws_ok($$select * from public.regenerate_recurrence_occurrences(1, array[]::date[], date '2026-06-01')$$, '42501', null, 'anon non può chiamare regenerate_recurrence_occurrences');
reset role;

select * from finish();
rollback;
