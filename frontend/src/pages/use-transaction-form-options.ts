import { useAccounts } from '../api/accounts.queries.ts'
import { useBudgetItems, useCategories, useMacroAreas } from '../api/classification.queries.ts'
import type { AccountOption, CategoryGroup } from '../components/TransactionForm.tsx'

interface Keep {
  /** Conti già usati dal movimento che si sta modificando: restano scegliibili anche se archiviati. */
  accountIds?: number[]
  /** Categoria già usata dal movimento che si sta modificando: resta scegliibile anche se archiviata. */
  categoryId?: number | null
}

const ORDER = [{ column: 'sort_order' as const }, { column: 'id' as const }]

/**
 * Scelte del form movimento: conti e categorie (raggruppate per voce) non archiviati, più — in modifica —
 * quelli già usati dal movimento, così il form non perde il valore corrente.
 */
export function useTransactionFormOptions(keep: Keep = {}) {
  const accounts = useAccounts({ orderBy: ORDER })
  const macroAreas = useMacroAreas()
  const budgetItems = useBudgetItems({ orderBy: ORDER })
  const categories = useCategories({ orderBy: ORDER })

  const queries = [accounts, macroAreas, budgetItems, categories]
  const keepAccounts = new Set(keep.accountIds ?? [])
  const areaName = new Map((macroAreas.data ?? []).map((area) => [area.id, area.name]))

  const accountOptions: AccountOption[] = (accounts.data ?? [])
    .filter((account) => !account.archived || keepAccounts.has(account.id))
    .map((account) => ({ id: account.id, name: account.name }))

  const groups: CategoryGroup[] = (budgetItems.data ?? []).flatMap((item) => {
    const own = (categories.data ?? []).filter(
      (category) => category.budget_item_id === item.id && (!category.archived || category.id === keep.categoryId),
    )
    // Una voce archiviata compare solo se contiene la categoria che il movimento già usa.
    const visible = !item.archived || own.some((category) => category.id === keep.categoryId)
    return !visible || own.length === 0
      ? []
      : [
          {
            budgetItemId: item.id,
            budgetItemName: item.name,
            macroAreaName: areaName.get(item.macro_area_id) ?? '',
            kind: item.kind,
            categories: own.map((category) => ({ id: category.id, name: category.name })),
          },
        ]
  })

  return {
    accounts: accountOptions,
    groups,
    isPending: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
  }
}
