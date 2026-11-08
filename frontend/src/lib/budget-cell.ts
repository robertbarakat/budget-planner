import { parseAmount } from './parse-amount.ts'

export type BudgetAmountInput =
  | { kind: 'empty' }
  | { kind: 'amount'; value: number }
  | { kind: 'error'; message: string }

/**
 * Legge l'importo digitato in una cella del budget. Vuoto = nessuna riga manuale.
 * L'importo è sempre positivo: il segno lo dà il tipo della voce (entrata o spesa).
 */
export function readBudgetAmount(text: string): BudgetAmountInput {
  if (text.trim() === '') return { kind: 'empty' }
  const value = parseAmount(text)
  if (value === null) return { kind: 'error', message: 'Importo non valido: scrivi un numero, per esempio 1.250,50.' }
  if (value < 0) return { kind: 'error', message: 'Scrivi l\'importo senza segno: entrata o spesa dipendono dalla voce.' }
  return { kind: 'amount', value }
}
