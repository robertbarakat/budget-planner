-- BP-85: test pgTAP di apply_recurrence. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_function('public', 'apply_recurrence', array['bigint', 'date[]'], 'esiste la funzione apply_recurrence');

-- Fixture
insert into public.macro_areas (name) values ('t_macro');
insert into public.budget_items (macro_area_id, name) select id, 't_rent' from public.macro_areas where name = 't_macro';
insert into public.accounts (name) values ('t_account');
insert into public.recurrences (name, budget_item_id, account_id, base_amount, frequency, start_date, end_date)
  select 't_monthly', b.id, a.id, -100.00, 'monthly', date '2026-01-15', date '2026-12-31'
  from public.budget_items b, public.accounts a where b.name = 't_rent' and a.name = 't_account';
insert into public.recurrences (name, budget_item_id, account_id, base_amount, frequency, start_date, archived)
  select 't_archived', b.id, a.id, -5.00, 'monthly', date '2026-01-01', true
  from public.budget_items b, public.accounts a where b.name = 't_rent' and a.name = 't_account';

-- N date -> N scadenze e N righe di budget con origine recurrence
select is(
  public.apply_recurrence((select id from public.recurrences where name = 't_monthly'),
    array[date '2026-01-15', date '2026-02-15', date '2026-03-15']),
  3, 'per 3 date restituisce 3 scadenze create');
select is((select count(*)::int from public.recurrence_occurrences o join public.recurrences r on r.id = o.recurrence_id where r.name = 't_monthly'), 3, '3 scadenze create');
select is((select count(*)::int from public.budget_entries where source = 'recurrence'), 3, '3 righe di budget con origine recurrence');
select is((select count(*)::int from public.recurrence_occurrences o join public.budget_entries b on b.id = o.budget_entry_id
           where b.source = 'recurrence' and b.amount = -100.00 and b.year = extract(year from o.due_date) and b.month = extract(month from o.due_date)
             and b.budget_item_id = (select id from public.budget_items where name = 't_rent') and o.amount = -100.00), 3,
  'ogni scadenza è collegata alla sua riga (voce, anno, mese, importo base)');

-- Idempotenza: stesse date, nessun doppione
select is(
  public.apply_recurrence((select id from public.recurrences where name = 't_monthly'),
    array[date '2026-01-15', date '2026-02-15', date '2026-03-15']),
  0, 'rieseguire con le stesse date non crea nulla');
select is((select count(*)::int from public.recurrence_occurrences), 3, 'nessuna scadenza doppia dopo la riesecuzione');
select is((select count(*)::int from public.budget_entries where source = 'recurrence'), 3, 'nessuna riga doppia dopo la riesecuzione');

-- Scadenza modificata a mano: resta invariata alla riesecuzione, anche con date nuove nell'elenco
update public.recurrence_occurrences set amount = -250.00 where due_date = date '2026-02-15';
update public.budget_entries set amount = -250.00 where id = (select budget_entry_id from public.recurrence_occurrences where due_date = date '2026-02-15');
select is(
  public.apply_recurrence((select id from public.recurrences where name = 't_monthly'),
    array[date '2026-02-15', date '2026-03-15', date '2026-04-15', date '2026-04-15']),
  1, 'con una data nuova (e un duplicato nell''elenco) crea una sola scadenza');
select is((select amount from public.recurrence_occurrences where due_date = date '2026-02-15'), -250.00::numeric, 'scadenza modificata: importo invariato');
select is((select b.amount from public.recurrence_occurrences o join public.budget_entries b on b.id = o.budget_entry_id where o.due_date = date '2026-02-15'), -250.00::numeric, 'scadenza modificata: riga di budget invariata');
select is((select amount from public.recurrence_occurrences where due_date = date '2026-04-15'), -100.00::numeric, 'la nuova scadenza ha l''importo base');

-- Atomicità: l'ultima data produce una riga non valida (anno > 2100) e annulla anche le righe già create
update public.recurrences set end_date = null where name = 't_monthly';
select throws_ok(
  $$select public.apply_recurrence((select id from public.recurrences where name = 't_monthly'),
      array[date '2026-05-15', date '2026-06-15', date '2101-01-15'])$$,
  '23514', null, 'errore a metà operazione (anno fuori da 2000-2100)');
select is((select count(*)::int from public.recurrence_occurrences), 4, 'dopo l''errore le scadenze sono quelle di prima');
select is((select count(*)::int from public.budget_entries where source = 'recurrence'), 4, 'dopo l''errore le righe di budget sono quelle di prima');

-- Validazioni
select throws_ok($$select public.apply_recurrence(-1, array[date '2026-01-15'])$$, 'P0002', null, 'ricorrenza inesistente');
select throws_ok($$select public.apply_recurrence((select id from public.recurrences where name = 't_archived'), array[date '2026-01-15'])$$, '22023', null, 'ricorrenza archiviata rifiutata');
select throws_ok($$select public.apply_recurrence((select id from public.recurrences where name = 't_monthly'), null)$$, '22023', null, 'elenco null rifiutato');
select throws_ok($$select public.apply_recurrence((select id from public.recurrences where name = 't_monthly'), array[date '2025-12-15'])$$, '22023', null, 'data prima dell''inizio rifiutata');
update public.recurrences set end_date = date '2026-12-31' where name = 't_monthly';
select throws_ok($$select public.apply_recurrence((select id from public.recurrences where name = 't_monthly'), array[date '2027-01-15'])$$, '22023', null, 'data dopo la fine rifiutata');
select is(public.apply_recurrence((select id from public.recurrences where name = 't_monthly'), array[]::date[]), 0, 'elenco vuoto: 0 create');

-- Accesso: anon non può chiamarla; un utente autenticato sì
set local role anon;
select throws_ok($$select public.apply_recurrence(1, array[date '2026-01-15'])$$, '42501', null, 'anon non può chiamare la funzione');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.apply_recurrence(-1, array[]::date[])$$, 'P0002', null, 'un utente autenticato può chiamare la funzione (errore applicativo, non di permessi)');
reset role;

select * from finish();
rollback;
