import type { Json } from 'budget-planner-shared'

/** Intervallo di mesi, estremi inclusi, anche a cavallo di due anni. */
export interface MonthRange {
  fromYear: number
  fromMonth: number
  toYear: number
  toMonth: number
}

/** Riga di budget da scrivere con le funzioni `replace_*_entries`. */
export interface BudgetEntryDraft {
  budgetItemId: number
  year: number
  month: number
  amount: number
}

export interface ReplaceResult {
  deletedCount: number
  insertedCount: number
}

/** Argomenti comuni delle funzioni SQL `replace_*_entries`. */
export function toReplaceArgs(range: MonthRange, entries: readonly BudgetEntryDraft[]) {
  const p_entries: Json = entries.map((entry) => ({
    budget_item_id: entry.budgetItemId,
    year: entry.year,
    month: entry.month,
    amount: entry.amount,
  }))
  return {
    p_from_year: range.fromYear,
    p_from_month: range.fromMonth,
    p_to_year: range.toYear,
    p_to_month: range.toMonth,
    p_entries,
  }
}

export function toReplaceResult(row: { deleted_count: number; inserted_count: number } | undefined): ReplaceResult {
  return { deletedCount: row?.deleted_count ?? 0, insertedCount: row?.inserted_count ?? 0 }
}
