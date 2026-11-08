import { describe, expect, it } from 'vitest'
import { planTaxApply } from './tax-apply.ts'

const deadlines = [
  { due_date: '2026-06-30', amount: 262 }, { due_date: '2026-06-30', amount: 150.75 },
  { due_date: '2026-11-30', amount: 349.34 }, { due_date: '2025-06-30', amount: 999 },
]

describe('planTaxApply', () => {
  it('una riga positiva per mese di scadenza, con la somma del mese', () => {
    const plan = planTaxApply(2026, deadlines, 7, [], [])
    expect(plan.segments).toHaveLength(1)
    expect(plan.segments[0].range).toEqual({ fromYear: 2026, fromMonth: 1, toYear: 2026, toMonth: 12 })
    expect(plan.segments[0].entries).toEqual([
      { budgetItemId: 7, year: 2026, month: 6, amount: 412.75 },
      { budgetItemId: 7, year: 2026, month: 11, amount: 349.34 },
    ])
    expect(plan.createdCount).toBe(2)
  })
  it('conta le righe tax già presenti da sostituire e salta i mesi chiusi', () => {
    const plan = planTaxApply(2026, deadlines, 7, [{ year: 2026, month: 6 }, { year: 2026, month: 3 }], [{ year: 2026, month: 6 }])
    expect(plan.skippedClosedMonths).toEqual([{ year: 2026, month: 6 }])
    expect(plan.replacedCount).toBe(1)
    expect(plan.segments.flatMap((s) => s.entries.map((e) => e.month))).toEqual([11])
  })
  it('senza scadenze non crea righe', () => {
    expect(planTaxApply(2026, [], 7, [], []).createdCount).toBe(0)
  })
})
