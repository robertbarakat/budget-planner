# Design token

I token stanno in `frontend/src/styles/tokens.css` (fonte: `docs/mockups/`). Il reset e gli stili globali sono in `frontend/src/styles/base.css`.

## Regola
Nei componenti e nei `.css` accanto ad essi **niente valori hardcoded** di colori, spazi, raggi, font, ombre: si usano solo i token con `var(--nome)`. Il significato non va mai affidato solo al colore (spese: colore negativo **e** segno meno).

## Token
| Token | Valore | Uso |
|---|---|---|
| `--color-primary` | `#0b6e6a` | Azioni primarie, link, voce attiva |
| `--color-primary-soft` | `#e3f1f0` | Sfondo evidenziato (voce attiva, badge) |
| `--color-primary-strong` | `#0b4f4c` | Testo su sfondo primario chiaro, anello di focus |
| `--color-on-primary` | `#ffffff` | Testo su sfondo primario |
| `--color-background` | `#f3f5f7` | Sfondo della pagina |
| `--color-surface` | `#ffffff` | Card, pannelli, campi |
| `--color-surface-muted` | `#f6f8fa` | Righe alternate, intestazioni di tabella |
| `--color-surface-sunken` | `#edf0f3` | Aree incassate, segnaposto |
| `--color-border` | `#dde3e8` | Bordi di card e campi |
| `--color-border-subtle` | `#e4e9ed` | Separatori leggeri |
| `--color-border-strong` | `#c5cfd7` | Solo decorativo (contrasto < 4,5:1), mai per testo |
| `--color-text` | `#14212b` | Testo principale |
| `--color-text-muted` | `#55646f` | Testo secondario, etichette |
| `--color-negative` | `#b23a0a` | Spese e scostamenti negativi (sempre con il segno) |
| `--color-negative-soft` | `#e7b9a6` | Sfondo/tratto decorativo negativo |
| `--color-positive` | `#0b6e6a` | Entrate e scostamenti positivi (sempre con il segno) |
| `--color-warning` | `#8a5a00` | Avvisi |
| `--color-info` | `#1b4fd1` | Serie informative (grafici, macro-aree) |
| `--color-info-soft` | `#a9bdf0` | Tratto decorativo informativo |
| `--font-sans` | `'IBM Plex Sans', system-ui, sans-serif` | Testo |
| `--font-mono` | `'IBM Plex Mono', ui-monospace, monospace` | Cifre e importi |
| `--font-size-2xs` | `0.625rem` | Dimensione del testo |
| `--font-size-xs` | `0.6875rem` | Dimensione del testo |
| `--font-size-sm` | `0.75rem` | Dimensione del testo |
| `--font-size-md` | `0.8125rem` | Dimensione del testo |
| `--font-size-base` | `0.875rem` | Dimensione del testo |
| `--font-size-lg` | `1rem` | Dimensione del testo |
| `--font-size-xl` | `1.0625rem` | Dimensione del testo |
| `--font-size-2xl` | `1.5rem` | Dimensione del testo |
| `--font-size-3xl` | `1.75rem` | Dimensione del testo |
| `--font-weight-regular` | `400` | Testo normale |
| `--font-weight-medium` | `500` | Enfasi leggera |
| `--font-weight-semibold` | `600` | Titoli, valori in evidenza |
| `--line-height-tight` | `1.2` | Titoli |
| `--line-height-base` | `1.5` | Testo corrente |
| `--letter-spacing-tight` | `-0.019rem` | Titoli grandi e importi |
| `--space-0` | `0` | Spaziature (padding, gap, margini) |
| `--space-1` | `0.125rem` | Spaziature (padding, gap, margini) |
| `--space-2` | `0.25rem` | Spaziature (padding, gap, margini) |
| `--space-3` | `0.375rem` | Spaziature (padding, gap, margini) |
| `--space-4` | `0.5rem` | Spaziature (padding, gap, margini) |
| `--space-5` | `0.625rem` | Spaziature (padding, gap, margini) |
| `--space-6` | `0.75rem` | Spaziature (padding, gap, margini) |
| `--space-7` | `0.875rem` | Spaziature (padding, gap, margini) |
| `--space-8` | `1rem` | Spaziature (padding, gap, margini) |
| `--space-9` | `1.25rem` | Spaziature (padding, gap, margini) |
| `--space-10` | `1.5rem` | Spaziature (padding, gap, margini) |
| `--space-11` | `2rem` | Spaziature (padding, gap, margini) |
| `--space-12` | `2.5rem` | Spaziature (padding, gap, margini) |
| `--radius-xs` | `0.1875rem` | Raggio degli angoli |
| `--radius-sm` | `0.5rem` | Raggio degli angoli |
| `--radius-md` | `0.625rem` | Raggio degli angoli |
| `--radius-lg` | `0.75rem` | Raggio degli angoli |
| `--radius-xl` | `0.875rem` | Raggio degli angoli |
| `--radius-2xl` | `1rem` | Raggio degli angoli |
| `--radius-full` | `9999px` | Pillole, avatar |
| `--shadow-sm` | `0 1px 2px rgb(20 33 43 / 12%)` | Elementi sollevati lievemente |
| `--shadow-md` | `0 4px 12px rgb(20 33 43 / 12%)` | Menu, popover |
| `--shadow-lg` | `0 8px 24px rgb(20 33 43 / 16%)` | Modali |
| `--breakpoint-tablet` | `768px` | Layout intermedio (solo `min-width`) |
| `--breakpoint-desktop` | `1024px` | Barra laterale e matrice (solo `min-width`) |
| `--target-min` | `2.75rem` | Altezza/larghezza minima di ogni elemento tappabile |
| `--nav-height` | `4.5rem` | Altezza della barra di navigazione inferiore (mobile) |
| `--nav-item-size` | `3.5rem` | Altezza/larghezza minima di una voce della barra |
| `--fab-size` | `3.5rem` | Diametro del pulsante "nuovo movimento" |
| `--focus-ring-width` | `0.125rem` | Spessore anello di focus |
| `--focus-ring-offset` | `0.125rem` | Distanza anello di focus |
| `--focus-ring-color` | `var(--color-primary-strong)` | Colore anello di focus |

