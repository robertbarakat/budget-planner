import { describe, expect, it } from 'vitest'
import { percentOfCents } from './percent.ts'

describe('percentOfCents', () => {
  it('applies a percentage with two decimals', () => {
    expect(percentOfCents(670_000, 26.07)).toBe(174_669)
  })

  it('rounds half up to the cent', () => {
    expect(percentOfCents(10, 5)).toBe(1) // 0.5 -> 1
    expect(percentOfCents(9, 5)).toBe(0) // 0.45 -> 0
    expect(percentOfCents(1, 50)).toBe(1) // 0.5 -> 1
    expect(percentOfCents(1, 49.99)).toBe(0)
  })

  it('handles 0 and 100 percent and zero amounts', () => {
    expect(percentOfCents(12_345, 0)).toBe(0)
    expect(percentOfCents(12_345, 100)).toBe(12_345)
    expect(percentOfCents(0, 67)).toBe(0)
  })

  it('rejects invalid amounts and percentages', () => {
    expect(() => percentOfCents(1.5, 10)).toThrow(RangeError)
    expect(() => percentOfCents(-1, 10)).toThrow(RangeError)
    expect(() => percentOfCents(100, -1)).toThrow(RangeError)
    expect(() => percentOfCents(100, 100.01)).toThrow(RangeError)
    expect(() => percentOfCents(100, Number.NaN)).toThrow(RangeError)
  })
})
