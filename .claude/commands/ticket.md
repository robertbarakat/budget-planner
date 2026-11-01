---
description: Lavora su un ticket Jira dall'inizio alla fine
argument-hint: <BP-NUMERO>
---

Lavora sul ticket Jira $ARGUMENTS.

1. Leggi il ticket su Jira (descrizione, criteri di accettazione, collegamenti). Se è bloccato da ticket non ancora in "Fatto", fermati e dimmelo.
2. Leggi CLAUDE.md, il CLAUDE.md della cartella interessata e le sezioni di docs/specifica.md citate.
3. Sposta il ticket in "In corso".
4. Se qualcosa non è chiaro o contraddice la specifica, chiedimelo prima di scrivere codice.
5. Crea il branch `$ARGUMENTS-descrizione-breve`.
6. Implementa solo ciò che il ticket chiede, nella cartella giusta.
7. Esegui lint, test e build. Verifica ogni criterio di accettazione uno per uno.
8. Fai commit con messaggio che inizia con `$ARGUMENTS:`.
9. Se tutti i criteri sono verificati, sposta il ticket in "Fatto" e aggiungi un commento con cosa hai fatto e come l'hai verificato. Se qualcosa non torna, lascialo "In corso" e scrivi il motivo nel commento.
10. A controlli passati fai merge del branch su main (squash) e push: main è il ramo da cui Vercel pubblica. Se il ticket prevede migrazioni o deploy, eseguili con i connettori (Supabase, Vercel) e verifica l'esito. Chiedimi conferma solo per operazioni distruttive su dati reali dopo l'import storico e per force push.
