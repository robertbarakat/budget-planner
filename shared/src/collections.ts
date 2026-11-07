/** A daily rate that applies from the given month until the next rate of the same client starts. */
export interface ClientRateInput {
  validFromYear: number
  validFromMonth: number
  dailyRateCents: number
}

export interface ClientInput {
  id: number
  /** Months between the month of work and the month the money arrives. */
  collectionDelayMonths: number
  rates: readonly ClientRateInput[]
}

/** Planned working days of a client in a month (fractions of a day are allowed). */
export interface WorkedDaysInput {
  clientId: number
  year: number
  month: number
  days: number
}

export interface ExpectedCollection {
  clientId: number
  /** Month in which the money is expected (work month + client delay). */
  year: number
  month: number
  /** Month of work that generated this collection. */
  workYear: number
  workMonth: number
  amountCents: number
}

/**
 * Expected collections of the revenue driver (docs/specifica.md, section 6).
 *
 * - Revenue of month M = days worked in M x the daily rate valid in M (the rate with the latest start
 *   not after M). Past months keep the rate they had then.
 * - The collection falls in month M + client delay, even in a later year (November work with a
 *   2-month delay is collected in January of the next year).
 * - Amounts are integer cents; days are handled in hundredths of a day and the result is rounded
 *   to the nearest cent.
 * - Work with days > 0 in a month where the client has no valid rate is an error, never a silent 0.
 *   Months with 0 days produce a 0 collection and do not need a rate.
 *
 * Pure function: no I/O. Result sorted by client, then collection year and month.
 */
export function computeExpectedCollections(
  clients: readonly ClientInput[],
  workedDays: readonly WorkedDaysInput[],
): ExpectedCollection[] {
  const clientsById = new Map<number, ClientInput>()
  for (const client of clients) {
    if (clientsById.has(client.id)) {
      throw new RangeError(`Duplicate client ${client.id}`)
    }
    if (!Number.isInteger(client.collectionDelayMonths) || client.collectionDelayMonths < 0) {
      throw new RangeError(
        `Collection delay must be a non-negative integer of months (client ${client.id}): ${client.collectionDelayMonths}`,
      )
    }
    validateRates(client)
    clientsById.set(client.id, client)
  }

  const seen = new Set<string>()
  const result: ExpectedCollection[] = []

  for (const { clientId, year, month, days } of workedDays) {
    const client = clientsById.get(clientId)
    if (!client) {
      throw new RangeError(`Worked days refer to an unknown client: ${clientId}`)
    }
    assertMonth(year, month)
    if (!Number.isFinite(days) || days < 0) {
      throw new RangeError(`Days must be a non-negative number (client ${clientId}): ${days}`)
    }
    const key = `${clientId}-${year}-${month}`
    if (seen.has(key)) {
      throw new RangeError(`Duplicate worked days for client ${clientId} in ${year}-${month}`)
    }
    seen.add(key)

    const rateCents = rateInForce(client, year, month)
    if (rateCents === undefined && days > 0) {
      throw new RangeError(`Client ${clientId} has no daily rate valid in ${year}-${month}`)
    }
    const amountCents =
      rateCents === undefined ? 0 : Math.round((Math.round(days * 100) * rateCents) / 100)

    const collectionIndex = monthIndex(year, month) + client.collectionDelayMonths
    result.push({
      clientId,
      year: Math.floor(collectionIndex / 12),
      month: (collectionIndex % 12) + 1,
      workYear: year,
      workMonth: month,
      amountCents,
    })
  }

  return result.sort(
    (a, b) => a.clientId - b.clientId || a.year - b.year || a.month - b.month,
  )
}

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1)
}

function assertMonth(year: number, month: number): void {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid year/month: ${year}-${month}`)
  }
}

function validateRates(client: ClientInput): void {
  const starts = new Set<number>()
  for (const rate of client.rates) {
    assertMonth(rate.validFromYear, rate.validFromMonth)
    if (!Number.isInteger(rate.dailyRateCents) || rate.dailyRateCents < 0) {
      throw new RangeError(
        `Daily rate must be a non-negative integer of cents (client ${client.id}): ${rate.dailyRateCents}`,
      )
    }
    const start = monthIndex(rate.validFromYear, rate.validFromMonth)
    if (starts.has(start)) {
      throw new RangeError(`Two rates start in the same month for client ${client.id}`)
    }
    starts.add(start)
  }
}

/** Daily rate of the client in the given month, or undefined if none has started yet. */
function rateInForce(client: ClientInput, year: number, month: number): number | undefined {
  const target = monthIndex(year, month)
  let best: { start: number; dailyRateCents: number } | undefined
  for (const rate of client.rates) {
    const start = monthIndex(rate.validFromYear, rate.validFromMonth)
    if (start <= target && (best === undefined || start > best.start)) {
      best = { start, dailyRateCents: rate.dailyRateCents }
    }
  }
  return best?.dailyRateCents
}
