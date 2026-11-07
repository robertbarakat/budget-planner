# Schema del database

Aggiornato a ogni migrazione (vedi `database/CLAUDE.md`). Importi `numeric(12,2)`, date `date`.
**Tutti gli identificatori sono in inglese** (tabelle, colonne, enum e valori, vincoli, indici, policy). L'italiano sta solo nei dati (seed) e nei testi per l'utente: il frontend traduce i valori degli enum in etichette italiane. Glossario italiano -> inglese in `docs/specifica.md`, sezione 2.

## Classificazione (BP-13)
`categories` -> `budget_items` -> `macro_areas` (N:1 a ogni livello).

| Tabella | Colonne principali | Note |
|---|---|---|
| `macro_areas` | id, name, sort_order, archived | |
| `budget_items` | id, macro_area_id, name, sort_order, archived | FK macro-area `ON DELETE RESTRICT` |
| `categories` | id, budget_item_id, name, sort_order, archived | FK voce `ON DELETE RESTRICT` |

- Nome unico (senza distinguere maiuscole) tra gli elementi **non archiviati** di ogni tabella (indice univoco parziale `*_name_active_key`).
- Un elemento con dati collegati non si elimina: si archivia.

## Conti (BP-14)
| Tabella | Colonne principali | Note |
|---|---|---|
| `accounts` | id, name, sort_order, archived | nome unico tra i non archiviati |
| `opening_balances` | id, account_id, year, amount, source | `unique (account_id, year)`; FK conto `ON DELETE RESTRICT` |

`source` (enum `balance_source`): `manual` oppure `carried_over` dall'anno precedente. Il calcolo del riporto e i valori sono fuori ambito (epic 4).

## Movimenti (BP-15)
`transactions`: id, type (enum `transaction_type`: `expense`, `income`, `transfer`), transaction_date, amount, account_id, destination_account_id, category_id, budget_item_id, comment, tag.

- `amount > 0` sempre; il segno deriva dal tipo.
- Vincolo `transactions_type_consistency`: `transfer` = destinazione presente e diversa dall'origine, senza categoria né voce; `expense`/`income` = categoria e voce presenti, nessuna destinazione.
- La voce di budget è salvata sul movimento: riclassificare una categoria non cambia lo storico.
- Tutte le FK sono `ON DELETE RESTRICT`. Indici su data, conto, destinazione, categoria, voce.

## Righe di budget (BP-16)
`budget_entries`: id, budget_item_id, year, month (1–12), amount, source (enum `budget_entry_source`: `manual`, `revenue_driver`, `recurrence`, `tax`).

- Budget libero: nessun vincolo di sequenza tra anni e mesi.
- **Unicità**: nessun vincolo unico su voce+anno+mese(+source). Più righe coesistono sulla stessa voce e mese anche con la stessa origine (il driver ricavi genera una riga per cliente e mese di incasso). Chi genera le righe (driver, ricorrenze, fiscale) le sostituisce da sé sui soli mesi non chiusi.
- FK voce `ON DELETE RESTRICT`; indice su (year, month, budget_item_id).

## Ricorrenze (BP-17)
| Tabella | Colonne principali | Note |
|---|---|---|
| `recurrences` | id, name, budget_item_id, account_id, base_amount, frequency, start_date, end_date, archived | `end_date >= start_date`; FK RESTRICT |
| `recurrence_occurrences` | id, recurrence_id, due_date, amount, budget_entry_id | `unique (recurrence_id, due_date)`; importo indipendente dal base; FK RESTRICT |

`frequency` (enum `recurrence_frequency`): `monthly`, `bimonthly`, `quarterly`, `semiannual`, `annual`. L'elenco è un'assunzione (la specifica non lo definisce): da confermare nell'epic 7. Generazione delle scadenze e UI: epic 7.

## Mesi chiusi (BP-18)
`closed_months`: id, year, month (1–12), closed_at. `unique (year, month)`. Un mese è chiuso se esiste la riga; riaprirlo = eliminarla.

