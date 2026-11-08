import { parseAmount } from './parse-amount.ts'

/** Una scadenza è "modificata" quando il suo importo differisce da quello base (confronto in centesimi). */
export function isOccurrenceModified(amount: number, baseAmount: number): boolean {
  return Math.round(amount * 100) !== Math.round(baseAmount * 100)
}

export type OccurrenceAmountResult = { ok: true; amount: number } | { ok: false; error: string }

/** Importo di una scadenza: numero valido e maggiore di zero (il segno lo dà il tipo della voce). */
export function validateOccurrenceAmount(text: string): OccurrenceAmountResult {
  const amount = parseAmount(text)
  if (amount === null || amount <= 0) return { ok: false, error: 'Inserisci un importo maggiore di zero.' }
  return { ok: true, amount }
}
