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
import { sommaCentesimi } from 'budget-planner-shared'
```

- Frontend: già collegato.
- Backend: da collegare quando si crea il pacchetto (BP-4).
- Ogni nuova funzione si esporta da `src/index.ts`.
