# Specifica – Budget Planner

Stato: versione iniziale, da aggiornare quando una decisione cambia. Le voci marcate **DA CONFERMARE** non sono verificate.

## 1. Obiettivo
Gestionale personale per un libero professionista in regime forfettario (P.IVA). Tiene insieme:
- il **budget previsto** dell'intero anno (previsione);
- il **consuntivo reale**, aggiornato man mano con i movimenti inseriti;
- spese e entrate professionali e personali, più un **modulo fiscale** separato dalle spese.

Un solo utente. Web app PWA usata da telefono (inserimento rapido) e desktop (analisi). Un solo database condiviso. UI in italiano, valuta EUR, mesi in italiano.

## 2. Stack e decisioni prese
- Monorepo GitHub `budget-planner`: frontend/, backend/, database/, shared/, docs/.
- Frontend: React + Vite + TypeScript, Oxlint, CSS puro con custom properties (niente SCSS). Lo scrive l'autore.
- Database e autenticazione: Supabase (Postgres, row level security, utente unico). Migrazioni in database/supabase/migrations.
- Backend: funzioni Node su Vercel; cron di Vercel per l'export settimanale.
- Calcoli (fiscale, previsioni) in funzioni pure in shared/, testate con Vitest.
- Gestione lavoro: Jira (barakarob.atlassian.net). Documentazione nel repo (docs/), non su Confluence.
- Online-first. L'uso offline (coda di inserimenti) è rimandato: vedi decisioni aperte.
- Export su Google Sheets: unidirezionale DB -> Sheet, fase finale. L'app non legge dal foglio.

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
Una riga per **voce + anno + mese** con importo previsto. Origine: `manuale`, `driver_ricavi`, `ricorrenza`, `fiscale`. Il budget è libero: si può inserire su qualsiasi anno e mese, senza vincoli di sequenza.

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
4. **Home mobile**: cassa prevista a fine mese, saldi per conto, spese del mese reale vs previsto, ultime registrazioni, prossime scadenze.
5. **Nuovo movimento (mobile)**: inserimento in pochi tocchi (tipo, importo, conto, categoria, data, commento).

Schermate di riferimento in `docs/mockups/`. I dati nei mockup sono illustrativi; i colori, i font e le spaziature sono quelli da riprendere.

## 6. Previsione dei ricavi (driver)
Ricavo previsto = **giorni lavorati x tariffa giornaliera** per cliente, spostato in avanti del **ritardo d'incasso** del cliente. Dal foglio "Budget 2026":

| Cliente | Tariffa giornaliera | Ritardo d'incasso |
|---|---|---|
| OneBlade | 250 | 2 mesi |
| GDS | 250 | 1 mese |
| Bit2Win | 300, poi 280 ("Discount") | 2 mesi |

**DA CONFERMARE**: ritardi e tariffe. Esiste un "Riporto su 2027" nel foglio: gli incassi di fine anno cadono nell'anno successivo. Il driver genera righe di budget con origine `driver_ricavi`.

## 7. Modulo fiscale (separato dalle spese)
Regime forfettario. Parametri **modificabili per anno**, mai fissi nel codice.
- Base imponibile = incassi dell'anno x **coefficiente di redditività 67%**.
- **INPS Gestione Separata**: 26,07% sulla base (24% se si ha altra copertura previdenziale). Fonte: circolare INPS n. 8 del 3 febbraio 2026, riportata da ecnews.
- **Imposta sostitutiva**: 15% (5% se start-up) su (base imponibile - contributi versati nell'anno). Principio di cassa.
- **Acconti e saldo**: percentuali e date **NON verificate**. Da verificare prima di implementare.
- **Rateizzazione**: entità propria (rate con interessi; gli interessi si ricavano per differenza tra importo rateizzato e somma delle rate). Esempio dal foglio 2026: interessi 1.920,27 EUR, da riconciliare.
- **Calendario F24**: scadenze con importi, che alimentano la riga "Imposte" del budget previsto.
- Il primo anno di attività è il 2025 (nessun acconto dovuto per quell'anno).
- Tutto va confermato dal commercialista. La deducibilità dei contributi pagati a rate è da verificare.

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
- Il file Excel contiene dati personali: non va committato (cartella `docs/import-data/` ignorata da git).

## 9. Export su Google Sheets (fase finale)
- Una volta a settimana (cron di Vercel), DB -> Google Sheet, solo scrittura.
- Foglio di riferimento per il formato: "Budget 2026", id `19yQwDNLnRQ29baRxhMSNirOvfhdGK2IuBuAdcyL0Teo`. Le prime due schede da replicare: (1) flusso di cassa semplice; (2) raggruppamento per macro-aree.
- La scheda "Analytic" del vecchio foglio **non si replica**: l'export è guidato dai dati dell'app. Le "Imposte" delle macro-aree vanno riconciliate solo in quella fase.
- L'accesso a Sheets avviene con un account di servizio le cui credenziali stanno solo nelle variabili d'ambiente.

## 10. Decisioni aperte
1. Offline: coda di inserimenti sul telefono oppure solo online?
2. Saldo in tempo reale per singolo conto, oppure solo cassa totale?
3. Saldi iniziali per conto al 1 gennaio: la somma deve dare 42.929,33 EUR (saldo iniziale totale 2026). Da confermare conto per conto.
4. Ritardi d'incasso (2 / 1 / 2 mesi) e tariffe.
5. Percentuali e date degli acconti.
6. Deducibilità dei contributi pagati a rate.
7. Imposte: versione della previsione (calcolata dal modulo fiscale, non più inserita a mano).

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
