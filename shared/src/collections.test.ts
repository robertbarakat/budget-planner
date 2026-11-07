import { describe, expect, it } from 'vitest'
import { computeExpectedCollections, type ClientInput } from './collections.ts'

const rate = (validFromYear: number, validFromMonth: number, dailyRateCents: number) => ({
  validFromYear,
  validFromMonth,
  dailyRateCents,
})
const client = (id: number, collectionDelayMonths: number, ...rates: ReturnType<typeof rate>[]): ClientInput => ({
  id,
  collectionDelayMonths,
  rates,
})
const work = (clientId: number, year: number, month: number, days: number) => ({
  clientId,
  year,
  month,
  days,
})

describe('computeExpectedCollections', () => {
  it('collects at work month + delay', () => {
    const result = computeExpectedCollections([client(1, 2, rate(2026, 1, 25_000))], [work(1, 2026, 3, 20)])
    expect(result).toEqual([
      { clientId: 1, year: 2026, month: 5, workYear: 2026, workMonth: 3, amountCents: 500_000 },
    ])
  })

  it('moves work done in November with a 2-month delay to January of the next year', () => {
    const result = computeExpectedCollections([client(1, 2, rate(2026, 1, 25_000))], [work(1, 2026, 11, 10)])
    expect(result).toEqual([
      { clientId: 1, year: 2027, month: 1, workYear: 2026, workMonth: 11, amountCents: 250_000 },
    ])
  })

  it('moves work done in December with a 1-month delay to January and with 2 months to February', () => {
    const one = computeExpectedCollections([client(1, 1, rate(2026, 1, 10_000))], [work(1, 2026, 12, 1)])
    const two = computeExpectedCollections([client(1, 2, rate(2026, 1, 10_000))], [work(1, 2026, 12, 1)])
    expect([one[0]?.year, one[0]?.month]).toEqual([2027, 1])
    expect([two[0]?.year, two[0]?.month]).toEqual([2027, 2])
  })

  it('applies the right rate to each month when the rate changes mid-year', () => {
    const bit = client(1, 2, rate(2026, 1, 30_000), rate(2026, 7, 28_000))
    const result = computeExpectedCollections([bit], [
      work(1, 2026, 6, 10),
      work(1, 2026, 7, 10),
      work(1, 2026, 12, 10),
    ])
    expect(result.map((r) => [r.workMonth, r.amountCents])).toEqual([
      [6, 300_000],
      [7, 280_000],
      [12, 280_000],
    ])
  })

  it('keeps the old rate for past months when the rates are given in any order', () => {
    const unordered = client(1, 0, rate(2026, 7, 28_000), rate(2026, 1, 30_000))
    const result = computeExpectedCollections([unordered], [work(1, 2026, 3, 1)])
    expect(result[0]?.amountCents).toBe(30_000)
  })

  it('handles delay 0: collected in the same month', () => {
    const result = computeExpectedCollections([client(1, 0, rate(2026, 1, 20_000))], [work(1, 2026, 4, 5)])
    expect([result[0]?.year, result[0]?.month]).toEqual([2026, 4])
  })

  it('handles 0 days: a 0 collection', () => {
    const result = computeExpectedCollections([client(1, 2, rate(2026, 1, 25_000))], [work(1, 2026, 8, 0)])
    expect(result[0]?.amountCents).toBe(0)
  })

  it('fails explicitly for a client without a rate when there are days to pay', () => {
    expect(() => computeExpectedCollections([client(1, 2)], [work(1, 2026, 3, 5)])).toThrow(/no daily rate/)
  })

  it('fails when the work month is before the first rate starts', () => {
    expect(() =>
      computeExpectedCollections([client(1, 2, rate(2026, 6, 25_000))], [work(1, 2026, 5, 5)]),
    ).toThrow(/no daily rate/)
  })

  it('does not need a rate for months with 0 days', () => {
    const result = computeExpectedCollections([client(1, 2)], [work(1, 2026, 3, 0)])
    expect(result[0]?.amountCents).toBe(0)
  })

  it('computes fractions of a day in exact cents', () => {
    const result = computeExpectedCollections([client(1, 0, rate(2026, 1, 25_000))], [
      work(1, 2026, 1, 0.5),
      work(1, 2026, 2, 7.25),
      work(1, 2026, 3, 0.1),
    ])
    expect(result.map((r) => r.amountCents)).toEqual([12_500, 181_250, 2_500])
  })

  it('rounds to the nearest cent', () => {
    // 10.5 days x 333.33 EUR = 3499.965 EUR -> 349,997 cents
    const result = computeExpectedCollections([client(1, 0, rate(2026, 1, 33_333))], [work(1, 2026, 1, 10.5)])
    expect(result[0]?.amountCents).toBe(349_997)
  })

  it('sorts by client, then by collection month, and handles several clients', () => {
    const result = computeExpectedCollections(
      [client(2, 1, rate(2026, 1, 25_000)), client(1, 2, rate(2026, 1, 25_000))],
      [work(2, 2026, 1, 1), work(1, 2026, 12, 1), work(1, 2026, 1, 1)],
    )
    expect(result.map((r) => [r.clientId, r.year, r.month])).toEqual([
      [1, 2026, 3],
      [1, 2027, 2],
      [2, 2026, 2],
    ])
  })

  it('returns nothing without worked days', () => {
    expect(computeExpectedCollections([client(1, 2, rate(2026, 1, 25_000))], [])).toEqual([])
  })

  it('rejects invalid input', () => {
    const c = client(1, 2, rate(2026, 1, 25_000))
    expect(() => computeExpectedCollections([c], [work(9, 2026, 1, 1)])).toThrow(RangeError)
    expect(() => computeExpectedCollections([c], [work(1, 2026, 13, 1)])).toThrow(RangeError)
    expect(() => computeExpectedCollections([c], [work(1, 2026, 1, -1)])).toThrow(RangeError)
    expect(() => computeExpectedCollections([c], [work(1, 2026, 1, 1), work(1, 2026, 1, 2)])).toThrow(RangeError)
    expect(() => computeExpectedCollections([client(1, -1)], [])).toThrow(RangeError)
    expect(() => computeExpectedCollections([client(1, 1.5)], [])).toThrow(RangeError)
    expect(() => computeExpectedCollections([client(1, 0, rate(2026, 1, 10.5))], [])).toThrow(RangeError)
    expect(() =>
      computeExpectedCollections([client(1, 0, rate(2026, 1, 100), rate(2026, 1, 200))], []),
    ).toThrow(RangeError)
    expect(() => computeExpectedCollections([c, c], [])).toThrow(RangeError)
  })
})
