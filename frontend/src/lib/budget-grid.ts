import {
  aggregateMonthlyValues,
  computeMonthlyValues,
  eurosToCents,
  type BudgetEntrySource,
  type BudgetItemKind,
} from 'budget-planner-shared'

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

export interface GridMacroAreaInput {
  id: number
  name: string
  archived: boolean
  sortOrder: number
}

export interface GridItemInput {
  id: number
  macroAreaId: number
  name: string
  kind: BudgetItemKind
  archived: boolean
  sortOrder: number
}

export interface GridEntryInput {
  id: number
  budgetItemId: number
  year: number
  month: number
  /** Importo in euro, sempre positivo: il segno lo dà il tipo della voce. */
  amount: number
  source: BudgetEntrySource
  /** Categoria della voce, se la riga è per categoria; `null`/assente = riga di voce. */
  categoryId?: number | null
}

export interface GridCategoryInput {
  id: number
  budgetItemId: number
  name: string
  archived: boolean
  sortOrder: number
}

export interface GridCell {
  /** Valore previsto con segno (entrate +, spese −), in centesimi. */
  cents: number
  /** Righe di questa cella, nell'ordine di inserimento. */
  entries: GridEntryInput[]
  /** Origini diverse da `manual` presenti nella cella, senza doppioni. */
  otherSources: BudgetEntrySource[]
}

/** Riga di una categoria dentro una voce (`categoryId` null = importi della voce senza categoria). */
export interface GridCategoryRow {
  categoryId: number | null
  name: string
  months: GridCell[]
  yearCents: number
}

export interface GridItemRow {
  budgetItemId: number
  name: string
  kind: BudgetItemKind
  archived: boolean
  months: GridCell[]
  yearCents: number
  /** Categorie da mostrare sotto la voce (vuoto se la voce ha una sola categoria: si inserisce a livello di voce). */
  categories: GridCategoryRow[]
}

export interface GridMacroAreaGroup {
  macroAreaId: number
  name: string
  archived: boolean
  items: GridItemRow[]
  monthCents: number[]
  yearCents: number
}

export interface BudgetGrid {
  year: number
  groups: GridMacroAreaGroup[]
  /** Totale per mese (indice 0 = gennaio). */
  monthCents: number[]
  yearCents: number
}

/**
 * Griglia del budget previsto di un anno: voci raggruppate per macro-area × 12 mesi.
 * I totali vengono dalle funzioni di `shared/` (`computeMonthlyValues`, `aggregateMonthlyValues`),
 * quindi i valori hanno il segno del tipo di voce. Voci e macro-aree archiviate compaiono
 * solo se nell'anno hanno righe.
 */
export function buildBudgetGrid(
  year: number,
  macroAreas: readonly GridMacroAreaInput[],
  items: readonly GridItemInput[],
  entries: readonly GridEntryInput[],
  categories: readonly GridCategoryInput[] = [],
): BudgetGrid {
  const yearEntries = entries.filter((entry) => entry.year === year)
  const usedItemIds = new Set(yearEntries.map((entry) => entry.budgetItemId))

  const visibleItems = items
    .filter((item) => !item.archived || usedItemIds.has(item.id))
    .sort(bySortOrderThenId)
  const visibleAreaIds = new Set(visibleItems.map((item) => item.macroAreaId))
  const visibleAreas = macroAreas
    .filter((area) => visibleAreaIds.has(area.id) && (!area.archived || visibleItems.some((i) => i.macroAreaId === area.id)))
    .sort(bySortOrderThenId)

  const values = computeMonthlyValues({
    year,
    budgetItems: visibleItems.map((item) => ({ budgetItemId: item.id, kind: item.kind })),
    budgetEntries: yearEntries
      .filter((entry) => usedItemIds.has(entry.budgetItemId))
      .map((entry) => ({
        budgetItemId: entry.budgetItemId,
        year: entry.year,
        month: entry.month,
        amountCents: eurosToCents(entry.amount),
      })),
    transactions: [],
    closedMonths: [],
  })
  const report = aggregateMonthlyValues(
    visibleItems.map((item) => ({ budgetItemId: item.id, macroAreaId: item.macroAreaId })),
    values,
  )

  const entriesByCell = new Map<string, GridEntryInput[]>()
  for (const entry of yearEntries) {
    const key = `${entry.budgetItemId}-${entry.month}`
    entriesByCell.set(key, [...(entriesByCell.get(key) ?? []), entry])
  }
  const itemMonthCents = new Map(values.map((v) => [`${v.budgetItemId}-${v.month}`, v.budgetedCents]))
  const itemYearCents = new Map(report.byItem.map((t) => [t.budgetItemId, t.budgetedCents]))
  const areaYearCents = new Map(report.byMacroArea.map((t) => [t.macroAreaId, t.budgetedCents]))
  const areaMonthCents = new Map(report.byMacroAreaMonth.map((t) => [`${t.macroAreaId}-${t.month}`, t.budgetedCents]))
  const totalMonthCents = new Map(report.byMonth.map((t) => [t.month, t.budgetedCents]))

  const groups = visibleAreas.map((area): GridMacroAreaGroup => ({
    macroAreaId: area.id,
    name: area.name,
    archived: area.archived,
    items: visibleItems
      .filter((item) => item.macroAreaId === area.id)
      .map((item): GridItemRow => ({
        budgetItemId: item.id,
        name: item.name,
        kind: item.kind,
        archived: item.archived,
        months: MONTHS.map((month): GridCell => {
          const cellEntries = entriesByCell.get(`${item.id}-${month}`) ?? []
          return {
            cents: itemMonthCents.get(`${item.id}-${month}`) ?? 0,
            entries: cellEntries,
            otherSources: [...new Set(cellEntries.map((e) => e.source).filter((s) => s !== 'manual'))],
          }
        }),
        yearCents: itemYearCents.get(item.id) ?? 0,
        categories: categoryRows(item, categories, yearEntries),
      })),
    monthCents: MONTHS.map((month) => areaMonthCents.get(`${area.id}-${month}`) ?? 0),
    yearCents: areaYearCents.get(area.id) ?? 0,
  }))

  return {
    year,
    groups,
    monthCents: MONTHS.map((month) => totalMonthCents.get(month) ?? 0),
    yearCents: report.byYear.find((t) => t.year === year)?.budgetedCents ?? 0,
  }
}

