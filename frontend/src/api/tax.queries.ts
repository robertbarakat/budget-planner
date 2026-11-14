import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCrudHooks, invalidateAll } from './crud-hooks.ts'
import type { BudgetEntryDraft, MonthRange } from './month-range.ts'
import { queryKeys } from './query-keys.ts'
import { taxService, type PlannedDeadline, type TaxParametersValues } from './tax.service.ts'

// Parametri, rate e scadenze alimentano la riga "Imposte" del budget: invalidiamo anche il budget.
const invalidate = [queryKeys.tax.all, queryKeys.budget.all] as const

const parameters = createCrudHooks({ service: taxService.parameters, key: queryKeys.tax.parameters, invalidate })
export const useTaxParametersList = parameters.useList
export const useDeleteTaxParameters = parameters.useRemove

const plans = createCrudHooks({ service: taxService.installmentPlans, key: queryKeys.tax.installmentPlans, invalidate })
export const useInstallmentPlans = plans.useList
export const useInstallmentPlan = plans.useById
export const useUpdateInstallmentPlan = plans.useUpdate
export const useDeleteInstallmentPlan = plans.useRemove

const installments = createCrudHooks({ service: taxService.installments, key: queryKeys.tax.installments, invalidate })
export const useAllInstallments = installments.useList
export const useCreateInstallment = installments.useCreate
export const useUpdateInstallment = installments.useUpdate
export const useDeleteInstallment = installments.useRemove

const planLines = createCrudHooks({ service: taxService.installmentLines, key: queryKeys.tax.installmentLines, invalidate })
export const useInstallmentLines = planLines.useList

const deadlines = createCrudHooks({ service: taxService.f24Deadlines, key: queryKeys.tax.f24Deadlines, invalidate })
export const useF24Deadlines = deadlines.useList
export const useCreateF24Deadline = deadlines.useCreate
export const useUpdateF24Deadline = deadlines.useUpdate
export const useDeleteF24Deadline = deadlines.useRemove

export function useTaxParameters(year: number) {
  return useQuery({
    queryKey: [...queryKeys.tax.parameters, 'year', year],
    queryFn: () => taxService.getParametersForYear(year),
  })
}

export function useInstallments(planId: number | null) {
  return useQuery({
    queryKey: [...queryKeys.tax.installments, 'of', planId],
    queryFn: () => taxService.listInstallments(planId as number),
    enabled: planId !== null,
  })
}

export function useF24DeadlinesDueInYear(year: number) {
  return useQuery({
    queryKey: [...queryKeys.tax.f24Deadlines, 'due-year', year],
    queryFn: () => taxService.listDeadlinesDueInYear(year),
  })
}

export function useSaveTaxParameters() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { year: number; values: TaxParametersValues }) =>
      taxService.saveParametersForYear(args.year, args.values),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useLinkDeadlineToTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { deadlineId: number; transactionId: number | null }) =>
      taxService.linkDeadlineToTransaction(args.deadlineId, args.transactionId),
    onSuccess: () => invalidateAll(queryClient, [...invalidate, queryKeys.transactions.all]),
  })
}

export function useReplaceTaxEntries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { range: MonthRange; entries: readonly BudgetEntryDraft[] }) =>
      taxService.replaceTaxEntries(args.range, args.entries),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useSyncF24Deadlines() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { year: number; planned: readonly PlannedDeadline[] }) => taxService.syncDeadlines(args.year, args.planned),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useApplyTaxEntries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (segments: Parameters<typeof taxService.applyTaxEntries>[0]) => taxService.applyTaxEntries(segments),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useCreateInstallmentPlanFromSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: Parameters<typeof taxService.createPlanFromSchedule>) => taxService.createPlanFromSchedule(...args),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useRebuildInstallmentPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: Parameters<typeof taxService.rebuildPlan>) => taxService.rebuildPlan(...args),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}
