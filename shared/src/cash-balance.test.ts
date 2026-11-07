import { describe, expect, it } from 'vitest'
import { computeCashBalances } from './cash-balance.ts'
import { computeMonthlyValues, type MonthlyValue } from './monthly-values.ts'

const value = (budgetItemId: number, month: number, shownCents: number, isClosed = false, year = 2026): MonthlyValue => ({
  budgetItemId,
  year,
  month,
  budgetedCents: shownCents,
  actualCents: shownCents,
  shownCents,
  isClosed,
})

describe('computeCashBalances', () => {
  it('January balance = opening balance + January flow', () => {
    const result = computeCashBalances(2026, 1_000_000, [value(1, 1, 250_000), value(2, 1, -80_000)])
    expect(result[0]).toEqual({ month: 1, flowCents: 170_000, endBalanceCents: 1_170_000, isClosed: false })
  })

  it('starts each month from the balance of the previous one', () => {
    const result = computeCashBalances(2026, 0, [
      value(1, 1, 100),
      value(1, 2, -30),
      value(1, 3, 500),
      value(1, 4, -1_000),
    ])
    expect(result.slice(0, 4).map((m) => m.endBalanceCents)).toEqual([100, 70, 570, -430])
    // months without values keep the last balance
    expect(result.slice(4).map((m) => m.endBalanceCents)).toEqual(Array.from({ length: 8 }, () => -430))
  })

  it('uses real values for closed months and budgeted values afterwards (manual calculation)', () => {
    // Opening balance 10,000.00 EUR. One income item (1) and one expense item (2).
    // January (closed):  budget +3,000.00 / -1,200.00, real +2,800.00 / -1,350.00 -> flow +1,450.00 -> 11,450.00
    // February (closed): budget +3,000.00 / -1,200.00, real +3,100.00 / -1,100.00 -> flow +2,000.00 -> 13,450.00
    // March (open):      budget +3,000.00 / -1,200.00, real partial -200.00        -> flow +1,800.00 -> 15,250.00
    // April (open):      budget +3,000.00 / -1,200.00                              -> flow +1,800.00 -> 17,050.00
    const budgetEntries = [1, 2, 3, 4].flatMap((month) => [
      { budgetItemId: 1, year: 2026, month, amountCents: 300_000 },
      { budgetItemId: 2, year: 2026, month, amountCents: -120_000 },
    ])
    const values = computeMonthlyValues({
      year: 2026,
      budgetItemIds: [1, 2],
      budgetEntries,
      transactions: [
        { type: 'income', budgetItemId: 1, transactionDate: '2026-01-15', amountCents: 280_000 },
        { type: 'expense', budgetItemId: 2, transactionDate: '2026-01-20', amountCents: 135_000 },
        { type: 'income', budgetItemId: 1, transactionDate: '2026-02-15', amountCents: 310_000 },
        { type: 'expense', budgetItemId: 2, transactionDate: '2026-02-20', amountCents: 110_000 },
        { type: 'expense', budgetItemId: 2, transactionDate: '2026-03-02', amountCents: 20_000 },
        { type: 'transfer', budgetItemId: null, transactionDate: '2026-03-03', amountCents: 50_000 },
      ],
      closedMonths: [
        { year: 2026, month: 1 },
        { year: 2026, month: 2 },
      ],
    })
    const result = computeCashBalances(2026, 1_000_000, values)
    expect(result.slice(0, 4)).toEqual([
      { month: 1, flowCents: 145_000, endBalanceCents: 1_145_000, isClosed: true },
      { month: 2, flowCents: 200_000, endBalanceCents: 1_345_000, isClosed: true },
      { month: 3, flowCents: 180_000, endBalanceCents: 1_525_000, isClosed: false },
      { month: 4, flowCents: 180_000, endBalanceCents: 1_705_000, isClosed: false },
    ])
  })

  it('returns the opening balance constant for a year without data', () => {
    const result = computeCashBalances(2027, 424_242, [])
    expect(result).toHaveLength(12)
    expect(result.every((m) => m.endBalanceCents === 424_242 && m.flowCents === 0 && !m.isClosed)).toBe(true)
    expect(result.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('can go below zero and keeps cents exact', () => {
    const result = computeCashBalances(2026, 10, [value(1, 1, -25), value(1, 2, 20), value(1, 2, 10)])
    expect(result[0]?.endBalanceCents).toBe(-15)
    expect(result[1]?.endBalanceCents).toBe(15)
  })

  it('rejects invalid input', () => {
    expect(() => computeCashBalances(2026, 0.5, [])).toThrow(RangeError)
    expect(() => computeCashBalances(2026, 0, [value(1, 1, 5, false, 2025)])).toThrow(RangeError)
    expect(() => computeCashBalances(2026, 0, [value(1, 13, 5)])).toThrow(RangeError)
    expect(() => computeCashBalances(2026, 0, [value(1, 1, 5.5)])).toThrow(RangeError)
    expect(() => computeCashBalances(2026, 0, [value(1, 1, 5, true), value(2, 1, 5, false)])).toThrow(RangeError)
  })
})
