import { describe, expect, it } from 'vitest'
import { AppError } from './api-error.ts'
import { ArchivableService, BaseService } from './base-service.ts'
import type { TypedSupabaseClient } from './supabase.ts'
import { fakeSupabase } from './test-utils.ts'

class TestAccountsService extends BaseService<'accounts'> {
  constructor(getClient: () => TypedSupabaseClient) {
    super('accounts', getClient)
  }
}

const row = { id: 1, name: 'Conto di prova', sort_order: 0, archived: false, created_at: '2026-01-01' }

describe('BaseService', () => {
  it('list applica filtri e ordinamento e restituisce le righe', async () => {
    const { client, calls } = fakeSupabase({ data: [row], error: null })
    const service = new TestAccountsService(() => client)
    const rows = await service.list({ where: { archived: false }, orderBy: [{ column: 'sort_order' }] })
    expect(rows).toEqual([row])
    expect(calls.map((c) => c.method)).toEqual(['from', 'select', 'match', 'order'])
    expect(calls[2]?.args).toEqual([{ archived: false }])
    expect(calls[3]?.args).toEqual(['sort_order', { ascending: true }])
  })

  it('create, update e remove usano la tabella e l\'id giusti', async () => {
    const { client, calls } = fakeSupabase({ data: row, error: null })
    const service = new TestAccountsService(() => client)
    await expect(service.create({ name: 'Conto di prova' })).resolves.toEqual(row)
    await expect(service.update(1, { archived: true })).resolves.toEqual(row)
    await expect(service.remove(1)).resolves.toBeUndefined()
    expect(calls.filter((c) => c.method === 'from').every((c) => c.args[0] === 'accounts')).toBe(true)
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([
      ['id', 1],
      ['id', 1],
    ])
  })

  it('un errore di Supabase diventa AppError', async () => {
    const { client } = fakeSupabase({ data: null, error: { code: '23503', message: 'fk violation' } })
    const service = new TestAccountsService(() => client)
    const failure = service.remove(1)
    await expect(failure).rejects.toBeInstanceOf(AppError)
    await expect(failure).rejects.toMatchObject({ kind: 'in_use' })
    await expect(service.list()).rejects.toMatchObject({ kind: 'in_use' })
    await expect(service.getById(1)).rejects.toMatchObject({ kind: 'in_use' })
  })
})

describe('ArchivableService.reorderAll', () => {
  it('aggiorna sort_order solo di chi cambia posizione', async () => {
    const { client, calls } = fakeSupabase({ data: row, error: null })
    const service = new ArchivableService('accounts', () => client)
    await service.reorderAll([3, 1, 2], { 1: 0, 2: 1, 3: 2 })
    const updates = calls.filter((c) => c.method === 'update').map((c) => c.args[0])
    expect(updates).toEqual([{ sort_order: 0 }, { sort_order: 1 }, { sort_order: 2 }])
  })

  it('non scrive nulla se l\'ordine è già quello', async () => {
    const { client, calls } = fakeSupabase({ data: row, error: null })
    const service = new ArchivableService('accounts', () => client)
    await service.reorderAll([1, 2], { 1: 0, 2: 1 })
    expect(calls.filter((c) => c.method === 'update')).toHaveLength(0)
  })
})
