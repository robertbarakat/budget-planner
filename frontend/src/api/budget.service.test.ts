import { describe, expect, it } from 'vitest'
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
