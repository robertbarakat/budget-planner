# Backend

Funzioni Node/TypeScript su Vercel.

## Regole
- Ogni funzione valida l'input e verifica l'utente autenticato (Supabase) prima di toccare i dati.
- Segreti solo come variabili d'ambiente (Vercel). Mai nel repo, mai nei log.
- La logica di calcolo sta in shared/: qui solo orchestrazione. Non duplicarla.
- Accesso al DB con il client Supabase; nessuna query che aggira le regole di accesso per riga, salvo funzioni amministrative esplicite e commentate.
- Errori espliciti con codice HTTP corretto; messaggi per l'utente in italiano, log in inglese.
- Cron di Vercel (vercel.json) per l'export settimanale su Google Sheets. L'export scrive solo sul file creato per questo scopo, mai sul foglio "Budget 2026" esistente.

## Funzioni previste
- Calcolo fiscale e calendario F24.
- Generazione delle righe di ricorrenza.
- Import una tantum da Excel (fogli Spese, Entrate, Bonifici) su DB vuoto, con tabella di mappatura categorie -> voci. Prima fai un'anteprima e un report degli scarti, poi scrivi.
- Export su Google Sheets (fase finale, unidirezionale DB -> Sheet).

## Prima di chiudere
Lint, test e build; elenca le variabili d'ambiente nuove.
