-- Dati iniziali (BP-20). Ripetibile: ogni riga si inserisce solo se manca (confronto sul nome, senza maiuscole,
-- tra gli elementi non archiviati). Rieseguirlo non crea duplicati e non tocca ciò che l'utente ha rinominato/archiviato oltre il nome.
--
-- Nessun saldo iniziale qui: i valori si ricavano il giorno dell'import (specifica sez. 8 e 10).
-- Macro-aree, voci e categorie sono un ELENCO DI PARTENZA ricavato dagli esempi della specifica:
-- i nomi delle macro-aree sono provvisori e vanno rivisti prima del primo uso.
-- La mappatura completa delle 63 categorie è nell'epic 9.

-- Conti
insert into public.conti (nome, ordine)
select v.nome, v.ordine
from (values ('Bancoposta', 1), ('Cash', 2), ('Postepay', 3)) as v(nome, ordine)
where not exists (
  select 1 from public.conti c where lower(c.nome) = lower(v.nome) and not c.archiviato
);

-- Macro-aree
insert into public.macro_aree (nome, ordine)
select v.nome, v.ordine
from (values ('Vita quotidiana', 1), ('Prestiti e rate', 2), ('Casa all''estero', 3)) as v(nome, ordine)
where not exists (
  select 1 from public.macro_aree m where lower(m.nome) = lower(v.nome) and not m.archiviata
);

-- Voci di budget
insert into public.voci_budget (macro_area_id, nome, ordine)
select m.id, v.nome, v.ordine
from (values
  ('Vita quotidiana', 'Utenze', 1),
  ('Vita quotidiana', 'Food & leisure', 2),
  ('Prestiti e rate', 'Prestito Alba', 1),
  ('Prestiti e rate', 'Mobili Alba (MondoConv)', 2),
  ('Prestiti e rate', 'Cofidis', 3),
  ('Casa all''estero', 'Travaux Jounieh', 1)
) as v(macro_area, nome, ordine)
join public.macro_aree m on lower(m.nome) = lower(v.macro_area) and not m.archiviata
where not exists (
  select 1 from public.voci_budget x where lower(x.nome) = lower(v.nome) and not x.archiviata
);

-- Categorie
insert into public.categorie (voce_budget_id, nome, ordine)
select b.id, v.nome, v.ordine
from (values
  ('Utenze', 'Luce', 1),
  ('Utenze', 'Gas', 2),
  ('Utenze', 'Acqua', 3),
  ('Food & leisure', 'Ristorante', 1),
  ('Food & leisure', 'Pizza', 2),
  ('Food & leisure', 'Bar', 3),
  ('Food & leisure', 'Supermercato', 4)
) as v(voce, nome, ordine)
join public.voci_budget b on lower(b.nome) = lower(v.voce) and not b.archiviata
where not exists (
  select 1 from public.categorie x where lower(x.nome) = lower(v.nome) and not x.archiviata
);
