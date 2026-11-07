import type { RecurrenceFrequency } from './domain.ts'

export interface RecurrenceDatesInput {
  frequency: RecurrenceFrequency
  /** First due date, `YYYY-MM-DD`. Its day of the month is the anchor of every due date. */
  startDate: string
  /** Last possible due date (inclusive), `YYYY-MM-DD`. Null/undefined: generate up to the horizon. */
  endDate?: string | null
  /** Reference date for the horizon (passed in, never read from the clock), `YYYY-MM-DD`. */
  referenceDate: string
  /** Horizon in months from the reference date, used only when there is no end date. */
  horizonMonths: number
}

const MONTHS_STEP: Record<RecurrenceFrequency, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
}

interface DateParts {
  year: number
  month: number
  day: number
}

function parseDate(value: string, label: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new RangeError(`Invalid ${label}: ${value}`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`Invalid ${label}: ${value}`)
  }
  return { year, month, day }
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function format(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Date `monthsToAdd` months after (year, month), with the anchor day clamped to the month length. */
function addMonthsClamped(year: number, month: number, anchorDay: number, monthsToAdd: number): string {
  const index = year * 12 + (month - 1) + monthsToAdd
  const newYear = Math.floor(index / 12)
  const newMonth = (index % 12) + 1
  return format(newYear, newMonth, Math.min(anchorDay, daysInMonth(newYear, newMonth)))
}

/**
 * Due dates of a recurrence (docs/specifica.md, section 3, "Ricorrenze").
 *
 * - Starts from `startDate` and steps by the frequency; the day of `startDate` is the anchor,
 *   so a due date on the 31st falls on the last day of shorter months (28/29 February, 30 April)
 *   and goes back to the 31st when the month allows it. The same holds for 29 February (annual).
 * - With `endDate`, no date goes past it (inclusive).
 * - Without `endDate`, dates go up to the horizon: `referenceDate` + `horizonMonths` months
 *   (inclusive, same clamping rule).
 * - Returns ISO dates in ascending order; empty if the first date is already past the limit.
 *
 * Pure function: no amounts, no database, no current date.
 */
export function generateRecurrenceDueDates(input: RecurrenceDatesInput): string[] {
  const step = MONTHS_STEP[input.frequency]
  if (step === undefined) {
    throw new RangeError(`Invalid frequency: ${String(input.frequency)}`)
  }
  const start = parseDate(input.startDate, 'start date')
  const reference = parseDate(input.referenceDate, 'reference date')
  if (!Number.isInteger(input.horizonMonths) || input.horizonMonths < 0) {
    throw new RangeError(`Invalid horizon: ${input.horizonMonths}`)
  }

  let limit: string
  if (input.endDate) {
    parseDate(input.endDate, 'end date')
    limit = input.endDate
  } else {
    limit = addMonthsClamped(reference.year, reference.month, reference.day, input.horizonMonths)
  }

  const dates: string[] = []
  for (let n = 0; ; n++) {
    const date = addMonthsClamped(start.year, start.month, start.day, n * step)
    if (date > limit) {
      break
    }
    dates.push(date)
  }
  return dates
}
