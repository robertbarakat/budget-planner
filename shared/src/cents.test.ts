import { describe, expect, it } from 'vitest'
import { eurosToCents, sumCents } from './cents.ts'

describe('sumCents', () => {
  it('sums amounts in cents', () => {
    expect(sumCents([1250, 399, -50])).toBe(1599)
  })

  it('returns 0 with no amounts', () => {
    expect(sumCents([])).toBe(0)
  })

  it('avoids floating point errors: 10 + 20 cents = exactly 30', () => {
    expect(sumCents([10, 20])).toBe(30)
  })

  it('rejects non-integer amounts', () => {
    expect(() => sumCents([10.5])).toThrow(RangeError)
  })
})

describe('eurosToCents', () => {
  it('converts euros to exact integer cents', () => {
    expect(eurosToCents(0.1)).toBe(10)
    expect(eurosToCents(0.2)).toBe(20)
    expect(eurosToCents(1234.5)).toBe(123_450)
    expect(eurosToCents(-42)).toBe(-4_200)
    expect(eurosToCents(19.99)).toBe(1_999)
  })

  it('rejects non-finite values', () => {
    expect(() => eurosToCents(Number.NaN)).toThrow(RangeError)
  })
})