## Come aggiungere un nuovo token
1. Aggiungi la custom property in `tokens.css`, nel gruppo giusto, con nome semantico (`--color-…`, `--space-…`, ecc.), non con il valore nel nome.
2. Per un colore di testo, verifica il contrasto (≥ 4,5:1 sullo sfondo su cui compare) e annotalo nel ticket.
3. Aggiungi la riga in questa tabella, con valore e uso. Il test `frontend/src/styles/tokens-doc.test.ts` fallisce se un token di `tokens.css` manca da qui (o se qui ce n'è uno che non esiste più).
4. Se serve un breakpoint, segui la sezione sotto: vanno aggiornati anche `breakpoints.ts` e le media query.

## Breakpoint e mobile first
- Si scrive prima lo stile mobile (390px dei mockup); le regole per schermi più grandi si aggiungono con `@media (min-width: ...)`. Niente `max-width`.
- Breakpoint, definiti una volta sola:

| Nome | Valore | Token | Uso |
|---|---|---|---|
| tablet | 768px | `--breakpoint-tablet` | layout intermedio |
| desktop | 1024px | `--breakpoint-desktop` | barra laterale, matrice (mockup a 1440px) |

- **Regola unica**: le custom properties non funzionano dentro `@media`, quindi il valore in pixel si ripete nelle media query. I valori ammessi sono solo quelli del token, in `px` e con `min-width`.
- In TypeScript si usa `frontend/src/styles/breakpoints.ts` (`BREAKPOINTS`, `minWidthQuery`, `matchesBreakpoint`) per `matchMedia`.
- Il test `frontend/src/styles/breakpoints.test.ts` fallisce se: `breakpoints.ts` e `tokens.css` divergono, oppure un qualsiasi `.css` in `src/` usa una media query di larghezza diversa dai token (o `max-width`).
- Per cambiare un breakpoint: modifica `tokens.css` e `breakpoints.ts`, poi aggiorna le media query dei `.css` (il test indica quali).
