# Schema del database

Aggiornato a ogni migrazione (vedi `database/CLAUDE.md`). Importi `numeric(12,2)`, date `date`. Nessun nome di dominio nel codice o nelle migrazioni: stanno nel seed.

## Classificazione (BP-13)
`categorie` -> `voci_budget` -> `macro_aree` (N:1 a ogni livello).

| Tabella | Colonne principali | Note |
|---|---|---|
| `macro_aree` | id, nome, ordine, archiviata | |
| `voci_budget` | id, macro_area_id, nome, ordine, archiviata | FK macro-area `ON DELETE RESTRICT` |
| `categorie` | id, voce_budget_id, nome, ordine, archiviata | FK voce `ON DELETE RESTRICT` |

- Nome unico (senza distinguere maiuscole) tra gli elementi **non archiviati** di ogni tabella (indice univoco parziale).
- Un elemento con dati collegati non si elimina: si archivia.

## Conti (BP-14)
| Tabella | Colonne principali | Note |
|---|---|---|
| `conti` | id, nome, ordine, archiviato | nome unico tra i non archiviati |
| `saldi_iniziali` | id, conto_id, anno, importo, origine | `unique (conto_id, anno)`; FK conto `ON DELETE RESTRICT` |

`origine` (enum `origine_saldo`): `manuale` oppure `riportato` dall'anno precedente. Il calcolo del riporto e i valori sono fuori ambito (epic 4).

## Movimenti (BP-15)
`movimenti`: id, tipo (enum `tipo_movimento`: spesa, entrata, trasferimento), data, importo, conto_id, conto_destinazione_id, categoria_id, voce_budget_id, commento, tag.

- `importo > 0` sempre; il segno deriva dal tipo.
- Vincolo `movimenti_coerenza_tipo`: trasferimento = destinazione presente e diversa dall'origine, senza categoria né voce; spesa/entrata = categoria e voce presenti, nessuna destinazione.
- La voce di budget è salvata sul movimento: riclassificare una categoria non cambia lo storico.
- Tutte le FK sono `ON DELETE RESTRICT`. Indici su data, conto, destinazione, categoria, voce.
