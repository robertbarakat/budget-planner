import { QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { AppError } from './api-error.ts'
import { createQueryClient, setErrorListener, shouldRetry } from './query-client.ts'

describe('query client', () => {
  it('un errore di query passa dall\'ascoltatore globale come AppError', async () => {
    const received: AppError[] = []
    const unsubscribe = setErrorListener((error) => received.push(error))
    const client = createQueryClient()
    const observer = new QueryObserver(client, {
      queryKey: ['test'],
      queryFn: () => Promise.reject({ code: '42501', message: 'denied' }),
      retry: false,
    })
    await observer.refetch()
    unsubscribe()
    expect(received).toHaveLength(1)
    expect(received[0]?.kind).toBe('forbidden')
  })

  it('riprova solo gli errori di rete e al massimo due volte', () => {
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true)
    expect(shouldRetry(2, new TypeError('Failed to fetch'))).toBe(false)
    expect(shouldRetry(0, { code: '23505', message: 'dup' })).toBe(false)
  })
})

describe('salvataggi offline', () => {
  it('blocca le mutazioni senza rete e non chiama la funzione', async () => {
    const { createQueryClient } = await import('./query-client.ts')
    const client = createQueryClient()
    const fn = vi.fn().mockResolvedValue('ok')
    const online = vi.spyOn(navigator, 'onLine', 'get')
    online.mockReturnValue(false)
    await expect(client.getMutationCache().build(client, { mutationFn: fn }).execute(undefined)).rejects.toThrow('offline')
    expect(fn).not.toHaveBeenCalled()
    online.mockReturnValue(true)
    await expect(client.getMutationCache().build(client, { mutationFn: fn }).execute(undefined)).resolves.toBe('ok')
    online.mockRestore()
  })
})
