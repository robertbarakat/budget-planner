import { describe, expect, it } from 'vitest'
import { computeAdvancesAndBalance } from './advances-balance.ts'

// Test rules only (made up): the real percentages, number of advances and dates are per-year parameters.
const rules = {
  advances: [
    { percent: 40, dueDate: '2031-06-30' },
    { percent: 60, dueDate: '2031-11-30' },
  ],
  balanceDueDate: '2032-06-30',
}
const base = { activityStartYear: 2025, rules }

describe('computeAdvancesAndBalance', () => {
  it('computes advances on the advance base and the balance as the rest', () => {
    const result = computeAdvancesAndBalance({ ...base, year: 2031, dueCents: 120_000, advanceBaseCents: () => 100_000 })
    expect(result.advances).toEqual([
      { amountCents: 40_000, dueDate: '2031-06-30' },
      { amountCents: 60_000, dueDate: '2031-11-30' },
    ])
    expect(result.advancesTotalCents).toBe(100_000)
    expect(result.balance).toEqual({ amountCents: 20_000, dueDate: '2032-06-30' })
    expect(result.creditCents).toBe(0)
  })

  it('each advance is computed on the base up to its own due date', () => {
    // Collections to date (test values): 100,000 cents by the first deadline, 250,000 by the second.
    const collectionsTo = (dueDate: string) => (dueDate === '2031-06-30' ? 100_000 : 250_000)
    const result = computeAdvancesAndBalance({ ...base, year: 2031, dueCents: 300_000, advanceBaseCents: collectionsTo })
    expect(result.advances.map((a) => a.amountCents)).toEqual([40_000, 150_000])
    expect(result.balance.amountCents).toBe(110_000)
  })

  it('first year of activity: no advances, balance is the whole amount due', () => {
    const result = computeAdvancesAndBalance({ ...base, year: 2025, dueCents: 100_500, advanceBaseCents: () => 0 })
    expect(result.advances).toEqual([])
    expect(result.advancesTotalCents).toBe(0)
    expect(result.balance.amountCents).toBe(100_500)
  })

  it('amounts already paid reduce the balance', () => {
    const forecast = computeAdvancesAndBalance({ ...base, year: 2031, dueCents: 120_000, advanceBaseCents: () => 100_000 })
    const partial = computeAdvancesAndBalance({
      ...base,
      year: 2031,
      dueCents: 120_000,
      advanceBaseCents: () => 100_000,
      paidAdvancesCents: 40_000,
    })
    expect(forecast.balance.amountCents).toBe(20_000)
    expect(partial.balance.amountCents).toBe(80_000)
  })

  it('amount paid above the amount due gives balance 0 and a credit', () => {
    const result = computeAdvancesAndBalance({ ...base, year: 2031, dueCents: 50_000, advanceBaseCents: () => 100_000 })
    expect(result.balance.amountCents).toBe(0)
    expect(result.creditCents).toBe(50_000)
  })

  it('no advance rules: the balance is the whole amount due', () => {
    const result = computeAdvancesAndBalance({
      ...base,
      year: 2031,
      dueCents: 70_000,
      advanceBaseCents: () => 100_000,
      rules: { advances: [], balanceDueDate: '2032-06-30' },
    })
    expect(result.advances).toEqual([])
    expect(result.balance.amountCents).toBe(70_000)
  })

  it('rounds each advance half up to the cent', () => {
    const result = computeAdvancesAndBalance({ ...base, year: 2031, dueCents: 1_000, advanceBaseCents: () => 5 })
    expect(result.advances.map((a) => a.amountCents)).toEqual([2, 3]) // 2.0 and 3.0
    const odd = computeAdvancesAndBalance({ ...base, year: 2031, dueCents: 1_000, advanceBaseCents: () => 1 })
    expect(odd.advances.map((a) => a.amountCents)).toEqual([0, 1]) // 0.4 -> 0, 0.6 -> 1
  })

  it('rejects a year before the activity start and invalid inputs', () => {
    expect(() => computeAdvancesAndBalance({ ...base, year: 2024, dueCents: 1, advanceBaseCents: () => 1 })).toThrow(RangeError)
    expect(() => computeAdvancesAndBalance({ ...base, year: 2031, dueCents: -1, advanceBaseCents: () => 1 })).toThrow(RangeError)
    expect(() =>
      computeAdvancesAndBalance({ ...base, year: 2031, dueCents: 1, advanceBaseCents: () => 1, rules: { ...rules, balanceDueDate: 'June' } }),
    ).toThrow(RangeError)
  })
})
