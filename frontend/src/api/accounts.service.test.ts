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

describe('AccountsService.listAccountIdsInUse', () => {
  it('unisce origine, destinazione e saldi iniziali senza doppioni né nulli', async () => {
    const resultsByColumn = (calls: { method: string; args: unknown[] }[]) => {
      const column = calls.find((c) => c.method === 'select')?.args[0]
      return column === 'destination_account_id'
        ? { data: [{ destination_account_id: 2 }, { destination_account_id: null }], error: null }
        : { data: [{ account_id: 1 }, { account_id: 3 }], error: null }
    }
    const fake = fakeSupabase(resultsByColumn)
    const ids = await new AccountsService(() => fake.client).listAccountIdsInUse()
    expect(ids.toSorted()).toEqual([1, 2, 3])
  })
})

describe('AccountsService.currentBalances', () => {
  it('saldo iniziale + movimenti dell\'anno fino a oggi, per conto e totale', async () => {
    const { client, calls } = fakeSupabase({
      opening_balances: { data: [{ id: 1, account_id: 1, year: 2026, amount: 1000.1, source: 'manual' }, { id: 2, account_id: 2, year: 2026, amount: 50, source: 'manual' }], error: null },
      transactions: {
        data: [tx('expense', 100.05, 1), tx('income', 20.2, 2), tx('transfer', 30, 1, 2)],
        error: null,
      },
    })
    const result = await new AccountsService(() => client).currentBalances(2026, '2026-11-08')
    // Conto 1: 1000,10 - 100,05 - 30 = 870,05. Conto 2: 50 + 20,20 + 30 = 100,20. Totale: 970,25.
    expect(result).toEqual({ balances: { 1: 870.05, 2: 100.2 }, total: 970.25 })
    const range = calls.filter((c) => c.method === 'gte' || c.method === 'lte').map((c) => c.args)
    expect(range).toEqual([['transaction_date', '2026-01-01'], ['transaction_date', '2026-11-08']])
  })

  it('un trasferimento non cambia il totale; un conto senza saldo iniziale parte da 0', async () => {
    const { client } = fakeSupabase({
      opening_balances: { data: [{ id: 1, account_id: 1, year: 2026, amount: 200, source: 'manual' }], error: null },
      transactions: { data: [tx('transfer', 75.5, 1, 2)], error: null },
    })
    const result = await new AccountsService(() => client).currentBalances(2026, '2026-11-08')
    expect(result.balances).toEqual({ 1: 124.5, 2: 75.5 })
    expect(result.total).toBe(200)
  })

  it('senza dati: nessun conto e totale 0', async () => {
    const { client } = fakeSupabase({ data: [], error: null })
    await expect(new AccountsService(() => client).currentBalances(2026, '2026-11-08')).resolves.toEqual({ balances: {}, total: 0 })
  })
})
