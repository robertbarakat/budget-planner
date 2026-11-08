import type { TransactionFormState } from './transaction-form.ts'

/** Voce di budget con le sue categorie (come le scelte del form movimento). */
export interface PrefillGroup {
  budgetItemId: number
  kind: 'expense' | 'income'
  categories: { id: number }[]
}

export interface DuePrefill {
  /** Importo della scadenza, sempre positivo. */
  amount: number
  accountId: number
  budgetItemId: number
}

/** Indirizzo del form Nuovo movimento precompilato da una scadenza (i valori viaggiano nell'indirizzo). */
export function newTransactionFromDuePath(basePath: string, due: DuePrefill): string {
  const params = new URLSearchParams({
    amount: due.amount.toFixed(2).replace('.', ','),
    account: String(due.accountId),
    item: String(due.budgetItemId),
  })
  return `${basePath}?${params.toString()}`
}

/** Indirizzo del form Nuovo movimento per il versamento di una scadenza F24: importo e voce precompilati, conto da scegliere. */
export function newTransactionFromDeadlinePath(basePath: string, deadline: { amount: number; budgetItemId: number; deadlineId: number }): string {
  const params = new URLSearchParams({
    amount: deadline.amount.toFixed(2).replace('.', ','),
    item: String(deadline.budgetItemId),
    deadline: String(deadline.deadlineId),
  })
  return `${basePath}?${params.toString()}`
}

/** Id della scadenza F24 da collegare al movimento che si sta registrando, se l'indirizzo lo indica. */
export function readDeadlineId(params: URLSearchParams): number | null {
  const value = Number(params.get('deadline'))
  return params.get('deadline') !== null && Number.isInteger(value) && value > 0 ? value : null
}

/**
 * Valori iniziali del form da una scadenza, letti dall'indirizzo; `null` se i parametri mancano o non sono validi.
 * Tipo: spesa, o entrata se la voce è di entrata. La scadenza ha la voce di budget, il form la categoria:
 * si propone la prima categoria della voce (modificabile). Data: oggi (default del form).
 */
export function readDuePrefill(
  params: URLSearchParams,
  groups: readonly PrefillGroup[],
  accountIds: readonly number[],
): Partial<TransactionFormState> | null {
  const amountText = params.get('amount')
  // Il conto è facoltativo (il versamento F24 non lo indica): se manca, resta da scegliere.
  const account = params.get('account') === null ? 0 : Number(params.get('account'))
  const item = Number(params.get('item'))
  if (!amountText || !Number.isInteger(account) || !Number.isInteger(item) || params.get('item') === null) {
    return null
  }
  const group = groups.find((g) => g.budgetItemId === item)
  return {
    type: group?.kind ?? 'expense',
    amountText,
    accountId: accountIds.includes(account) ? String(account) : '',
    categoryId: group?.categories[0] ? String(group.categories[0].id) : '',
  }
}
