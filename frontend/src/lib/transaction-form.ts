import { isValidIsoDate } from './dates.ts'
import { parseAmount } from './parse-amount.ts'

export type TransactionFormType = 'expense' | 'income'

/** Valori grezzi del form, così come li scrive l'utente. */
export interface TransactionFormState {
  type: TransactionFormType
  amountText: string
  accountId: string
  categoryId: string
  date: string
  comment: string
  tag: string
}

export interface TransactionFormErrors {
  amount?: string
  account?: string
  category?: string
  date?: string
}

/** Valori validati, pronti per essere salvati (importo sempre positivo: il segno lo dà il tipo). */
export interface TransactionFormValues {
  type: TransactionFormType
  amount: number
  accountId: number
  categoryId: number
  date: string
  comment: string | null
  tag: string | null
}

export type TransactionFormResult =
  | { ok: true; values: TransactionFormValues }
  | { ok: false; errors: TransactionFormErrors }

/** Controlla il form: importo > 0, conto e categoria obbligatori, data valida. Errori in italiano. */
export function validateTransactionForm(state: TransactionFormState): TransactionFormResult {
  const errors: TransactionFormErrors = {}

  const amount = parseAmount(state.amountText)
  if (state.amountText.trim() === '') errors.amount = 'Inserisci l\'importo.'
  else if (amount === null) errors.amount = 'Scrivi un importo valido, per esempio 14,90.'
  else if (amount <= 0) errors.amount = 'L\'importo deve essere maggiore di zero.'

  if (state.accountId === '') errors.account = 'Scegli il conto.'
  if (state.categoryId === '') errors.category = 'Scegli la categoria.'
  if (!isValidIsoDate(state.date)) errors.date = 'Scegli una data valida.'

  if (Object.keys(errors).length > 0 || amount === null) return { ok: false, errors }

  return {
    ok: true,
    values: {
      type: state.type,
      amount,
      accountId: Number(state.accountId),
      categoryId: Number(state.categoryId),
      date: state.date,
      comment: state.comment.trim() || null,
      tag: state.tag.trim() || null,
    },
  }
}
