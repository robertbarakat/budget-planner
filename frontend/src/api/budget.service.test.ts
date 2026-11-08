import { describe, expect, it, vi } from 'vitest'
import { BudgetService } from './budget.service.ts'
import { fakeSupabase, type RecordedCall } from './test-utils.ts'

function filters(queryCalls: RecordedCall[]): Record<string, unknown> {
  return (queryCalls.find((c) => c.method === 'match')?.args[0] as Record<string, unknown> | undefined) ?? {}
}

describe('BudgetService.listEntries', () => {
  it('filtra per anno, mese e origine e ordina per anno e mese', async () => {
    const { client, calls } = fakeSupabase({ data: [], error: null })
    await new BudgetService(() => client).listEntries({ year: 2026, month: 3, source: 'tax' })
    expect(calls.find((c) => c.method === 'match')?.args[0]).toEqual({ year: 2026, month: 3, source: 'tax' })
    expect(calls.filter((c) => c.method === 'order').map((c) => c.args[0])).toEqual(['year', 'month', 'id'])
  })
})

describe('BudgetService mesi chiusi', () => {
  it('closeMonth crea la riga se il mese è aperto', async () => {
    const { client, calls } = fakeSupabase({ closed_months: { data: [], error: null } })
    await new BudgetService(() => client).closeMonth(2026, 3)
    expect(calls.find((c) => c.method === 'insert')?.args[0]).toEqual({ year: 2026, month: 3 })
  })

  it('closeMonth su un mese già chiuso non scrive nulla', async () => {
    const row = { id: 4, year: 2026, month: 3, closed_at: '2026-04-01' }
    const { client, calls } = fakeSupabase({ closed_months: { data: [row], error: null } })
    await expect(new BudgetService(() => client).closeMonth(2026, 3)).resolves.toEqual(row)
    expect(calls.some((c) => c.method === 'insert')).toBe(false)
  })

  it('reopenMonth elimina la riga del mese chiuso, e non fa nulla se era aperto', async () => {
    const closed = fakeSupabase({
      closed_months: (q) => ({
        data: 'year' in filters(q) ? [{ id: 4, year: 2026, month: 3, closed_at: 'x' }] : [],
        error: null,
      }),
    })
    await new BudgetService(() => closed.client).reopenMonth(2026, 3)
    expect(closed.calls.some((c) => c.method === 'delete')).toBe(true)
    expect(closed.calls.filter((c) => c.method === 'eq').at(-1)?.args).toEqual(['id', 4])

    const open = fakeSupabase({ closed_months: { data: [], error: null } })
    await new BudgetService(() => open.client).reopenMonth(2026, 4)
    expect(open.calls.some((c) => c.method === 'delete')).toBe(false)
  })
})

describe('BudgetService.listBudgetItemIdsInUse', () => {
  it('restituisce gli id delle voci con righe, senza doppioni', async () => {
    const { client, calls } = fakeSupabase({
      budget_entries: { data: [{ budget_item_id: 3 }, { budget_item_id: 5 }, { budget_item_id: 3 }], error: null },
    })
    await expect(new BudgetService(() => client).listBudgetItemIdsInUse()).resolves.toEqual([3, 5])
    expect(calls.find((c) => c.method === 'select')?.args).toEqual(['budget_item_id'])
  })
})

describe('BudgetService.setManualAmount', () => {
  type Entry = Awaited<ReturnType<BudgetService['listEntries']>>[number]
  const row = (id: number, amount: number): Entry =>
    ({ id, budget_item_id: 7, year: 2026, month: 3, amount, source: 'manual', created_at: '' }) as Entry

  function setup(existing: Entry[]) {
    const service = new BudgetService(() => fakeSupabase({ data: [], error: null }).client)
    const list = vi.spyOn(service, 'listEntries').mockResolvedValue(existing)
    const create = vi.spyOn(service.entries, 'create').mockResolvedValue(row(99, 0))
    const update = vi.spyOn(service.entries, 'update').mockResolvedValue(row(1, 0))
    const remove = vi.spyOn(service.entries, 'remove').mockResolvedValue()
    return { service, list, create, update, remove }
  }

  it('crea una riga manuale in una cella senza righe manuali (cerca solo le manuali)', async () => {
    const { service, list, create, update } = setup([])
    await service.setManualAmount(7, 2026, 3, 100)
    expect(list).toHaveBeenCalledWith({ year: 2026, month: 3, budgetItemId: 7, source: 'manual' })
    expect(create).toHaveBeenCalledWith({ budget_item_id: 7, year: 2026, month: 3, amount: 100, source: 'manual' })
    expect(update).not.toHaveBeenCalled()
  })

  it('aggiorna la riga manuale esistente senza crearne un\'altra', async () => {
    const { service, create, update } = setup([row(1, 50)])
    await service.setManualAmount(7, 2026, 3, 80)
    expect(update).toHaveBeenCalledWith(1, { amount: 80 })
    expect(create).not.toHaveBeenCalled()
  })

  it('non scrive se l\'importo è lo stesso', async () => {
    const { service, create, update, remove } = setup([row(1, 50)])
    await service.setManualAmount(7, 2026, 3, 50)
    expect([create, update, remove].some((spy) => spy.mock.calls.length > 0)).toBe(false)
  })

  it('con importo null elimina le righe manuali', async () => {
    const { service, remove, create } = setup([row(1, 50), row(2, 5)])
    await service.setManualAmount(7, 2026, 3, null)
    expect(remove.mock.calls.map((c) => c[0])).toEqual([1, 2])
    expect(create).not.toHaveBeenCalled()
  })

  it('con più righe manuali ne tiene una sola', async () => {
    const { service, update, remove } = setup([row(1, 50), row(2, 5)])
    await service.setManualAmount(7, 2026, 3, 55)
    expect(update).toHaveBeenCalledWith(1, { amount: 55 })
    expect(remove.mock.calls.map((c) => c[0])).toEqual([2])
  })
})
