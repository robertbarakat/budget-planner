# Specifica – Budget Planner

Stato: versione iniziale, da aggiornare quando una decisione cambia. Le decisioni prese sono nella sezione 10.

## 1. Obiettivo
Gestionale personale per un libero professionista in regime forfettario (P.IVA). Tiene insieme:
- il **budget previsto** dell'intero anno (previsione);
- il **consuntivo reale**, aggiornato man mano con i movimenti inseriti;
- spese e entrate professionali e personali, più un **modulo fiscale** separato dalle spese.

Un solo utente. Web app PWA usata da telefono (inserimento rapido) e desktop (analisi). Un solo database condiviso. UI in italiano, valuta EUR, mesi in italiano.

## 2. Stack e decisioni prese
- **Nomi nel codice**: tutti gli identificatori (tabelle, colonne, enum e valori, variabili, funzioni, tipi, file) sono in inglese; l'italiano resta nei dati, nei testi per l'utente e nella documentazione. Glossario sotto.
- Monorepo GitHub `budget-planner`: frontend/, backend/, database/, shared/, docs/.
- Frontend: React + Vite + TypeScript, Oxlint, CSS puro con custom properties (niente SCSS). Lo scrive l'autore.
- Database e autenticazione: Supabase (Postgres, row level security, utente unico). Migrazioni in database/supabase/migrations.
- Backend: funzioni Node su Vercel; cron di Vercel per l'export settimanale.
- Calcoli (fiscale, previsioni) in funzioni pure in shared/, testate con Vitest.
- Gestione lavoro: Jira (barakarob.atlassian.net). Documentazione nel repo (docs/), non su Confluence.
- Solo online all'inizio. L'uso offline (coda di inserimenti sul telefono) non è un requisito iniziale: si valuta a fine progetto (epic 11).
- Export su Google Sheets: unidirezionale DB -> Sheet, fase finale. L'app non legge dal foglio.

### Glossario italiano -> inglese (nomi nel codice)
| Italiano | Inglese | Note |
|---|---|---|
| conto / saldo iniziale | `accounts` / `opening_balances` | |
| macro-area, voce di budget, categoria | `macro_areas`, `budget_items`, `categories` | |
| movimento: spesa, entrata, trasferimento | `transactions`: `expense`, `income`, `transfer` | |
| riga di budget | `budget_entries` | origine = `source`: `manual`, `revenue_driver`, `recurrence`, `tax` |
| ricorrenza, scadenza | `recurrences`, `recurrence_occurrences` | periodicità = `frequency`: `monthly`, `bimonthly`, `quarterly`, `semiannual`, `annual` |
| mese chiuso | `closed_months` | |
| importo, anno, mese, nome, data | `amount`, `year`, `month`, `name`, `transaction_date` / `due_date` | |

## 3. Modello dati

### Conti
Bancoposta, Cash, Postepay sono i conti iniziali, inseriti come **dati** (seed), non come elenco fisso nel codice. Ogni conto ha un **saldo iniziale** per anno. Il saldo iniziale dell'anno riporta quello finale dell'anno precedente, oppure si imposta a mano.

### Anagrafiche modificabili dall'app
Conti, categorie, voci di budget e macro-aree sono dati gestibili dall'utente: aggiungere, rinominare, riordinare, archiviare. Regole:
- Un elemento archiviato sparisce dalle scelte di inserimento ma resta nello storico e nelle viste degli anni in cui è stato usato.
- Non si elimina un elemento che ha movimenti o righe di budget collegati: si archivia.
- Spostare una categoria su un'altra voce di budget vale solo per i movimenti futuri, a meno che l'utente scelga esplicitamente di riclassificare anche lo storico.
- Nessun nome di conto, categoria, voce o macro-area è scritto nel codice: solo nei dati.

### Classificazione
`categoria` (livello di inserimento, es. Pizza, Bar, Supermercato) -> `voce di budget` (livello di previsione, es. Food & leisure) -> `macro-area` (raggruppamento per la vista di sintesi). Più categorie confluiscono in una voce (N:1).

