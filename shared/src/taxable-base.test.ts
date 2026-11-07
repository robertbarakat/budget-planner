import { describe, expect, it } from 'vitest'
import { computeTaxableBaseAndInps } from './taxable-base.ts'

// Test values only: the real ones are per-year parameters.
const params = { profitabilityCoefficient: 67, inpsRate: 26.07 }

describe('computeTaxableBaseAndInps', () => {
  it('base = collections x coefficient; INPS = base x rate (spec example, 10,000 collected)', () => {
    expect(computeTaxableBaseAndInps(1_000_000, params)).toEqual({
      taxableBaseCents: 670_000,
      inpsDueCents: 174_669,
    })
  })

  it('a different INPS rate changes the result', () => {
    const lower = computeTaxableBaseAndInps(1_000_000, { ...params, inpsRate: 24 })
    expect(lower.taxableBaseCents).toBe(670_000)
    expect(lower.inpsDueCents).toBe(160_800)
  })

  it('a different coefficient changes the base', () => {
    expect(computeTaxableBaseAndInps(1_000_000, { ...params, profitabilityCoefficient: 78 }).taxableBaseCents).toBe(780_000)
  })

  it('zero collections give zero base and zero INPS', () => {
    expect(computeTaxableBaseAndInps(0, params)).toEqual({ taxableBaseCents: 0, inpsDueCents: 0 })
  })

  it('rounds half up to the cent at each step', () => {
    // 1,001 cents x 67% = 670.67 -> 671; 671 x 26.07% = 174.9297 -> 175
    expect(computeTaxableBaseAndInps(1_001, params)).toEqual({ taxableBaseCents: 671, inpsDueCents: 175 })
  })

  it('rejects negative or non-integer collections', () => {
    expect(() => computeTaxableBaseAndInps(-100, params)).toThrow(RangeError)
    expect(() => computeTaxableBaseAndInps(10.5, params)).toThrow(RangeError)
  })
})
