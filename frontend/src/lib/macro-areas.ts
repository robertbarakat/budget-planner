import { aggregateMonthlyValues, computeMonthlyValues, eurosToCents } from 'budget-planner-shared'

export interface MacroAreaInput {
  id: number
  name: string
  archived: boolean
  sortOrder: number
}

export interface BudgetItemInput {
  id: number
  macroAreaId: number
  name: string
  kind: 'income' | 'expense'
  archived: boolean
  sortOrder: number
}

export interface EntryInput {
  budgetItemId: number
  year: number
  month: number
  amount: number
}

export interface TransactionInput {
  type: 'expense' | 'income' | 'transfer'
  budgetItemId: number | null
  categoryId: number | null
  transactionDate: string
  amount: number
}

/** Previsto, reale e scostamento (reale − previsto) in euro con segno: entrate +, spese −. */
export interface Figures {
  budgeted: number
  actual: number
  variance: number
}

export interface MacroAreaItemRow extends Figures {
  budgetItemId: number
  name: string
  kind: 'income' | 'expense'
  archived: boolean
}

export interface MacroAreaGroup extends Figures {
  macroAreaId: number
  name: string
  archived: boolean
  items: MacroAreaItemRow[]
}

export interface MacroAreaReport {
  year: number
  /** Mese scelto, o null per l'anno intero. */
  month: number | null
  groups: MacroAreaGroup[]
  total: Figures
}

const euros = (cents: number): number => cents / 100
const figures = (t: { budgetedCents: number; actualCents: number; varianceCents: number }): Figures => ({
  budgeted: euros(t.budgetedCents),
  actual: euros(t.actualCents),
  variance: euros(t.varianceCents),
})

/**
 * Previsto, reale e scostamento per macro-area e per voce, per un anno intero o per un mese.
 * Usa `computeMonthlyValues` e `aggregateMonthlyValues` di `shared/`. Le aree e le voci archiviate
 * compaiono solo se nell'anno hanno importi (previsti o reali): restano così nello storico.
 */
export function buildMacroAreaReport(
  year: number,
  month: number | null,
  areas: readonly MacroAreaInput[],
  items: readonly BudgetItemInput[],
  entries: readonly EntryInput[],
  transactions: readonly TransactionInput[],
  closedMonths: readonly { year: number; month: number }[],
): MacroAreaReport {
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
  const report = aggregateMonthlyValues(
    items.map((i) => ({ budgetItemId: i.id, macroAreaId: i.macroAreaId })),
    values,
  )

  // Chi ha importi nell'anno (anche se il mese scelto è vuoto) resta visibile se archiviato.
  const usedInYear = new Set(
    report.byItem.filter((t) => t.budgetedCents !== 0 || t.actualCents !== 0).map((t) => t.budgetItemId),
  )
  const itemTotals = new Map(
    (month === null ? report.byItem : report.byItemMonth.filter((t) => t.month === month)).map((t) => [t.budgetItemId, figures(t)]),
  )
  const zero: Figures = { budgeted: 0, actual: 0, variance: 0 }

  const groups: MacroAreaGroup[] = []
  for (const area of [...areas].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)) {
    const rows = items
      .filter((i) => i.macroAreaId === area.id && (!i.archived || usedInYear.has(i.id)))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
      .map((i): MacroAreaItemRow => ({ budgetItemId: i.id, name: i.name, kind: i.kind, archived: i.archived, ...(itemTotals.get(i.id) ?? zero) }))
    if (rows.length === 0 && area.archived) continue
    // Il totale dell'area è la somma delle sue voci (in centesimi, per non accumulare errori).
    const sum = (key: keyof Figures) => euros(rows.reduce((total, r) => total + Math.round(r[key] * 100), 0))
    groups.push({
      macroAreaId: area.id,
      name: area.name,
      archived: area.archived,
      items: rows,
      budgeted: sum('budgeted'),
      actual: sum('actual'),
      variance: sum('variance'),
    })
  }
  const total = (key: keyof Figures) => euros(groups.reduce((t, g) => t + Math.round(g[key] * 100), 0))
  return {
    year,
    month,
    groups,
    total: { budgeted: total('budgeted'), actual: total('actual'), variance: total('variance') },
  }
}
