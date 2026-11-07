import type { MonthlyValue } from './monthly-values.ts'

export interface MonthlyCashBalance {
  month: number
  /** Net flow of the month: sum of the shown values of all items (real if closed, budgeted otherwise). */
  flowCents: number
  /** Balance at the end of the month: opening balance + cumulative flows up to this month. */
  endBalanceCents: number
  /** True when the month is closed (flow at real values); false when it is still budgeted. */
  isClosed: boolean
}

/**
 * Progressive cash balance, month by month (docs/specifica.md, section 4):
 * balance = opening balance of the year + cumulative flow of each month, with closed months at
 * real values and the others at budgeted values (the `shownCents` of `computeMonthlyValues`).
 *
 * - `openingBalanceCents` is the total opening balance of the year (sum over all accounts).
 * - Transfers are already excluded from the monthly values, so they never move the total cash.
 * - Always returns 12 months. A year without data keeps the opening balance constant.
 * - The closed/open flag comes from the values; a month without any value is reported as open.
 *
 * Pure function, integer cents.
 */
export function computeCashBalances(
  year: number,
  openingBalanceCents: number,
  values: readonly MonthlyValue[],
): MonthlyCashBalance[] {
  if (!Number.isInteger(year)) {
    throw new RangeError(`Invalid year: ${year}`)
  }
  if (!Number.isInteger(openingBalanceCents)) {
    throw new RangeError(`Opening balance is not an integer number of cents: ${openingBalanceCents}`)
  }

  const flows = Array.from({ length: 12 }, () => 0)
  const closedFlags = Array.from({ length: 12 }, (): boolean | undefined => undefined)

  for (const value of values) {
    if (value.year !== year) {
      throw new RangeError(`Value of year ${value.year} given for year ${year}`)
    }
    if (!Number.isInteger(value.month) || value.month < 1 || value.month > 12) {
      throw new RangeError(`Invalid month: ${value.month}`)
    }
    if (!Number.isInteger(value.shownCents)) {
      throw new RangeError(`Amount is not an integer number of cents: ${value.shownCents}`)
    }
    const index = value.month - 1
    if (closedFlags[index] !== undefined && closedFlags[index] !== value.isClosed) {
      throw new RangeError(`Inconsistent closed flag in month ${value.month}`)
    }
    closedFlags[index] = value.isClosed
    flows[index] = (flows[index] ?? 0) + value.shownCents
  }

  let balance = openingBalanceCents
  return flows.map((flowCents, index) => {
    balance += flowCents
    return {
      month: index + 1,
      flowCents,
      endBalanceCents: balance,
      isClosed: closedFlags[index] ?? false,
    }
  })
}
