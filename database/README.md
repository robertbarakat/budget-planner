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

## Test SQL (pgTAP)
Test dei vincoli e della RLS in `supabase/tests/` (`01_vincoli.test.sql`, `02_rls.test.sql`). Ogni file gira in una transazione annullata: non lascia dati.
```bash
npx supabase start   # serve Docker
npx supabase test db # esegue tutti i test in supabase/tests/
```
Ogni tabella ha almeno un test (esistenza, RLS, vincoli, `ON DELETE RESTRICT`). Quando aggiungi una tabella o un vincolo, aggiungi il test.
