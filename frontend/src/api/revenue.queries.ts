import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createArchivableHooks, createCrudHooks, invalidateAll } from './crud-hooks.ts'
import type { BudgetEntryDraft, MonthRange } from './month-range.ts'
import { queryKeys } from './query-keys.ts'
import { revenueService, type WorkedDaysFilters } from './revenue.service.ts'

// Giorni, tariffe e ritardi cambiano gli incassi previsti: invalidiamo anche il budget.
const invalidate = [queryKeys.revenue.all, queryKeys.budget.all] as const

const clients = createArchivableHooks({ service: revenueService.clients, key: queryKeys.revenue.clients, invalidate })
export const useClients = clients.useList
export const useClient = clients.useById
export const useCreateClient = clients.useCreate
export const useUpdateClient = clients.useUpdate
export const useDeleteClient = clients.useRemove
export const useSetArchivedClient = clients.useSetArchived
export const useReorderClients = clients.useReorder

/** Id dei clienti con tariffe o giorni lavorati collegati. */
export function useClientIdsInUse() {
  return useQuery({
    queryKey: [...queryKeys.revenue.all, 'client-ids-in-use'],
    queryFn: () => revenueService.listClientIdsInUse(),
  })
}

const rates = createCrudHooks({ service: revenueService.rates, key: queryKeys.revenue.rates, invalidate })
export const useClientRatesList = rates.useList
export const useCreateClientRate = rates.useCreate
export const useUpdateClientRate = rates.useUpdate
export const useDeleteClientRate = rates.useRemove

const workedDays = createCrudHooks({ service: revenueService.workedDays, key: queryKeys.revenue.workedDays, invalidate })
export const useDeleteWorkedDays = workedDays.useRemove

export function useClientRates(clientId: number | null) {
  return useQuery({
    queryKey: [...queryKeys.revenue.rates, 'of', clientId],
    queryFn: () => revenueService.listRates(clientId as number),
    enabled: clientId !== null,
  })
}

export function useWorkedDays(filters: WorkedDaysFilters = {}) {
  return useQuery({
    queryKey: [...queryKeys.revenue.workedDays, 'filtered', filters],
    queryFn: () => revenueService.listWorkedDays(filters),
  })
}

export function useSetWorkedDays() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { clientId: number; year: number; month: number; days: number }) =>
      revenueService.setWorkedDays(args.clientId, args.year, args.month, args.days),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useReplaceRevenueDriverEntries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { range: MonthRange; entries: readonly BudgetEntryDraft[] }) =>
      revenueService.replaceRevenueDriverEntries(args.range, args.entries),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}
