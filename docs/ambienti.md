# Ambienti e variabili d'ambiente

## Ambienti
| Ambiente | Dove gira | Database | Come si pubblica |
|---|---|---|---|
| Sviluppo | PC locale (`vite`, Supabase locale con Docker) | Supabase locale (`supabase start`) oppure il progetto remoto | a mano |
| Preview | Vercel, un deploy per ogni branch/PR | progetto Supabase remoto `budget-planner` | push di un branch |
| Produzione | Vercel, da `main` | progetto Supabase remoto `budget-planner` | merge su `main` (previa conferma, vedi BP-8) |

C'è un solo progetto Supabase remoto (`joknxejlzsaogyuggzsy`): preview e produzione usano lo stesso database.

## Variabili
| Variabile | Usata da | Segreta | Sviluppo | Preview | Produzione |
|---|---|---|---|---|---|
| `VITE_SUPABASE_URL` | frontend | no (pubblica) | `frontend/.env.local` | Vercel | Vercel |
| `VITE_SUPABASE_ANON_KEY` | frontend | no (chiave pubblicabile) | `frontend/.env.local` | Vercel | Vercel |
| `SUPABASE_URL` | backend | no | `.env` (radice) | Vercel | Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | **sì** | `.env` (radice) | da impostare quando serve | da impostare quando serve |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | backend (export) | **sì** | `.env` | epic 10 | epic 10 |
| `GOOGLE_SHEET_ID` | backend (export) | no | `.env` | epic 10 | epic 10 |
| `CRON_SECRET` | backend (cron) | **sì** | `.env` | epic 10 | epic 10 |

Note:
- Le variabili `VITE_*` finiscono nel bundle del browser: mai metterci segreti. La service role key non va mai nel frontend.
- Le variabili segrete si inseriscono a mano (dashboard Vercel → Settings → Environment Variables, tipo *Sensitive*). Non passano da chat, ticket o repo.
- `.env.example` elenca i nomi; i file `.env` e `.env.local` reali sono ignorati da git.
- In locale, con `supabase start`, URL e chiavi del database locale sono quelli stampati dal comando.
- Il backend legge e valida le variabili in `backend/src/config.ts`, il frontend in `frontend/src/api/env.ts`: se ne manca una, l'errore elenca solo i nomi.
