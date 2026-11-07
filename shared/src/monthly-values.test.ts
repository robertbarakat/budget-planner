import { describe, expect, it } from 'vitest'
import {
  computeMonthlyValues,
  type ActualTransactionInput,
  type BudgetEntryInput,
  type BudgetItemInput,
  type MonthlyValuesInput,
} from './monthly-values.ts'

const entry = (budgetItemId: number, month: number, amountCents: number, year = 2026): BudgetEntryInput => ({
  budgetItemId,
  year,
  month,
  amountCents,
})
const tx = (
  type: ActualTransactionInput['type'],
  budgetItemId: number | null,
  transactionDate: string,
  amountCents: number,
): ActualTransactionInput => ({ type, budgetItemId, transactionDate, amountCents })

// item 1 is an expense item, item 2 an income item
const items: BudgetItemInput[] = [
  { budgetItemId: 1, kind: 'expense' },
  { budgetItemId: 2, kind: 'income' },
]

const base = (over: Partial<MonthlyValuesInput>): MonthlyValuesInput => ({
  year: 2026,
  budgetItems: items.slice(0, 1),
  budgetEntries: [],
  transactions: [],
  closedMonths: [],
  ...over,
})
const cell = (values: ReturnType<typeof computeMonthlyValues>, budgetItemId: number, month: number) =>
  values.find((v) => v.budgetItemId === budgetItemId && v.month === month)

describe('computeMonthlyValues', () => {
  it('shows the real value for a closed month, even when it differs from the budget', () => {
    const values = computeMonthlyValues(
      base({
        budgetEntries: [entry(1, 3, 50_000)],
        transactions: [tx('expense', 1, '2026-03-10', 62_000)],
        closedMonths: [{ year: 2026, month: 3 }],
      }),
    )
    expect(cell(values, 1, 3)).toMatchObject({
      budgetedCents: -50_000,
      actualCents: -62_000,
      shownCents: -62_000,
      isClosed: true,
    })
  })

  it('shows the budget for an open month and returns the partial real next to it', () => {
    const values = computeMonthlyValues(
      base({
        budgetEntries: [entry(1, 11, 50_000)],
        transactions: [tx('expense', 1, '2026-11-02', 12_000)],
      }),
    )
    expect(cell(values, 1, 11)).toMatchObject({
      budgetedCents: -50_000,
      actualCents: -12_000,
      shownCents: -50_000,
      isClosed: false,
    })
  })

  it('does not let a transfer change the total of the month', () => {
    const withTransfer = computeMonthlyValues(
      base({
        transactions: [tx('income', 1, '2026-05-01', 100_000), tx('transfer', null, '2026-05-02', 40_000)],
        closedMonths: [{ year: 2026, month: 5 }],
      }),
    )
    const without = computeMonthlyValues(
      base({
        transactions: [tx('income', 1, '2026-05-01', 100_000)],
        closedMonths: [{ year: 2026, month: 5 }],
      }),
    )
    expect(cell(withTransfer, 1, 5)?.shownCents).toBe(100_000)
    expect(withTransfer).toEqual(without)
  })

  it('values a month without transactions or lines at 0', () => {
    const values = computeMonthlyValues(base({ closedMonths: [{ year: 2026, month: 2 }] }))
    expect(cell(values, 1, 2)).toEqual({
      budgetItemId: 1,
      year: 2026,
      month: 2,
      budgetedCents: 0,
      actualCents: 0,
      shownCents: 0,
      isClosed: true,
    })
    expect(cell(values, 1, 9)?.shownCents).toBe(0)
  })

  it('sums several budget lines with different origins on the same item and month', () => {
    const values = computeMonthlyValues(
      base({ budgetEntries: [entry(1, 6, 10_000), entry(1, 6, 2_550), entry(1, 6, 500)] }),
    )
    expect(cell(values, 1, 6)?.budgetedCents).toBe(-13_050)
  })

  it('gives the same budget line a positive sign on an income item and a negative one on an expense item', () => {
    const values = computeMonthlyValues(
      base({
        budgetItems: items,
        budgetEntries: [entry(1, 4, 12_345), entry(2, 4, 12_345)],
      }),
    )
    expect(cell(values, 1, 4)?.budgetedCents).toBe(-12_345)
    expect(cell(values, 2, 4)?.budgetedCents).toBe(12_345)
  })

  it('counts income as positive and expenses as negative', () => {
    const values = computeMonthlyValues(
      base({
        transactions: [
          tx('income', 1, '2026-01-10', 300_000),
          tx('expense', 1, '2026-01-12', 45_000),
          tx('expense', 1, '2026-01-31', 5_000),
        ],
        closedMonths: [{ year: 2026, month: 1 }],
      }),
    )
    expect(cell(values, 1, 1)?.actualCents).toBe(250_000)
  })

  it('returns 12 months per item, in the given item order, and ignores other years', () => {
    const values = computeMonthlyValues(
      base({
        budgetItems: [
          { budgetItemId: 7, kind: 'expense' },
          { budgetItemId: 3, kind: 'income' },
        ],
        budgetEntries: [entry(7, 1, 100, 2025), entry(3, 1, 200, 2027), entry(3, 2, 300)],
        transactions: [tx('income', 7, '2025-01-05', 999), tx('income', 3, '2026-02-05', 400)],
        closedMonths: [{ year: 2025, month: 1 }],
      }),
    )
    expect(values).toHaveLength(24)
    expect(values.slice(0, 12).every((v) => v.budgetItemId === 7)).toBe(true)
    expect(values.slice(12).map((v) => v.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(cell(values, 7, 1)).toMatchObject({ budgetedCents: 0, actualCents: 0, isClosed: false })
    expect(cell(values, 3, 1)?.budgetedCents).toBe(0)
    expect(cell(values, 3, 2)).toMatchObject({ budgetedCents: 300, actualCents: 400 })
  })

  it('rejects invalid input', () => {
    expect(() => computeMonthlyValues(base({ budgetEntries: [entry(99, 1, 1)] }))).toThrow(RangeError)
    expect(() => computeMonthlyValues(base({ budgetEntries: [entry(1, 13, 1)] }))).toThrow(RangeError)
    expect(() => computeMonthlyValues(base({ budgetEntries: [entry(1, 1, 1.5)] }))).toThrow(RangeError)
    expect(() => computeMonthlyValues(base({ transactions: [tx('expense', null, '2026-01-01', 5)] }))).toThrow(RangeError)
    expect(() => computeMonthlyValues(base({ transactions: [tx('expense', 99, '2026-01-01', 5)] }))).toThrow(RangeError)
    expect(() => computeMonthlyValues(base({ transactions: [tx('expense', 1, '2026-13-01', 5)] }))).toThrow(RangeError)
    expect(() => computeMonthlyValues(base({ transactions: [tx('expense', 1, '01/02/2026', 5)] }))).toThrow(RangeError)
    expect(() => computeMonthlyValues(base({ transactions: [tx('expense', 1, '2026-01-01', 0)] }))).toThrow(RangeError)
    expect(() => computeMonthlyValues(base({ budgetItems: [...items.slice(0, 1), ...items.slice(0, 1)] }))).toThrow(RangeError)
    expect(() => computeMonthlyValues(base({ budgetEntries: [entry(1, 1, -5)] }))).toThrow(RangeError)
    expect(() => computeMonthlyValues(base({ closedMonths: [{ year: 2026, month: 0 }] }))).toThrow(RangeError)
  })
})
