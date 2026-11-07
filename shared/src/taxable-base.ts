import { percentOfCents } from './percent.ts'

/** Parameters of the tax year, passed in (from `tax_parameters`): never constants in the code. */
export interface TaxableBaseParameters {
  /** Profitability coefficient in percent (two decimals at most). */
  profitabilityCoefficient: number
  /** INPS rate in percent (two decimals at most). */
  inpsRate: number
}

export interface TaxableBaseResult {
  /** Taxable base = collections x profitability coefficient, in cents. */
  taxableBaseCents: number
  /** INPS due on the year = taxable base x INPS rate, in cents. It is an amount "due", not a deduction. */
  inpsDueCents: number
}

/**
 * Computes the taxable base and the INPS contributions due for a year.
 *
 * Rounding: each step rounds half up to the cent. The INPS is computed on the already rounded
 * taxable base (the amount that is declared), not on the unrounded product.
 * `collectionsCents`: professional collections of the year (integer cents, >= 0).
 */
export function computeTaxableBaseAndInps(
  collectionsCents: number,
  parameters: TaxableBaseParameters,
): TaxableBaseResult {
  const taxableBaseCents = percentOfCents(collectionsCents, parameters.profitabilityCoefficient)
  const inpsDueCents = percentOfCents(taxableBaseCents, parameters.inpsRate)
  return { taxableBaseCents, inpsDueCents }
}
