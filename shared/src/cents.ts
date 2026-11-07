/**
 * Sums amounts expressed in integer cents.
 * Example function: shows the shared/ conventions (pure functions, integer cents).
 */
export function sumCents(amounts: readonly number[]): number {
  let total = 0
  for (const amount of amounts) {
    if (!Number.isInteger(amount)) {
      throw new RangeError(`Amount is not an integer number of cents: ${amount}`)
    }
    total += amount
  }
  return total
}

/**
 * Converts an amount in euros (as stored in numeric(12,2) columns) to integer cents.
 * Rounds to the nearest cent, so 0.1 and 0.2 become exactly 10 and 20.
 */
export function eurosToCents(euros: number): number {
  if (!Number.isFinite(euros)) {
    throw new RangeError(`Amount is not a finite number: ${euros}`)
  }
  return Math.round(euros * 100)
}
