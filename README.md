# Budget Planner

Gestionale personale per P.IVA forfettaria: budget annuo previsto e consuntivo reale, con modulo fiscale. Web app PWA (mobile + desktop), un solo database. UI in italiano, valuta EUR.

| Cartella | Contenuto | README |
|---|---|---|
| `frontend/` | React + Vite + TypeScript, CSS puro | |
| `backend/` | funzioni Node su Vercel | [backend/README.md](backend/README.md) |
| `database/` | Supabase (Postgres), migrazioni in `database/supabase/migrations` | [database/README.md](database/README.md) |
| `shared/` | tipi e calcoli comuni, testati con Vitest | [shared/README.md](shared/README.md) |
| `docs/` | specifica, mockup, convenzioni | [docs/README.md](docs/README.md) |

## Requisiti
- Node.js 22 o superiore (con npm)
- Git
- Docker Desktop, solo per Supabase in locale

## Setup da repo pulito
```bash
git clone git@github.com:robertbarakat/budget-planner.git
cd budget-planner
```

### 1. Variabili d'ambiente
Il frontend legge `frontend/.env.local` (file ignorato da git):
```bash
cp .env.example frontend/.env.local
```
Compila solo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (valori pubblici: Supabase dashboard → progetto `budget-planner` → Project Settings → API). Le altre variabili servono al backend: vedi [docs/ambienti.md](docs/ambienti.md) per chi usa cosa. I segreti non vanno mai nel repo né in chat.

Senza queste due variabili la pagina mostra "Configurazione mancante: ...".

### 2. Frontend
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

### 3. Backend (opzionale)
```bash
cd backend
npm install
```
Per ora c'è solo `GET /api/health` (`backend/api/health.ts`), coperta da test. Per provarla in locale come funzione Vercel, dalla radice: `npx vercel dev` (richiede `vercel login`).

### 4. Supabase locale (opzionale, serve Docker acceso)
```bash
cd database
npx supabase start    # stampa URL e chiavi del database locale
npx supabase stop
```
Dettagli, collegamento al progetto remoto e migrazioni: [database/README.md](database/README.md). Lancia sempre i comandi `supabase` da `database/`.

## Lint, test e build
Ogni cartella ha i suoi script; la CI (`.github/workflows/ci.yml`) li esegue per `shared`, `backend` e `frontend` a ogni PR e push su `main`.

| Cartella | Lint | Test | Build |
|---|---|---|---|
| `shared/` | `npm run lint` | `npm test` | `npm run build` (controllo dei tipi) |
| `backend/` | `npm run lint` | `npm test` | `npm run build` (controllo dei tipi) |
| `frontend/` | `npm run lint` | non ancora presente | `npm run build` |

Il lint usa Oxlint con `--deny-warnings`: anche un warning fa fallire.

## Convenzioni
- Un ticket Jira (progetto BP, barakarob.atlassian.net) per ogni lavoro. Come si scrivono: [docs/jira.md](docs/jira.md).
- **Branch**: `BP-12-descrizione-breve`, uno per ticket.
- **Commit**: iniziano con la chiave, es. `BP-12: aggiunge tabella transactions`.
- Un ticket si chiude solo con lint, test e build passati e i criteri di accettazione verificati.
- Flusso: branch per ticket → merge su `main` (squash) → push. Vercel pubblica da `main` (produzione), ogni altro branch ha una preview.
- Regole fiscali: vanno confermate dal commercialista.
- Nessun segreto nel repo: file `.env` ignorati, solo `.env.example` è versionato.

## Per lavorare con Claude Code
Leggi `CLAUDE.md` e `docs/specifica.md`. Comandi disponibili: `/epic` (backlog Jira di un epic), `/ticket` (un ticket dall'inizio alla fine) e `/lavora` (più ticket in sequenza, per etichetta o epic).
