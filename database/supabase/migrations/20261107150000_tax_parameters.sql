-- BP-98: parametri fiscali per anno (specifica sez. 7). Mai fissi nel codice.
-- Nessun valore inserito qui: i valori arrivano dall'app dopo la verifica con il commercialista.
-- Le percentuali sono in punti percentuali (es. 26.07 = 26,07%), due decimali, da 0 a 100.

create table public.tax_parameters (
  id                          bigint generated always as identity primary key,
  year                        smallint      not null check (year between 2000 and 2100),
  profitability_coefficient   numeric(5,2)  not null check (profitability_coefficient between 0 and 100),
  inps_rate                   numeric(5,2)  not null check (inps_rate between 0 and 100),
  substitute_tax_rate         numeric(5,2)  not null check (substitute_tax_rate between 0 and 100),
  is_startup                  boolean       not null default false,
  has_other_pension_coverage  boolean       not null default false,
  activity_start_year         smallint      not null check (activity_start_year between 2000 and 2100),
  created_at                  timestamptz   not null default now(),
  constraint tax_parameters_year_key unique (year),
  constraint tax_parameters_start_not_after_year check (activity_start_year <= year)
);

alter table public.tax_parameters enable row level security;
revoke all on public.tax_parameters from anon;
create policy tax_parameters_owner on public.tax_parameters
  for all to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
