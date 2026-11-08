import type { ExpectedCollection } from 'budget-planner-shared'
import type { BudgetEntryDraft, MonthRange } from '../api/month-range.ts'

export interface YearMonth {
  year: number
  month: number
}

/** Un tratto continuo di mesi aperti: una sostituzione delle righe del driver in un'unica transazione. */
export interface ApplySegment {
  range: MonthRange
  entries: BudgetEntryDraft[]
}

export interface DriverApplyPlan {
  /** Intervallo coinvolto: da gennaio dell'anno scelto a dicembre dell'anno dopo. */
  from: YearMonth
  to: YearMonth
  segments: ApplySegment[]
  /** Righe `revenue_driver` già presenti nei mesi aperti dell'intervallo: verranno sostituite. */
  replacedCount: number
  /** Righe che verranno create (un incasso positivo per cliente e mese). */
  createdCount: number
  /** Mesi chiusi dell'intervallo: non si toccano. */
  skippedClosedMonths: YearMonth[]
}

const monthIndex = (year: number, month: number) => year * 12 + (month - 1)
const fromIndex = (index: number): YearMonth => ({ year: Math.floor(index / 12), month: (index % 12) + 1 })

/**
 * Cosa scrive "Applica al budget" per l'anno scelto: gli incassi previsti da gennaio dell'anno scelto a dicembre
 * dell'anno dopo (compreso il riporto), sui soli mesi non chiusi. Nell'intervallo le righe del driver si
 * sostituiscono con tutti gli incassi calcolati dai giorni previsti (di ogni anno), così rifare l'operazione
 * dà lo stesso risultato e non crea doppioni; le righe di altra origine non si toccano.
 * Gli incassi a zero non generano righe.
 */
export function planDriverApply(
  year: number,
  collections: readonly ExpectedCollection[],
  budgetItemIdByClient: ReadonlyMap<number, number>,
  existingDriverRows: readonly YearMonth[],
  closedMonths: readonly YearMonth[],
): DriverApplyPlan {
  const entries: BudgetEntryDraft[] = []
  for (const collection of collections) {
    if (collection.amountCents <= 0) continue
    const budgetItemId = budgetItemIdByClient.get(collection.clientId)
    if (budgetItemId === undefined) throw new RangeError(`Client ${collection.clientId} has no budget item`)
    entries.push({ budgetItemId, year: collection.year, month: collection.month, amount: collection.amountCents / 100 })
  }
  return planReplacement({ year, month: 1 }, { year: year + 1, month: 12 }, entries, existingDriverRows, closedMonths)
}

/**
 * Sostituzione delle righe di un'origine (driver, imposte) nell'intervallo di mesi: solo i mesi non chiusi, a tratti
 * continui (una transazione per tratto). Le righe fuori dai tratti aperti non si scrivono né si contano.
 */
export function planReplacement(
  fromMonth: YearMonth,
  toMonth: YearMonth,
  entries: readonly BudgetEntryDraft[],
  existingRows: readonly YearMonth[],
  closedMonths: readonly YearMonth[],
): DriverApplyPlan {
  const first = monthIndex(fromMonth.year, fromMonth.month)
  const last = monthIndex(toMonth.year, toMonth.month)
  const closed = new Set(closedMonths.map((m) => monthIndex(m.year, m.month)))

  const segments: ApplySegment[] = []
  const skipped: YearMonth[] = []
  let start: number | null = null
  const closeSegment = (end: number) => {
    if (start === null) return
    const from = fromIndex(start)
    const to = fromIndex(end)
    const segmentStart = start
    const inSegment = entries.filter((entry) => {
      const index = monthIndex(entry.year, entry.month)
      return index >= segmentStart && index <= end
    })
    segments.push({ range: { fromYear: from.year, fromMonth: from.month, toYear: to.year, toMonth: to.month }, entries: inSegment })
    start = null
  }
  for (let index = first; index <= last; index++) {
    if (closed.has(index)) {
      closeSegment(index - 1)
      skipped.push(fromIndex(index))
    } else if (start === null) {
      start = index
    }
  }
  closeSegment(last)

  const inOpenRange = (row: YearMonth) => {
    const index = monthIndex(row.year, row.month)
    return index >= first && index <= last && !closed.has(index)
  }
  return {
    from: fromMonth,
    to: toMonth,
    segments,
    replacedCount: existingRows.filter(inOpenRange).length,
    createdCount: segments.reduce((sum, segment) => sum + segment.entries.length, 0),
    skippedClosedMonths: skipped,
  }
}
