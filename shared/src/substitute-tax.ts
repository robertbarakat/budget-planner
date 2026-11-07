import { percentOfCents } from './percent.ts'

/** An INPS payment actually made (cash principle): only the payment date decides the year. */
export interface InpsPaymentInput {
  /** Amount paid, in integer cents (> 0). */
  amountCents: number
  /** Payment date, `YYYY-MM-DD`. The reference year of the contribution does not matter. */
  paymentDate: string
  /** True if the payment is one instalment of a rescheduled debt (see `deductInstalments`). */
  isInstalment?: boolean
}

export interface SubstituteTaxInput {
  /** Tax year whose payments are deducted. */
  year: number
  /** Taxable base of the year, in cents (from `computeTaxableBaseAndInps`). */
  taxableBaseCents: number
  /** Substitute tax rate of the year in percent (two decimals at most). */
  substituteTaxRate: number
  /** All INPS payments known: those outside `year` are ignored. */
  inpsPayments: readonly InpsPaymentInput[]
  /**
   * Explicit option for payments made by instalments (BP-95: deductible, modifiable parameter).
   * When false, payments flagged `isInstalment` are not deducted.
   */
  deductInstalments: boolean
}

export interface SubstituteTaxResult {
  /** INPS actually paid in `year` that is deducted, in cents. */
  inpsPaidInYearCents: number
  /** Amount the tax is computed on: taxable base - INPS paid in the year, never below zero. */
  taxableAfterDeductionCents: number
  /** Substitute tax of the year, in cents, never negative. */
  taxCents: number
}

function yearOf(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) {
    throw new RangeError(`Invalid payment date: ${date}`)
  }
  return Number(match[1])
}

/**
 * Substitute tax = rate x (taxable base - INPS paid in the year), cash principle (spec, section 7).
 * Rounding: half up to the cent, on the amount after the deduction. The tax never goes below zero:
 * if the INPS paid exceeds the base, the tax is 0 (the surplus is not carried over here).
 */
export function computeSubstituteTax(input: SubstituteTaxInput): SubstituteTaxResult {
  let inpsPaidInYearCents = 0
  for (const payment of input.inpsPayments) {
    if (!Number.isSafeInteger(payment.amountCents) || payment.amountCents <= 0) {
      throw new RangeError(`Payment is not a positive integer number of cents: ${payment.amountCents}`)
    }
    if (yearOf(payment.paymentDate) !== input.year) continue
    if (payment.isInstalment === true && !input.deductInstalments) continue
    inpsPaidInYearCents += payment.amountCents
  }
  const taxableAfterDeductionCents = Math.max(0, input.taxableBaseCents - inpsPaidInYearCents)
  const taxCents = percentOfCents(taxableAfterDeductionCents, input.substituteTaxRate)
  return { inpsPaidInYearCents, taxableAfterDeductionCents, taxCents }
}
