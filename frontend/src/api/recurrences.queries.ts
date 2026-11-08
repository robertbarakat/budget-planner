import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InsertOf, UpdateOf } from './base-service.ts'
import { createCrudHooks, invalidateAll } from './crud-hooks.ts'
import { queryKeys } from './query-keys.ts'
import { recurrencesService } from './recurrences.service.ts'

// Le scadenze generano righe di budget: ogni scrittura invalida ricorrenze e budget.
const invalidate = [queryKeys.recurrences.all, queryKeys.budget.all] as const

const recurrences = createCrudHooks({
  service: recurrencesService.recurrences,
  key: queryKeys.recurrences.recurrences,
  invalidate,
})
export const useRecurrences = recurrences.useList
export const useRecurrence = recurrences.useById
export const useCreateRecurrence = recurrences.useCreate
export const useUpdateRecurrence = recurrences.useUpdate
export const useDeleteRecurrence = recurrences.useRemove

const occurrences = createCrudHooks({
  service: recurrencesService.occurrences,
  key: queryKeys.recurrences.occurrences,
  invalidate,
})
export const useOccurrence = occurrences.useById
export const useDeleteOccurrence = occurrences.useRemove

export function useOccurrences(recurrenceId: number | null) {
  return useQuery({
    queryKey: [...queryKeys.recurrences.occurrences, 'of', recurrenceId],
    queryFn: () => recurrencesService.listOccurrences(recurrenceId as number),
    enabled: recurrenceId !== null,
  })
}

export function useActiveRecurrences() {
  return useQuery({
    queryKey: [...queryKeys.recurrences.recurrences, 'active'],
    queryFn: () => recurrencesService.listRecurrences(false),
  })
}

export function useUpcomingOccurrences(fromDate: string, limit = 5) {
  return useQuery({
    queryKey: [...queryKeys.recurrences.occurrences, 'upcoming', fromDate, limit],
    queryFn: () => recurrencesService.listUpcomingOccurrences(fromDate, limit),
  })
}

export function useCreateRecurrenceWithOccurrences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { values: InsertOf<'recurrences'>; referenceDate: string }) =>
      recurrencesService.createRecurrence(args.values, args.referenceDate),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useUpdateRecurrenceWithOccurrences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { recurrenceId: number; values: UpdateOf<'recurrences'>; today: string }) =>
      recurrencesService.updateRecurrence(args.recurrenceId, args.values, args.today),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useChangeOccurrenceAmount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { occurrenceId: number; amount: number }) =>
      recurrencesService.changeOccurrenceAmount(args.occurrenceId, args.amount),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useApplyRecurrence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { recurrenceId: number; dueDates: readonly string[] }) =>
      recurrencesService.applyRecurrence(args.recurrenceId, args.dueDates),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useRegenerateOccurrences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { recurrenceId: number; dueDates: readonly string[]; today: string }) =>
      recurrencesService.regenerateOccurrences(args.recurrenceId, args.dueDates, args.today),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useArchiveRecurrence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { recurrenceId: number; today: string }) =>
      recurrencesService.archiveRecurrence(args.recurrenceId, args.today),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}
