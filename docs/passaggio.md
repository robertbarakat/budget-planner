# Procedura del giorno del passaggio

L'import storico si fa **una sola volta**, su database senza movimenti, da un'unica esportazione dell'app Android ("Budget e finanze"). Dopo il passaggio la vecchia app non si usa più (specifica, sezione 8). Dettagli dei comandi: `backend/src/import/README.md`.

I comandi si lanciano da `backend/`. File Excel, mappatura, report e backup stanno in `docs/import-data/` (ignorata da git): **non si committano mai**.

## Prima del giorno
1. Migrazione `20261108160000_import_transactions.sql` (funzione `import_transactions`) applicata al progetto remoto `joknxejlzsaogyuggzsy`, con advisor controllati.
2. `.env` nella radice con `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` del progetto remoto (inseriti a mano, mai in chat o nel repo).
3. Mappatura compilata in `docs/import-data/category-mapping.json` (BP-118): ogni categoria dell'export ha una regola; per le voci nuove ci sono `targetMacroArea` e `targetKind`.
4. Conti (Bancoposta, Cash, Postepay e altri) già presenti nel database: lo script non li crea.
5. Prova generale fatta in locale (`cd database && npx supabase start`) con un file anonimo.

## Il giorno, in ordine
1. **Ferma gli inserimenti sulla vecchia app.** Da qui in poi niente nuovi movimenti, né lì né nella nuova app.
2. **Esporta l'Excel** dalla vecchia app (fogli `Spese`, `Entrate`, `Bonifici`) e salvalo come `docs/import-data/export.xlsx`.
3. **Backup del database remoto** (serve Docker acceso e `npx supabase login` + `link` già fatti, vedi `database/README.md`):
   ```bash
   cd ../database
   npx supabase db dump --linked -f ../docs/import-data/backup-prima-import.sql
   npx supabase db dump --linked --data-only -f ../docs/import-data/backup-dati-prima-import.sql
   cd ../backend
   ```
   Il primo file contiene lo schema, il secondo i dati (anagrafiche comprese). Controlla che nessuno dei due sia vuoto.
4. **Anteprima** (nessuna scrittura):
   ```bash
   npm run import:preview -- ../docs/import-data/export.xlsx ../docs/import-data/category-mapping.json
   ```
5. **Verifica il report** `docs/import-data/preview-report.md`: righe lette = accettate + scartate per ogni foglio; guarda ogni scarto (foglio, riga, motivo), i totali per voce e mese, la variazione per conto. Annota il numero di scarti **che accetti** (`N`). Se sono inattesi vedi "Se qualcosa va storto".
6. **Anagrafiche mancanti** (prima in prova, poi scrittura con conferma digitata `scrivi`):
   ```bash
   npm run import:setup -- ../docs/import-data/export.xlsx ../docs/import-data/category-mapping.json
   npm run import:setup -- ../docs/import-data/export.xlsx ../docs/import-data/category-mapping.json --write
   ```
   Un conto assente nel database è un errore bloccante: crealo dall'app e rilancia.
7. **Import dei movimenti.** Controlla che il database sia vuoto, mostra l'anteprima e chiede la conferma digitata `importa`. `N` è la soglia di scarti:
   ```bash
   npm run import:run -- ../docs/import-data/export.xlsx ../docs/import-data/category-mapping.json --max-rejected N --allow-remote
   ```
8. **Saldi iniziali.** Inserisci il saldo attuale di ogni conto (leggilo dalla vecchia app o dalla banca); il sistema calcola il saldo iniziale del 2026 e mostra lo scarto dai 42.929,33 EUR del foglio "Budget 2026". Conferma digitando `salva`:
   ```bash
   npm run import:opening-balances -- --year 2026 --allow-remote
   ```
   Lo scarto non è un errore automatico: se non è zero capisci da dove viene prima di andare avanti (movimenti mancanti o scartati, saldo digitato sbagliato, foglio non aggiornato).
9. **Riconciliazione.** Crea `docs/import-data/saldi.json` con i saldi attuali, ad esempio `{ "Bancoposta": 1234.56, "Cash": 50, "Postepay": 0 }`, poi:
   ```bash
   npm run import:reconcile -- ../docs/import-data/export.xlsx ../docs/import-data/category-mapping.json --balances ../docs/import-data/saldi.json --year 2026
   ```
   Atteso: "Differenze nei totali: 0" e "Differenze nei saldi per conto: 0". Altrimenti leggi `docs/import-data/reconcile-report.md`: ogni differenza deve essere spiegata dagli scarti dell'anteprima.
10. **Controllo delle viste** nell'app: cronologica (saldo progressivo del mese corrente = cassa attesa), per categoria e macro-area, matrice web, home mobile. Confronta qualche mese e qualche voce con la vecchia app.
11. **Disattiva la vecchia app.** Tieni per qualche settimana l'Excel e il backup (fuori da git) e non cancellare l'app finché non hai chiuso il primo mese.

## Se qualcosa va storto
- **Anteprima con scarti inattesi** (categorie senza regola, valute diverse, trasferimenti non riconosciuti, importi a zero): non importare. Correggi la mappatura (`category-mapping.json`) o i dati nella vecchia app, riesporta se serve e rifai dal punto 4. Il report indica foglio e riga di ogni scarto.
- **Scarti oltre la soglia `N`:** il comando si ferma prima di scrivere. Rivedi il report; alza `N` solo se gli scarti sono tutti spiegati.
- **Import fallito a metà:** la scrittura è una sola transazione, quindi `transactions` resta vuota. Leggi il messaggio (di solito un conto o una categoria inesistenti), correggi e rilancia dal punto 6 o 7. Non servono ripristini.
- **Import riuscito ma sbagliato** (riconciliazione con differenze non spiegate): il comando di import non si può rilanciare perché il database non è più vuoto. Ripristina lo stato di prima in uno di questi modi, **dopo averlo confermato**:
  - ripristina il backup del punto 3 (i dati stanno in `backup-dati-prima-import.sql`; ripristinarlo su un database con dati già presenti richiede di svuotarlo prima: è un'operazione distruttiva, falla solo con la tua conferma esplicita);
  - oppure, se il database conteneva solo anagrafiche, cancella i movimenti importati e i saldi iniziali con questo SQL (cancellazione di massa: chiedi conferma prima di eseguirla):
    ```sql
    begin;
    delete from public.opening_balances where year = 2026;
    delete from public.transactions;
    commit;
    ```
  poi correggi la causa e riparti dal punto 4 (le anagrafiche create al punto 6 si possono tenere: `import:setup` è idempotente).
- **Saldi iniziali già salvati:** `import:opening-balances` rifiuta di scrivere se esistono saldi per l'anno; cancellali con il SQL sopra (con conferma) e rilancia.
- **Conto sbagliato nei saldi digitati:** il comando non salva nulla se manca un conto attivo o se il nome non esiste.

## Promemoria
- Excel, mappatura, report (`preview-report.md`, `reconcile-report.md`), `saldi.json` e i due backup contengono dati personali: restano in `docs/import-data/`, ignorata da git. Prima di ogni commit controlla `git status`.
- Nessuna chiave in chat, nei ticket o nei file versionati.
- Il terminale mostra solo conteggi (e i saldi che digiti); commenti e nomi stanno nei report.