### Movimenti reali
Tipi: **spesa**, **entrata**, **trasferimento** (tra conti, senza effetto sul totale). Campi: data, importo, conto (e conto di destinazione per i trasferimenti), categoria, voce di budget, commento, tag facoltativo. Valuta unica EUR.

### Righe di budget
Una riga per **voce + anno + mese** con importo previsto. Origine (`source`): `manual`, `revenue_driver`, `recurrence`, `tax`. Il budget è libero: si può inserire su qualsiasi anno e mese, senza vincoli di sequenza.

### Ricorrenze
Pagamenti periodici (es. mutuo, abbonamenti). Generano righe di budget alle scadenze. L'importo si può **modificare a ogni scadenza** senza cambiare le altre.

### Mese chiuso
Flag per mese. Mese **chiuso**: le viste mostrano il reale. Mese **aperto** (corrente e futuri): si mostra il previsto, affiancato al reale parziale quando c'è. "Chiudi mese" è un'azione esplicita.

## 4. Regole di calcolo
- Totale mese = somma dei movimenti reali (se chiuso) oppure previsto (se non chiuso).
- **Saldo progressivo di cassa** = saldo iniziale dell'anno + somma cumulata dei flussi mese per mese, con mesi chiusi a reale e gli altri a previsto.
- Scostamento = reale - previsto, per voce e per mese.
- I trasferimenti non cambiano la cassa totale, solo i saldi dei singoli conti.

## 5. Viste
1. **Cronologica (flusso di cassa)**: elenco mese per mese, con saldo progressivo. Mobile e web.
2. **Per categoria / macro-area**: previsto vs reale, per mese e per anno. Dettaglio per voce.
3. **Matrice web**: voci x mesi, con interruttore Misto / Previsto / Reale / Scostamento.
4. **Home mobile**: cassa prevista a fine mese (totale; il saldo di ogni conto si vede a richiesta, nel dettaglio), spese del mese reale vs previsto, ultime registrazioni, prossime scadenze.
5. **Nuovo movimento (mobile)**: inserimento in pochi tocchi (tipo, importo, conto, categoria, data, commento).

Schermate di riferimento in `docs/mockups/`. I dati nei mockup sono illustrativi; i colori, i font e le spaziature sono quelli da riprendere.

## 6. Previsione dei ricavi (driver)
Tutto parametrabile dall'app: nessun cliente, tariffa o ritardo è scritto nel codice.

### Parametri
- **Clienti**: anagrafica gestibile (aggiungere, rinominare, archiviare). Ogni cliente ha un **ritardo d'incasso** in mesi (modificabile).
- **Tariffa giornaliera** per cliente, con **periodo di validità** (da mese / a mese): una tariffa può cambiare nel tempo (es. Bit2Win passa da 300 a 280) e i mesi passati mantengono la tariffa di allora.
- **Giorni lavorati previsti** per cliente e mese, inseriti dall'utente (anche su più anni in anticipo) e modificabili in qualsiasi momento.

### Calcolo
- Ricavo maturato nel mese M = giorni lavorati di M x tariffa valida in M, per cliente.
- Incasso previsto = ricavo maturato, spostato in avanti del ritardo del cliente: cade nel mese M + ritardo. Se cade in un altro anno, finisce nel budget di quell'anno (es. il "Riporto su 2027" del foglio).
- Il driver genera righe di budget con origine `revenue_driver`, una per cliente e mese di incasso.
- Cambiando giorni, tariffa o ritardo, le righe `revenue_driver` si rigenerano solo per i mesi **non chiusi**. I mesi chiusi non si toccano.
- Quando arriva l'incasso reale, si registra come entrata collegata al cliente: l'app confronta incasso previsto e reale per cliente.

### Dati di partenza (dal foglio "Budget 2026", confermati dall'autore)
| Cliente | Tariffa giornaliera | Ritardo d'incasso |
|---|---|---|
| OneBlade | 250 | 2 mesi |
| GDS | 250 | 1 mese |
| Bit2Win | 300, poi 280 ("Discount") | 2 mesi |

