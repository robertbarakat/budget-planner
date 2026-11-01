# Database

Supabase Postgres. Directory di lavoro della CLI: `database/`. Le regole sono in `CLAUDE.md`.
Migrazioni in `supabase/migrations`, dati iniziali in `supabase/seed.sql`.

## Locale
Serve Docker in esecuzione.
```bash
npx supabase start    # avvia lo stack locale (Studio: http://127.0.0.1:54323)
npx supabase stop
npx supabase db reset # riapplica migrazioni e seed in locale
```

## Collegare la CLI al progetto remoto
Progetto: `budget-planner`, ref `joknxejlzsaogyuggzsy`, regione eu-west-1.
```bash
npx supabase login
npx supabase link --project-ref joknxejlzsaogyuggzsy
```
Nessuna migrazione va applicata al progetto remoto senza conferma (vedi `CLAUDE.md` per le regole dopo l'import storico).

## Nuova migrazione
```bash
npx supabase migration new descrizione_breve
```
Il file prende un nome con data; non modificare mai una migrazione già applicata.
