import { describe, expect, it } from 'vitest'
import { aggregateMonthlyValues, type BudgetItemStructure } from './aggregates.ts'
import { computeMonthlyValues, type MonthlyValue } from './monthly-values.ts'

const v = (
  budgetItemId: number,
  month: number,
  budgetedCents: number,
  actualCents: number,
  year = 2026,
): MonthlyValue => ({
  budgetItemId,
  year,
  month,
  budgetedCents,
  actualCents,
  shownCents: actualCents,
  isClosed: true,
})

// item 1 and 2 belong to macro-area 10, item 3 to macro-area 20
const structure: BudgetItemStructure[] = [
  { budgetItemId: 1, macroAreaId: 10 },
  { budgetItemId: 2, macroAreaId: 10 },
  { budgetItemId: 3, macroAreaId: 20 },
]

describe('aggregateMonthlyValues', () => {
  it('variance = actual - budgeted, with the right sign for expenses and income', () => {
    const report = aggregateMonthlyValues(structure, [
      v(1, 1, -10_000, -12_000), // expense: spent 20.00 more -> -20.00 (unfavorable)
      v(2, 1, -10_000, -7_000), // expense: spent 30.00 less -> +30.00 (favorable)
      v(3, 1, 100_000, 80_000), // income: earned 200.00 less -> -200.00 (unfavorable)
    ])
    const variance = (budgetItemId: number) =>
      report.byItemMonth.find((r) => r.budgetItemId === budgetItemId)?.varianceCents
    expect(variance(1)).toBe(-2_000)
    expect(variance(2)).toBe(3_000)
    expect(variance(3)).toBe(-20_000)
  })

  it('the total of a macro-area is the sum of its items', () => {
    const report = aggregateMonthlyValues(structure, [
      v(1, 1, -10_000, -12_000),
      v(2, 1, -5_000, -4_000),
      v(3, 1, 100_000, 80_000),
    ])
    const area10 = report.byMacroAreaMonth.find((r) => r.macroAreaId === 10)
    expect(area10).toMatchObject({ budgetedCents: -15_000, actualCents: -16_000, varianceCents: -1_000 })
    const area20 = report.byMacroArea.find((r) => r.macroAreaId === 20)
    expect(area20).toMatchObject({ budgetedCents: 100_000, actualCents: 80_000, varianceCents: -20_000 })
    expect(report.byYear[0]).toMatchObject({ budgetedCents: 85_000, actualCents: 64_000, varianceCents: -21_000 })
  })

  it('the yearly total is the sum of the twelve months', () => {
    const values = computeMonthlyValues({
      year: 2026,
      budgetItemIds: [1, 2, 3],
      budgetEntries: Array.from({ length: 12 }, (_, i) => [
        { budgetItemId: 1, year: 2026, month: i + 1, amountCents: -(i + 1) * 1_000 },
        { budgetItemId: 3, year: 2026, month: i + 1, amountCents: 50_000 },
      ]).flat(),
      transactions: [
        { type: 'expense', budgetItemId: 1, transactionDate: '2026-03-05', amountCents: 4_321 },
        { type: 'income', budgetItemId: 3, transactionDate: '2026-12-31', amountCents: 10_000 },
      ],
      closedMonths: Array.from({ length: 12 }, (_, i) => ({ year: 2026, month: i + 1 })),
    })
    const report = aggregateMonthlyValues(structure, values)
    expect(report.byMonth).toHaveLength(12)
    const sum = (key: 'budgetedCents' | 'actualCents' | 'varianceCents') =>
      report.byMonth.reduce((total, month) => total + month[key], 0)
    expect(report.byYear).toHaveLength(1)
    expect(report.byYear[0]?.budgetedCents).toBe(sum('budgetedCents'))
    expect(report.byYear[0]?.actualCents).toBe(sum('actualCents'))
    expect(report.byYear[0]?.varianceCents).toBe(sum('varianceCents'))
    // manual: budget = -(1+...+12)*1000 + 12*50000 = -78000 + 600000 = 522000; actual = -4321 + 10000 = 5679
    expect(report.byYear[0]).toMatchObject({ budgetedCents: 522_000, actualCents: 5_679 })
  })

  it('keeps an archived item in the totals of the years where it was used', () => {
    // Item 2 is archived today (the function never filters on it) but was used in 2025.
    const report = aggregateMonthlyValues(structure, [
      v(2, 4, -3_000, -3_500, 2025),
      v(1, 4, -1_000, -1_000, 2026),
    ])
    const area2025 = report.byMacroArea.find((r) => r.macroAreaId === 10 && r.year === 2025)
    expect(area2025).toMatchObject({ budgetedCents: -3_000, actualCents: -3_500, varianceCents: -500 })
    expect(report.byItem.find((r) => r.budgetItemId === 2 && r.year === 2025)?.actualCents).toBe(-3_500)
    expect(report.byYear.map((y) => [y.year, y.actualCents])).toEqual([
      [2025, -3_500],
      [2026, -1_000],
    ])
  })

  it('returns nothing without values and sorts the output', () => {
    expect(aggregateMonthlyValues(structure, [])).toEqual({
      byItemMonth: [],
      byItem: [],
      byMacroAreaMonth: [],
      byMacroArea: [],
      byMonth: [],
      byYear: [],
    })
    const report = aggregateMonthlyValues(structure, [v(3, 2, 1, 1), v(1, 5, 1, 1), v(1, 2, 1, 1)])
    expect(report.byItemMonth.map((r) => [r.budgetItemId, r.month])).toEqual([
      [1, 2],
      [1, 5],
      [3, 2],
    ])
    expect(report.byMonth.map((r) => r.month)).toEqual([2, 5])
  })

  it('rejects invalid input', () => {
    expect(() => aggregateMonthlyValues(structure, [v(99, 1, 0, 0)])).toThrow(RangeError)
    expect(() => aggregateMonthlyValues(structure, [v(1, 13, 0, 0)])).toThrow(RangeError)
    expect(() => aggregateMonthlyValues(structure, [v(1, 1, 0.5, 0)])).toThrow(RangeError)
    expect(() => aggregateMonthlyValues(structure, [v(1, 1, 0, 0), v(1, 1, 5, 5)])).toThrow(RangeError)
    expect(() => aggregateMonthlyValues([...structure, { budgetItemId: 1, macroAreaId: 30 }], [])).toThrow(RangeError)
  })
})