Il mese da cui la tariffa di Bit2Win scende a 280 si imposta nell'app.

## 7. Modulo fiscale (separato dalle spese)
Regime forfettario. Parametri **modificabili per anno**, mai fissi nel codice.
- Base imponibile = incassi dell'anno x **coefficiente di redditività 67%**.
- **INPS Gestione Separata**: 26,07% sulla base (24% se si ha altra copertura previdenziale). Fonte: circolare INPS n. 8 del 3 febbraio 2026, riportata da ecnews.
- **Imposta sostitutiva**: 15% (5% se start-up) su (base imponibile - contributi INPS **effettivamente versati nell'anno**). Principio di cassa.
- **Acconti e saldo**: percentuali, importi e date sono parametri per anno, ricavati dall'F24 del commercialista e inseriti nell'app. Non vanno fissati nel codice.
- **Rateizzazione**: entità propria (rate con interessi; gli interessi si ricavano per differenza tra importo rateizzato e somma delle rate). Esempio dal foglio 2026: interessi 1.920,27 EUR, da riconciliare.
- **Calendario F24**: scadenze con importi, che alimentano la riga "Imposte" del budget previsto.
- Il primo anno di attività è il 2025 (nessun acconto dovuto per quell'anno).
- I contributi versati nell'anno sono deducibili anche se pagati a rate (indicazione dell'autore); resta un parametro modificabile. Il commercialista resta la verifica finale di tutte le regole.

### Regola di cassa per INPS e imposta (spiegata dall'autore, da confermare col commercialista)
Tutto si basa su ciò che è stato effettivamente incassato o versato nell'anno, non sull'anno di competenza.
1. Base imponibile dell'anno = incassi dell'anno x 67%.
2. **INPS dovuta** sull'anno = base x 26,07%. Si paga in anni diversi (saldo nell'anno dopo, eventuali acconti); è un importo "dovuto", non una deduzione.
3. **INPS versata** nell'anno = somma dei pagamenti INPS fatti in quell'anno, qualunque sia l'anno cui si riferiscono (saldo dell'anno precedente + acconti dell'anno corrente).
4. Imposta sostitutiva dell'anno = 15% x (base dell'anno - INPS **versata** nell'anno). Non va sotto zero.

Esempio (cifre di prova, non reali):
- **2025** (primo anno, nessun versamento INPS nel 2025): incassi 10.000 -> base 6.700 -> imposta 15% x 6.700 = 1.005, senza alcuna deduzione. INPS dovuta sul 2025 = 6.700 x 26,07% = 1.746,69, pagata nel 2026.
- **2026**: incassi 20.000 -> base 13.400. INPS versata nel 2026 = 1.746,69 (INPS 2025) + A (eventuali acconti INPS 2026 pagati nel 2026). Imposta = 15% x (13.400 - 1.746,69 - A).
- **Dal 2027** non ci sono più casi particolari: ogni anno si deduce l'INPS versata in quell'anno (saldo dell'anno prima + acconti dell'anno corrente).

Conseguenza per il codice: l'INPS dovuta e l'INPS versata sono due grandezze distinte. La prima si calcola dalla base (funzione pura); la seconda è un elenco di pagamenti con data, che è l'input dell'imposta. Il caso 2025 va coperto da un test.

