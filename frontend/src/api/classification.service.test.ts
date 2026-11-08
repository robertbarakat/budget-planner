import { describe, expect, it } from 'vitest'
import { ClassificationService } from './classification.service.ts'
import { fakeSupabase } from './test-utils.ts'

const category = { id: 5, budget_item_id: 9, name: 'Pizza', sort_order: 0, archived: false, created_at: '2026-01-01' }

describe('ClassificationService.moveCategoryToBudgetItem', () => {
  it('senza riclassificazione sposta solo la categoria (movimenti passati invariati)', async () => {
    const { client, calls } = fakeSupabase({ data: category, error: null })
    await new ClassificationService(() => client).moveCategoryToBudgetItem(5, 9)
    const tables = calls.filter((c) => c.method === 'from').map((c) => c.args[0])
    expect(tables).toEqual(['categories'])
    expect(calls.find((c) => c.method === 'update')?.args).toEqual([{ budget_item_id: 9 }])
  })

  it('con riclassificazione aggiorna anche i movimenti della categoria', async () => {
    const { client, calls } = fakeSupabase({ data: category, error: null })
    await new ClassificationService(() => client).moveCategoryToBudgetItem(5, 9, { reclassifyHistory: true })
    const tables = calls.filter((c) => c.method === 'from').map((c) => c.args[0])
    expect(tables).toEqual(['categories', 'transactions'])
    const eqOnTransactions = calls.filter((c) => c.method === 'eq').at(-1)
    expect(eqOnTransactions?.args).toEqual(['category_id', 5])
  })

  it('se la categoria non si aggiorna non tocca i movimenti e lancia AppError', async () => {
    const { client, calls } = fakeSupabase({ data: null, error: { code: '23503', message: 'fk' } })
    const service = new ClassificationService(() => client)
    await expect(service.moveCategoryToBudgetItem(5, 999, { reclassifyHistory: true })).rejects.toMatchObject({
      kind: 'in_use',
    })
    expect(calls.filter((c) => c.method === 'from').map((c) => c.args[0])).toEqual(['categories'])
  })

  it('archive, unarchive e reorder aggiornano le colonne giuste', async () => {
    const { client, calls } = fakeSupabase({ data: category, error: null })
    const service = new ClassificationService(() => client)
    await service.categories.archive(5)
    await service.categories.unarchive(5)
    await service.categories.reorder(5, 3)
    expect(calls.filter((c) => c.method === 'update').map((c) => c.args[0])).toEqual([
      { archived: true },
      { archived: false },
      { sort_order: 3 },
    ])
  })
})
