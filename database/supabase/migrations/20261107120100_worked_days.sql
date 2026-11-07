-- BP-58: giorni lavorati previsti per cliente e mese (specifica sez. 6).
-- Ricavo maturato nel mese = days x tariffa valida in quel mese. I giorni sono input dell'utente,
-- anche su più anni in anticipo e anche in frazioni di giornata (es. 0.5), massimo 31 per mese.
-- Si può inserire qualunque mese, anche futuro, senza righe precedenti.

create table public.worked_days (
  id         bigint generated always as identity primary key,
  client_id  bigint        not null references public.clients (id) on delete restrict,
  year       smallint      not null check (year between 2000 and 2100),
  month      smallint      not null check (month between 1 and 12),
  days       numeric(5,2)  not null check (days >= 0 and days <= 31),
  created_at timestamptz   not null default now(),
  constraint worked_days_client_year_month_key unique (client_id, year, month)
);

alter table public.worked_days enable row level security;
revoke all on public.worked_days from anon;
create policy worked_days_owner on public.worked_days
  for all to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
