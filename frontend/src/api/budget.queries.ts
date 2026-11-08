import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { budgetService, type BudgetEntryFilters } from './budget.service.ts'
import { createCrudHooks, invalidateAll } from './crud-hooks.ts'
import { queryKeys } from './query-keys.ts'

const invalidate = [queryKeys.budget.all] as const

const entries = createCrudHooks({ service: budgetService.entries, key: queryKeys.budget.entries, invalidate })
export const useBudgetEntry = entries.useById
export const useCreateBudgetEntry = entries.useCreate
export const useUpdateBudgetEntry = entries.useUpdate
export const useDeleteBudgetEntry = entries.useRemove

/** Righe di budget filtrate per anno, mese, voce e origine. */
export function useBudgetEntries(filters: BudgetEntryFilters = {}) {
  return useQuery({
    queryKey: [...queryKeys.budget.entries, 'filtered', filters],
    queryFn: () => budgetService.listEntries(filters),
  })
}

/** Salva (o elimina, con `amount: null`) la riga manuale di una cella del budget. */
export function useSetManualBudgetAmount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { budgetItemId: number; year: number; month: number; amount: number | null }) =>
      budgetService.setManualAmount(args.budgetItemId, args.year, args.month, args.amount),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useClosedMonths(year?: number) {
  return useQuery({
    queryKey: [...queryKeys.budget.closedMonths, 'list', year ?? null],
    queryFn: () => budgetService.listClosedMonths(year),
  })
}

export function useCloseMonth() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { year: number; month: number }) => budgetService.closeMonth(args.year, args.month),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useReopenMonth() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { year: number; month: number }) => budgetService.reopenMonth(args.year, args.month),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

/** Id delle voci con righe di budget collegate. */
export function useBudgetItemIdsInUse() {
  return useQuery({
    queryKey: [...queryKeys.budget.entries, 'item-ids-in-use'],
    queryFn: () => budgetService.listBudgetItemIdsInUse(),
  })
}
