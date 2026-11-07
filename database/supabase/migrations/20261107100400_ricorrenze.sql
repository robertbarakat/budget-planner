-- BP-17: ricorrenze e scadenze modificabili (specifica sez. 3, "Ricorrenze").
-- L'importo di ogni scadenza è indipendente dall'importo base della ricorrenza:
-- modificarlo non tocca le altre scadenze né la ricorrenza.
-- Periodicità ammesse (assunzione, la specifica non le elenca): mensile, bimestrale, trimestrale, semestrale, annuale.

create type public.periodicita as enum ('mensile', 'bimestrale', 'trimestrale', 'semestrale', 'annuale');

create table public.ricorrenze (
  id             bigint generated always as identity primary key,
  nome           text    not null check (length(btrim(nome)) > 0),
  voce_budget_id bigint  not null references public.voci_budget (id) on delete restrict,
  conto_id       bigint  not null references public.conti (id) on delete restrict,
  importo_base   numeric(12,2) not null,
  periodicita    public.periodicita not null,
  data_inizio    date    not null,
  data_fine      date,
  archiviata     boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint ricorrenze_periodo_valido check (data_fine is null or data_fine >= data_inizio)
);
create index ricorrenze_voce_budget_idx on public.ricorrenze (voce_budget_id);
create index ricorrenze_conto_idx on public.ricorrenze (conto_id);

create table public.scadenze_ricorrenza (
  id               bigint generated always as identity primary key,
  ricorrenza_id    bigint        not null references public.ricorrenze (id) on delete restrict,
  data             date          not null,
  importo          numeric(12,2) not null,
  riga_budget_id   bigint        references public.righe_budget (id) on delete restrict,
  created_at       timestamptz   not null default now(),
  constraint scadenze_ricorrenza_data_key unique (ricorrenza_id, data)
);
create index scadenze_ricorrenza_riga_budget_idx on public.scadenze_ricorrenza (riga_budget_id) where riga_budget_id is not null;
