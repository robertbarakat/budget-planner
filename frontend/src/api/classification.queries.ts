import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateAll, createCrudHooks } from './crud-hooks.ts'
import { classificationService, type MoveCategoryOptions } from './classification.service.ts'
import { queryKeys } from './query-keys.ts'

// Spostare una categoria o cambiare una voce tocca anche i movimenti: li invalidiamo insieme.
const invalidate = [queryKeys.classification.all, queryKeys.transactions.all, queryKeys.budget.all] as const

const macroAreas = createCrudHooks({
  service: classificationService.macroAreas,
  key: queryKeys.classification.macroAreas,
  invalidate,
})
export const useMacroAreas = macroAreas.useList
export const useMacroArea = macroAreas.useById
export const useCreateMacroArea = macroAreas.useCreate
export const useUpdateMacroArea = macroAreas.useUpdate
export const useDeleteMacroArea = macroAreas.useRemove

const budgetItems = createCrudHooks({
  service: classificationService.budgetItems,
  key: queryKeys.classification.budgetItems,
  invalidate,
})
export const useBudgetItems = budgetItems.useList
export const useBudgetItem = budgetItems.useById
export const useCreateBudgetItem = budgetItems.useCreate
export const useUpdateBudgetItem = budgetItems.useUpdate
export const useDeleteBudgetItem = budgetItems.useRemove

const categories = createCrudHooks({
  service: classificationService.categories,
  key: queryKeys.classification.categories,
  invalidate,
})
export const useCategories = categories.useList
export const useCategory = categories.useById
export const useCreateCategory = categories.useCreate
export const useUpdateCategory = categories.useUpdate
export const useDeleteCategory = categories.useRemove

export function useMoveCategoryToBudgetItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { categoryId: number; budgetItemId: number; options?: MoveCategoryOptions }) =>
      classificationService.moveCategoryToBudgetItem(args.categoryId, args.budgetItemId, args.options),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}
