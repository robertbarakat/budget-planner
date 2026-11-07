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
