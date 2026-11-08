import { useQuery } from '@tanstack/react-query'
import { createCrudHooks } from './crud-hooks.ts'
import { queryKeys } from './query-keys.ts'
import { transactionsService, type TransactionFilters } from './transactions.service.ts'

// Un movimento cambia saldi, cassa e consuntivo del budget: invalidiamo anche conti e budget.
const invalidate = [queryKeys.transactions.all, queryKeys.accounts.all, queryKeys.budget.all] as const

const transactions = createCrudHooks({ service: transactionsService, key: queryKeys.transactions.all, invalidate })

export const useTransaction = transactions.useById
export const useUpdateTransaction = transactions.useUpdate
export const useDeleteTransaction = transactions.useRemove
export const useCreateTransaction = transactions.useCreate

/** Elenco dei movimenti con filtri (periodo, conto, categoria, voce, tipo). */
export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: [...queryKeys.transactions.all, 'filtered', filters],
    queryFn: () => transactionsService.listFiltered(filters),
  })
}
