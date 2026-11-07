import type { AdvancesBalanceResult } from './advances-balance.ts'

/** Tax types of the F24 calendar (same values as the `tax_type` enum of the database). */
export type F24TaxType =
  | 'substitute_tax'
  | 'substitute_tax_advance'
  | 'substitute_tax_balance'
  | 'inps'
  | 'inps_advance'
  | 'inps_balance'

/** Advances and balance of one tax, as computed by `computeAdvancesAndBalance`, for one reference year. */
export interface F24TaxSource {
  /** Year the amounts refer to (the balance usually falls in the following calendar year). */
  referenceYear: number
  /** Which tax the result belongs to. */
  tax: 'substitute_tax' | 'inps'
  result: Pick<AdvancesBalanceResult, 'advances' | 'balance'>
}

/** An active instalment of a rescheduled debt (row of `installments`), paid by the caller's choice. */
export interface F24InstallmentInput {
  referenceYear: number
  taxType: F24TaxType
  /** Progressive number of the instalment in its plan. */
  number: number
  dueDate: string
  amountCents: number
}

export interface F24CalendarInput {
  /** Calendar year of the due dates: only deadlines falling in this year are listed. */
  year: number
  sources: readonly F24TaxSource[]
  /** Active instalments (the caller leaves out the ones no longer due). */
  installments: readonly F24InstallmentInput[]
}

export interface F24Deadline {
  referenceYear: number
  taxType: F24TaxType
  /** `YYYY-MM-DD`. */
  dueDate: string
  amountCents: number
  /** Set for instalments: they stay distinct from the tax amounts due on the same date. */
  installmentNumber?: number
}

export interface F24Calendar {
  /** Sorted by date, then reference year, then tax type, then instalment number. */
  deadlines: F24Deadline[]
  /** Sum of all deadlines, in cents. */
  totalCents: number
}

function checkDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError(`Invalid date: ${value}`)
  }
}

function checkCents(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`Amount is not a non-negative integer number of cents: ${value}`)
  }
}

/**
 * Builds the F24 calendar of a calendar year (spec, section 7).
 *
 * - Grouping (decision of this ticket, mirrors the unique key of `f24_deadlines`): amounts with the same
 *   reference year, tax type and date are merged into one deadline; different tax types or reference
 *   years on the same date stay distinct, because the F24 lists them as separate lines.
 *   Instalments are never merged with anything: each stays its own deadline.
 * - Zero amounts are left out; the advance/balance split gives the `*_advance` / `*_balance` types.
 * - A year with nothing due yields an empty calendar.
 */
export function buildF24Calendar(input: F24CalendarInput): F24Calendar {
  const merged = new Map<string, F24Deadline>()
  const instalments: F24Deadline[] = []

  const add = (referenceYear: number, taxType: F24TaxType, dueDate: string, amountCents: number) => {
    checkDate(dueDate)
    checkCents(amountCents)
    if (amountCents === 0 || Number(dueDate.slice(0, 4)) !== input.year) return
    const key = `${referenceYear}|${taxType}|${dueDate}`
    const existing = merged.get(key)
    if (existing) existing.amountCents += amountCents
    else merged.set(key, { referenceYear, taxType, dueDate, amountCents })
  }

  for (const source of input.sources) {
    for (const advance of source.result.advances) {
      add(source.referenceYear, `${source.tax}_advance`, advance.dueDate, advance.amountCents)
    }
    add(source.referenceYear, `${source.tax}_balance`, source.result.balance.dueDate, source.result.balance.amountCents)
  }

  for (const installment of input.installments) {
    checkDate(installment.dueDate)
    if (!Number.isSafeInteger(installment.amountCents) || installment.amountCents <= 0) {
      throw new RangeError(`Instalment amount is not a positive integer number of cents: ${installment.amountCents}`)
    }
    if (Number(installment.dueDate.slice(0, 4)) !== input.year) continue
    instalments.push({
      referenceYear: installment.referenceYear,
      taxType: installment.taxType,
      dueDate: installment.dueDate,
      amountCents: installment.amountCents,
      installmentNumber: installment.number,
    })
  }

  const deadlines = [...merged.values(), ...instalments].sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      a.referenceYear - b.referenceYear ||
      a.taxType.localeCompare(b.taxType) ||
      (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0),
  )
  return { deadlines, totalCents: deadlines.reduce((sum, d) => sum + d.amountCents, 0) }
}
