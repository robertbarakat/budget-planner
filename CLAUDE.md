# Budget Planner

Gestionale personale per P.IVA forfettaria: budget annuo previsto + consuntivo reale in tempo reale. Web app PWA (mobile + desktop), un solo DB. UI in italiano, valuta EUR.

## Struttura
- frontend/  React + Vite + TypeScript, Oxlint, CSS puro con custom properties (niente SCSS)
- backend/   funzioni Node su Vercel
- database/  Supabase Postgres, migrazioni in database/supabase/migrations
- shared/    tipi e funzioni pure di calcolo (fiscale)
- docs/      specifica, mockup, convenzioni

## Leggi prima di lavorare
- docs/specifica.md: modello dati, viste, regole fiscali
- docs/mockups/: schermate di riferimento (colori, font, spazi)
- docs/jira.md: come scrivere i ticket
- il CLAUDE.md della cartella in cui lavori

## Modello in breve
- Conti (Bancoposta, Cash, Postepay) con saldo iniziale.
- Categorie -> voce di budget -> macro-area.
- Movimenti reali: spesa, entrata, trasferimento.
- Righe di budget per voce + anno + mese (origine: manuale, driver ricavi, ricorrenza, fiscale).
- Ricorrenze con importo modificabile a ogni scadenza.
- Mese "chiuso" = si mostra il reale; altrimenti il previsto. Budget libero su qualsiasi anno e mese.
- Viste: cronologica mese per mese con saldo progressivo; per categoria/macro-area (previsto vs reale); sul web anche matrice voci x mesi.

## Regole
- Rispondi in italiano, breve e diretto, senza spiegazioni superflue.
- Un ticket Jira (progetto BP, barakarob.atlassian.net) per ogni lavoro; cita la chiave nei commit e nei branch.
- Usa i connettori (Supabase, Vercel, GitHub, Jira) direttamente: applica migrazioni, fai push e deploy senza chiedere conferma.
- Chiedi conferma solo per: operazioni distruttive su dati reali dopo l'import storico (DROP, TRUNCATE, DELETE massivi, reset del database), force push, e qualsiasi scrittura sul foglio Google "Budget 2026" esistente (l'export scrive solo sul proprio file).
- Flusso git: un branch per ticket; a lint, test e build passati, merge su main (squash) e push. Vercel pubblica da main.
- Ignora i ticket con etichetta `rimandato`.
- Mai stampare o committare chiavi e segreti.
- Regole fiscali: segnala ogni dubbio. Vanno confermate dal commercialista.
- Non toccare cartelle fuori dal compito della sessione.
- Prima di dichiarare un lavoro finito: lint, test e build della cartella toccata.
