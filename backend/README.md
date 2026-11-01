# Backend

Funzioni Node/TypeScript su Vercel. Le regole sono in `CLAUDE.md`.

## Comandi
```bash
npm install
npm run lint
npm test
npm run build   # controllo dei tipi (tsc --noEmit)
```

## Endpoint
- `GET /api/health` → `200 {"status":"ok"}`

## Variabili d'ambiente
Lette da `src/config.ts` (errore chiaro se mancano, senza stampare valori):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
