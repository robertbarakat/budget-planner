import { describe, expect, it } from 'vitest'
import { AppError } from './api-error.ts'
import { TransactionsService } from './transactions.service.ts'
import { fakeSupabase } from './test-utils.ts'

const expense = { type: 'expense' as const, transaction_date: '2026-03-10', amount: 12.5, account_id: 1, category_id: 4, budget_item_id: 2 }

describe('TransactionsService.listFiltered', () => {
  it('applica i filtri passati e ordina dal più recente', async () => {
    const { client, calls } = fakeSupabase({ data: [], error: null })
    await new TransactionsService(() => client).listFiltered({
      from: '2026-03-01',
      to: '2026-03-31',
      accountId: 1,
      categoryId: 4,
      type: 'expense',
    })
    const used = calls.filter((c) => c.method !== 'from' && c.method !== 'select')
    expect(used).toEqual([
      { method: 'gte', args: ['transaction_date', '2026-03-01'] },
      { method: 'lte', args: ['transaction_date', '2026-03-31'] },
      { method: 'or', args: ['account_id.eq.1,destination_account_id.eq.1'] },
      { method: 'eq', args: ['category_id', 4] },
      { method: 'eq', args: ['type', 'expense'] },
      { method: 'order', args: ['transaction_date', { ascending: false }] },
      { method: 'order', args: ['id', { ascending: false }] },
    ])
  })

  it('senza filtri ordina soltanto', async () => {
    const { client, calls } = fakeSupabase({ data: [], error: null })
    await new TransactionsService(() => client).listFiltered()
    expect(calls.map((c) => c.method)).toEqual(['from', 'select', 'order', 'order'])
  })
})

describe('TransactionsService.create', () => {
  it('un trasferimento senza conto di destinazione è rifiutato con messaggio chiaro', async () => {
    const { client, calls } = fakeSupabase({ data: {}, error: null })
    const service = new TransactionsService(() => client)
    const attempt = service.create({ type: 'transfer', transaction_date: '2026-03-10', amount: 5, account_id: 1 })
    await expect(attempt).rejects.toBeInstanceOf(AppError)
    await expect(attempt).rejects.toThrow('Per un trasferimento serve il conto di destinazione.')
    expect(calls).toEqual([])
  })

  it('rifiuta destinazione uguale all\'origine, e spese senza categoria', async () => {
    const { client } = fakeSupabase({ data: {}, error: null })
    const service = new TransactionsService(() => client)
    await expect(
      service.create({ type: 'transfer', transaction_date: '2026-03-10', amount: 5, account_id: 1, destination_account_id: 1 }),
    ).rejects.toMatchObject({ kind: 'invalid' })
    await expect(service.create({ ...expense, category_id: null })).rejects.toMatchObject({ kind: 'invalid' })
    await expect(service.create({ ...expense, destination_account_id: 2 })).rejects.toMatchObject({ kind: 'invalid' })
  })

  it('un movimento valido viene scritto', async () => {
    const { client, calls } = fakeSupabase({ data: { id: 1, ...expense }, error: null })
    await new TransactionsService(() => client).create(expense)
    expect(calls.find((c) => c.method === 'insert')?.args[0]).toEqual(expense)
  })
})

describe('TransactionsService.listCategoryIdsInUse', () => {
  it('restituisce gli id delle categorie con movimenti, senza doppioni e senza i trasferimenti', async () => {
    const { client, calls } = fakeSupabase({
      transactions: { data: [{ category_id: 4 }, { category_id: null }, { category_id: 7 }, { category_id: 4 }], error: null },
    })
    await expect(new TransactionsService(() => client).listCategoryIdsInUse()).resolves.toEqual([4, 7])
    expect(calls.find((c) => c.method === 'select')?.args).toEqual(['category_id'])
  })
})

describe('TransactionsService.update', () => {
  const row = { id: 1 }
  it('con il tipo controlla le regole prima di scrivere', async () => {
    const { client, calls } = fakeSupabase({ data: row, error: null })
    const service = new TransactionsService(() => client)
    await expect(service.update(1, { type: 'transfer', account_id: 1, destination_account_id: 1 })).rejects.toMatchObject({
      message: 'Il conto di destinazione deve essere diverso da quello di origine.',
    })
    await expect(service.update(1, { type: 'expense', account_id: 1 })).rejects.toBeInstanceOf(AppError)
    expect(calls.some((c) => c.method === 'update')).toBe(false)
  })

  it('un aggiornamento completo valido passa; uno parziale senza tipo non viene bloccato', async () => {
    const { client, calls } = fakeSupabase({ data: row, error: null })
    const service = new TransactionsService(() => client)
    await service.update(1, { type: 'income', category_id: 5, budget_item_id: 6, destination_account_id: null })
    await service.update(1, { comment: 'nuovo' })
    expect(calls.filter((c) => c.method === 'update')).toHaveLength(2)
  })
})
