# Autenticazione (utente unico)

L'app ha un solo utente, con login email/password gestito da Supabase Auth. Nessuna registrazione pubblica.

## Impostazioni
- Locale: `database/supabase/config.toml` ha `enable_signup = false` in `[auth]`, che blocca la registrazione per tutti i provider (le opzioni `enable_signup` di `[auth.email]` e `[auth.sms]` sono deprecate e rimosse) e password minima di 12 caratteri.
- Remoto (dashboard Supabase, progetto `budget-planner`):
  - Authentication → Sign In / Providers → disattivare **Allow new users to sign up**.
  - Provider **Email** attivo; disattivare gli altri provider e il sign-in anonimo.

## Creare l'utente (una tantum)
Dashboard → Authentication → Users → **Add user** → **Create new user**: email, password, con **Auto Confirm User** attivo.
La password la sceglie e la conserva il proprietario (gestore di password). Non va scritta nel repo, nei ticket o in chat.

## Verifica
- Login con l'utente: `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` con la chiave pubblica restituisce una sessione.
- Registrazione: `POST {SUPABASE_URL}/auth/v1/signup` restituisce errore (`signup_disabled`).

## Row level security
Le policy RLS (ogni riga accessibile solo al proprietario) arrivano con lo schema, nell'epic 2. Finché non ci sono tabelle non c'è nulla da proteggere.
