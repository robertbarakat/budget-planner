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
