import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { BaseService } from './base-service.ts'
import { createCrudHooks } from './crud-hooks.ts'
import { queryKeys } from './query-keys.ts'
import { fakeSupabase } from './test-utils.ts'

const row = { id: 1, name: 'Cash', sort_order: 0, archived: false, created_at: '2026-01-01' }

function setup() {
  const { client } = fakeSupabase({ data: [row], error: null })
  const service = new BaseService('accounts', () => client)
  const hooks = createCrudHooks({
    service,
    key: queryKeys.accounts.accounts,
    invalidate: [queryKeys.accounts.all, queryKeys.transactions.all],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { hooks, queryClient, wrapper }
}

describe('createCrudHooks', () => {
  it('useList espone stato di caricamento e dati dalla cache', async () => {
    const { hooks, wrapper } = setup()
    const { result } = renderHook(() => hooks.useList(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([row])
  })

  it('una mutazione invalida le query dell\'area e quelle dei movimenti', async () => {
    const { hooks, queryClient, wrapper } = setup()
    queryClient.setQueryData([...queryKeys.accounts.accounts, 'list', {}], [row])
    queryClient.setQueryData([...queryKeys.transactions.all, 'list'], [])
    const { result } = renderHook(() => hooks.useCreate(), { wrapper })
    result.current.mutate({ name: 'Nuovo' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryState([...queryKeys.accounts.accounts, 'list', {}])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState([...queryKeys.transactions.all, 'list'])?.isInvalidated).toBe(true)
  })
})