## Clienti e tariffe (BP-57)
| Tabella | Colonne principali | Note |
|---|---|---|
| `clients` | id, name, budget_item_id, collection_delay_months, sort_order, archived | ritardo d'incasso in mesi `>= 0`; nome unico tra i non archiviati; FK voce `ON DELETE RESTRICT` |
| `client_rates` | id, client_id, daily_rate, valid_from_year, valid_from_month | `unique (client_id, valid_from_year, valid_from_month)`; FK cliente `ON DELETE RESTRICT` |

- **Validità delle tariffe**: una tariffa vale dal mese `valid_from_*` fino al mese precedente alla successiva dello stesso cliente. Con un solo inizio per tariffa le validità non si sovrappongono; il vincolo unico impedisce due tariffe con lo stesso mese di inizio. I mesi passati mantengono la tariffa di allora.
- Il DB non distingue voci di entrata e di spesa: la voce del cliente (`budget_item_id`) è scelta dall'app.
- RLS e policy `<table>_owner` come le altre tabelle. Nessun cliente nella migrazione (i dati stanno nell'app).

## Giorni lavorati (BP-58)
`worked_days`: id, client_id, year, month (1–12), days (`numeric(5,2)`, da 0 a 31, anche frazioni di giornata). `unique (client_id, year, month)`; FK cliente `ON DELETE RESTRICT`; RLS come le altre. Si può inserire qualunque mese, anche futuro, senza righe precedenti.

## Funzioni (BP-60)
`public.replace_revenue_driver_entries(p_from_year, p_from_month, p_to_year, p_to_month, p_entries jsonb) returns table (deleted_count, inserted_count)`

- Cancella le righe di `budget_entries` con `source = 'revenue_driver'` nell'intervallo di mesi (estremi inclusi, anche a cavallo di due anni) e inserisce le righe passate in `p_entries` (array JSON di `{budget_item_id, year, month, amount}`), in un'unica transazione. Righe con altra origine non vengono toccate.
- Le righe passate devono cadere nell'intervallo (altrimenti errore `22023`), così una rigenerazione successiva non lascia doppioni. Mesi fuori da 1–12 o intervallo invertito: errore `22023`.
- Un errore a metà (es. voce inesistente) annulla tutto: i dati restano com'erano.
- `security invoker` (valgono le policy RLS), `search_path` vuoto; `execute` revocato a `public` e `anon`, concesso ad `authenticated`.
- Il calcolo degli importi sta in `shared/` (`computeExpectedCollections`): qui solo la scrittura.

## Sicurezza: RLS a utente unico (BP-19)
- RLS attiva su tutte le tabelle; una policy `<table>_owner` per `authenticated` (lettura e scrittura, purché `auth.uid()` esista).
- `anon`: privilegi revocati e nessuna policy, quindi nessun accesso.
- Il signup è disattivato (docs/auth.md): l'unico utente è il proprietario.
- Ogni nuova tabella deve abilitare RLS e aggiungere la policy nella propria migrazione.

## Seed (BP-20)
`database/supabase/seed.sql`: 3 conti, 3 macro-aree, 6 voci e 7 categorie di partenza (dagli esempi della specifica). Ripetibile (inserisce solo ciò che manca, per nome tra i non archiviati). Nessun saldo iniziale. I nomi delle macro-aree sono provvisori: da rivedere prima del primo uso. Il seed gira in locale con `supabase db reset`; non è applicato al progetto remoto.

## Test (BP-22)
Test pgTAP in `database/supabase/tests/`, eseguiti con `npx supabase test db` (vedi `database/README.md`).

## Rename in inglese (BP-152)
La migrazione `20261107110000_rename_schema_to_english.sql` ha rinominato tabelle, colonne, enum e valori, vincoli, indici, policy e sequenze create con nomi italiani nelle migrazioni BP-13…BP-19 (che restano invariate come storia).
