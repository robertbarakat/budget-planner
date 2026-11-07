import { describe, expect, it } from 'vitest'
import { computeSubstituteTax } from './substitute-tax.ts'

// Test values only: the real rates are per-year parameters.
const rate = 15
const base = { substituteTaxRate: rate, deductInstalments: true }

describe('computeSubstituteTax', () => {
  it('first year (2025): no INPS paid in the year, tax on the whole base', () => {
    const result = computeSubstituteTax({ ...base, year: 2025, taxableBaseCents: 670_000, inpsPayments: [] })
    expect(result).toEqual({ inpsPaidInYearCents: 0, taxableAfterDeductionCents: 670_000, taxCents: 100_500 })
  })

  it('2026: deducts the 2025 INPS paid in 2026 plus the 2026 advances paid in 2026', () => {
    const result = computeSubstituteTax({
      ...base,
      year: 2026,
      taxableBaseCents: 1_340_000,
      inpsPayments: [
        { amountCents: 174_669, paymentDate: '2026-06-30' }, // INPS 2025 balance
        { amountCents: 100_000, paymentDate: '2026-11-30' }, // INPS 2026 advance
      ],
    })
    expect(result.inpsPaidInYearCents).toBe(274_669)
    expect(result.taxableAfterDeductionCents).toBe(1_065_331)
    expect(result.taxCents).toBe(159_800) // 15% x 10,653.31 = 1,597.9965 -> 1,598.00
  })

  it('cash principle: only payments made in the year count', () => {
    const result = computeSubstituteTax({
      ...base,
      year: 2026,
      taxableBaseCents: 1_000_000,
      inpsPayments: [
        { amountCents: 50_000, paymentDate: '2025-12-31' },
        { amountCents: 70_000, paymentDate: '2026-01-01' },
        { amountCents: 90_000, paymentDate: '2026-12-31' },
        { amountCents: 30_000, paymentDate: '2027-01-01' },
      ],
    })
    expect(result.inpsPaidInYearCents).toBe(160_000)
  })

  it('INPS paid above the base gives tax 0, not negative', () => {
    const result = computeSubstituteTax({
      ...base,
      year: 2026,
      taxableBaseCents: 100_000,
      inpsPayments: [{ amountCents: 250_000, paymentDate: '2026-03-10' }],
    })
    expect(result).toEqual({ inpsPaidInYearCents: 250_000, taxableAfterDeductionCents: 0, taxCents: 0 })
  })

  it('instalment payments are deducted by default, excluded with the explicit option', () => {
    const payments = [
      { amountCents: 100_000, paymentDate: '2026-02-10', isInstalment: true },
      { amountCents: 100_000, paymentDate: '2026-03-10', isInstalment: true },
      { amountCents: 50_000, paymentDate: '2026-06-30' },
    ]
    const input = { year: 2026, taxableBaseCents: 1_000_000, substituteTaxRate: rate, inpsPayments: payments }
    expect(computeSubstituteTax({ ...input, deductInstalments: true }).inpsPaidInYearCents).toBe(250_000)
    expect(computeSubstituteTax({ ...input, deductInstalments: false }).inpsPaidInYearCents).toBe(50_000)
  })

  it('a different rate changes the tax; rounds half up to the cent', () => {
    const input = { year: 2026, taxableBaseCents: 1_000_001, inpsPayments: [], deductInstalments: true }
    expect(computeSubstituteTax({ ...input, substituteTaxRate: 5 }).taxCents).toBe(50_000) // 500.0005 -> 500.00
    expect(computeSubstituteTax({ ...input, substituteTaxRate: 50 }).taxCents).toBe(500_001) // 500,000.5 -> half up
  })

  it('rejects invalid payments', () => {
    const input = { ...base, year: 2026, taxableBaseCents: 100 }
    expect(() => computeSubstituteTax({ ...input, inpsPayments: [{ amountCents: 0, paymentDate: '2026-01-01' }] })).toThrow(RangeError)
    expect(() => computeSubstituteTax({ ...input, inpsPayments: [{ amountCents: 10, paymentDate: '01/01/2026' }] })).toThrow(RangeError)
  })
})
