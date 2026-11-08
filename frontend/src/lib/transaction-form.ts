import { isValidIsoDate } from './dates.ts'
import { parseAmount } from './parse-amount.ts'

export type TransactionFormType = 'expense' | 'income' | 'transfer'

/** Valori grezzi del form, così come li scrive l'utente. */
export interface TransactionFormState {
  type: TransactionFormType
  amountText: string
  accountId: string
  /** Solo per i trasferimenti. */
  destinationAccountId: string
  categoryId: string
  date: string
  comment: string
  tag: string
}

export interface TransactionFormErrors {
  amount?: string
  account?: string
  destination?: string
  category?: string
  date?: string
}

interface CommonValues {
  /** Importo sempre positivo: il segno lo dà il tipo. */
  amount: number
  accountId: number
  date: string
  comment: string | null
  tag: string | null
}

/** Spesa o entrata: hanno una categoria. */
export interface CategorizedValues extends CommonValues {
  type: 'expense' | 'income'
  categoryId: number
}

/** Trasferimento: ha un conto di destinazione e nessuna categoria. */
export interface TransferValues extends CommonValues {
  type: 'transfer'
  destinationAccountId: number
}

/** Valori validati, pronti per essere salvati. */
export type TransactionFormValues = CategorizedValues | TransferValues

export type TransactionFormResult =
  | { ok: true; values: TransactionFormValues }
  | { ok: false; errors: TransactionFormErrors }

/**
 * Controlla il form: importo > 0, conto obbligatorio, data reale; per spesa ed entrata la categoria,
 * per il trasferimento la destinazione, diversa dall'origine. Errori in italiano.
 */
export function validateTransactionForm(state: TransactionFormState): TransactionFormResult {
  const errors: TransactionFormErrors = {}

  const amount = parseAmount(state.amountText)
  if (state.amountText.trim() === '') errors.amount = 'Inserisci l\'importo.'
  else if (amount === null) errors.amount = 'Scrivi un importo valido, per esempio 14,90.'
  else if (amount <= 0) errors.amount = 'L\'importo deve essere maggiore di zero.'

  const isTransfer = state.type === 'transfer'
  if (state.accountId === '') errors.account = isTransfer ? 'Scegli il conto di origine.' : 'Scegli il conto.'
  if (isTransfer) {
    if (state.destinationAccountId === '') errors.destination = 'Scegli il conto di destinazione.'
    else if (state.destinationAccountId === state.accountId) {
      errors.destination = 'Il conto di destinazione deve essere diverso da quello di origine.'
    }
  } else if (state.categoryId === '') {
    errors.category = 'Scegli la categoria.'
  }
  if (!isValidIsoDate(state.date)) errors.date = 'Scegli una data valida.'

  if (Object.keys(errors).length > 0 || amount === null) return { ok: false, errors }

  const common = {
    amount,
    accountId: Number(state.accountId),
    date: state.date,
    comment: state.comment.trim() || null,
    tag: state.tag.trim() || null,
  }
  if (state.type === 'transfer') {
    return { ok: true, values: { ...common, type: 'transfer', destinationAccountId: Number(state.destinationAccountId) } }
  }
  return { ok: true, values: { ...common, type: state.type, categoryId: Number(state.categoryId) } }
}
