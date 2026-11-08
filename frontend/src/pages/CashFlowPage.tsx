import { useMemo } from 'react'
import Amount from '../components/Amount.tsx'
import CashFlowMonthRow from '../components/CashFlowMonthRow.tsx'
import PeriodSelector, { usePeriod } from '../components/PeriodSelector.tsx'
import { buildCashFlow } from '../lib/cash-flow.ts'
import { buildMonthStatuses } from '../lib/month-status.ts'
import { useYearInputs } from './use-year-inputs.ts'
import './CashFlowPage.css'

export default function CashFlowPage() {
  const [period, setPeriod] = usePeriod('none')
  const { year } = period
  const { inputs, isError } = useYearInputs(year)

  const view = useMemo(() => {
    if (!inputs) return null
    const flow = buildCashFlow(
      year,
      inputs.openingBalance,
      inputs.budgetItems.map((i) => ({ id: i.id, name: i.name, kind: i.kind, archived: i.archived })),
      inputs.entries,
      inputs.transactions,
      inputs.closedMonths,
    )
    return { flow, statuses: buildMonthStatuses(year, inputs.closedMonths, inputs.transactions) }
  }, [year, inputs])

  return (
    <main className="cash-flow-page">
      <h1>Flusso di cassa</h1>
      <PeriodSelector period={period} onChange={setPeriod} monthMode="none" />
      {isError ? (
        <p role="alert" className="cash-flow-page__note">
          Non riesco a leggere il flusso di cassa. Riprova più tardi.
        </p>
      ) : !view ? (
        <p role="status" className="cash-flow-page__note">
          Caricamento…
        </p>
      ) : (
        <>
          <p className="cash-flow-page__opening">
            Saldo iniziale {year}: <Amount value={view.flow.openingBalance} colored={false} />
          </p>
          <section aria-label={`Flusso di cassa ${year}`}>
            <ul className="cash-flow-page__months">
              {view.flow.months.map((month) => (
                <CashFlowMonthRow
                  key={month.month}
                  year={year}
                  data={month}
                  transactionCount={view.statuses[month.month - 1]?.transactionCount ?? 0}
                />
              ))}
            </ul>
          </section>
          <p className="cash-flow-page__opening">
            Saldo a fine anno: <Amount value={view.flow.closingBalance} colored={false} />
          </p>
        </>
      )}
    </main>
  )
}
