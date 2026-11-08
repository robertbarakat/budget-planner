import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateAll, createArchivableHooks } from './crud-hooks.ts'
import { classificationService, type MoveCategoryOptions } from './classification.service.ts'
import { queryKeys } from './query-keys.ts'

// Spostare una categoria o cambiare una voce tocca anche i movimenti: li invalidiamo insieme.
const invalidate = [queryKeys.classification.all, queryKeys.transactions.all, queryKeys.budget.all] as const

const macroAreas = createArchivableHooks({
  service: classificationService.macroAreas,
  key: queryKeys.classification.macroAreas,
  invalidate,
})
export const useMacroAreas = macroAreas.useList
export const useMacroArea = macroAreas.useById
export const useCreateMacroArea = macroAreas.useCreate
export const useUpdateMacroArea = macroAreas.useUpdate
export const useDeleteMacroArea = macroAreas.useRemove
export const useSetArchivedMacroArea = macroAreas.useSetArchived
export const useReorderMacroAreas = macroAreas.useReorder

const budgetItems = createArchivableHooks({
  service: classificationService.budgetItems,
  key: queryKeys.classification.budgetItems,
  invalidate,
})
export const useBudgetItems = budgetItems.useList
export const useBudgetItem = budgetItems.useById
export const useCreateBudgetItem = budgetItems.useCreate
export const useUpdateBudgetItem = budgetItems.useUpdate
export const useDeleteBudgetItem = budgetItems.useRemove
export const useSetArchivedBudgetItem = budgetItems.useSetArchived
export const useReorderBudgetItems = budgetItems.useReorder

const categories = createArchivableHooks({
  service: classificationService.categories,
  key: queryKeys.classification.categories,
  invalidate,
})
export const useCategories = categories.useList
export const useCategory = categories.useById
export const useCreateCategory = categories.useCreate
export const useUpdateCategory = categories.useUpdate
export const useDeleteCategory = categories.useRemove
export const useSetArchivedCategory = categories.useSetArchived
export const useReorderCategories = categories.useReorder

export function useMoveCategoryToBudgetItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { categoryId: number; budgetItemId: number; options?: MoveCategoryOptions }) =>
      classificationService.moveCategoryToBudgetItem(args.categoryId, args.budgetItemId, args.options),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

/** Quanti movimenti della categoria passerebbero alla voce indicata (lettura al momento, senza cache). */
export function useCountHistoryToReclassify() {
  return useMutation({
    mutationFn: (args: { categoryId: number; budgetItemId: number }) =>
      classificationService.countHistoryToReclassify(args.categoryId, args.budgetItemId),
  })
}

/** Riclassifica lo storico di una categoria (solo su scelta esplicita dell'utente). */
export function useReclassifyCategoryHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { categoryId: number; budgetItemId: number }) =>
      classificationService.reclassifyCategoryHistory(args.categoryId, args.budgetItemId),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}
