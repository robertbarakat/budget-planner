-- BP-16: righe di budget per voce + anno + mese (specifica sez. 3).
-- Il budget è libero: nessun vincolo di sequenza tra anni o mesi (si può inserire un anno futuro da solo).
--
-- SCELTA SULL'UNICITÀ: nessun vincolo unico su (voce, anno, mese, origine).
-- Più righe possono coesistere sulla stessa voce e mese, anche con la stessa origine: il driver ricavi
-- genera una riga per cliente e mese di incasso (sez. 6) e più ricorrenze possono puntare alla stessa voce.
-- L'idempotenza della rigenerazione (driver, ricorrenze, fiscale) spetta a chi genera le righe,
-- che sostituisce le proprie righe sui soli mesi non chiusi. L'indice non univoco serve alle viste.

create type public.origine_riga_budget as enum ('manuale', 'driver_ricavi', 'ricorrenza', 'fiscale');

create table public.righe_budget (
  id             bigint generated always as identity primary key,
  voce_budget_id bigint        not null references public.voci_budget (id) on delete restrict,
  anno           smallint      not null check (anno between 2000 and 2100),
  mese           smallint      not null check (mese between 1 and 12),
  importo        numeric(12,2) not null,
  origine        public.origine_riga_budget not null default 'manuale',
  created_at     timestamptz   not null default now()
);
create index righe_budget_periodo_voce_idx on public.righe_budget (anno, mese, voce_budget_id);
create index righe_budget_voce_idx on public.righe_budget (voce_budget_id);
