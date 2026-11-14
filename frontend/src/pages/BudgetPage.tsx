import { Fragment, useMemo, useState } from 'react'
import { useBudgetEntries, useSetManualBudgetAmount } from '../api/budget.queries.ts'
import { useBudgetItems, useCategories, useMacroAreas, useReorderMacroAreas } from '../api/classification.queries.ts'
import { useYearData } from '../api/year-data.queries.ts'
import Amount from '../components/Amount.tsx'
import { useSnackbar } from '../components/Snackbar.tsx'
import YearSelector from '../components/YearSelector.tsx'
import { buildBudgetGrid, sourceLabel, sourceShortLabel, type GridCell } from '../lib/budget-grid.ts'
import { buildMatrix } from '../lib/matrix.ts'
import { monthOptions } from '../lib/months.ts'
import { useMediaQuery } from '../lib/use-media-query.ts'
import '../components/DataGrid.css'
import './BudgetPage.css'
import DisclosureButton from '../components/DisclosureButton.tsx'
import EditableBudgetCell from '../components/EditableBudgetCell.tsx'

const MONTHS = monthOptions()
const COLLAPSED_KEY = 'budget.collapsedAreas'
const EXPANDED_ITEMS_KEY = 'budget.expandedItems'

function readExpandedItems(): Set<number> {
  try {
    const raw = JSON.parse(localStorage.getItem(EXPANDED_ITEMS_KEY) ?? '[]') as unknown
    return new Set(Array.isArray(raw) ? raw.filter((v): v is number => typeof v === 'number') : [])
  } catch {
    return new Set()
  }
}

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
  const categoriesQuery = useCategories()
  const entries = useBudgetEntries({ year })
  const data = useYearData(year)
  const setManual = useSetManualBudgetAmount()
  const reorder = useReorderMacroAreas()
  const [collapsed, setCollapsed] = useState<Set<number>>(readCollapsed)
  const [dragId, setDragId] = useState<number | null>(null)
  // Voci con le categorie aperte: di base si vede solo il totale della voce.
  const [expandedItems, setExpandedItems] = useState<Set<number>>(readExpandedItems)
  function updateExpandedItems(next: Set<number>) {
    setExpandedItems(next)
    try {
      localStorage.setItem(EXPANDED_ITEMS_KEY, JSON.stringify([...next]))
    } catch {
      // senza storage la scelta vale solo per la sessione
    }
  }
  function toggleItem(id: number) {
    const next = new Set(expandedItems)
    if (!next.delete(id)) next.add(id)
    updateExpandedItems(next)
  }
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const [month, setMonth] = useState<number | null>(() => new Date().getMonth() + 1)

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
  const saveCell = (budgetItemId: number, month: number, categoryId: number | null = null) => async (amount: number | null) => {
    await setManual.mutateAsync({ budgetItemId, year, month, amount, categoryId })
    showSuccess(amount === null ? 'Riga manuale eliminata.' : 'Budget salvato.')
  }

  const queries = [macroAreas, budgetItems, entries, categoriesQuery]
  const yearError = data.isError
  const grid = useMemo(() => {
    if (!macroAreas.data || !budgetItems.data || !entries.data || !categoriesQuery.data) return null
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
        categoryId: e.category_id,
      })),
      categoriesQuery.data.map((c) => ({ id: c.id, budgetItemId: c.budget_item_id, name: c.name, archived: c.archived, sortOrder: c.sort_order })),
    )
  }, [year, macroAreas.data, budgetItems.data, entries.data, categoriesQuery.data])

  // Reale per voce, categoria e mese (spese negative, entrate positive), per i mesi chiusi.
  const categoryActuals = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of data.transactions ?? []) {
      if (t.type === 'transfer' || t.budget_item_id === null) continue
      const month = Number(t.transaction_date.slice(5, 7))
      const key = `${t.budget_item_id}|${t.category_id ?? 'none'}|${month}`
      map.set(key, (map.get(key) ?? 0) + (t.type === 'expense' ? -Number(t.amount) : Number(t.amount)))
    }
    return map
  }, [data.transactions])
  const categoryActual = (itemId: number, categoryId: number | null, index: number) =>
    closed[index] ? Math.round((categoryActuals.get(`${itemId}|${categoryId ?? 'none'}|${index + 1}`) ?? 0) * 100) / 100 : undefined

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
            <button
              type="button"
              onClick={() => {
                updateCollapsed(new Set())
                updateExpandedItems(new Set(grid.groups.flatMap((g) => g.items.filter((i) => i.categories.length > 0).map((i) => i.budgetItemId))))
              }}
            >
              Espandi tutto
            </button>
            <button
              type="button"
              onClick={() => {
                updateCollapsed(new Set(grid.groups.map((g) => g.macroAreaId)))
                updateExpandedItems(new Set())
              }}
            >
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
      ) : isMobile ? (
        <div className="budget-mobile">
          <div className="budget-mobile__months" role="group" aria-label="Periodo">
            <button type="button" aria-label="Mese precedente" disabled={month === null || month === 1} onClick={() => setMonth((month ?? 1) - 1)}>
              ‹
            </button>
            <span className="budget-mobile__month">
              {month === null ? `Anno ${year}` : `${MONTHS[month - 1]!.label} ${year}`}
              {month !== null && <span className="budget-page__month-state">{closed[month - 1] ? '✓ reale' : '○ previsto'}</span>}
            </span>
            <button type="button" aria-label="Mese successivo" disabled={month === null || month === 12} onClick={() => setMonth((month ?? 12) + 1)}>
              ›
            </button>
          </div>
          <button
            type="button"
            className="text-link budget-mobile__switch"
            onClick={() => setMonth(month === null ? new Date().getMonth() + 1 : null)}
          >
            {month === null ? 'Vedi un mese' : 'Vedi anno intero'}
          </button>
          {grid.groups.map((group) => {
            const index = (month ?? 1) - 1
            const open = !collapsed.has(group.macroAreaId)
            return (
              <section key={group.macroAreaId} className="budget-mobile__area">
                <button
                  type="button"
                  className="budget-mobile__area-head"
                  aria-expanded={open}
                  onClick={() => toggleArea(group.macroAreaId)}
                >
                  <span>
                    <span aria-hidden="true">{open ? '▾' : '▸'}</span> {group.archived ? `${group.name} (archiviata)` : group.name}
                  </span>
                  {month === null ? (
                    <Amount value={group.yearCents / 100} />
                  ) : (
                    <ClosedAmount
                      budgeted={(group.monthCents[index] ?? 0) / 100}
                      actual={closed[index] ? groupCells.get(group.macroAreaId)?.[index]?.actual : undefined}
                    />
                  )}
                </button>
                {open && (
                  <ul className="budget-mobile__items">
                    {group.items.map((item) => {
                      const cell = item.months[index]!
                      return (
                        <li key={item.budgetItemId} className="budget-mobile__item">
                          {item.categories.length > 0 ? (
                            <DisclosureButton className="budget-mobile__item-toggle" expanded={expandedItems.has(item.budgetItemId)} onToggle={() => toggleItem(item.budgetItemId)}>
                          {item.archived ? `${item.name} (archiviata)` : item.name}
                              <span className="budget-mobile__item-count">{item.categories.length} categorie</span>
                            </DisclosureButton>
                          ) : (
                            <span className="budget-mobile__item-name">{item.archived ? `${item.name} (archiviata)` : item.name}</span>
                          )}
                          {month === null ? (
                            <Amount value={item.yearCents / 100} />
                          ) : item.categories.length > 0 ? (
                            <span className="budget-cell__readonly">
                              <BudgetCell cell={cell} actual={closed[index] ? itemCells.get(item.budgetItemId)?.[index]?.actual : undefined} />
                            </span>
                          ) : (
                            <EditableBudgetCell title={`${item.name}, ${MONTHS[index]!.label} ${year}`} ariaLabel={`Modifica ${item.name}, ${MONTHS[index]!.label} ${year}`} kind={item.kind} entries={cell.entries} onSave={saveCell(item.budgetItemId, month)}>
<BudgetCell cell={cell} actual={closed[index] ? itemCells.get(item.budgetItemId)?.[index]?.actual : undefined} />
</EditableBudgetCell>
                          )}
                          {item.categories.length > 0 && expandedItems.has(item.budgetItemId) && (
                            <ul className="budget-mobile__categories">
                              {item.categories.map((cat) => {
                                const catCell = cat.months[index]!
                                return (
                                  <li key={cat.categoryId ?? 'none'} className="budget-mobile__category">
                                    <span className="budget-mobile__category-name">{cat.name}</span>
                                    {month === null ? (
                                      <Amount value={cat.yearCents / 100} />
                                    ) : (
                                      <EditableBudgetCell title={`${item.name} · ${cat.name}, ${MONTHS[index]!.label} ${year}`} ariaLabel={`Modifica ${item.name} ${cat.name}, ${MONTHS[index]!.label} ${year}`} kind={item.kind} entries={catCell.entries} onSave={saveCell(item.budgetItemId, month, cat.categoryId)}>
<BudgetCell cell={catCell} actual={categoryActual(item.budgetItemId, cat.categoryId, index)} />
</EditableBudgetCell>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            )
          })}
          {month !== null && (
            <div className="budget-mobile__total">
              <span>Totale {MONTHS[month - 1]!.label}</span>
              <ClosedAmount budgeted={(grid.monthCents[month - 1] ?? 0) / 100} actual={closed[month - 1] ? matrix?.months[month - 1]?.actual : undefined} />
            </div>
          )}
          <div className="budget-mobile__total">
            <span>Totale anno {year}</span>
            <Amount value={grid.yearCents / 100} />
          </div>
        </div>
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
                </tr>
                {!collapsed.has(group.macroAreaId) && group.items.map((item) => (
                  <Fragment key={item.budgetItemId}>
                  <tr className={item.categories.length > 0 ? 'budget-page__voice budget-page__voice--parent' : 'budget-page__voice'}>
                    <th scope="row" className="data-grid__label budget-page__item">
                      {item.categories.length > 0 ? (
                        <DisclosureButton className="budget-page__item-toggle" expanded={expandedItems.has(item.budgetItemId)} onToggle={() => toggleItem(item.budgetItemId)}>
                          {item.archived ? `${item.name} (archiviata)` : item.name}
                          <span className="budget-page__item-count">{item.categories.length} categorie</span>
                        </DisclosureButton>
                      ) : item.archived ? `${item.name} (archiviata)` : item.name}
                    </th>
                    {item.months.map((cell, index) => (
                      <td key={index}>
                        {item.categories.length > 0 ? (
                          <span className="budget-cell__readonly">
                            <BudgetCell cell={cell} actual={closed[index] ? itemCells.get(item.budgetItemId)?.[index]?.actual : undefined} />
                          </span>
                        ) : (
                        <EditableBudgetCell title={`${item.name}, ${MONTHS[index]!.label} ${year}`} ariaLabel={`Modifica ${item.name}, ${MONTHS[index]!.label} ${year}`} kind={item.kind} entries={cell.entries} onSave={saveCell(item.budgetItemId, index + 1)}>
<BudgetCell cell={cell} actual={closed[index] ? itemCells.get(item.budgetItemId)?.[index]?.actual : undefined} />
</EditableBudgetCell>
                        )}
                      </td>
                    ))}
                    <td className="data-grid__sum">
                      <Amount value={item.yearCents / 100} />
                    </td>
                  </tr>
                  {expandedItems.has(item.budgetItemId) && item.categories.map((cat) => (
                    <tr key={cat.categoryId ?? 'none'} className="budget-page__category">
                      <th scope="row" className="data-grid__label budget-page__category-name">
                        {cat.name}
                      </th>
                      {cat.months.map((cell, index) => (
                        <td key={index}>
                          <EditableBudgetCell title={`${item.name} · ${cat.name}, ${MONTHS[index]!.label} ${year}`} ariaLabel={`Modifica ${item.name} ${cat.name}, ${MONTHS[index]!.label} ${year}`} kind={item.kind} entries={cell.entries} onSave={saveCell(item.budgetItemId, index + 1, cat.categoryId)}>
<BudgetCell cell={cell} actual={categoryActual(item.budgetItemId, cat.categoryId, index)} />
</EditableBudgetCell>
                        </td>
                      ))}
                      <td className="data-grid__sum">
                        <Amount value={cat.yearCents / 100} />
                      </td>
                      <td className="data-grid__sum" />
                    </tr>
                  ))}
                  </Fragment>
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
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="budget-page__status">
        Le righe colorate sono le macro-area (con i totali): ▾/▸ apre e chiude le voci, ⋮⋮ le trascina, ↑↓ le spostano. Nei mesi chiusi (✓) la cella mostra il reale, e sotto il previsto solo se è diverso; nei mesi aperti (○) il previsto, in corsivo.
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
