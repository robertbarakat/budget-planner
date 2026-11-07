-- BP-99: rateizzazioni e rate (specifica sez. 7).
-- Gli interessi non sono memorizzati: si ricavano come somma delle rate - total_amount.
-- tax_type: valori controllati (decisione del ticket "da definire"): imposta sostitutiva e INPS,
-- ciascuna come acconto, saldo o versamento semplice. Lo stesso tipo è usato dal calendario F24 (BP-100).

create type public.tax_type as enum (
  'substitute_tax',
  'substitute_tax_advance',
  'substitute_tax_balance',
  'inps',
  'inps_advance',
  'inps_balance'
);

create table public.installment_plans (
  id             bigint generated always as identity primary key,
  description    text           not null check (length(btrim(description)) > 0),
  total_amount   numeric(12,2)  not null check (total_amount > 0),
  tax_type       public.tax_type not null,
  reference_year smallint       not null check (reference_year between 2000 and 2100),
  archived       boolean        not null default false,
  created_at     timestamptz    not null default now()
);

create table public.installments (
  id         bigint generated always as identity primary key,
  plan_id    bigint         not null references public.installment_plans (id) on delete restrict,
  number     smallint       not null check (number >= 1),
  due_date   date           not null,
  amount     numeric(12,2)  not null check (amount > 0),
  created_at timestamptz    not null default now(),
  constraint installments_plan_number_key unique (plan_id, number)
);

alter table public.installment_plans enable row level security;
alter table public.installments enable row level security;
revoke all on public.installment_plans from anon;
revoke all on public.installments from anon;
create policy installment_plans_owner on public.installment_plans
  for all to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
create policy installments_owner on public.installments
  for all to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
