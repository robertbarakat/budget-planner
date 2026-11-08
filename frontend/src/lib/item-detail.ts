import { computeMonthlyValues, eurosToCents } from 'budget-planner-shared'
import type { EntryInput, Figures, TransactionInput } from './macro-areas.ts'

export interface ItemMonthRow extends Figures {
  month: number
  isClosed: boolean
}

export interface ItemCategoryRow {
  categoryId: number
  name: string
  /** Reale dell'anno della categoria, con segno (entrate +, spese −). */
  actual: number
}

export interface ItemDetail {
  budgetItemId: number
  year: number
  months: ItemMonthRow[]
  /** Totale annuo: coincide con la riga della voce nella vista per macro-area (anno intero). */
  total: Figures
  categories: ItemCategoryRow[]
}

const euros = (cents: number) => cents / 100

/**
 * Dettaglio di una voce in un anno: previsto, reale e scostamento per ciascun mese, totale annuo e
 * reale per categoria. Usa `computeMonthlyValues` di `shared/`: i totali sono gli stessi della vista per macro-area.
 * `categoryNames` serve a dare un nome alle categorie; le categorie archiviate senza movimenti nell'anno non compaiono.
 */
export function buildItemDetail(
  year: number,
  item: { id: number; kind: 'income' | 'expense' },
  entries: readonly EntryInput[],
  transactions: readonly TransactionInput[],
  closedMonths: readonly { year: number; month: number }[],
  categories: readonly { id: number; budgetItemId: number; name: string; archived: boolean }[],
): ItemDetail {
  const mine = transactions.filter((t) => t.budgetItemId === item.id)
  const values = computeMonthlyValues({
    year,
    budgetItems: [{ budgetItemId: item.id, kind: item.kind }],
    budgetEntries: entries
      .filter((e) => e.budgetItemId === item.id)
      .map((e) => ({ budgetItemId: e.budgetItemId, year: e.year, month: e.month, amountCents: eurosToCents(e.amount) })),
    transactions: mine.map((t) => ({
      type: t.type,
      budgetItemId: t.budgetItemId,
      transactionDate: t.transactionDate,
      amountCents: eurosToCents(t.amount),
    })),
    closedMonths: closedMonths.map((c) => ({ year: c.year, month: c.month })),
  })
  const months = values.map((v): ItemMonthRow => ({
    month: v.month,
    isClosed: v.isClosed,
    budgeted: euros(v.budgetedCents),
    actual: euros(v.actualCents),
    variance: euros(v.actualCents - v.budgetedCents),
  }))
  const sum = (pick: (v: (typeof values)[number]) => number) => euros(values.reduce((t, v) => t + pick(v), 0))

  // Reale per categoria: stesse regole del reale della voce (spese −, entrate +, trasferimenti esclusi, solo l'anno).
  const perCategory = new Map<number, number>()
  for (const t of mine) {
    if (t.type === 'transfer' || t.categoryId === null || !t.transactionDate.startsWith(`${year}-`)) continue
    const cents = eurosToCents(t.amount) * (t.type === 'income' ? 1 : -1)
    perCategory.set(t.categoryId, (perCategory.get(t.categoryId) ?? 0) + cents)
  }
  const rows: ItemCategoryRow[] = categories
    .filter((c) => c.budgetItemId === item.id && (!c.archived || perCategory.has(c.id)))
    .map((c) => ({ categoryId: c.id, name: c.name, actual: euros(perCategory.get(c.id) ?? 0) }))
  return {
    budgetItemId: item.id,
    year,
    months,
    total: {
      budgeted: sum((v) => v.budgetedCents),
      actual: sum((v) => v.actualCents),
      variance: sum((v) => v.actualCents - v.budgetedCents),
    },
    categories: rows,
  }
}
