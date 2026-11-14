import { useBudgetItems } from '../api/classification.queries.ts'
import { useOccurrencesInRange, useRecurrences } from '../api/recurrences.queries.ts'
import { useF24Deadlines } from '../api/tax.queries.ts'
import { todayIso } from '../lib/dates.ts'
import { formatShortDay } from '../lib/months.ts'
import { buildUpcomingDues, upcomingRange, UPCOMING_WINDOW_DAYS } from '../lib/upcoming-dues.ts'
import AmountRow from './AmountRow.tsx'
import './UpcomingDues.css'

/** Scheda "Prossime scadenze" della Home: scadenze delle ricorrenze nei prossimi giorni, più le scadute non registrate. */
export default function UpcomingDues() {
  const today = todayIso()
  const { from, to } = upcomingRange(today)
  const occurrences = useOccurrencesInRange(from, to)
  const recurrences = useRecurrences()
  const budgetItems = useBudgetItems()
  const f24 = useF24Deadlines()

  const queries = [occurrences, recurrences, budgetItems, f24]
  const loading = queries.some((q) => q.isPending)
  const failed = queries.some((q) => q.isError)
  const kinds = new Map((budgetItems.data ?? []).map((item) => [item.id, item.kind]))
  const rows = buildUpcomingDues({
    occurrences: occurrences.data ?? [],
    recurrences: recurrences.data ?? [],
    kinds,
    today,
  })
  // F24 ancora da versare nella stessa finestra: una riga per scadenza, con il totale delle righe.
  const f24ByDate = new Map<string, number>()
  for (const d of f24.data ?? []) {
    if (d.transaction_id === null && d.due_date >= from && d.due_date <= to) f24ByDate.set(d.due_date, (f24ByDate.get(d.due_date) ?? 0) + Number(d.amount))
  }
  const items = [
    ...rows.map((row) => ({ key: `occ-${row.occurrenceId}`, title: row.name, dueDate: row.dueDate, amount: row.amount, overdue: row.overdue })),
    ...[...f24ByDate.entries()].map(([dueDate, amount]) => ({ key: `f24-${dueDate}`, title: 'F24', dueDate, amount: -amount, overdue: dueDate < today })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  return (
    <section className="upcoming" aria-labelledby="upcoming-title">
      <h2 id="upcoming-title" className="upcoming__title">
        Prossime scadenze
      </h2>
      {loading ? (
        <p role="status" className="upcoming__note">Caricamento…</p>
      ) : failed ? (
        <p role="alert" className="upcoming__note">Non riesco a leggere le scadenze. Riprova più tardi.</p>
      ) : items.length === 0 ? (
        <p className="upcoming__note">Nessuna scadenza nei prossimi {UPCOMING_WINDOW_DAYS} giorni.</p>
      ) : (
        <ul className="upcoming__list">
          {items.map((row) => (
            <AmountRow
              key={row.key}
              title={row.title}
              meta={
                <>
                  {formatShortDay(row.dueDate)}
                  {row.overdue && <span className="upcoming__overdue"> · Scaduta</span>}
                </>
              }
              amount={row.amount}
              explicitPlus={row.amount > 0}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
