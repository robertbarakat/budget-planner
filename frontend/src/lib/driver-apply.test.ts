import type { ExpectedCollection } from 'budget-planner-shared'
import { describe, expect, it } from 'vitest'
import { planDriverApply } from './driver-apply.ts'

const collection = (clientId: number, year: number, month: number, amountCents: number, workYear = year): ExpectedCollection => ({
  clientId, year, month, workYear, workMonth: 1, amountCents,
})
const items = new Map([[1, 10], [2, 20]])

describe('planDriverApply', () => {
  const collections = [
    collection(1, 2025, 12, 100000), // fuori intervallo
    collection(1, 2026, 3, 250050),
    collection(2, 2026, 3, 100000),
    collection(1, 2026, 5, 0), // a zero: nessuna riga
    collection(1, 2027, 1, 300000, 2026),
    collection(1, 2028, 1, 500000), // fuori intervallo
  ]

  it('da gennaio dell\'anno scelto a dicembre dell\'anno dopo, con le sole righe positive in euro', () => {
    const plan = planDriverApply(2026, collections, items, [], [])
    expect(plan.segments).toHaveLength(1)
    expect(plan.segments[0]!.range).toEqual({ fromYear: 2026, fromMonth: 1, toYear: 2027, toMonth: 12 })
    expect(plan.segments[0]!.entries).toEqual([
      { budgetItemId: 10, year: 2026, month: 3, amount: 2500.5 },
      { budgetItemId: 20, year: 2026, month: 3, amount: 1000 },
      { budgetItemId: 10, year: 2027, month: 1, amount: 3000 },
    ])
    expect(plan.createdCount).toBe(3)
    expect(plan.skippedClosedMonths).toEqual([])
  })

  it('conta le righe del driver già presenti nell\'intervallo come sostituite', () => {
    const plan = planDriverApply(2026, [], items, [
      { year: 2025, month: 12 }, { year: 2026, month: 1 }, { year: 2027, month: 12 }, { year: 2028, month: 1 },
    ], [])
    expect(plan.replacedCount).toBe(2)
    expect(plan.createdCount).toBe(0)
  })

  it('non tocca i mesi chiusi: divide in tratti e non sostituisce né crea righe in quei mesi', () => {
    const plan = planDriverApply(
      2026,
      collections,
      items,
      [{ year: 2026, month: 1 }, { year: 2026, month: 2 }, { year: 2026, month: 3 }],
      [{ year: 2026, month: 1 }, { year: 2026, month: 2 }, { year: 2026, month: 5 }],
    )
    expect(plan.segments.map((s) => s.range)).toEqual([
      { fromYear: 2026, fromMonth: 3, toYear: 2026, toMonth: 4 },
      { fromYear: 2026, fromMonth: 6, toYear: 2027, toMonth: 12 },
    ])
    expect(plan.segments[0]!.entries).toHaveLength(2)
    expect(plan.segments[1]!.entries).toHaveLength(1)
    expect(plan.skippedClosedMonths).toEqual([{ year: 2026, month: 1 }, { year: 2026, month: 2 }, { year: 2026, month: 5 }])
    expect(plan.replacedCount).toBe(1)
  })

  it('con tutto chiuso non c\'è nulla da scrivere', () => {
    const closed = Array.from({ length: 24 }, (_, i) => ({ year: 2026 + Math.floor(i / 12), month: (i % 12) + 1 }))
    const plan = planDriverApply(2026, collections, items, [], closed)
    expect(plan.segments).toEqual([])
    expect(plan.createdCount).toBe(0)
  })

  it('un cliente senza voce è un errore, non una riga persa', () => {
    expect(() => planDriverApply(2026, [collection(9, 2026, 3, 100)], items, [], [])).toThrow(RangeError)
  })
})
