import { useMemo, useState } from 'react'
import { useBudgetEntries, useSetManualBudgetAmount } from '../api/budget.queries.ts'
import { useBudgetItems, useMacroAreas } from '../api/classification.queries.ts'
import { useYearData } from '../api/year-data.queries.ts'
import Amount from '../components/Amount.tsx'
import BudgetCellDialog from '../components/BudgetCellDialog.tsx'
import { useSnackbar } from '../components/Snackbar.tsx'
import YearSelector from '../components/YearSelector.tsx'
import { buildBudgetGrid, sourceLabel, sourceShortLabel, type GridCell } from '../lib/budget-grid.ts'
import { buildMatrix, closedVariance, type MatrixCell } from '../lib/matrix.ts'
import { monthOptions } from '../lib/months.ts'
import '../components/DataGrid.css'
import './BudgetPage.css'

const MONTHS = monthOptions()

export default function BudgetPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const macroAreas = useMacroAreas()
  const budgetItems = useBudgetItems()
  const entries = useBudgetEntries({ year })
  const data = useYearData(year)
  const setManual = useSetManualBudgetAmount()
  const { showSuccess } = useSnackbar()

  const queries = [macroAreas, budgetItems, entries]
  const yearError = data.isError
  const grid = useMemo(() => {
    if (!macroAreas.data || !budgetItems.data || !entries.data) return null
    return buildBudgetGrid(
      year,
      macroAreas.data.map((a) => ({ id: a.id, name: a.name, archived: a.archived, sortOrder: a.sort_order })),
      budgetItems.data.map((i) => ({
        id: i.id,
        macroAreaId: i.macro_area_id,
        name: i.name,
        kind: i.kind,
        archived: i.archived,
        sortOrder: i.sort_order,
      })),
      entries.data.map((e) => ({
        id: e.id,
        budgetItemId: e.budget_item_id,
        year: e.year,
        month: e.month,
        amount: e.amount,
        source: e.source,
      })),
    )
  }, [year, macroAreas.data, budgetItems.data, entries.data])

  const matrix = useMemo(() => {
    if (!data.isReady || !macroAreas.data || !budgetItems.data || !data.entries || !data.transactions || !data.closedMonths) return null
    return buildMatrix(
      year,
      macroAreas.data.map((a) => ({ id: a.id, name: a.name, archived: a.archived, sortOrder: a.sort_order })),
      budgetItems.data.map((i) => ({ id: i.id, macroAreaId: i.macro_area_id, name: i.name, kind: i.kind, archived: i.archived, sortOrder: i.sort_order })),
      data.entries.map((e) => ({ budgetItemId: e.budget_item_id, year: e.year, month: e.month, amount: e.amount })),
      data.transactions.map((t) => ({ type: t.type, budgetItemId: t.budget_item_id, categoryId: t.category_id, transactionDate: t.transaction_date, amount: t.amount })),
      data.closedMonths,
    )
  }, [year, data.isReady, data.entries, data.transactions, data.closedMonths, macroAreas.data, budgetItems.data])
  const itemCells = useMemo(() => new Map(matrix?.groups.flatMap((g) => g.items.map((i) => [i.budgetItemId, i.months] as const))), [matrix])
  const groupCells = useMemo(() => new Map(matrix?.groups.map((g) => [g.macroAreaId, g.months] as const)), [matrix])
  const closed = matrix?.closedMonths ?? []

  return (
    <main className="budget-page">
      <h1>Budget</h1>
      <YearSelector year={year} onChange={setYear} />
      {queries.some((q) => q.isError) || yearError ? (
        <p role="alert" className="budget-page__status">
          Non riesco a leggere il budget. Riprova più tardi.
        </p>
      ) : !grid ? (
        <p role="status" className="budget-page__status">
          Caricamento…
        </p>
      ) : grid.groups.length === 0 ? (
        <p className="budget-page__status">Nessuna voce di budget: creale in Impostazioni.</p>
      ) : (
        <div className="data-grid" tabIndex={0} role="region" aria-label={`Budget previsto ${year}`}>
          <table className="data-grid__table">
            <thead>
              <tr>
                <th scope="col" className="data-grid__label">
                  Voce
                </th>
                {MONTHS.map((month) => (
                  <th key={month.value} scope="col">
                    {month.label}
                  </th>
                ))}
                <th scope="col" className="data-grid__sum">
                  Totale
                </th>
                <th scope="col" className="data-grid__sum">
                  Scostamento
                </th>
              </tr>
            </thead>
            {grid.groups.map((group) => (
              <tbody key={group.macroAreaId}>
                <tr className="data-grid__group">
                  <th scope="rowgroup" className="data-grid__label">
                    {group.archived ? `${group.name} (archiviata)` : group.name}
                  </th>
                  {group.monthCents.map((cents, index) => (
                    <td key={index}>
                      <ClosedAmount budgeted={cents / 100} actual={closed[index] ? groupCells.get(group.macroAreaId)?.[index]?.actual : undefined} />
                    </td>
                  ))}
                  <td className="data-grid__sum">
                    <Amount value={group.yearCents / 100} colored={false} />
                  </td>
                  <VarianceCell cells={groupCells.get(group.macroAreaId)} closed={closed} />
                </tr>
                {group.items.map((item) => (
                  <tr key={item.budgetItemId}>
                    <th scope="row" className="data-grid__label">
                      {item.archived ? `${item.name} (archiviata)` : item.name}
                    </th>
                    {item.months.map((cell, index) => (
                      <td key={index}>
                        <BudgetCellDialog
                          title={`${item.name}, ${MONTHS[index]!.label} ${year}`}
                          kind={item.kind}
                          entries={cell.entries}
                          onSave={async (amount) => {
                            await setManual.mutateAsync({ budgetItemId: item.budgetItemId, year, month: index + 1, amount })
                            showSuccess(amount === null ? 'Riga manuale eliminata.' : 'Budget salvato.')
                          }}
                          trigger={
                            <button type="button" className="budget-cell__button" aria-label={`Modifica ${item.name}, ${MONTHS[index]!.label} ${year}`}>
                              <BudgetCell cell={cell} actual={closed[index] ? itemCells.get(item.budgetItemId)?.[index]?.actual : undefined} />
                            </button>
                          }
                        />
                      </td>
                    ))}
                    <td className="data-grid__sum">
                      <Amount value={item.yearCents / 100} colored={false} />
                    </td>
                    <VarianceCell cells={itemCells.get(item.budgetItemId)} closed={closed} />
                  </tr>
                ))}
              </tbody>
            ))}
            <tfoot>
              <tr className="data-grid__total">
                <th scope="row" className="data-grid__label">
                  Totale
                </th>
                {grid.monthCents.map((cents, index) => (
                  <td key={index}>
                    <ClosedAmount budgeted={cents / 100} actual={closed[index] ? matrix?.months[index]?.actual : undefined} />
                  </td>
                ))}
                <td className="data-grid__sum">
                  <Amount value={grid.yearCents / 100} colored={false} />
                </td>
                <VarianceCell cells={matrix?.months} closed={closed} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </main>
  )
}

/** Previsto, e per i mesi chiusi il reale in evidenza con il previsto più piccolo sotto. */
function ClosedAmount({ budgeted, actual }: { budgeted: number; actual: number | undefined }) {
  if (actual === undefined) return <Amount value={budgeted} colored={false} />
  return (
    <span className="budget-cell">
      <Amount value={actual} colored={false} className="budget-cell__actual" />
      <span className="budget-cell__planned">
        <span className="visually-hidden">previsto </span>
        <Amount value={budgeted} colored={false} />
      </span>
    </span>
  )
}

function VarianceCell({ cells, closed }: { cells: MatrixCell[] | undefined; closed: boolean[] }) {
  const variance = cells ? closedVariance(cells, closed) : null
  return <td className="data-grid__sum">{variance === null ? '' : <Amount value={variance} explicitPlus />}</td>
}

function BudgetCell({ cell, actual }: { cell: GridCell; actual: number | undefined }) {
  if (actual !== undefined) return <ClosedAmount budgeted={cell.cents / 100} actual={actual} />
  if (cell.entries.length === 0) return <span className="budget-page__empty" aria-label="vuoto">–</span>
  return (
    <span className="budget-cell">
      <Amount value={cell.cents / 100} colored={false} />
      {cell.otherSources.map((source) => (
        <span key={source} className="budget-cell__source" title={sourceLabel(source)}>
          {sourceShortLabel(source)}
          <span className="visually-hidden"> ({sourceLabel(source)})</span>
        </span>
      ))}
    </span>
  )
}
