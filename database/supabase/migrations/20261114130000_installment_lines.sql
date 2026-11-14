-- Rateizzazione a più righe di capitale (tributo + anno), con interessi per riga.
-- Ogni rata è una riga per tributo/anno: capitale + interessi. Le righe di definizione stanno in installment_lines.

alter table public.installments
  add column tax_type       public.tax_type not null,
  add column reference_year smallint        not null check (reference_year between 2000 and 2100),
  add column principal      numeric(12,2)   not null check (principal >= 0),
  add column interest       numeric(12,2)   not null default 0 check (interest >= 0);

alter table public.installments drop constraint installments_plan_number_key;
alter table public.installments
  add constraint installments_plan_number_line_key unique (plan_id, number, tax_type, reference_year);

create table public.installment_lines (
  id             bigint generated always as identity primary key,
  plan_id        bigint         not null references public.installment_plans (id) on delete cascade,
  tax_type       public.tax_type not null,
  reference_year smallint       not null check (reference_year between 2000 and 2100),
  quota          numeric(12,2)  not null check (quota > 0),
  -- Ultima rata in cui la riga si paga; null = fino alla fine del piano. Dopo, né capitale né interessi.
  last_number    smallint       check (last_number >= 1),
  created_at     timestamptz    not null default now()
);
create index installment_lines_plan_idx on public.installment_lines (plan_id);

alter table public.installment_lines enable row level security;
revoke all on public.installment_lines from anon;
create policy installment_lines_owner on public.installment_lines
  for all to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
