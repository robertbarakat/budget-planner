import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from './accounts.service.ts'
import { budgetService } from './budget.service.ts'
import { transactionsService } from './transactions.service.ts'
import { AppError } from './api-error.ts'
import { useYearData } from './year-data.queries.ts'

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(budgetService.entries, 'list').mockResolvedValue([])
  vi.spyOn(budgetService.closedMonths, 'list').mockResolvedValue([])
  vi.spyOn(transactionsService, 'listForYear').mockResolvedValue([])
  vi.spyOn(accountsService.openingBalances, 'list').mockResolvedValue([])
})

describe('useYearData', () => {
  it('legge i quattro insiemi dell\'anno richiesto', async () => {
    const { result } = renderHook(() => useYearData(2026), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(transactionsService.listForYear).toHaveBeenCalledWith(2026)
    expect(budgetService.entries.list).toHaveBeenCalledWith(expect.objectContaining({ where: { year: 2026 } }))
    expect(budgetService.closedMonths.list).toHaveBeenCalledWith(expect.objectContaining({ where: { year: 2026 } }))
    expect(accountsService.openingBalances.list).toHaveBeenCalledWith({ where: { year: 2026 } })
  })

  it('un secondo uso dello stesso anno (altra vista) non rilancia le richieste', async () => {
    const w = wrapper()
    const first = renderHook(() => useYearData(2026), { wrapper: w })
    await waitFor(() => expect(first.result.current.isReady).toBe(true))
    const second = renderHook(() => useYearData(2026), { wrapper: w })
    expect(second.result.current.isReady).toBe(true)
    expect(transactionsService.listForYear).toHaveBeenCalledTimes(1)
    expect(budgetService.entries.list).toHaveBeenCalledTimes(1)
    expect(accountsService.openingBalances.list).toHaveBeenCalledTimes(1)
  })

  it('un altro anno rilegge, e un errore segna isError', async () => {
    vi.spyOn(transactionsService, 'listForYear').mockImplementation(async (year) => {
      if (year === 2027) throw new AppError('network', null, undefined, 'Rete assente.')
      return []
    })
    const w = wrapper()
    const { result, rerender } = renderHook(({ year }) => useYearData(year), { wrapper: w, initialProps: { year: 2026 } })
    await waitFor(() => expect(result.current.isReady).toBe(true))
    rerender({ year: 2027 })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
