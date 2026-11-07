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

## Righe di budget (BP-16)
`righe_budget`: id, voce_budget_id, anno, mese (1–12), importo, origine (enum `origine_riga_budget`: manuale, driver_ricavi, ricorrenza, fiscale).

- Budget libero: nessun vincolo di sequenza tra anni e mesi.
- **Unicità**: nessun vincolo unico su voce+anno+mese(+origine). Più righe coesistono sulla stessa voce e mese anche con la stessa origine (il driver ricavi genera una riga per cliente e mese di incasso). Chi genera le righe (driver, ricorrenze, fiscale) le sostituisce da sé sui soli mesi non chiusi.
- FK voce `ON DELETE RESTRICT`; indice su (anno, mese, voce).

## Ricorrenze (BP-17)
| Tabella | Colonne principali | Note |
|---|---|---|
| `ricorrenze` | id, nome, voce_budget_id, conto_id, importo_base, periodicita, data_inizio, data_fine, archiviata | `data_fine >= data_inizio`; FK RESTRICT |
| `scadenze_ricorrenza` | id, ricorrenza_id, data, importo, riga_budget_id | `unique (ricorrenza_id, data)`; importo indipendente dal base; FK RESTRICT |

`periodicita` (enum): mensile, bimestrale, trimestrale, semestrale, annuale. L'elenco è un'assunzione (la specifica non lo definisce): da confermare nell'epic 7. Generazione delle scadenze e UI: epic 7.

## Mesi chiusi (BP-18)
`mesi_chiusi`: id, anno, mese (1–12), chiuso_il. `unique (anno, mese)`. Un mese è chiuso se esiste la riga; riaprirlo = eliminarla.

## Sicurezza: RLS a utente unico (BP-19)
- RLS attiva su tutte le tabelle; una policy `<tabella>_proprietario` per `authenticated` (lettura e scrittura, purché `auth.uid()` esista).
- `anon`: privilegi revocati e nessuna policy, quindi nessun accesso.
- Il signup è disattivato (docs/auth.md): l'unico utente è il proprietario.
- Ogni nuova tabella deve abilitare RLS e aggiungere la policy nella propria migrazione.

## Seed (BP-20)
`database/supabase/seed.sql`: 3 conti, 3 macro-aree, 6 voci e 7 categorie di partenza (dagli esempi della specifica). Ripetibile (inserisce solo ciò che manca, per nome tra i non archiviati). Nessun saldo iniziale. I nomi delle macro-aree sono provvisori: da rivedere prima del primo uso. Il seed gira in locale con `supabase db reset`; non è applicato al progetto remoto.

## Test (BP-22)
Test pgTAP in `database/supabase/tests/`, eseguiti con `npx supabase test db` (vedi `database/README.md`).
