import { percentOfCents } from './percent.ts'

/** One advance payment rule of the year: percentage of the advance base and due date. */
export interface AdvanceRule {
  /** Percentage of `advanceBaseCents` due with this advance (two decimals at most). */
  percent: number
  /** Due date, `YYYY-MM-DD`. */
  dueDate: string
}

/** Rules of the tax year, as stored per year (taken from the accountant's F24): never constants in the code. */
export interface AdvancesBalanceRules {
  /** Advance payments, in order. Empty array: no advances for this year. */
  advances: readonly AdvanceRule[]
  /** Due date of the balance, `YYYY-MM-DD`. */
  balanceDueDate: string
}

export interface AdvancesBalanceInput {
  /** Year the amounts refer to. */
  year: number
  /** First year of activity: no advances are due in that year. */
  activityStartYear: number
  /** Amount due for the year (substitute tax or INPS), in cents. */
  dueCents: number
  /** Amount the advances are computed on (e.g. a previous-year figure, chosen by the caller), in cents. */
  advanceBaseCents: number
  /**
   * Advances already paid for this year, in cents. If omitted, the scheduled advances are assumed
   * to be paid in full (forecast).
   */
  paidAdvancesCents?: number
  rules: AdvancesBalanceRules
}

export interface ScheduledPayment {
  amountCents: number
  dueDate: string
}

export interface AdvancesBalanceResult {
  advances: ScheduledPayment[]
  advancesTotalCents: number
  /** Balance still to pay, in cents (never negative). */
  balance: ScheduledPayment
  /** Overpayment when the amount paid exceeds the amount due, in cents (0 otherwise). */
  creditCents: number
}

function checkDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError(`Invalid date: ${value}`)
  }
}

function checkCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} is not a non-negative integer number of cents: ${value}`)
  }
}

/**
 * Splits the amount due for a year into advances and balance, following rules passed in.
 *
 * - Each advance = advance base x its percentage, rounded half up to the cent.
 * - In the first year of activity no advances are due (the balance is the whole amount due).
 * - Balance = amount due - advances paid (actual if given, otherwise the scheduled ones); never negative,
 *   an excess is returned as `creditCents`.
 */
export function computeAdvancesAndBalance(input: AdvancesBalanceInput): AdvancesBalanceResult {
  if (input.year < input.activityStartYear) {
    throw new RangeError(`Year ${input.year} is before the activity start year ${input.activityStartYear}`)
  }
  checkCents(input.dueCents, 'Amount due')
  checkCents(input.advanceBaseCents, 'Advance base')
  if (input.paidAdvancesCents !== undefined) checkCents(input.paidAdvancesCents, 'Paid advances')
  checkDate(input.rules.balanceDueDate)

  const isFirstYear = input.year === input.activityStartYear
  const advances: ScheduledPayment[] = []
  if (!isFirstYear) {
    for (const rule of input.rules.advances) {
      checkDate(rule.dueDate)
      advances.push({ amountCents: percentOfCents(input.advanceBaseCents, rule.percent), dueDate: rule.dueDate })
    }
  }
  const advancesTotalCents = advances.reduce((sum, advance) => sum + advance.amountCents, 0)

  const paidCents = input.paidAdvancesCents ?? advancesTotalCents
  const remaining = input.dueCents - paidCents
  return {
    advances,
    advancesTotalCents,
    balance: { amountCents: Math.max(0, remaining), dueDate: input.rules.balanceDueDate },
    creditCents: Math.max(0, -remaining),
  }
}
