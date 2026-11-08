import { useMemo } from 'react'
import { useBudgetItems, useMacroAreas } from '../api/classification.queries.ts'
import { useYearData } from '../api/year-data.queries.ts'
import type { BudgetItemInput, EntryInput, MacroAreaInput, TransactionInput } from '../lib/macro-areas.ts'

export interface YearInputs {
  areas: MacroAreaInput[]
  budgetItems: BudgetItemInput[]
  entries: EntryInput[]
  transactions: TransactionInput[]
  closedMonths: { year: number; month: number }[]
  /** Somma dei saldi iniziali di tutti i conti per l'anno. */
  openingBalance: number
}

/**
 * Dati di un anno nella forma richiesta dalle funzioni di `src/lib/` (viste cronologica, macro-aree, Home).
 * Una sola mappatura dalle righe del database, così le viste partono dagli stessi numeri.
 */
export function useYearInputs(year: number): { inputs: YearInputs | null; isError: boolean } {
  const data = useYearData(year)
  const areas = useMacroAreas()
  const items = useBudgetItems()
  const isError = data.isError || areas.isError || items.isError

  const inputs = useMemo((): YearInputs | null => {
    if (!data.isReady || !areas.data || !items.data || !data.entries || !data.transactions || !data.closedMonths || !data.openingBalances) {
      return null
    }
    return {
      areas: areas.data.map((a) => ({ id: a.id, name: a.name, archived: a.archived, sortOrder: a.sort_order })),
      budgetItems: items.data.map((i) => ({
        id: i.id,
        macroAreaId: i.macro_area_id,
        name: i.name,
        kind: i.kind,
        archived: i.archived,
        sortOrder: i.sort_order,
      })),
      entries: data.entries.map((e) => ({ budgetItemId: e.budget_item_id, year: e.year, month: e.month, amount: e.amount })),
      transactions: data.transactions.map((t) => ({
        type: t.type,
        budgetItemId: t.budget_item_id,
        categoryId: t.category_id,
        transactionDate: t.transaction_date,
        amount: t.amount,
      })),
      closedMonths: data.closedMonths.map((c) => ({ year: c.year, month: c.month })),
      openingBalance: data.openingBalances.reduce((sum, row) => sum + row.amount, 0),
    }
  }, [data.isReady, data.entries, data.transactions, data.closedMonths, data.openingBalances, areas.data, items.data])

  return { inputs, isError }
}
