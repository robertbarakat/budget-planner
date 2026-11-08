import { useMemo, useState } from 'react'
import { useBudgetEntries, useSetManualBudgetAmount } from '../api/budget.queries.ts'
import { useBudgetItems, useMacroAreas } from '../api/classification.queries.ts'
import Amount from '../components/Amount.tsx'
import BudgetCellDialog from '../components/BudgetCellDialog.tsx'
import { useSnackbar } from '../components/Snackbar.tsx'
import YearSelector from '../components/YearSelector.tsx'
import { buildBudgetGrid, sourceLabel, sourceShortLabel, type GridCell } from '../lib/budget-grid.ts'
import { monthOptions } from '../lib/months.ts'
import '../components/DataGrid.css'
import './BudgetPage.css'

const MONTHS = monthOptions()

export default function BudgetPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const macroAreas = useMacroAreas()
  const budgetItems = useBudgetItems()
  const entries = useBudgetEntries({ year })
  const setManual = useSetManualBudgetAmount()
  const { showSuccess } = useSnackbar()

  const queries = [macroAreas, budgetItems, entries]
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

  return (
    <main className="budget-page">
      <h1>Budget</h1>
      <YearSelector year={year} onChange={setYear} />
      {queries.some((q) => q.isError) ? (
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
                      <Amount value={cents / 100} colored={false} />
                    </td>
                  ))}
                  <td className="data-grid__sum">
                    <Amount value={group.yearCents / 100} colored={false} />
                  </td>
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
                              <BudgetCell cell={cell} />
                            </button>
                          }
                        />
                      </td>
                    ))}
                    <td className="data-grid__sum">
                      <Amount value={item.yearCents / 100} colored={false} />
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
                {grid.monthCents.map((cents, index) => (
                  <td key={index}>
                    <Amount value={cents / 100} colored={false} />
                  </td>
                ))}
                <td className="data-grid__sum">
                  <Amount value={grid.yearCents / 100} colored={false} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </main>
  )
}

function BudgetCell({ cell }: { cell: GridCell }) {
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
