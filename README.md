# Budget Planner

Gestionale personale per P.IVA forfettaria: budget annuo previsto e consuntivo reale, con modulo fiscale. Web app PWA (mobile + desktop), un solo database.

- `frontend/` React + Vite + TypeScript, CSS puro
- `backend/` funzioni Node su Vercel
- `database/` Supabase (Postgres), migrazioni in `database/supabase/migrations`
- `shared/` tipi e calcoli comuni
- `docs/` specifica, mockup, convenzioni Jira

Per lavorare con Claude Code: leggi `CLAUDE.md` e `docs/specifica.md`. Comandi disponibili: `/epic` (backlog Jira di un epic) e `/ticket` (lavoro su un ticket).

Variabili d'ambiente: vedi `.env.example`.
