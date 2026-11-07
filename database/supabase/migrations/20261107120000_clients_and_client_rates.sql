-- BP-57: clienti e tariffe giornaliere con validità nel tempo (specifica sez. 6).
-- Nessun nome di cliente nella migrazione: i clienti sono dati inseriti dall'app.
--
-- Validità delle tariffe: ogni tariffa vale "dal mese (valid_from_year, valid_from_month)" fino
-- al mese precedente alla tariffa successiva dello stesso cliente. Con un solo inizio per tariffa
-- le validità non possono sovrapporsi per costruzione; il vincolo unico impedisce due tariffe
-- con lo stesso mese di inizio. I mesi passati mantengono la tariffa di allora.
--
-- La voce di budget del cliente è la voce di entrata su cui confluisce il suo incasso previsto.
-- Il database non distingue voci di entrata e di spesa: la scelta è lasciata all'app.

create table public.clients (
  id                      bigint generated always as identity primary key,
  name                    text    not null check (length(btrim(name)) > 0),
  budget_item_id          bigint  not null references public.budget_items (id) on delete restrict,
  collection_delay_months integer not null default 0 check (collection_delay_months >= 0),
  sort_order              integer not null default 0,
  archived                boolean not null default false,
  created_at              timestamptz not null default now()
);
create unique index clients_name_active_key on public.clients (lower(name)) where not archived;
create index clients_budget_item_idx on public.clients (budget_item_id);

create table public.client_rates (
  id               bigint generated always as identity primary key,
  client_id        bigint        not null references public.clients (id) on delete restrict,
  daily_rate       numeric(12,2) not null check (daily_rate >= 0),
  valid_from_year  smallint      not null check (valid_from_year between 2000 and 2100),
  valid_from_month smallint      not null check (valid_from_month between 1 and 12),
  created_at       timestamptz   not null default now(),
  constraint client_rates_client_valid_from_key unique (client_id, valid_from_year, valid_from_month)
);

-- RLS a utente unico, come le altre tabelle (BP-19).
do $$
declare t text;
begin
  foreach t in array array['clients', 'client_rates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)',
      t || '_owner', t
    );
  end loop;
end $$;
