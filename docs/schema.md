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
