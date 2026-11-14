-- Previsioni di ricavo per cliente: n giorni x tariffa giornaliera, con mese di competenza (giorni fatturati)
-- e mese di incasso distinti. Il cliente è una voce di budget della macro-area professionale (nessuna anagrafica separata).
-- Più righe per lo stesso cliente e mese sono ammesse. La somma di ogni cliente e mese di incasso
-- finisce in budget_entries con origine 'revenue_driver'; i mesi chiusi non si toccano.

create table public.revenue_forecasts (
  id               bigint generated always as identity primary key,
  budget_item_id   bigint        not null references public.budget_items (id) on delete restrict,
  work_year        smallint      not null check (work_year between 2000 and 2100),
  work_month       smallint      not null check (work_month between 1 and 12),
  collection_year  smallint      not null check (collection_year between 2000 and 2100),
  collection_month smallint      not null check (collection_month between 1 and 12),
  days             numeric(5,2)  not null check (days > 0 and days <= 31),
  daily_rate       numeric(10,2) not null check (daily_rate >= 0),
  created_at       timestamptz   not null default now()
);

create index revenue_forecasts_item_collection_idx
  on public.revenue_forecasts (budget_item_id, collection_year, collection_month);

alter table public.revenue_forecasts enable row level security;
revoke all on public.revenue_forecasts from anon;
create policy revenue_forecasts_owner on public.revenue_forecasts
  for all to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- Ricalcola la riga di budget di un cliente per un mese di incasso (salvo mese chiuso).
create or replace function public.sync_revenue_forecast_entry(p_item bigint, p_year integer, p_month integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (select 1 from public.closed_months c where c.year = p_year and c.month = p_month) then
    return;
  end if;
  delete from public.budget_entries b
  where b.source = 'revenue_driver' and b.budget_item_id = p_item and b.year = p_year and b.month = p_month;
  insert into public.budget_entries (budget_item_id, year, month, amount, source)
  select p_item, p_year, p_month, round(sum(f.days * f.daily_rate), 2), 'revenue_driver'
  from public.revenue_forecasts f
  where f.budget_item_id = p_item and f.collection_year = p_year and f.collection_month = p_month
  having sum(f.days * f.daily_rate) > 0;
end;
$$;

create or replace function public.revenue_forecasts_sync_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.sync_revenue_forecast_entry(old.budget_item_id, old.collection_year, old.collection_month);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.sync_revenue_forecast_entry(new.budget_item_id, new.collection_year, new.collection_month);
  end if;
  return null;
end;
$$;

create trigger revenue_forecasts_sync
  after insert or update or delete on public.revenue_forecasts
  for each row execute function public.revenue_forecasts_sync_trigger();

revoke all on function public.sync_revenue_forecast_entry(bigint, integer, integer) from public, anon;
grant execute on function public.sync_revenue_forecast_entry(bigint, integer, integer) to authenticated;
