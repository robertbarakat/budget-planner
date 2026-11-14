import type { F24TaxType } from './f24-calendar.ts'

/** A capital line of a rescheduled debt: one tax and year, paid in equal capital shares. */
export interface InstallmentLineInput {
  taxType: F24TaxType
  referenceYear: number
  /** Capital paid in each instalment (cents). */
  quotaCents: number
  /** Last instalment in which the line is paid; `null` = until the end. Afterwards no capital and no interest. */
  lastNumber: number | null
}

export interface InstallmentScheduleRow {
  number: number
  dueDate: string
  taxType: F24TaxType
  referenceYear: number
  principalCents: number
  interestCents: number
}

/** Interest in basis points of the quota (1 bp = 0.01%) for an instalment: 0 for the 1st, 0.18% for the 2nd, +0.33 points per instalment. */
export function installmentInterestBasisPoints(number: number): number {
  if (!Number.isInteger(number) || number < 1) throw new RangeError(`Invalid instalment number: ${number}`)
  return number === 1 ? 0 : 18 + 33 * (number - 2)
}

/** `YYYY-MM-DD` plus whole months, clamped to the last day of the month (31 Jan + 1 = 28/29 Feb). */
export function addMonthsIso(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number]
  const index = year * 12 + (month - 1) + months
  const y = Math.floor(index / 12)
  const m = (index % 12) + 1
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
}

/**
 * The instalment schedule: one row per instalment and line, with capital and interest (rounded to the cent, line by line).
 * Instalments are monthly from `firstDueDate`.
 */
export function buildInstallmentSchedule(input: {
  lines: readonly InstallmentLineInput[]
  count: number
  firstDueDate: string
}): InstallmentScheduleRow[] {
  if (!Number.isInteger(input.count) || input.count < 1) throw new RangeError(`Invalid instalment count: ${input.count}`)
  const rows: InstallmentScheduleRow[] = []
  for (let number = 1; number <= input.count; number += 1) {
    const dueDate = addMonthsIso(input.firstDueDate, number - 1)
    for (const line of input.lines) {
      if (!Number.isSafeInteger(line.quotaCents) || line.quotaCents <= 0) throw new RangeError(`Invalid quota: ${line.quotaCents}`)
      if (line.lastNumber !== null && number > line.lastNumber) continue
      rows.push({
        number,
        dueDate,
        taxType: line.taxType,
        referenceYear: line.referenceYear,
        principalCents: line.quotaCents,
        interestCents: Math.round((line.quotaCents * installmentInterestBasisPoints(number)) / 10000),
      })
    }
  }
  return rows
}
