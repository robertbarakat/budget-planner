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
