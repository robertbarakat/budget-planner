# Import storico: lettura dell'Excel

`excel-parser.ts` legge l'export di "Budget e finanze" (`ru.innim.my_finance`) e restituisce le righe grezze dei fogli `Spese`, `Entrate`, `Bonifici`. Niente normalizzazione, mappatura o scrittura nel database.

```bash
npm run import:read -- /percorso/del/file.xlsx   # stampa il numero di righe per foglio
```

Il percorso arriva sempre dall'argomento. Il file contiene dati personali: non va copiato nel repo (`*.xlsx` e `docs/import-data/` sono ignorati da git).

## Controlli
- Mancano fogli o colonne: errore `ImportFileError` con messaggio in italiano che li elenca.
- Intestazioni confrontate senza distinguere maiuscole e spazi extra. Righe completamente vuote saltate.
- Ogni riga porta `sheet` e `rowNumber` (1 = intestazioni) per il report degli scarti.

## Come `Bonifici` indica i due conti
Il formato reale non è documentato e la specifica non lo dice: il parser **non fa ipotesi**, restituisce tutte le colonne così come sono (il foglio ha una sola colonna `Conto`). Il riconoscimento è nella normalizzazione (`shared/`, BP-120), che prova due forme:
1. **due righe** con stessa data e ora e stesso importo in valore assoluto, segno opposto, conti diversi: la riga negativa è l'origine, la positiva la destinazione;
2. **una riga** con `Conto` come origine e destinazione nel commento/tag, solo se coincide con un conto esistente.

Le righe di `Bonifici` che non rientrano in nessuna forma non vengono indovinate: finiscono negli scarti dell'anteprima (BP-123) con il motivo. Da verificare sul file reale il giorno del passaggio.

## File di mappatura (`docs/import-data/category-mapping.json`, ignorato da git)
```json
{ "rules": [
  { "sourceCategory": "…", "commentContains": "…", "priority": 1, "targetBudgetItem": "…", "targetCategory": "…" }
] }
```
- `sourceCategory`: categoria dell'export. `commentContains`: facoltativo, testo che deve essere contenuto nel commento.
- Confronti senza distinguere maiuscole e con gli spazi ridotti a uno (`  Rata   PRIMO ` contiene `primo`).
- `priority`: vince il numero **più basso**; a parità, la prima regola del file. Metti le regole con commento prima (numero basso) e quella generica dopo.
- Le stesse regole servono per le entrate: "Stipendio" con il cliente nel commento va alla voce di quel cliente.
- Nessuna regola applicabile: lo scarto riporta categoria e commento (`shared/src/import-mapping.ts`, BP-121). I trasferimenti non hanno categoria e non passano dalle regole.

## Anteprima (BP-123)
```bash
npm run import:preview -- /percorso/file.xlsx ../docs/import-data/category-mapping.json [report.md]
```
Esegue parser, normalizzazione e mappatura **senza accedere al database** e scrive il report (default `docs/import-data/preview-report.md`, ignorato da git): righe per foglio (lette = accettate + scartate), scarti con foglio, riga e motivo, totali per voce e mese, variazione per conto. Il terminale mostra solo i conteggi, mai commenti o categorie. I nomi dei conti per riconoscere i trasferimenti a riga singola sono quelli visti nei fogli `Spese` ed `Entrate`.

## Anagrafiche mancanti (BP-122)
```bash
npm run import:setup -- /percorso/file.xlsx ../docs/import-data/category-mapping.json          # prova: non scrive
npm run import:setup -- /percorso/file.xlsx ../docs/import-data/category-mapping.json --write  # scrive dopo conferma
```
Confronta le destinazioni della mappatura e i conti dell'export con il database (variabili `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, da `.env` nella radice; nessuna variabile nuova) e crea solo categorie, voci e macro-aree mancanti. Senza `--write` elenca cosa creerebbe; con `--write` chiede di digitare `scrivi`, mostrando il progetto di destinazione. Rieseguirlo non crea doppioni.
- Per creare una **voce nuova** la regola deve avere anche `targetMacroArea` e `targetKind` (`income` o `expense`); senza, errore. Le macro-aree nuove nascono con `is_professional = false`: marcala dall'app.
- **Errori bloccanti** (non si scrive nulla): conto dell'export assente nel database (i conti non si creano), elemento esistente ma archiviato, categoria già presente sotto un'altra voce o mappata su due voci.
- Fuori ambito: clienti e movimenti.

## Import completo (BP-125)
```bash
npm run import:run -- /percorso/file.xlsx ../docs/import-data/category-mapping.json --max-rejected 0
```
Ordine: database vuoto? (se no, si ferma) → anteprima → scarti entro `--max-rejected`? (se no, si ferma; la soglia è obbligatoria) → conferma **digitata** (`importa`; qualunque altra risposta o input chiuso = nessuna scrittura) → funzione SQL `import_transactions` (una transazione). A fine scrittura controlla che i movimenti inseriti siano quelli dell'anteprima. Niente deduplica: dopo un import riuscito rilanciarlo si ferma (database non vuoto).
- **Solo database locale** per default (`SUPABASE_URL` su 127.0.0.1/localhost). Per un progetto remoto serve `--allow-remote`: da usare solo il giorno del passaggio, dopo `import:preview` e `import:setup`.
- Prova locale: `cd database && npx supabase start`, poi esporta `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` da `npx supabase status -o env`.

## Riconciliazione (BP-126)
```bash
npm run import:reconcile -- /percorso/file.xlsx ../docs/import-data/category-mapping.json [--balances saldi.json --year 2026] [--out report.md]
```
Solo lettura. Confronta, per anno, conto e tipo (spese, entrate, trasferimenti in uscita/entrata), i totali del database con quelli dei movimenti accettati dall'anteprima. Report in `docs/import-data/reconcile-report.md` con le **sole differenze** e, per spiegarle, righe e importi scartati per foglio. A terminale solo conteggi. Esce con codice 2 se ci sono differenze.
- `--balances`: file JSON `{ "Nome conto": saldo attuale in euro }`; con `--year` confronta i saldi calcolati con `computeAccountBalances` (saldo iniziale dell'anno + movimenti dal 1 gennaio) con quelli digitati. Va usato dopo aver salvato i saldi iniziali (BP-151).

## Saldi iniziali (BP-151)
```bash
npm run import:opening-balances -- --year 2026 [--balances saldi.json] [--expected-total 42929,33] [--allow-remote]
```
Da lanciare **dopo** l'import dei movimenti. Chiede il saldo attuale di ogni conto attivo (o lo legge da `saldi.json`, `{ "Nome conto": euro }`) e calcola `saldo iniziale = saldo attuale - movimenti dal 1 gennaio dell'anno` (`computeOpeningBalancesFromCurrent` in `shared/`; trasferimenti compresi, movimenti precedenti all'anno ignorati). Mostra, per conto, saldo attuale, movimenti e saldo iniziale, poi il totale con lo scarto dal totale atteso (default 42.929,33 EUR del foglio "Budget 2026"). Solo dopo la conferma digitata (`salva`) scrive in `opening_balances` con origine `manual`. Se per l'anno esistono già saldi iniziali non scrive. Un saldo iniziale può risultare negativo. Solo database locale senza `--allow-remote`.
