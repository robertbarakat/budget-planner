-- BP-100: calendario F24 (specifica sez. 7). Le scadenze alimentano la riga "Imposte" del budget previsto;
-- il versamento reale resta un movimento (transaction_id), la rata di una rateizzazione è facoltativa.
-- tax_type è l'enum creato in BP-99.

create table public.f24_deadlines (
  id             bigint generated always as identity primary key,
  reference_year smallint        not null check (reference_year between 2000 and 2100),
  tax_type       public.tax_type not null,
  due_date       date            not null,
  amount         numeric(12,2)   not null check (amount > 0),
  transaction_id bigint          references public.transactions (id) on delete restrict,
  installment_id bigint          references public.installments (id) on delete restrict,
  created_at     timestamptz     not null default now(),
  constraint f24_deadlines_year_tax_due_key unique (reference_year, tax_type, due_date)
);

create index f24_deadlines_transaction_idx on public.f24_deadlines (transaction_id);
create index f24_deadlines_installment_idx on public.f24_deadlines (installment_id);

alter table public.f24_deadlines enable row level security;
revoke all on public.f24_deadlines from anon;
create policy f24_deadlines_owner on public.f24_deadlines
  for all to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
