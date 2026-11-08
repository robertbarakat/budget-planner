import { useMemo } from 'react'
import { useBudgetItems, useMacroAreas } from '../api/classification.queries.ts'
import { useYearData } from '../api/year-data.queries.ts'
import Amount from '../components/Amount.tsx'
import PeriodSelector, { usePeriod } from '../components/PeriodSelector.tsx'
import { buildMacroAreaReport } from '../lib/macro-areas.ts'
import { monthName } from '../lib/months.ts'
import '../components/DataGrid.css'
import './MacroAreasPage.css'

export default function MacroAreasPage() {
  const [period, setPeriod] = usePeriod('optional')
  const { year, month } = period
  const data = useYearData(year)
  const areas = useMacroAreas()
  const items = useBudgetItems()

  const report = useMemo(() => {
    if (!data.isReady || !areas.data || !items.data || !data.entries || !data.transactions || !data.closedMonths) return null
    return buildMacroAreaReport(
      year,
      month,
      areas.data.map((a) => ({ id: a.id, name: a.name, archived: a.archived, sortOrder: a.sort_order })),
      items.data.map((i) => ({
        id: i.id,
        macroAreaId: i.macro_area_id,
        name: i.name,
        kind: i.kind,
        archived: i.archived,
        sortOrder: i.sort_order,
      })),
      data.entries.map((e) => ({ budgetItemId: e.budget_item_id, year: e.year, month: e.month, amount: e.amount })),
      data.transactions.map((t) => ({
        type: t.type,
        budgetItemId: t.budget_item_id,
        categoryId: t.category_id,
        transactionDate: t.transaction_date,
        amount: t.amount,
      })),
      data.closedMonths,
    )
  }, [year, month, data.isReady, data.entries, data.transactions, data.closedMonths, areas.data, items.data])

  const periodLabel = month === null ? String(year) : `${monthName(month)} ${year}`

  return (
    <main className="macro-areas-page">
      <h1>Macro-aree</h1>
      <PeriodSelector period={period} onChange={setPeriod} monthMode="optional" />
      {data.isError || areas.isError || items.isError ? (
        <p role="alert" className="macro-areas-page__note">
          Non riesco a leggere le macro-aree. Riprova più tardi.
        </p>
      ) : !report ? (
        <p role="status" className="macro-areas-page__note">
          Caricamento…
        </p>
      ) : report.groups.length === 0 ? (
        <p className="macro-areas-page__note">Nessuna macro-area: creale in Impostazioni.</p>
      ) : (
        <div className="data-grid" tabIndex={0} role="region" aria-label={`Previsto e reale per macro-area, ${periodLabel}`}>
          <table className="data-grid__table">
            <thead>
              <tr>
                <th scope="col" className="data-grid__label">
                  Macro-area / voce
                </th>
                <th scope="col">Previsto</th>
                <th scope="col">Reale</th>
                <th scope="col">Scostamento</th>
              </tr>
            </thead>
            {report.groups.map((group) => (
              <tbody key={group.macroAreaId}>
                <tr className="data-grid__group">
                  <th scope="rowgroup" className="data-grid__label">
                    {group.archived ? `${group.name} (archiviata)` : group.name}
                  </th>
                  <td>
                    <Amount value={group.budgeted} colored={false} />
                  </td>
                  <td>
                    <Amount value={group.actual} colored={false} />
                  </td>
                  <td>
                    <Amount value={group.variance} explicitPlus />
                  </td>
                </tr>
                {group.items.map((item) => (
                  <tr key={item.budgetItemId}>
                    <th scope="row" className="data-grid__label">
                      {item.archived ? `${item.name} (archiviata)` : item.name}
                    </th>
                    <td>
                      <Amount value={item.budgeted} colored={false} />
                    </td>
                    <td>
                      <Amount value={item.actual} colored={false} />
                    </td>
                    <td>
                      <Amount value={item.variance} explicitPlus />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
            <tfoot>
              <tr className="data-grid__total">
                <th scope="row" className="data-grid__label">
                  Totale
                </th>
                <td>
                  <Amount value={report.total.budgeted} colored={false} />
                </td>
                <td>
                  <Amount value={report.total.actual} colored={false} />
                </td>
                <td>
                  <Amount value={report.total.variance} explicitPlus />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="macro-areas-page__note">
        Entrate positive, spese negative. Scostamento = reale − previsto: un segno meno è sempre sfavorevole.
      </p>
    </main>
  )
}
