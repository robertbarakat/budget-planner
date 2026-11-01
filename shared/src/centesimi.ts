/**
 * Somma importi espressi in centesimi interi.
 * Funzione di esempio: mostra la convenzione di shared/ (funzioni pure, centesimi interi).
 */
export function sommaCentesimi(importi: readonly number[]): number {
  let totale = 0
  for (const importo of importi) {
    if (!Number.isInteger(importo)) {
      throw new RangeError(`Importo non intero in centesimi: ${importo}`)
    }
    totale += importo
  }
  return totale
}
