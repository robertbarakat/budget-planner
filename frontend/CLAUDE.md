# Frontend

React + Vite + TypeScript, lint con Oxlint. L'autore scrive il front-end: qui Claude revisiona, suggerisce, o fa solo ciò che il ticket chiede.

## Stile
- CSS puro con custom properties. Vietati SCSS, Tailwind, CSS-in-JS.
- Token in src/styles/tokens.css, reset minimo in src/styles/base.css. Documentazione in docs/design-tokens.md.
- Nei componenti niente valori hardcoded di colori, spazi, raggi, font: usa solo i token.
- Un file .css accanto a ogni componente. Mobile first; i breakpoint vengono dai token.
- Fonte dei token: docs/mockups/ (IBM Plex Sans per testo, IBM Plex Mono per le cifre).

## Codice
- TypeScript stretto, niente any. Tipi dal pacchetto shared/ (non ridefinirli).
- Nessun calcolo fiscale o di budget nei componenti: importa le funzioni da shared/.
- Accesso ai dati solo tramite un livello dedicato (src/api/), non sparso nei componenti.
- Mesi e testi in italiano. Importi formattati con Intl it-IT, in EUR, font mono.

## Accessibilità e UX
- Target tappabili di almeno 44px, etichette su ogni input, contrasto sufficiente.
- Non affidare il significato solo al colore (spese in rosso: aggiungi anche segno).
- Il pulsante "nuovo movimento" deve essere raggiungibile con una mano sola.

## Prima di chiudere
npm run lint, npm run build, e verifica a 390px e a 1440px.
