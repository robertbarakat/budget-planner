# Database

Supabase Postgres. Migrazioni SQL in database/supabase/migrations. Directory di lavoro Supabase: database/.

## Regole
- Una migrazione per cambiamento, nome con data e descrizione. Mai modificare una migrazione già applicata: ne crei una nuova.
- Dopo aver scritto una migrazione, applicala al progetto Supabase con il connettore e controlla gli advisor di sicurezza e performance. Finché il database è vuoto (prima dell'import storico) non serve conferma.
- Dopo l'import storico, DROP, TRUNCATE e DELETE massivi richiedono il mio ok.
- Descrivi lo schema aggiornato in docs/schema.md a ogni modifica.
- Row level security attiva su ogni tabella, utente unico: ogni riga accessibile solo al proprietario.
- Nomi in snake_case, sempre in inglese: tabelle, colonne, enum e valori, vincoli, indici, policy. Coerenti con i tipi di shared/. Le etichette in italiano stanno nei dati e nel frontend, non nei nomi. Se un ticket usa nomi italiani, traducili (glossario in docs/specifica.md).
- Importi in numeric(12,2), date in date, mai float. Vincoli (not null, check, foreign key) e indici dove servono.
- Dati iniziali (conti, categorie, voci, macro-aree) in database/supabase/seed.sql, ripetibile.
- Viste utili: saldo progressivo, previsto vs reale per voce e mese.
- Dopo ogni cambio di schema rigenera i tipi TypeScript e aggiornali in shared/.

## Da tenere presente
- Una voce di budget raccoglie più categorie dell'app vecchia (mappatura N:1). Alcuni casi dipendono anche dal commento (es. Prestiti, Casa): serve una tabella di mappatura.
- Il saldo iniziale dell'anno riporta quello dell'anno precedente, oppure è manuale.
