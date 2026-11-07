-- BP-14: conti e saldi iniziali per anno (specifica sez. 3, "Conti").
-- Nessun nome di conto e nessun saldo nella migrazione: i dati stanno nel seed / nell'app.
-- Il saldo iniziale è "riportato" dall'anno precedente oppure "manuale".

create table public.conti (
  id         bigint generated always as identity primary key,
  nome       text    not null check (length(btrim(nome)) > 0),
  ordine     integer not null default 0,
  archiviato boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index conti_nome_attivo_key on public.conti (lower(nome)) where not archiviato;

create type public.origine_saldo as enum ('manuale', 'riportato');

create table public.saldi_iniziali (
  id         bigint generated always as identity primary key,
  conto_id   bigint        not null references public.conti (id) on delete restrict,
  anno       smallint      not null check (anno between 2000 and 2100),
  importo    numeric(12,2) not null,
  origine    public.origine_saldo not null default 'manuale',
  created_at timestamptz   not null default now(),
  constraint saldi_iniziali_conto_anno_key unique (conto_id, anno)
);
