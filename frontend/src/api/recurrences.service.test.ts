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

  it('createRecurrence calcola le date con shared/ e chiama apply_recurrence con esse', async () => {
    const recurrence = {
      id: 7, name: 'TEST-Mutuo', frequency: 'monthly', start_date: '2026-01-31', end_date: '2026-04-30',
      base_amount: 500, account_id: 1, budget_item_id: 2, archived: false, created_at: '',
    }
    const { client, calls } = fakeSupabase({
      recurrences: { data: recurrence, error: null },
      apply_recurrence: { data: 4, error: null },
    })
    const out = await new RecurrencesService(() => client).createRecurrence(
      { name: 'TEST-Mutuo', frequency: 'monthly', start_date: '2026-01-31', end_date: '2026-04-30', base_amount: 500, account_id: 1, budget_item_id: 2 },
      '2026-01-01',
    )
    expect(out.createdCount).toBe(4)
    expect(calls.find((c) => c.method === 'rpc')?.args).toEqual([
      'apply_recurrence',
      { p_recurrence_id: 7, p_due_dates: ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'] },
    ])
  })

  it('updateRecurrence ricalcola le date e chiama regenerate_recurrence_occurrences con la data di oggi', async () => {
    const recurrence = {
      id: 7, name: 'x', frequency: 'quarterly', start_date: '2026-01-15', end_date: '2026-07-15',
      base_amount: 10, account_id: 1, budget_item_id: 2, archived: false, created_at: '',
    }
    const { client, calls } = fakeSupabase({
      recurrences: { data: recurrence, error: null },
      regenerate_recurrence_occurrences: { data: [{ created_count: 0, updated_count: 1, deleted_count: 0 }], error: null },
    })
    const out = await new RecurrencesService(() => client).updateRecurrence(7, { end_date: '2026-07-15' }, '2026-02-01')
    expect(out.result.updatedCount).toBe(1)
    expect(calls.find((c) => c.method === 'rpc')?.args).toEqual([
      'regenerate_recurrence_occurrences',
      { p_recurrence_id: 7, p_due_dates: ['2026-01-15', '2026-04-15', '2026-07-15'], p_today: '2026-02-01' },
    ])
  })

  it('listOccurrencesInRange filtra per date ed esclude le ricorrenze archiviate', async () => {
    const occ = (id: number, recurrence_id: number, due_date: string) => ({ id, recurrence_id, due_date, amount: 1, budget_entry_id: null, created_at: '', is_manually_modified: false })
    const { client, calls } = fakeSupabase({
      recurrence_occurrences: { data: [occ(1, 1, '2026-03-01'), occ(2, 2, '2026-03-02'), occ(3, 1, '2026-03-03')], error: null },
      recurrences: { data: [{ id: 1 }], error: null },
    })
    const rows = await new RecurrencesService(() => client).listOccurrencesInRange('2026-03-01', '2026-03-31')
    expect(rows.map((r) => r.id)).toEqual([1, 3])
    expect(calls.filter((c) => c.method === 'gte' || c.method === 'lte').map((c) => c.args)).toEqual([
      ['due_date', '2026-03-01'],
      ['due_date', '2026-03-31'],
    ])
  })

  it('un errore del database sulla creazione diventa AppError in italiano', async () => {
    const { client } = fakeSupabase({ recurrences: { data: null, error: { code: '23503', message: 'fk' } } })
    await expect(
      new RecurrencesService(() => client).createRecurrence(
        { name: 'x', frequency: 'monthly', start_date: '2026-01-01', base_amount: 1, account_id: 1, budget_item_id: 1 },
        '2026-01-01',
      ),
    ).rejects.toMatchObject({ kind: expect.any(String), message: expect.stringMatching(/[a-z]/) })
  })

  it('restoreOccurrenceAmount rimette l\'importo base e poi toglie il segno "modificata"', async () => {
    const { client, calls } = fakeSupabase({ data: { id: 11 }, error: null })
    await new RecurrencesService(() => client).restoreOccurrenceAmount(11, 100.5)
    expect(calls.filter((c) => c.method === 'update').map((c) => c.args[0])).toEqual([
      { amount: 100.5 },
      { is_manually_modified: false },
    ])
  })
})
