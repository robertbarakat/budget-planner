import { describe, expect, it } from 'vitest'
import { generateRecurrenceDueDates } from './recurrence-dates.ts'

const base = { referenceDate: '2026-01-01', horizonMonths: 24 }

describe('generateRecurrenceDueDates', () => {
  it('monthly from January to December returns 12 dates', () => {
    const dates = generateRecurrenceDueDates({
      ...base,
      frequency: 'monthly',
      startDate: '2026-01-15',
      endDate: '2026-12-15',
    })
    expect(dates).toHaveLength(12)
    expect(dates[0]).toBe('2026-01-15')
    expect(dates[11]).toBe('2026-12-15')
  })

  it('due date on the 31st falls on 28/29 February and 30 April', () => {
    const common = { ...base, frequency: 'monthly' as const, startDate: '2026-01-31', endDate: '2026-05-31' }
    expect(generateRecurrenceDueDates(common)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ])
    const leap = generateRecurrenceDueDates({ ...common, startDate: '2028-01-31', endDate: '2028-03-31' })
    expect(leap).toEqual(['2028-01-31', '2028-02-29', '2028-03-31'])
  })

  it('with an end date, no date goes past it (inclusive)', () => {
    const dates = generateRecurrenceDueDates({
      ...base,
      frequency: 'monthly',
      startDate: '2026-01-10',
      endDate: '2026-04-09',
    })
    expect(dates).toEqual(['2026-01-10', '2026-02-10', '2026-03-10'])
    const inclusive = generateRecurrenceDueDates({
      ...base,
      frequency: 'monthly',
      startDate: '2026-01-10',
      endDate: '2026-04-10',
    })
    expect(inclusive.at(-1)).toBe('2026-04-10')
  })

  it('without an end date, no date goes past the horizon', () => {
    const dates = generateRecurrenceDueDates({
      frequency: 'monthly',
      startDate: '2026-01-15',
      referenceDate: '2026-01-01',
      horizonMonths: 24,
    })
    expect(dates.at(-1)).toBe('2027-12-15')
    expect(dates.every((date) => date <= '2028-01-01')).toBe(true)
    expect(dates).toHaveLength(24)
  })

  it('annual on 29 February in a non-leap year falls on 28 February, and back on 29 in leap years', () => {
    const dates = generateRecurrenceDueDates({
      ...base,
      frequency: 'annual',
      startDate: '2024-02-29',
      endDate: '2028-12-31',
    })
    expect(dates).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29'])
  })

  it('bimonthly, quarterly and semiannual step correctly', () => {
    const run = (frequency: 'bimonthly' | 'quarterly' | 'semiannual') =>
      generateRecurrenceDueDates({ ...base, frequency, startDate: '2026-01-05', endDate: '2026-12-31' })
    expect(run('bimonthly')).toHaveLength(6)
    expect(run('quarterly')).toEqual(['2026-01-05', '2026-04-05', '2026-07-05', '2026-10-05'])
    expect(run('semiannual')).toEqual(['2026-01-05', '2026-07-05'])
  })

  it('returns an empty list when the start is past the limit', () => {
    expect(
      generateRecurrenceDueDates({
        ...base,
        frequency: 'monthly',
        startDate: '2026-06-01',
        endDate: '2026-05-31',
      }),
    ).toEqual([])
  })

  it('rejects invalid input', () => {
    const valid = { ...base, frequency: 'monthly' as const, startDate: '2026-01-15' }
    expect(() => generateRecurrenceDueDates({ ...valid, startDate: '2026-02-30' })).toThrow(RangeError)
    expect(() => generateRecurrenceDueDates({ ...valid, horizonMonths: -1 })).toThrow(RangeError)
    expect(() => generateRecurrenceDueDates({ ...valid, frequency: 'weekly' as never })).toThrow(RangeError)
  })
})
