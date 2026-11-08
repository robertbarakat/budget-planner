/**
 * Legge un importo scritto all'italiana ("1.234,50", "-42,5", "€ 10", "1234.5") e lo restituisce in euro.
 * `null` se il testo non è un importo valido.
 */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[\s€]/g, '').replace(/^[−–]/, '-')
  if (cleaned === '') return null
  // Con la virgola il punto è separatore delle migliaia; senza virgola un punto seguito da 1-2 cifre è decimale.
  let normalized: string
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '')
  } else {
    normalized = cleaned
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}
