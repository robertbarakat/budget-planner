import type { Recurrence, RecurrenceOccurrence } from 'budget-planner-shared'

/** Finestra in avanti della scheda "Prossime scadenze" (giorni da oggi, estremo incluso). */
export const UPCOMING_WINDOW_DAYS = 30
/** Quanto indietro si cercano scadenze passate non ancora registrate (giorni prima di oggi). */
export const OVERDUE_LOOKBACK_DAYS = 30

export interface UpcomingDue {
  occurrenceId: number
  name: string
  /** `YYYY-MM-DD`. */
  dueDate: string
  /** Con segno: spesa negativa, entrata positiva. */
  amount: number
  /** Conto e voce di budget della ricorrenza (per precompilare il movimento). */
  accountId: number
  budgetItemId: number
  /** Scadenza passata senza un movimento corrispondente. */
  overdue: boolean
}

export interface UpcomingTransaction {
  type: 'expense' | 'income' | 'transfer'
  account_id: number
  budget_item_id: number | null
  transaction_date: string
}

/** `YYYY-MM-DD` spostata di `days` giorni (anche negativi), senza fusi orari. */
export function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** Estremi dell'intervallo da leggere: da `OVERDUE_LOOKBACK_DAYS` giorni fa a `UPCOMING_WINDOW_DAYS` da oggi. */
export function upcomingRange(today: string): { from: string; to: string } {
  return { from: shiftIsoDate(today, -OVERDUE_LOOKBACK_DAYS), to: shiftIsoDate(today, UPCOMING_WINDOW_DAYS) }
}

/**
 * Scadenze della Home, in ordine di data: quelle da oggi ai prossimi 30 giorni, più le passate (ultimi 30 giorni)
 * non ancora registrate, segnalate come `overdue`.
 *
 * REGOLA PROVVISORIA (da confermare): una scadenza passata è "registrata" se esiste un movimento di spesa o
 * entrata con lo stesso conto e la stessa voce di budget della ricorrenza, nello stesso mese della scadenza;
 * ogni movimento copre una sola scadenza. Il database non collega movimenti e scadenze.
 * Le ricorrenze archiviate non compaiono; `kinds` dà il segno (voce di entrata: +, di spesa: −).
 */
export function buildUpcomingDues(args: {
  occurrences: readonly RecurrenceOccurrence[]
  recurrences: readonly Recurrence[]
  kinds: ReadonlyMap<number, 'income' | 'expense'>
  transactions: readonly UpcomingTransaction[]
  today: string
}): UpcomingDue[] {
  const { from, to } = upcomingRange(args.today)
  const byId = new Map(args.recurrences.filter((r) => !r.archived).map((r) => [r.id, r]))
  const free = args.transactions.filter((t) => t.type !== 'transfer')
  const used = new Set<number>()

  const sorted = [...args.occurrences].sort((a, b) => a.due_date.localeCompare(b.due_date) || a.id - b.id)
  const result: UpcomingDue[] = []
  for (const occurrence of sorted) {
    const recurrence = byId.get(occurrence.recurrence_id)
    if (!recurrence || occurrence.due_date < from || occurrence.due_date > to) continue
    const past = occurrence.due_date < args.today
    if (past) {
      const month = occurrence.due_date.slice(0, 7)
      const matchIndex = free.findIndex(
        (t, index) =>
          !used.has(index) &&
          t.account_id === recurrence.account_id &&
          t.budget_item_id === recurrence.budget_item_id &&
          t.transaction_date.slice(0, 7) === month,
      )
      if (matchIndex >= 0) {
        used.add(matchIndex)
        continue
      }
    }
    const sign = args.kinds.get(recurrence.budget_item_id) === 'income' ? 1 : -1
    result.push({
      occurrenceId: occurrence.id,
      name: recurrence.name,
      dueDate: occurrence.due_date,
      amount: sign * occurrence.amount,
      accountId: recurrence.account_id,
      budgetItemId: recurrence.budget_item_id,
      overdue: past,
    })
  }
  return result
}