### Parametri confermati e incassi professionali (BP-97)
- Valori confermati dall'autore il 2026-11-07, applicati da due anni con il commercialista: coefficiente di redditività 67%, aliquota INPS Gestione Separata 26,07%, imposta sostitutiva 15%. Restano parametri per anno, modificabili dall'app (BP-109).
- **Incassi ai fini fiscali**: contano solo le entrate professionali. Si identificano per macro-area: le entrate le cui voci di budget appartengono alla macro-area dei ricavi professionali (nome nei dati, scelto dall'autore: "Ricavi professionali"). Le altre entrate non entrano nella base imponibile. Poiché nessun nome è scritto nel codice, la macro-area andrà marcata con un attributo (da definire in un ticket dedicato).

Differenza con la spesa: le imposte non si inseriscono a mano come spese, sono calcolate. Il versamento reale resta un movimento, collegato alla scadenza F24.

## 8. Import storico (una tantum)
- Si esegue **una sola volta**, su DB vuoto, il giorno del passaggio, da un Excel esportato dall'app Android attuale ("Budget e finanze", `ru.innim.my_finance`). Dopo il passaggio la vecchia app non si usa più.
- L'export non ha ID di riga: **niente re-import con deduplica**.
- Fogli: `Spese`, `Entrate`, `Bonifici`. Colonne: Data e ora, Categoria, Conto, Importo in valuta predefinita, Valuta predefinita, Importo in valuta del conto, Valuta conto, Importo in valuta della transazione, Valuta transazione, Tag, Commento.
- Le 63 categorie dell'app confluiscono in circa 30 voci del foglio. Serve una **tabella di mappatura** categoria (+ commento) -> voce:
  - N:1 semplice: Luce, Gas, Acqua -> Utenze; Ristorante, Pizza, Bar, Supermercato -> Food & leisure.
  - Dipende dal commento: Prestiti -> Prestito Alba / Mobili Alba (MondoConv) / Cofidis; Casa + "Denise" -> Travaux Jounieh.
  - Stipendio con cliente nel commento -> riga entrata per cliente.
- Procedura: anteprima e report degli scarti prima di scrivere; poi scrittura in una transazione.
- **Saldi iniziali per conto**: non si digitano a memoria. Il giorno dell'import l'utente inserisce il saldo attuale di ogni conto; il sistema ricava il saldo iniziale dell'anno = saldo attuale - movimenti importati. Controllo: la somma dei saldi iniziali 2026 deve dare 42.929,33 EUR (totale del foglio "Budget 2026"); in caso di scarto, mostrarlo.
- Il file Excel contiene dati personali: non va committato (cartella `docs/import-data/` ignorata da git).

## 9. Export su Google Sheets (fase finale)
- Una volta a settimana (cron di Vercel), DB -> Google Sheet, solo scrittura.
- Foglio di riferimento per il formato: "Budget 2026", id `19yQwDNLnRQ29baRxhMSNirOvfhdGK2IuBuAdcyL0Teo`. Le prime due schede da replicare: (1) flusso di cassa semplice; (2) raggruppamento per macro-aree.
- La scheda "Analytic" del vecchio foglio **non si replica**: l'export è guidato dai dati dell'app. Le "Imposte" delle macro-aree vanno riconciliate solo in quella fase.
- L'accesso a Sheets avviene con un account di servizio le cui credenziali stanno solo nelle variabili d'ambiente.

## 10. Decisioni prese
1. Offline: solo online all'inizio; l'offline si valuta a fine progetto.
2. Saldi: la home mostra la cassa totale; il saldo di ogni conto si vede a richiesta.
3. Saldi iniziali per conto: ricavati il giorno dell'import (vedi sezione 8), non digitati a memoria.
4. Tariffe e ritardi d'incasso: confermati (sezione 6).
5. Imposte: calcolate dal modulo fiscale, non inserite a mano.
6. Acconti: parametri per anno presi dall'F24 del commercialista (sezione 7).
7. Contributi pagati a rate: deducibili, parametro modificabile.

Non ci sono decisioni aperte che blocchino l'avvio.

## 11. Ordine di sviluppo suggerito
1. Fondamenta: ambienti, Supabase, Vercel, repo.
2. Schema database e dati iniziali.
3. Design token e base del front-end.
4. Conti e movimenti (inserimento reale), compresa la gestione delle anagrafiche (conti, categorie, voci, macro-aree).
5. Previsione e driver ricavi.
6. Viste, ricorrenze, modulo fiscale.
7. Import storico.
8. Export su Google Sheets.
9. PWA, offline, test, deploy.
