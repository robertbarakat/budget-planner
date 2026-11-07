-- BP-155: marca le macro-aree dei ricavi professionali (specifica sez. 7).
-- Ai fini fiscali contano solo le entrate professionali, identificate per macro-area. Nessun nome nel codice:
-- la macro-area (es. "Ricavi professionali") è un dato e qui si limita a un attributo.
-- Le macro-aree esistenti restano false; nessun dato inserito.

alter table public.macro_areas
  add column is_professional boolean not null default false;
