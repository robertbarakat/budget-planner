# Shared

Tipi condivisi e funzioni pure di calcolo, usate da frontend e backend.

## Regole
- Solo funzioni pure: nessun I/O, nessun accesso a rete, DB o data corrente (la data si passa come argomento).
- Nessuna dipendenza da frontend/ o backend/.
- Ogni funzione ha test Vitest, inclusi casi limite (anno senza incassi, rateizzazione, arrotondamenti).
- Calcoli in centesimi interi per evitare errori di virgola mobile; formattazione solo ai bordi.
- Parametri fiscali per anno (coefficiente, aliquote, scadenze) passati come argomento, mai costanti nel codice.
- Tipi del DB generati da Supabase: non scriverli a mano.

## Modulo fiscale (forfettario)
- Base imponibile = incassi x coefficiente di redditività (67%).
- INPS Gestione Separata: 26,07% sulla base (24% con altra copertura). Fonte: circolare INPS n. 8 del 3 febbraio 2026.
- Imposta sostitutiva: 15% (5% start-up) su (base - contributi versati nell'anno, principio di cassa).
- Acconti, saldo e rateizzazioni (rate con interessi) producono il calendario F24, che alimenta la riga "Imposte" del budget.
- Percentuali, importi e date degli acconti sono parametri per anno, presi dall'F24 del commercialista: mai costanti nel codice.
- I contributi versati nell'anno sono deducibili anche se pagati a rate (indicazione dell'autore), parametro modificabile.
- Per ogni altra regola incerta, indica la fonte o scrivi che manca. Il commercialista resta la verifica finale.
