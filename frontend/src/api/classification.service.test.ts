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

  it('con riclassificazione chiama la funzione SQL dopo aver spostato la categoria', async () => {
    const { client, calls } = fakeSupabase({ categories: { data: category, error: null }, reclassify_category_history: { data: 3, error: null } })
    await new ClassificationService(() => client).moveCategoryToBudgetItem(5, 9, { reclassifyHistory: true })
    expect(calls.filter((c) => c.method === 'from').map((c) => c.args[0])).toEqual(['categories'])
    expect(calls.find((c) => c.method === 'rpc')?.args).toEqual([
      'reclassify_category_history',
      { p_category_id: 5, p_budget_item_id: 9 },
    ])
  })

  it('se la categoria non si aggiorna non tocca i movimenti e lancia AppError', async () => {
    const { client, calls } = fakeSupabase({ data: null, error: { code: '23503', message: 'fk' } })
    const service = new ClassificationService(() => client)
    await expect(service.moveCategoryToBudgetItem(5, 999, { reclassifyHistory: true })).rejects.toMatchObject({
      kind: 'in_use',
    })
    expect(calls.filter((c) => c.method === 'from').map((c) => c.args[0])).toEqual(['categories'])
  })

  it('reclassifyCategoryHistory restituisce quanti movimenti ha modificato', async () => {
    const { client } = fakeSupabase({ reclassify_category_history: { data: 4, error: null } })
    await expect(new ClassificationService(() => client).reclassifyCategoryHistory(5, 9)).resolves.toBe(4)
  })

  it('reclassifyCategoryHistory trasforma un errore del database in AppError', async () => {
    const { client } = fakeSupabase({ reclassify_category_history: { data: null, error: { code: '23503', message: 'x' } } })
    await expect(new ClassificationService(() => client).reclassifyCategoryHistory(5, 999)).rejects.toMatchObject({ kind: 'in_use' })
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

describe('ClassificationService.countHistoryToReclassify', () => {
  it('conta solo i movimenti della categoria che hanno un\'altra voce', async () => {
    const { client, calls } = fakeSupabase({
      transactions: { data: [{ budget_item_id: 1 }, { budget_item_id: 9 }, { budget_item_id: 1 }, { budget_item_id: 2 }], error: null },
    })
    await expect(new ClassificationService(() => client).countHistoryToReclassify(5, 9)).resolves.toBe(3)
    expect(calls.find((c) => c.method === 'match')?.args[0]).toEqual({ category_id: 5 })
  })

  it('nessun movimento da riclassificare: 0', async () => {
    const { client } = fakeSupabase({ transactions: { data: [{ budget_item_id: 9 }], error: null } })
    await expect(new ClassificationService(() => client).countHistoryToReclassify(5, 9)).resolves.toBe(0)
  })
})
