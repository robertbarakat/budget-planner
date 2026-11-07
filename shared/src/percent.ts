/**
 * Applies a percentage (two decimals at most, e.g. 12.34 = 12,34%) to an amount in integer cents.
 * Rounding: half up to the cent (0.5 cent rounds to 1), done with integers so there are no
 * floating-point surprises. The amount must be a non-negative integer number of cents.
 */
export function percentOfCents(cents: number, percent: number): number {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError(`Amount is not a non-negative integer number of cents: ${cents}`)
  }
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`Percentage out of range 0-100: ${percent}`)
  }
  // Percentages have two decimals: work in hundredths of a percent.
  const hundredths = Math.round(percent * 100)
  return Math.floor((cents * hundredths * 2 + 10_000) / 20_000)
}
