const formatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  // L'italiano di default non raggruppa le migliaia a 4 cifre (1234,50): qui sì, come nei mockup.
  useGrouping: 'always',
  signDisplay: 'never',
})

const MINUS = '−' // segno meno tipografico

export type AmountSign = '-' | '+' | ''

/** Arrotonda ai centesimi, così -0,001 diventa zero e non mostra un segno. */
function toCents(value: number): number {
  return Math.round(value * 100) / 100
}

/** Segno da mostrare: il meno per i negativi, il più solo se `explicitPlus`, nessuno per zero. */
export function amountSign(value: number, explicitPlus = false): AmountSign {
  const rounded = toCents(value)
  if (rounded < 0) return '-'
  if (rounded > 0 && explicitPlus) return '+'
  return ''
}

/** Importo in EUR formattato it-IT, senza segno (es. "1.234,50 €"). */
export function formatAbsoluteAmount(value: number): string {
  return formatter.format(Math.abs(toCents(value)))
}

/** Importo in EUR formattato it-IT con segno (es. "−42,00 €", "+1.234,50 €"). */
export function formatAmount(value: number, options: { explicitPlus?: boolean } = {}): string {
  const sign = amountSign(value, options.explicitPlus)
  const text = formatAbsoluteAmount(value)
  if (sign === '-') return `${MINUS}${text}`
  if (sign === '+') return `+${text}`
  return text
}
