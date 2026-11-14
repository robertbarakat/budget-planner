import { useMemo, useState } from 'react'
import { useBudgetItems, useCategories, useMacroAreas } from '../api/classification.queries.ts'
import { useYearData } from '../api/year-data.queries.ts'
import Amount from '../components/Amount.tsx'
import ItemDetailDialog from '../components/ItemDetailDialog.tsx'
import PeriodSelector, { usePeriod } from '../components/PeriodSelector.tsx'
import { buildItemDetail } from '../lib/item-detail.ts'
import { buildMacroAreaReport, type BudgetItemInput, type EntryInput, type TransactionInput } from '../lib/macro-areas.ts'
import { monthName } from '../lib/months.ts'
import '../components/DataGrid.css'
import './MacroAreasPage.css'

export default function MacroAreasPage() {
  const [period, setPeriod] = usePeriod('optional')
  const { year, month } = period
  const data = useYearData(year)
  const areas = useMacroAreas()
  const items = useBudgetItems()
  const categories = useCategories()
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)

  const inputs = useMemo(() => {
    if (!data.isReady || !areas.data || !items.data || !categories.data || !data.entries || !data.transactions || !data.closedMonths) return null
    const budgetItems: BudgetItemInput[] = items.data.map((i) => ({
      id: i.id,
      macroAreaId: i.macro_area_id,
      name: i.name,
      kind: i.kind,
      archived: i.archived,
      sortOrder: i.sort_order,
    }))
    const entries: EntryInput[] = data.entries.map((e) => ({ budgetItemId: e.budget_item_id, year: e.year, month: e.month, amount: e.amount }))
    const transactions: TransactionInput[] = data.transactions.map((t) => ({
      type: t.type,
      budgetItemId: t.budget_item_id,
      categoryId: t.category_id,
      transactionDate: t.transaction_date,
      amount: t.amount,
    }))
    return { budgetItems, entries, transactions, closedMonths: data.closedMonths }
  }, [data.isReady, data.entries, data.transactions, data.closedMonths, areas.data, items.data, categories.data])

  const report = useMemo(() => {
    if (!inputs || !areas.data) return null
    return buildMacroAreaReport(
      year,
      month,
      areas.data.map((a) => ({ id: a.id, name: a.name, archived: a.archived, sortOrder: a.sort_order })),
      inputs.budgetItems,
      inputs.entries,
      inputs.transactions,
      inputs.closedMonths,
    )
  }, [year, month, inputs, areas.data])

  const selected = useMemo(() => {
    const item = inputs?.budgetItems.find((i) => i.id === selectedItemId)
    if (!inputs || !item || !categories.data) return null
    const detail = buildItemDetail(
      year,
      item,
      inputs.entries,
      inputs.transactions,
      inputs.closedMonths,
      categories.data.map((c) => ({ id: c.id, budgetItemId: c.budget_item_id, name: c.name, archived: c.archived })),
    )
    return { name: item.name, detail }
  }, [year, inputs, selectedItemId, categories.data])

  const periodLabel = month === null ? String(year) : `${monthName(month)} ${year}`

  return (
    <main className="macro-areas-page">
      <h1>Previsto/Reale</h1>
      <PeriodSelector period={period} onChange={setPeriod} monthMode="optional" />
      {data.isError || areas.isError || items.isError || categories.isError ? (
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
                      <button type="button" className="macro-areas-page__item" onClick={() => setSelectedItemId(item.budgetItemId)}>
                        {item.archived ? `${item.name} (archiviata)` : item.name}
                      </button>
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
      {selected && <ItemDetailDialog name={selected.name} detail={selected.detail} onClose={() => setSelectedItemId(null)} />}
      <p className="macro-areas-page__note">
        Entrate positive, spese negative. Scostamento = reale − previsto: un segno meno è sempre sfavorevole.
      </p>
    </main>
  )
}
