-- BP-13: classificazione categoria -> voce di budget -> macro-area (specifica sez. 3).
-- Nessun nome nella migrazione: i dati stanno nel seed.
-- Eliminare un elemento con dati collegati è impedito (ON DELETE RESTRICT): si archivia.
-- Nomi unici (senza distinguere maiuscole) tra gli elementi non archiviati dello stesso livello.

create table public.macro_aree (
  id         bigint generated always as identity primary key,
  nome       text    not null check (length(btrim(nome)) > 0),
  ordine     integer not null default 0,
  archiviata boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index macro_aree_nome_attivo_key on public.macro_aree (lower(nome)) where not archiviata;

create table public.voci_budget (
  id            bigint generated always as identity primary key,
  macro_area_id bigint  not null references public.macro_aree (id) on delete restrict,
  nome          text    not null check (length(btrim(nome)) > 0),
  ordine        integer not null default 0,
  archiviata    boolean not null default false,
  created_at    timestamptz not null default now()
);
create unique index voci_budget_nome_attiva_key on public.voci_budget (lower(nome)) where not archiviata;
create index voci_budget_macro_area_idx on public.voci_budget (macro_area_id);

create table public.categorie (
  id              bigint generated always as identity primary key,
  voce_budget_id  bigint  not null references public.voci_budget (id) on delete restrict,
  nome            text    not null check (length(btrim(nome)) > 0),
  ordine          integer not null default 0,
  archiviata      boolean not null default false,
  created_at      timestamptz not null default now()
);
create unique index categorie_nome_attiva_key on public.categorie (lower(nome)) where not archiviata;
create index categorie_voce_budget_idx on public.categorie (voce_budget_id);
