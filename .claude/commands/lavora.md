---
description: Lavora in sequenza su tutti i ticket di un epic o di un'area (database, backend, frontend)
argument-hint: <database|backend|frontend> [epic N] oppure epic N
---

Lavora in sequenza su tutti i ticket Jira del progetto BP che corrispondono a: $ARGUMENTS

Come interpretare gli argomenti:
- Una parola tra `database`, `backend`, `frontend`: tutti i ticket con quell'etichetta, di tutti gli epic.
- `epic N` (o il nome dell'epic): tutti i ticket di quell'epic, di qualunque etichetta.
- Le due cose insieme: l'intersezione (es. `backend epic 8`).

Procedura:
1. Leggi CLAUDE.md, il CLAUDE.md delle cartelle interessate, docs/specifica.md e docs/jira.md.
2. Cerca su Jira i ticket che corrispondono, NON sono già in "Fatto" e NON hanno l'etichetta `rimandato`. Ordinali rispettando i collegamenti "bloccato da" (prima i ticket da cui dipendono gli altri), poi per priorità.
3. Mostrami in poche righe l'ordine che seguirai, poi parti senza aspettare risposta.
4. Per ogni ticket, uno dopo l'altro:
   - sposta il ticket in "In corso";
   - crea il branch `BP-NUMERO-descrizione-breve` (o continua sul branch dell'epic, se più ticket sono collegati);
   - implementa solo ciò che il ticket chiede, nella cartella giusta;
   - esegui lint, test e build e verifica ogni criterio di accettazione;
   - fai commit con messaggio che inizia con la chiave del ticket;
   - a lint, test e build passati, fai merge del branch su main (squash) e push: main è il ramo da cui Vercel pubblica;
   - se tutti i criteri sono verificati, sposta il ticket in "Fatto" e aggiungi un commento con cosa hai fatto e come l'hai verificato; altrimenti lascialo "In corso" e scrivi il motivo.
5. Non fermarti tra un ticket e l'altro. Fermati solo se: un ticket è bloccato da uno non completato, la specifica è ambigua o contraddittoria, un test fallisce e non riesci a sistemarlo, oppure serve qualcosa che non puoi fare tu (chiavi o credenziali da inserire a mano).
6. Usa i connettori direttamente: fai push dei branch, applica le migrazioni su Supabase, fai i deploy su Vercel e verifica l'esito. Chiedi conferma solo per operazioni distruttive su dati reali dopo l'import storico (DROP, TRUNCATE, DELETE massivi), per force push e per scritture sul foglio "Budget 2026" esistente.
7. Alla fine dammi un riepilogo breve: ticket completati, ticket rimasti aperti con il motivo, e le azioni che restano a me.

Se la sessione si interrompe, i ticket già in "Fatto" non vengono rifatti: rilanciando lo stesso comando si riparte dal primo non completato.
