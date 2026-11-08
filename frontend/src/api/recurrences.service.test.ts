import { describe, expect, it } from 'vitest'
import { RecurrencesService } from './recurrences.service.ts'
import { fakeSupabase } from './test-utils.ts'

describe('RecurrencesService', () => {
  it('applyRecurrence chiama apply_recurrence con id e date, e restituisce il numero creato', async () => {
    const { client, calls } = fakeSupabase({ apply_recurrence: { data: 3, error: null } })
    const created = await new RecurrencesService(() => client).applyRecurrence(7, ['2026-01-05', '2026-02-05'])
    expect(created).toBe(3)
    expect(calls.find((c) => c.method === 'rpc')?.args).toEqual([
      'apply_recurrence',
      { p_recurrence_id: 7, p_due_dates: ['2026-01-05', '2026-02-05'] },
    ])
  })

  it('regenerateOccurrences passa data di riferimento e date, e riassume il risultato', async () => {
    const { client, calls } = fakeSupabase({
      regenerate_recurrence_occurrences: {
        data: [{ created_count: 2, updated_count: 1, deleted_count: 4 }],
        error: null,
      },
    })
    const result = await new RecurrencesService(() => client).regenerateOccurrences(7, ['2026-03-05'], '2026-02-01')
    expect(result).toEqual({ createdCount: 2, updatedCount: 1, deletedCount: 4 })
    expect(calls.find((c) => c.method === 'rpc')?.args).toEqual([
      'regenerate_recurrence_occurrences',
      { p_recurrence_id: 7, p_due_dates: ['2026-03-05'], p_today: '2026-02-01' },
    ])
  })

  it('archiveRecurrence chiama archive_recurrence', async () => {
    const { client, calls } = fakeSupabase({ archive_recurrence: { data: 5, error: null } })
    await expect(new RecurrencesService(() => client).archiveRecurrence(7, '2026-02-01')).resolves.toBe(5)
    expect(calls.find((c) => c.method === 'rpc')?.args[0]).toBe('archive_recurrence')
  })

  it('un errore della funzione SQL diventa AppError', async () => {
    const { client } = fakeSupabase({ apply_recurrence: { data: null, error: { code: '22023', message: 'bad date' } } })
    await expect(new RecurrencesService(() => client).applyRecurrence(7, ['x'])).rejects.toMatchObject({
      kind: 'invalid',
    })
  })

  it('changeOccurrenceAmount aggiorna solo l\'importo della scadenza', async () => {
    const { client, calls } = fakeSupabase({ data: { id: 1 }, error: null })
    await new RecurrencesService(() => client).changeOccurrenceAmount(11, 99.9)
    expect(calls.find((c) => c.method === 'update')?.args[0]).toEqual({ amount: 99.9 })
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual(['id', 11])
  })
})
