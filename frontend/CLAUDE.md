# Frontend

React + Vite + TypeScript, lint con Oxlint. Claude implementa i ticket frontend per intero (decisione dell'autore, 2026-11-08). Il livello dati (`src/api/`) lo scrive Claude dal ticket BP-38 (BP-158..164).

## Librerie
- Dati dal server: React Query (cache, stati di caricamento ed errore). Stato locale (grafica, preferenze salvate in locale): Jotai.
- Componenti interattivi accessibili (modali, menu, select, toast): Radix UI (pacchetto `radix-ui`), senza stile proprio; lo stile è in CSS con i token.
- Niente Axios: i dati passano da `@supabase/supabase-js`.

## Stile
- CSS puro con custom properties. Vietati SCSS, Tailwind, CSS-in-JS.
- Token in src/styles/tokens.css, reset minimo in src/styles/base.css. Documentazione in docs/design-tokens.md.
- Nei componenti niente valori hardcoded di colori, spazi, raggi, font: usa solo i token.
- Un file .css accanto a ogni componente. Mobile first; i breakpoint vengono dai token.
- Fonte dei token: docs/mockups/ (IBM Plex Sans per testo, IBM Plex Mono per le cifre).

## Codice
- TypeScript stretto, niente any. Tipi dal pacchetto shared/ (non ridefinirli).
- Nessun calcolo fiscale o di budget nei componenti: importa le funzioni da shared/.
- Accesso ai dati solo tramite un livello dedicato (src/api/), non sparso nei componenti. Nessuna chiamata `supabase.from(` fuori da `src/api/`.
- Livello dati: una classe per area logica (`ClassificationService`, `AccountsService`, `TransactionsService`, `BudgetService`, `RecurrencesService`, `RevenueService`, `TaxService`), tutte figlie di `BaseService` (CRUD generico). Gli errori diventano `AppError` con messaggio in italiano. Ogni area ha un file `*.queries.ts` con gli hook React Query; i componenti usano solo gli hook. Nuove tabelle o funzioni SQL: aggiungi il metodo al servizio dell'area, mai chiamate sparse.
- Le chiavi di cache stanno in `queryKeys`; una mutazione invalida le query delle aree che toccano gli stessi dati.
- Mesi e testi in italiano. Importi formattati con Intl it-IT, in EUR, font mono.

## Accessibilità e UX
- Target tappabili di almeno 44px, etichette su ogni input, contrasto sufficiente.
- Non affidare il significato solo al colore (spese in rosso: aggiungi anche segno).
- Il pulsante "nuovo movimento" deve essere raggiungibile con una mano sola.

## Prima di chiudere
npm run lint, npm run build, e verifica a 390px e a 1440px.
