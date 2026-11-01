---
description: Lavora su un ticket Jira dall'inizio alla fine
argument-hint: <CHIAVE-NUMERO>
---

Lavora sul ticket Jira $ARGUMENTS.

1. Leggi il ticket su Jira (descrizione, criteri di accettazione, collegamenti). Leggi CLAUDE.md, il CLAUDE.md della cartella interessata e le sezioni di docs/specifica.md citate.
2. Se qualcosa non è chiaro o contraddice la specifica, chiedimelo prima di scrivere codice.
3. Crea il branch `$ARGUMENTS-descrizione-breve`.
4. Implementa solo ciò che il ticket chiede, nella cartella giusta.
5. Esegui lint, test e build. Verifica ogni criterio di accettazione uno per uno e dimmi l'esito.
6. Fai commit con messaggio che inizia con `$ARGUMENTS:`.
7. Non spostare il ticket in "Fatto", non fare push e non applicare migrazioni al progetto Supabase senza il mio ok.
