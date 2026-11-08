import { describe, expect, it } from 'vitest'
import type { RowOf } from '../api/base-service.ts'
import { toFormState, toTransactionPayload } from './transaction-payload.ts'

describe('toTransactionPayload', () => {
  it('spesa: categoria e voce, nessuna destinazione', () => {
    expect(
      toTransactionPayload({ type: 'expense', amount: 14.9, accountId: 1, categoryId: 5, budgetItemId: 9, date: '2026-11-08', comment: 'x', tag: null }),
    ).toEqual({
      type: 'expense', amount: 14.9, transaction_date: '2026-11-08', account_id: 1, comment: 'x', tag: null,
      destination_account_id: null, category_id: 5, budget_item_id: 9,
    })
  })

  it('trasferimento: destinazione, categoria e voce azzerate', () => {
    expect(
      toTransactionPayload({ type: 'transfer', amount: 50, accountId: 1, destinationAccountId: 2, date: '2026-11-08', comment: null, tag: null }),
    ).toEqual({
      type: 'transfer', amount: 50, transaction_date: '2026-11-08', account_id: 1, comment: null, tag: null,
      destination_account_id: 2, category_id: null, budget_item_id: null,
    })
  })
})

describe('toFormState', () => {
  it('riporta una riga nei campi del form, con l\'importo all\'italiana', () => {
    const row = {
      id: 1, type: 'expense', amount: 14.9, transaction_date: '2026-11-08', account_id: 2, destination_account_id: null,
      category_id: 5, budget_item_id: 9, comment: null, tag: 'viaggio', created_at: '',
    } as unknown as RowOf<'transactions'>
    expect(toFormState(row)).toEqual({
      type: 'expense', amountText: '14,90', accountId: '2', destinationAccountId: '', categoryId: '5',
      date: '2026-11-08', comment: '', tag: 'viaggio',
    })
  })
})
