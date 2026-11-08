import { describe, expect, it } from 'vitest'
import { RevenueService } from './revenue.service.ts'
import { fakeSupabase, type RecordedCall } from './test-utils.ts'

function filters(queryCalls: RecordedCall[]): Record<string, unknown> {
  return (queryCalls.find((c) => c.method === 'match')?.args[0] as Record<string, unknown> | undefined) ?? {}
}

describe('RevenueService.replaceRevenueDriverEntries', () => {
  it('chiama la funzione SQL con intervallo e righe attesi', async () => {
    const { client, calls } = fakeSupabase({
      replace_revenue_driver_entries: { data: [{ deleted_count: 2, inserted_count: 3 }], error: null },
    })
    const result = await new RevenueService(() => client).replaceRevenueDriverEntries(
      { fromYear: 2026, fromMonth: 5, toYear: 2027, toMonth: 2 },
      [{ budgetItemId: 9, year: 2026, month: 6, amount: 1250.5 }],
    )
    expect(result).toEqual({ deletedCount: 2, insertedCount: 3 })
    expect(calls.find((c) => c.method === 'rpc')?.args).toEqual([
      'replace_revenue_driver_entries',
      {
        p_from_year: 2026,
        p_from_month: 5,
        p_to_year: 2027,
        p_to_month: 2,
        p_entries: [{ budget_item_id: 9, year: 2026, month: 6, amount: 1250.5 }],
      },
    ])
  })

  it('un errore della funzione (riga fuori intervallo) diventa AppError', async () => {
    const { client } = fakeSupabase({
      replace_revenue_driver_entries: { data: null, error: { code: '22023', message: 'outside range' } },
    })
    await expect(
      new RevenueService(() => client).replaceRevenueDriverEntries(
        { fromYear: 2026, fromMonth: 5, toYear: 2026, toMonth: 8 },
        [],
      ),
    ).rejects.toMatchObject({ kind: 'invalid' })
  })
})

describe('RevenueService letture e giorni lavorati', () => {
  it('listRates ordina dalla tariffa più recente', async () => {
    const { client, calls } = fakeSupabase({ data: [], error: null })
    await new RevenueService(() => client).listRates(3)
    expect(calls.find((c) => c.method === 'match')?.args[0]).toEqual({ client_id: 3 })
    expect(calls.filter((c) => c.method === 'order').map((c) => c.args)).toEqual([
      ['valid_from_year', { ascending: false }],
      ['valid_from_month', { ascending: false }],
    ])
  })

  it('setWorkedDays crea il mese se manca e lo aggiorna se esiste', async () => {
    const empty = fakeSupabase({ worked_days: { data: [], error: null } })
    await new RevenueService(() => empty.client).setWorkedDays(3, 2026, 5, 18)
    expect(empty.calls.find((c) => c.method === 'insert')?.args[0]).toEqual({
      client_id: 3,
      year: 2026,
      month: 5,
      days: 18,
    })

    const present = fakeSupabase({
      worked_days: (q) => ({
        data: 'client_id' in filters(q) ? [{ id: 8, client_id: 3, year: 2026, month: 5, days: 10 }] : [],
        error: null,
      }),
    })
    await new RevenueService(() => present.client).setWorkedDays(3, 2026, 5, 18.5)
    expect(present.calls.find((c) => c.method === 'update')?.args[0]).toEqual({ days: 18.5 })
  })
})
