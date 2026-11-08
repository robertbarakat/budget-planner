# Design token

I token stanno in `frontend/src/styles/tokens.css`. Questo documento si completa in BP-26.

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
