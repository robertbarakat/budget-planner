import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsService } from './accounts.service.ts'
import { createArchivableHooks, createCrudHooks, invalidateAll } from './crud-hooks.ts'
import { queryKeys } from './query-keys.ts'

// I saldi di cassa dipendono da conti e saldi iniziali: invalidiamo anche i movimenti.
const invalidate = [queryKeys.accounts.all, queryKeys.transactions.all] as const

const accounts = createArchivableHooks({ service: accountsService.accounts, key: queryKeys.accounts.accounts, invalidate })
export const useAccounts = accounts.useList
export const useAccount = accounts.useById
export const useCreateAccount = accounts.useCreate
export const useUpdateAccount = accounts.useUpdate
export const useDeleteAccount = accounts.useRemove
export const useSetArchivedAccount = accounts.useSetArchived
export const useReorderAccounts = accounts.useReorder

const openingBalances = createCrudHooks({
  service: accountsService.openingBalances,
  key: queryKeys.accounts.openingBalances,
  invalidate,
})
export const useOpeningBalances = openingBalances.useList
export const useOpeningBalance = openingBalances.useById
export const useDeleteOpeningBalance = openingBalances.useRemove

export function useSetOpeningBalance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { accountId: number; year: number; amount: number }) =>
      accountsService.setOpeningBalance(args.accountId, args.year, args.amount),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

export function useCarryOverOpeningBalance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { accountId: number; year: number }) =>
      accountsService.carryOverOpeningBalance(args.accountId, args.year),
    onSuccess: () => invalidateAll(queryClient, invalidate),
  })
}

/** Id dei conti con movimenti o saldi iniziali collegati. */
export function useAccountIdsInUse() {
  return useQuery({
    queryKey: [...queryKeys.accounts.all, 'ids-in-use'],
    queryFn: () => accountsService.listAccountIdsInUse(),
  })
}

/** Saldo corrente per conto e totale (anno indicato, movimenti fino a `today`). Si aggiorna con ogni movimento. */
export function useCurrentBalances(year: number, today: string) {
  return useQuery({
    queryKey: [...queryKeys.accounts.all, 'current-balances', year, today],
    queryFn: () => accountsService.currentBalances(year, today),
  })
}

/** Saldi iniziali di tutti i conti per un anno. */
export function useYearOpeningBalances(year: number) {
  return useQuery({
    queryKey: [...queryKeys.accounts.openingBalances, 'year', year],
    queryFn: () => accountsService.listOpeningBalances(year),
  })
}
