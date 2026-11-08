import { useMemo } from 'react'
import { useYearData } from '../api/year-data.queries.ts'
import { buildMonthStatuses, transactionCountLabel } from '../lib/month-status.ts'
import { monthName } from '../lib/months.ts'
import MonthCloseDialog from './MonthCloseDialog.tsx'
import MonthStatusBadge from './MonthStatusBadge.tsx'
import './MonthStatusList.css'

/** Elenco dei 12 mesi dell'anno con stato (chiuso/aperto), movimenti e azione per chiudere o riaprire. */
export default function MonthStatusList({ year }: { year: number }) {
  const data = useYearData(year)
  const statuses = useMemo(() => {
    if (!data.closedMonths || !data.transactions) return null
    return buildMonthStatuses(
      year,
      data.closedMonths,
      data.transactions.map((t) => ({ transactionDate: t.transaction_date })),
    )
  }, [year, data.closedMonths, data.transactions])

  if (data.isError) {
    return (
      <p role="alert" className="month-status__note">
        Non riesco a leggere i mesi. Riprova più tardi.
      </p>
    )
  }
  if (!statuses) {
    return (
      <p role="status" className="month-status__note">
        Caricamento…
      </p>
    )
  }
  return (
    <section aria-label={`Stato dei mesi ${year}`} className="month-status">
      <h2 className="month-status__title">Mesi {year}</h2>
      <ul className="month-status__list">
        {statuses.map((status) => (
          <li key={status.month} className="month-status__row">
            <span className="month-status__name">{monthName(status.month)}</span>
            <MonthStatusBadge closed={status.closed} />
            <span className="month-status__count">{transactionCountLabel(status.transactionCount)}</span>
            <MonthCloseDialog year={year} month={status.month} closed={status.closed} transactionCount={status.transactionCount} />
          </li>
        ))}
      </ul>
    </section>
  )
}
