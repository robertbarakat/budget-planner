import { describe, expect, it } from 'vitest'
import { newTransactionFromDuePath, readDuePrefill } from './due-prefill.ts'

const groups = [
  { budgetItemId: 20, kind: 'expense' as const, categories: [{ id: 5 }, { id: 6 }] },
  { budgetItemId: 10, kind: 'income' as const, categories: [{ id: 1 }] },
  { budgetItemId: 30, kind: 'expense' as const, categories: [] },
]

describe('due prefill', () => {
  it('il percorso porta importo, conto e voce, e si rilegge uguale', () => {
    const path = newTransactionFromDuePath('/transactions/new', { amount: 650, accountId: 1, budgetItemId: 20 })
    expect(path).toBe('/transactions/new?amount=650%2C00&account=1&item=20')
    const params = new URL(path, 'http://x').searchParams
    expect(readDuePrefill(params, groups, [1, 2])).toEqual({ type: 'expense', amountText: '650,00', accountId: '1', categoryId: '5' })
  })

  it('una voce di entrata precompila una entrata', () => {
    const params = new URLSearchParams('amount=300,00&account=2&item=10')
    expect(readDuePrefill(params, groups, [1, 2])).toMatchObject({ type: 'income', categoryId: '1', accountId: '2' })
  })

  it('senza categorie o con un conto non disponibile lascia vuoti i campi', () => {
    const params = new URLSearchParams('amount=10,00&account=9&item=30')
    expect(readDuePrefill(params, groups, [1])).toMatchObject({ categoryId: '', accountId: '' })
  })

  it('senza parametri validi non precompila', () => {
    expect(readDuePrefill(new URLSearchParams(''), groups, [1])).toBeNull()
    expect(readDuePrefill(new URLSearchParams('amount=1,00&account=x&item=1'), groups, [1])).toBeNull()
  })
})
