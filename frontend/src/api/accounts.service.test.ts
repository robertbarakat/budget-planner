import { describe, expect, it } from 'vitest'
import { AccountsService } from './accounts.service.ts'
import { fakeSupabase, type RecordedCall } from './test-utils.ts'

const tx = (type: string, amount: number, account_id: number, destination_account_id: number | null = null) => ({
  id: 1,
  type,
  amount,
  account_id,
  destination_account_id,
  transaction_date: '2025-06-01',
})

/** Valore passato al filtro `match` della query, se c'è. */
function filters(queryCalls: RecordedCall[]): Record<string, unknown> {
  return (queryCalls.find((c) => c.method === 'match')?.args[0] as Record<string, unknown> | undefined) ?? {}
}

describe('AccountsService.carryOverOpeningBalance', () => {
  it('saldo iniziale dell\'anno prima + entrate - spese, salvato come carried_over', async () => {
    const { client, calls } = fakeSupabase({
      opening_balances: (q) => {
        const f = filters(q)
        const rows = f.year === 2025 ? [{ id: 7, account_id: 1, year: 2025, amount: 1000.1, source: 'manual' }] : []
        return { data: rows, error: null }
      },
      transactions: (q) => ({
        data: 'account_id' in filters(q) ? [tx('income', 500.2, 1), tx('expense', 100.05, 1)] : [],
        error: null,
      }),
    })
    await new AccountsService(() => client).carryOverOpeningBalance(1, 2026)
    // 1000,10 + 500,20 - 100,05 = 1400,25: in centesimi, senza errori di virgola mobile.
    expect(calls.filter((c) => c.method === 'insert').at(-1)?.args[0]).toEqual({
      account_id: 1,
      year: 2026,
      amount: 1400.25,
      source: 'carried_over',
    })
  })

  it('conta i trasferimenti in entrata e parte da 0 senza saldo iniziale precedente', async () => {
    const { client, calls } = fakeSupabase({
      opening_balances: { data: [], error: null },
      transactions: (q) => ({
        data: 'destination_account_id' in filters(q) ? [tx('transfer', 50, 1, 2)] : [],
        error: null,
      }),
    })
    await new AccountsService(() => client).carryOverOpeningBalance(2, 2026)
    expect(calls.filter((c) => c.method === 'insert').at(-1)?.args[0]).toMatchObject({ amount: 50 })
  })

  it('aggiorna il saldo dell\'anno se esiste già', async () => {
    const { client, calls } = fakeSupabase({
      opening_balances: (q) => ({
        data: filters(q).year === 2026 ? [{ id: 9, account_id: 1, year: 2026, amount: 1, source: 'manual' }] : [],
        error: null,
      }),
      transactions: { data: [], error: null },
    })
    await new AccountsService(() => client).carryOverOpeningBalance(1, 2026)
    expect(calls.find((c) => c.method === 'update')?.args[0]).toEqual({ amount: 0, source: 'carried_over' })
  })
})

describe('AccountsService.setOpeningBalance', () => {
  it('crea il saldo se manca e lo aggiorna se esiste', async () => {
    const missing = fakeSupabase({ opening_balances: { data: [], error: null } })
    await new AccountsService(() => missing.client).setOpeningBalance(1, 2026, 10)
    expect(missing.calls.some((c) => c.method === 'insert')).toBe(true)

    const present = fakeSupabase({
      opening_balances: { data: [{ id: 3, account_id: 1, year: 2026, amount: 5, source: 'manual' }], error: null },
    })
    await new AccountsService(() => present.client).setOpeningBalance(1, 2026, 10)
    expect(present.calls.find((c) => c.method === 'update')?.args[0]).toEqual({ amount: 10, source: 'manual' })
  })
})
