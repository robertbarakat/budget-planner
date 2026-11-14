import { useMemo, useState } from 'react'
import { useBudgetEntries, useSetManualBudgetAmount } from '../api/budget.queries.ts'
import { useBudgetItems, useMacroAreas, useReorderMacroAreas } from '../api/classification.queries.ts'
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
const COLLAPSED_KEY = 'budget.collapsedAreas'

function readCollapsed(): Set<number> {
  try {
    const raw = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]') as unknown
    return new Set(Array.isArray(raw) ? raw.filter((v): v is number => typeof v === 'number') : [])
  } catch {
    return new Set()
  }
}

export default function BudgetPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const macroAreas = useMacroAreas()
  const budgetItems = useBudgetItems()
  const entries = useBudgetEntries({ year })
  const data = useYearData(year)
  const setManual = useSetManualBudgetAmount()
  const reorder = useReorderMacroAreas()
  const [collapsed, setCollapsed] = useState<Set<number>>(readCollapsed)
  const [dragId, setDragId] = useState<number | null>(null)

  function updateCollapsed(next: Set<number>) {
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]))
    } catch {
      // senza storage la preferenza vale solo per la sessione
    }
  }
  function toggleArea(id: number) {
    const next = new Set(collapsed)
    if (!next.delete(id)) next.add(id)
    updateCollapsed(next)
  }
  /** Sposta una macro-area prima di un'altra (o di `offset` posti), mantenendo l'ordine di quelle non visibili. */
  function moveArea(id: number, target: { before: number } | { offset: number }) {
    const rows = [...(macroAreas.data ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    const ids = rows.map((r) => r.id)
    const from = ids.indexOf(id)
    if (from < 0) return
    ids.splice(from, 1)
    const to = 'before' in target ? ids.indexOf(target.before) : Math.max(0, Math.min(ids.length, from + target.offset))
    if (to < 0) return
    ids.splice(to, 0, id)
    reorder.mutate({ orderedIds: ids, currentOrder: Object.fromEntries(rows.map((r) => [r.id, r.sort_order])) })
  }
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
      <div className="budget-page__toolbar">
        <YearSelector year={year} onChange={setYear} />
        {grid && grid.groups.length > 0 && (
          <span className="budget-page__bulk">
            <button type="button" onClick={() => updateCollapsed(new Set())}>
              Espandi tutto
            </button>
            <button type="button" onClick={() => updateCollapsed(new Set(grid.groups.map((g) => g.macroAreaId)))}>
              Comprimi tutto
            </button>
          </span>
        )}
      </div>
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
                  Macro-area e voci
                </th>
                {MONTHS.map((month) => (
                  <th key={month.value} scope="col">
                    {month.label}
                    <span className="budget-page__month-state">{closed[month.value - 1] ? '✓ reale' : '○ previsto'}</span>
                  </th>
                ))}
                <th scope="col" className="data-grid__sum">
                  Totale
                </th>
                <th scope="col" className="data-grid__sum budget-page__variance-head">
                  Reale − previsto
                  <span className="budget-page__variance-sub">mesi chiusi</span>
                </th>
              </tr>
            </thead>
            {grid.groups.map((group, groupIndex) => (
              <tbody
                key={group.macroAreaId}
                onDragOver={(event) => dragId !== null && event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  if (dragId !== null && dragId !== group.macroAreaId) moveArea(dragId, { before: group.macroAreaId })
                  setDragId(null)
                }}
                className={dragId === group.macroAreaId ? 'budget-page__dragging' : undefined}
              >
                <tr className="data-grid__group budget-page__area">
                  <th scope="rowgroup" className="data-grid__label">
                    <span className="budget-area">
                      <span
                        className="budget-area__grip"
                        role="img"
                        aria-label={`Trascina per spostare ${group.name}`}
                        title="Trascina per riordinare"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move'
                          setDragId(group.macroAreaId)
                        }}
                        onDragEnd={() => setDragId(null)}
                      >
                        ⋮⋮
                      </span>
                      <button
                        type="button"
                        className="budget-area__toggle"
                        aria-expanded={!collapsed.has(group.macroAreaId)}
                        onClick={() => toggleArea(group.macroAreaId)}
                      >
                        <span aria-hidden="true">{collapsed.has(group.macroAreaId) ? '▸' : '▾'}</span>{' '}
                        {group.archived ? `${group.name} (archiviata)` : group.name}
                      </button>
                      <span className="budget-area__move">
                        <button type="button" aria-label={`Sposta su ${group.name}`} disabled={groupIndex === 0} onClick={() => moveArea(group.macroAreaId, { offset: -1 })}>
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Sposta giù ${group.name}`}
                          disabled={groupIndex === grid.groups.length - 1}
                          onClick={() => moveArea(group.macroAreaId, { offset: 1 })}
                        >
                          ↓
                        </button>
                      </span>
                    </span>
                  </th>
                  {group.monthCents.map((cents, index) => (
                    <td key={index}>
                      <ClosedAmount budgeted={cents / 100} actual={closed[index] ? groupCells.get(group.macroAreaId)?.[index]?.actual : undefined} />
                    </td>
                  ))}
                  <td className="data-grid__sum">
                    <Amount value={group.yearCents / 100} />
                  </td>
                  <VarianceCell cells={groupCells.get(group.macroAreaId)} closed={closed} />
                </tr>
                {!collapsed.has(group.macroAreaId) && group.items.map((item) => (
                  <tr key={item.budgetItemId}>
                    <th scope="row" className="data-grid__label budget-page__item">
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
                      <Amount value={item.yearCents / 100} />
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
                  <Amount value={grid.yearCents / 100} />
                </td>
                <VarianceCell cells={matrix?.months} closed={closed} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="budget-page__status">
        Le righe colorate sono le macro-area (con i totali): ▾/▸ apre e chiude le voci, ⋮⋮ le trascina, ↑↓ le spostano. Nei mesi chiusi (✓) la cella mostra il reale, e sotto il previsto solo se è diverso; nei mesi aperti (○) il previsto, in corsivo. «Reale − previsto» somma i soli mesi chiusi:
        verde con + è meglio del previsto (più entrate o meno spese), rosso con − è peggio.
      </p>
    </main>
  )
}

/** Previsto, e per i mesi chiusi il reale in evidenza con il previsto più piccolo sotto. */
function ClosedAmount({ budgeted, actual }: { budgeted: number; actual: number | undefined }) {
  if (actual === undefined) return <Amount value={budgeted} className="budget-cell__forecast" />
  const differs = Math.abs(actual - budgeted) >= 0.005
  return (
    <span className="budget-cell">
      <Amount value={actual} />
      {differs && (
        <span className="budget-cell__planned">
          previsto <Amount value={budgeted} />
        </span>
      )}
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
      <Amount value={cell.cents / 100} />
      {cell.otherSources.map((source) => (
        <span key={source} className="budget-cell__source" title={sourceLabel(source)}>
          {sourceShortLabel(source)}
          <span className="visually-hidden"> ({sourceLabel(source)})</span>
        </span>
      ))}
    </span>
  )
}
