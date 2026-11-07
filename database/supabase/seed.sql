-- Dati iniziali (BP-20). Ripetibile: ogni riga si inserisce solo se manca (confronto sul nome, senza maiuscole,
-- tra gli elementi non archiviati). Rieseguirlo non crea duplicati.
--
-- Identificatori (tabelle, colonne) in inglese; i NOMI inseriti sono dati in italiano, come li vede l'utente.
-- Nessun saldo iniziale qui: i valori si ricavano il giorno dell'import (specifica sez. 8 e 10).
-- Macro-aree, voci e categorie sono un ELENCO DI PARTENZA ricavato dagli esempi della specifica:
-- i nomi delle macro-aree sono provvisori e vanno rivisti prima del primo uso.
-- La mappatura completa delle 63 categorie è nell'epic 9.

-- Conti
insert into public.accounts (name, sort_order)
select v.name, v.sort_order
from (values ('Bancoposta', 1), ('Cash', 2), ('Postepay', 3)) as v(name, sort_order)
where not exists (
  select 1 from public.accounts a where lower(a.name) = lower(v.name) and not a.archived
);

-- Macro-aree
insert into public.macro_areas (name, sort_order)
select v.name, v.sort_order
from (values ('Vita quotidiana', 1), ('Prestiti e rate', 2), ('Casa all''estero', 3)) as v(name, sort_order)
where not exists (
  select 1 from public.macro_areas m where lower(m.name) = lower(v.name) and not m.archived
);

-- Macro-area dei ricavi professionali (BP-157): le sue entrate contano come incassi ai fini fiscali (BP-155).
insert into public.macro_areas (name, sort_order, is_professional)
select v.name, v.sort_order, true
from (values ('Ricavi professionali', 4)) as v(name, sort_order)
where not exists (
  select 1 from public.macro_areas m where lower(m.name) = lower(v.name) and not m.archived
);

-- Voci di budget
insert into public.budget_items (macro_area_id, name, kind, sort_order)
select m.id, v.name, v.kind::public.budget_item_kind, v.sort_order
from (values
  ('Vita quotidiana', 'Utenze', 'expense', 1),
  ('Vita quotidiana', 'Food & leisure', 'expense', 2),
  ('Prestiti e rate', 'Prestito Alba', 'expense', 1),
  ('Prestiti e rate', 'Mobili Alba (MondoConv)', 'expense', 2),
  ('Prestiti e rate', 'Cofidis', 'expense', 3),
  ('Casa all''estero', 'Travaux Jounieh', 'expense', 1)
) as v(macro_area, name, kind, sort_order)
join public.macro_areas m on lower(m.name) = lower(v.macro_area) and not m.archived
where not exists (
  select 1 from public.budget_items x where lower(x.name) = lower(v.name) and not x.archived
);

-- Categorie
insert into public.categories (budget_item_id, name, sort_order)
select b.id, v.name, v.sort_order
from (values
  ('Utenze', 'Luce', 1),
  ('Utenze', 'Gas', 2),
  ('Utenze', 'Acqua', 3),
  ('Food & leisure', 'Ristorante', 1),
  ('Food & leisure', 'Pizza', 2),
  ('Food & leisure', 'Bar', 3),
  ('Food & leisure', 'Supermercato', 4)
) as v(budget_item, name, sort_order)
join public.budget_items b on lower(b.name) = lower(v.budget_item) and not b.archived
where not exists (
  select 1 from public.categories x where lower(x.name) = lower(v.name) and not x.archived
);
