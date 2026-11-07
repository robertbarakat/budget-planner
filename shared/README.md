# Shared

Tipi condivisi e funzioni pure di calcolo, usate da frontend e backend. Le regole sono in `CLAUDE.md`.

## Comandi
```bash
npm install
npm run lint
npm test
npm run build   # controllo dei tipi (tsc --noEmit)
```

## Come si usa dagli altri pacchetti
Il pacchetto si chiama `budget-planner-shared` e espone direttamente i sorgenti TypeScript (`src/index.ts`).
Si aggiunge come dipendenza locale:

```bash
npm install --save "budget-planner-shared@file:../shared"
```

```ts
import { sumCents } from 'budget-planner-shared'
```

- Frontend: già collegato.
- Backend: da collegare quando si crea il pacchetto (BP-4).
- Ogni nuova funzione si esporta da `src/index.ts`.

## Tipi del database
`src/database.types.ts` è generato da Supabase: non si modifica a mano. Gli alias di dominio (`Transaction`, `BudgetEntry`, `ClosedMonth`…) stanno in `src/domain.ts` e sono esportati da `src/index.ts`.

Rigenerare **dopo ogni migrazione** (insieme a `docs/schema.md`):
```bash
cd ../database && npx supabase start   # una volta, serve Docker
cd ../shared && npm run gen:types      # supabase gen types typescript --local
npm run build
```
Se una nuova tabella serve al codice, aggiungi il suo alias in `src/domain.ts`.

## Saldi per conto
`computeAccountBalances(openingBalances, transactions)` restituisce il saldo di ogni conto e il totale (saldo iniziale + entrate − spese ± trasferimenti), tutto in centesimi interi. Gli importi del DB (euro, `numeric(12,2)`) si convertono con `eurosToCents` ai bordi.

## Incassi previsti (driver ricavi)
`computeExpectedCollections(clients, workedDays)` calcola gli incassi previsti per cliente, anno e mese: giorni lavorati × tariffa valida nel mese di lavoro, spostati in avanti del ritardo d'incasso del cliente (anche nell'anno successivo). Centesimi interi; lavoro con giorni > 0 senza tariffa valida è un errore esplicito.

## Valore di un mese per voce
`computeMonthlyValues({ year, budgetItemIds, budgetEntries, transactions, closedMonths })` restituisce, per ogni voce e mese dell'anno, previsto, reale e valore mostrato (reale se il mese è chiuso, previsto altrimenti). Entrate positive, spese negative, trasferimenti esclusi; gli importi delle righe di budget sono già con segno.

## Saldo progressivo di cassa
`computeCashBalances(year, openingBalanceCents, values)` parte dai valori di `computeMonthlyValues` e restituisce, per i 12 mesi, flusso, saldo a fine mese (saldo iniziale totale dell'anno + flussi cumulati) e se il mese è chiuso (reale) o ancora a previsto. Un anno senza dati mantiene costante il saldo iniziale.

## Scostamenti e aggregati
`aggregateMonthlyValues(structure, values)` somma i valori di `computeMonthlyValues` per voce, macro-area, mese e anno e calcola lo scostamento (reale − previsto). Gli importi sono con segno (entrate positive, spese negative), quindi uno scostamento negativo è sempre sfavorevole. La struttura voce → macro-area arriva dai dati; le voci archiviate non vengono filtrate.

## Date di scadenza delle ricorrenze
`generateRecurrenceDueDates({ frequency, startDate, endDate, referenceDate, horizonMonths })` restituisce le date `YYYY-MM-DD` delle scadenze. Il giorno di `startDate` è l'àncora: se il mese è più corto si usa l'ultimo giorno (28/29 febbraio, 30 aprile) e si torna al giorno originale quando il mese lo permette. Con `endDate` nessuna data la supera; senza, si arriva a `referenceDate` + `horizonMonths` mesi. Niente importi né accesso al database.
