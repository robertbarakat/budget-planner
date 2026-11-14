import { useMemo } from 'react'
import { useCategories } from '../api/classification.queries.ts'
import Amount from '../components/Amount.tsx'
import PeriodShares from '../components/PeriodShares.tsx'
import CashFlowMonthRow, { type ItemInfo } from '../components/CashFlowMonthRow.tsx'
import PeriodSelector, { usePeriod } from '../components/PeriodSelector.tsx'
import { buildCashFlow, shareRows } from '../lib/cash-flow.ts'
import { buildMonthStatuses } from '../lib/month-status.ts'
import { useYearInputs } from './use-year-inputs.ts'
import './CashFlowPage.css'

export default function CashFlowPage() {
  const [period, setPeriod] = usePeriod('none')
  const { year } = period
  const { inputs, isError } = useYearInputs(year)
  const categories = useCategories()

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

  const itemInfo = useMemo(() => {
    if (!inputs) return undefined
    const categoryName = new Map((categories.data ?? []).map((c) => [c.id, c.name]))
    const areaOf = new Map(inputs.budgetItems.map((i) => [i.id, inputs.areas.find((a) => a.id === i.macroAreaId)?.name ?? '']))
    return (budgetItemId: number, month: number): ItemInfo => {
      const totals = new Map<string, { amount: number; count: number }>()
      for (const t of inputs.transactions) {
        if (t.budgetItemId !== budgetItemId || t.type === 'transfer') continue
        if (Number(t.transactionDate.slice(0, 4)) !== year || Number(t.transactionDate.slice(5, 7)) !== month) continue
        const name = (t.categoryId !== null ? categoryName.get(t.categoryId) : undefined) ?? 'Senza categoria'
        const cur = totals.get(name) ?? { amount: 0, count: 0 }
        cur.amount += t.type === 'expense' ? -t.amount : t.amount
        cur.count += 1
        totals.set(name, cur)
      }
      const rows = [...totals.entries()].map(([name, v]) => ({ name, amount: Math.round(v.amount * 100) / 100, count: v.count }))
      rows.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      return { areaName: areaOf.get(budgetItemId) ?? '', categories: rows }
    }
  }, [inputs, categories.data, year])

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
            Saldo iniziale {year}: <Amount value={view.flow.openingBalance} />
          </p>
          <section aria-label={`Flusso di cassa ${year}`}>
            <ul className="cash-flow-page__months">
              {view.flow.months.map((month) => (
                <CashFlowMonthRow
                  key={month.month}
                  year={year}
                  data={month}
                  transactionCount={view.statuses[month.month - 1]?.transactionCount ?? 0}
                  itemInfo={itemInfo}
                />
              ))}
            </ul>
          </section>
          <PeriodShares rows={view.flow.months.flatMap((m) => shareRows(m.details))} periodLabel={String(year)} />
          <p className="cash-flow-page__opening">
            Saldo a fine anno: <Amount value={view.flow.closingBalance} />
          </p>
        </>
      )}
    </main>
  )
}