/** Righe per categoria di una voce: solo se ha più di una categoria attiva (o righe già assegnate a categorie). */
function categoryRows(item: GridItemInput, categories: readonly GridCategoryInput[], yearEntries: readonly GridEntryInput[]): GridCategoryRow[] {
  const own = categories.filter((c) => c.budgetItemId === item.id).sort(bySortOrderThenId)
  const itemEntries = yearEntries.filter((e) => e.budgetItemId === item.id)
  const usedCategoryIds = new Set(itemEntries.flatMap((e) => (e.categoryId == null ? [] : [e.categoryId])))
  const shown = own.filter((c) => !c.archived || usedCategoryIds.has(c.id))
  if (shown.length < 2 && usedCategoryIds.size === 0) return []
  const sign = item.kind === 'expense' ? -1 : 1
  const row = (categoryId: number | null, name: string): GridCategoryRow => {
    const months = MONTHS.map((month): GridCell => {
      const cellEntries = itemEntries.filter((e) => e.month === month && (e.categoryId ?? null) === categoryId)
      return {
        cents: cellEntries.reduce((sum, e) => sum + sign * eurosToCents(e.amount), 0),
        entries: cellEntries,
        otherSources: [...new Set(cellEntries.map((e) => e.source).filter((s) => s !== 'manual'))],
      }
    })
    return { categoryId, name, months, yearCents: months.reduce((sum, m) => sum + m.cents, 0) }
  }
  const rows = shown.map((c) => row(c.id, c.name))
  const loose = row(null, 'Senza categoria')
  if (loose.months.some((m) => m.entries.length > 0)) rows.push(loose)
  return rows
}

function bySortOrderThenId(a: { sortOrder: number; id: number }, b: { sortOrder: number; id: number }): number {
  return a.sortOrder - b.sortOrder || a.id - b.id
}

const SOURCE_LABELS: Record<BudgetEntrySource, string> = {
  manual: 'Manuale',
  revenue_driver: 'Driver ricavi',
  recurrence: 'Ricorrenza',
  tax: 'Fiscale',
}

const SOURCE_SHORT_LABELS: Record<BudgetEntrySource, string> = {
  manual: 'Manuale',
  revenue_driver: 'Ricavi',
  recurrence: 'Ricorrente',
  tax: 'Fiscale',
}

/** Nome esteso dell'origine di una riga, in italiano. */
export function sourceLabel(source: BudgetEntrySource): string {
  return SOURCE_LABELS[source]
}

/** Etichetta breve dell'origine, per le celle strette. */
export function sourceShortLabel(source: BudgetEntrySource): string {
  return SOURCE_SHORT_LABELS[source]
}
