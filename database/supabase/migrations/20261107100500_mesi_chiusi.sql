-- BP-18: mesi chiusi (specifica sez. 3, "Mese chiuso").
-- Un mese è chiuso se esiste la riga; riaprirlo = eliminare la riga.

create table public.mesi_chiusi (
  id          bigint generated always as identity primary key,
  anno        smallint    not null check (anno between 2000 and 2100),
  mese        smallint    not null check (mese between 1 and 12),
  chiuso_il   timestamptz not null default now(),
  constraint mesi_chiusi_anno_mese_key unique (anno, mese)
);
