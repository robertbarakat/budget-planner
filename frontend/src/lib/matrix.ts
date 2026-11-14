import { computeMonthlyValues, eurosToCents } from 'budget-planner-shared'
import type { BudgetItemInput, EntryInput, MacroAreaInput, TransactionInput } from './macro-areas.ts'

/**
 * Modalità della matrice (nell'indirizzo come `mode`): misto (reale nei mesi chiusi, previsto negli altri),
 * previsto, reale, scostamento (reale − previsto).
 */
export type MatrixMode = 'mixed' | 'budgeted' | 'actual' | 'variance'
export const MATRIX_MODES: readonly MatrixMode[] = ['mixed', 'budgeted', 'actual', 'variance']
export const DEFAULT_MATRIX_MODE: MatrixMode = 'mixed'

/** Una cella in euro con segno (entrate +, spese −): previsto, reale, valore misto e scostamento. */
export interface MatrixCell {
  budgeted: number
  actual: number
  /** Misto: il reale se il mese è chiuso, il previsto altrimenti. */
  shown: number
  /** Reale − previsto. */
  variance: number
}

export interface MatrixItemRow {
  budgetItemId: number
  name: string
  archived: boolean
  months: MatrixCell[]
  year: MatrixCell
}

export interface MatrixGroup {
  macroAreaId: number
  name: string
  archived: boolean
  items: MatrixItemRow[]
  months: MatrixCell[]
  year: MatrixCell
}

export interface Matrix {
  year: number
  groups: MatrixGroup[]
  /** Mesi chiusi: 12 flag, da gennaio. */
  closedMonths: boolean[]
  /** Totale per mese di tutte le voci, e totale annuo. */
  months: MatrixCell[]
  total: MatrixCell
}

/** Valore da mostrare in una cella secondo la modalità. */
export function cellValue(cell: MatrixCell, mode: MatrixMode): number {
  switch (mode) {
    case 'mixed':
      return cell.shown
    case 'budgeted':
      return cell.budgeted
    case 'actual':
      return cell.actual
    case 'variance':
      return cell.variance
  }
}

/** Legge la modalità dai parametri di ricerca; un valore sconosciuto vale la modalità predefinita. */
export function readMatrixMode(value: string | null): MatrixMode {
  return MATRIX_MODES.find((mode) => mode === value) ?? DEFAULT_MATRIX_MODE
}

type CentsCell = { budgeted: number; actual: number; shown: number }
const zero = (): CentsCell => ({ budgeted: 0, actual: 0, shown: 0 })
const add = (target: CentsCell, source: CentsCell) => {
  target.budgeted += source.budgeted
  target.actual += source.actual
  target.shown += source.shown
}
const toCell = (cents: CentsCell): MatrixCell => ({
  budgeted: cents.budgeted / 100,
  actual: cents.actual / 100,
  shown: cents.shown / 100,
  variance: (cents.actual - cents.budgeted) / 100,
})

/**
 * Matrice voci × mesi di un anno, raggruppata per macro-area, con totali per voce, area e mese.
 * Valori da `computeMonthlyValues` di `shared/` (previsto = somma delle righe di budget, reale = somma
 * dei movimenti, trasferimenti esclusi); qui si sommano solo le celle, in centesimi. Le voci e le aree
 * archiviate compaiono solo se nell'anno hanno importi.
 */
export function buildMatrix(
  year: number,
  areas: readonly MacroAreaInput[],
  items: readonly BudgetItemInput[],
  entries: readonly EntryInput[],
  transactions: readonly TransactionInput[],
  closedMonths: readonly { year: number; month: number }[],
): Matrix {
  const values = computeMonthlyValues({
    year,
    budgetItems: items.map((i) => ({ budgetItemId: i.id, kind: i.kind })),
    budgetEntries: entries.map((e) => ({ budgetItemId: e.budgetItemId, year: e.year, month: e.month, amountCents: eurosToCents(e.amount) })),
    transactions: transactions.map((t) => ({
      type: t.type,
      budgetItemId: t.budgetItemId,
      transactionDate: t.transactionDate,
      amountCents: eurosToCents(t.amount),
    })),
    closedMonths: closedMonths.map((c) => ({ year: c.year, month: c.month })),
  })
  const byItem = new Map<number, CentsCell[]>()
  const closed = Array.from({ length: 12 }, () => false)
  for (const value of values) {
    const months = byItem.get(value.budgetItemId) ?? Array.from({ length: 12 }, zero)
    months[value.month - 1] = { budgeted: value.budgetedCents, actual: value.actualCents, shown: value.shownCents }
    byItem.set(value.budgetItemId, months)
    if (value.isClosed) closed[value.month - 1] = true
  }

  const grandMonths = Array.from({ length: 12 }, zero)
  const grandYear = zero()
  const groups: MatrixGroup[] = []
  for (const area of [...areas].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)) {
    const areaMonths = Array.from({ length: 12 }, zero)
    const areaYear = zero()
    const rows: MatrixItemRow[] = []
    for (const item of items.filter((i) => i.macroAreaId === area.id).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)) {
      const months = byItem.get(item.id) ?? Array.from({ length: 12 }, zero)
      const itemYear = zero()
      months.forEach((cell) => add(itemYear, cell))
      if (item.archived && itemYear.budgeted === 0 && itemYear.actual === 0) continue
      months.forEach((cell, index) => {
        add(areaMonths[index]!, cell)
        add(grandMonths[index]!, cell)
      })
      add(areaYear, itemYear)
      add(grandYear, itemYear)
      rows.push({ budgetItemId: item.id, name: item.name, archived: item.archived, months: months.map(toCell), year: toCell(itemYear) })
    }
    if (rows.length === 0 && area.archived) continue
    groups.push({
      macroAreaId: area.id,
      name: area.name,
      archived: area.archived,
      items: rows,
      months: areaMonths.map(toCell),
      year: toCell(areaYear),
    })
  }
  return { year, groups, closedMonths: closed, months: grandMonths.map(toCell), total: toCell(grandYear) }
}

/** Scostamento (reale − previsto, in euro) sommato ai soli mesi chiusi: nei mesi aperti non c'è ancora un reale da confrontare. */
export function closedVariance(months: readonly MatrixCell[], closed: readonly boolean[]): number {
  const cents = months.reduce((sum, cell, index) => (closed[index] ? sum + Math.round((cell.actual - cell.budgeted) * 100) : sum), 0)
  return cents / 100
}
