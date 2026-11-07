import { describe, expect, it } from 'vitest'
import { sumCents } from './cents.ts'

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
