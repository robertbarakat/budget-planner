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
