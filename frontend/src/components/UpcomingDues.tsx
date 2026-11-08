import { useBudgetItems } from '../api/classification.queries.ts'
import { useOccurrencesInRange, useRecurrences } from '../api/recurrences.queries.ts'
import { useTransactions } from '../api/transactions.queries.ts'
import { Link } from 'react-router'
import { newTransactionFromDuePath } from '../lib/due-prefill.ts'
import { paths } from '../paths.ts'
import { todayIso } from '../lib/dates.ts'
import { formatShortDay } from '../lib/months.ts'
import { buildUpcomingDues, upcomingRange, UPCOMING_WINDOW_DAYS } from '../lib/upcoming-dues.ts'
import Amount from './Amount.tsx'
import './Button.css'
import './UpcomingDues.css'

/** Scheda "Prossime scadenze" della Home: scadenze delle ricorrenze nei prossimi giorni, più le scadute non registrate. */
export default function UpcomingDues() {
  const today = todayIso()
  const { from, to } = upcomingRange(today)
  const occurrences = useOccurrencesInRange(from, to)
  const recurrences = useRecurrences()
  const budgetItems = useBudgetItems()
  const transactions = useTransactions({ from, to: today })

  const queries = [occurrences, recurrences, budgetItems, transactions]
  const loading = queries.some((q) => q.isPending)
  const failed = queries.some((q) => q.isError)
  const kinds = new Map((budgetItems.data ?? []).map((item) => [item.id, item.kind]))
  const rows = buildUpcomingDues({
    occurrences: occurrences.data ?? [],
    recurrences: recurrences.data ?? [],
    kinds,
    transactions: transactions.data ?? [],
    today,
  })

  return (
    <section className="upcoming" aria-labelledby="upcoming-title">
      <h2 id="upcoming-title" className="upcoming__title">
        Prossime scadenze
      </h2>
      {loading ? (
        <p role="status" className="upcoming__note">Caricamento…</p>
      ) : failed ? (
        <p role="alert" className="upcoming__note">Non riesco a leggere le scadenze. Riprova più tardi.</p>
      ) : rows.length === 0 ? (
        <p className="upcoming__note">Nessuna scadenza nei prossimi {UPCOMING_WINDOW_DAYS} giorni.</p>
      ) : (
        <ul className="upcoming__list">
          {rows.map((row) => (
            <li key={row.occurrenceId} className="upcoming__item">
              <div className="upcoming__main">
                <span className="upcoming__name">{row.name}</span>
                <span className="upcoming__meta">
                  {formatShortDay(row.dueDate)}
                  {row.overdue && <span className="upcoming__overdue"> · Scaduta</span>}
                </span>
              </div>
              <Amount value={row.amount} explicitPlus={row.amount > 0} />
              <Link
                className="button button--secondary upcoming__register"
                aria-label={`Registra pagamento di ${row.name} del ${row.dueDate}`}
                to={newTransactionFromDuePath(paths.newTransaction, {
                  amount: Math.abs(row.amount),
                  accountId: row.accountId,
                  budgetItemId: row.budgetItemId,
                })}
              >
                Registra pagamento
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
