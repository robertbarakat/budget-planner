import { describe, expect, it } from 'vitest'
import { computeOpeningBalancesFromCurrent } from './opening-balances-from-current.ts'
import type { DatedTransactionInput } from './opening-balances-from-current.ts'

const accounts = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' },
]

const tx = (
  type: DatedTransactionInput['type'],
  date: string,
  amountCents: number,
  accountId: number,
  destinationAccountId: number | null = null,
): DatedTransactionInput => ({ type, transactionDate: date, amountCents, accountId, destinationAccountId })

describe('computeOpeningBalancesFromCurrent', () => {
  // A: -40,00 spesa, +1000,00 entrata, -50,00 trasferimento verso B  => netto +910,00
  // B: +50,00 dal trasferimento, -12,50 spesa                         => netto  +37,50
  // C: nessun movimento                                               => netto 0
  const transactions = [
    tx('expense', '2026-03-11', 4000, 1),
    tx('income', '2026-03-15', 100000, 1),
    tx('transfer', '2026-03-16', 5000, 1, 2),
    tx('expense', '2026-03-10', 1250, 2),
  ]

  it('saldo iniziale = saldo attuale - movimenti, trasferimenti compresi', () => {
    const result = computeOpeningBalancesFromCurrent({
      year: 2026,
      accounts,
      currentBalancesCents: { 1: 191000, 2: 23750, 3: 50000 },
      transactions,
      expectedTotalCents: 0,
    })
    expect(result.balances.map((b) => [b.name, b.movementsCents, b.openingCents])).toEqual([
      ['A', 91000, 100000],
      ['B', 3750, 20000],
      ['C', 0, 50000],
    ])
    expect(result.totalCents).toBe(170000)
  })

  it('confronta il totale con quello atteso e mostra lo scarto', () => {
    const base = { year: 2026, accounts, currentBalancesCents: { 1: 191000, 2: 23750, 3: 50000 }, transactions }
    expect(computeOpeningBalancesFromCurrent({ ...base, expectedTotalCents: 170000 }).differenceCents).toBe(0)
    const off = computeOpeningBalancesFromCurrent({ ...base, expectedTotalCents: 169000 })
    expect(off.expectedTotalCents).toBe(169000)
    expect(off.differenceCents).toBe(1000)
  })

  it('ignora i movimenti precedenti al 1 gennaio dell\'anno', () => {
    const result = computeOpeningBalancesFromCurrent({
      year: 2026,
      accounts: [{ id: 1, name: 'A' }],
      currentBalancesCents: { 1: 10000 },
      transactions: [tx('expense', '2025-12-31', 99900, 1), tx('expense', '2026-01-01', 1000, 1)],
      expectedTotalCents: 0,
    })
    expect(result.balances[0]?.openingCents).toBe(11000)
  })

  it('può dare un saldo iniziale negativo', () => {
    const result = computeOpeningBalancesFromCurrent({
      year: 2026,
      accounts: [{ id: 1, name: 'A' }],
      currentBalancesCents: { 1: 1000 },
      transactions: [tx('income', '2026-02-01', 5000, 1)],
      expectedTotalCents: 0,
    })
    expect(result.balances[0]?.openingCents).toBe(-4000)
  })

  it('segnala i conti senza saldo attuale', () => {
    expect(() =>
      computeOpeningBalancesFromCurrent({ year: 2026, accounts, currentBalancesCents: { 1: 0 }, transactions: [], expectedTotalCents: 0 }),
    ).toThrow('Manca il saldo attuale dei conti: B, C')
  })

  it('senza movimenti il saldo iniziale coincide con quello attuale', () => {
    const result = computeOpeningBalancesFromCurrent({
      year: 2027,
      accounts: [{ id: 1, name: 'A' }],
      currentBalancesCents: { 1: 12345 },
      transactions: [],
      expectedTotalCents: 12345,
    })
    expect(result.balances[0]?.openingCents).toBe(12345)
    expect(result.differenceCents).toBe(0)
  })
})
