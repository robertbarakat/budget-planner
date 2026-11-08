import type { InsertOf } from '../api/base-service.ts'
import type { TransactionFormSubmit } from '../components/TransactionForm.tsx'
import type { RowOf } from '../api/base-service.ts'
import type { TransactionFormState } from './transaction-form.ts'

/**
 * Valori del form -> riga di `transactions`. Sempre completa: un trasferimento azzera categoria e voce,
 * una spesa o entrata azzera la destinazione (serve anche in modifica, quando il tipo cambia).
 */
export function toTransactionPayload(values: TransactionFormSubmit): InsertOf<'transactions'> {
  const common = {
    amount: values.amount,
    transaction_date: values.date,
    account_id: values.accountId,
    comment: values.comment,
    tag: values.tag,
  }
  if (values.type === 'transfer') {
    return { ...common, type: 'transfer', destination_account_id: values.destinationAccountId, category_id: null, budget_item_id: null }
  }
  return {
    ...common,
    type: values.type,
    destination_account_id: null,
    category_id: values.categoryId,
    budget_item_id: values.budgetItemId,
  }
}

/** Riga salvata -> valori di partenza del form di modifica (importo scritto all'italiana). */
export function toFormState(row: RowOf<'transactions'>): Partial<TransactionFormState> {
  return {
    type: row.type,
    amountText: Number(row.amount).toFixed(2).replace('.', ','),
    accountId: String(row.account_id),
    destinationAccountId: row.destination_account_id === null ? '' : String(row.destination_account_id),
    categoryId: row.category_id === null ? '' : String(row.category_id),
    date: row.transaction_date,
    comment: row.comment ?? '',
    tag: row.tag ?? '',
  }
}
