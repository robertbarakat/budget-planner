import { useMemo } from 'react'
import { useBudgetItems } from '../api/classification.queries.ts'
import { useYearData } from '../api/year-data.queries.ts'
import Amount from '../components/Amount.tsx'
import CashFlowMonthRow from '../components/CashFlowMonthRow.tsx'
import PeriodSelector, { usePeriod } from '../components/PeriodSelector.tsx'
import { buildCashFlow } from '../lib/cash-flow.ts'
import { buildMonthStatuses } from '../lib/month-status.ts'
import './CashFlowPage.css'

export default function CashFlowPage() {
  const [period, setPeriod] = usePeriod('none')
  const { year } = period
  const data = useYearData(year)
  const items = useBudgetItems()

  const view = useMemo(() => {
    if (!data.isReady || !items.data || !data.entries || !data.transactions || !data.closedMonths || !data.openingBalances) return null
    const openingBalance = data.openingBalances.reduce((sum, row) => sum + row.amount, 0)
    const budgetItems = items.data.map((i) => ({ id: i.id, name: i.name, kind: i.kind, archived: i.archived }))
    const transactions = data.transactions.map((t) => ({
      type: t.type,
      budgetItemId: t.budget_item_id,
      transactionDate: t.transaction_date,
      amount: t.amount,
    }))
    const flow = buildCashFlow(
      year,
      openingBalance,
      budgetItems,
      data.entries.map((e) => ({ budgetItemId: e.budget_item_id, year: e.year, month: e.month, amount: e.amount })),
      transactions,
      data.closedMonths,
    )
    return { flow, statuses: buildMonthStatuses(year, data.closedMonths, transactions) }
  }, [year, data.isReady, data.entries, data.transactions, data.closedMonths, data.openingBalances, items.data])

  return (
    <main className="cash-flow-page">
      <h1>Flusso di cassa</h1>
      <PeriodSelector period={period} onChange={setPeriod} monthMode="none" />
      {data.isError || items.isError ? (
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
