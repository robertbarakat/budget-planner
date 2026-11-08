import { describe, expect, it } from 'vitest'
import { diffBalances, diffTotals, totalsFromTransactions } from './import-reconcile.ts'
import type { ReconcileTransaction } from './import-reconcile.ts'

const tx = (
  type: ReconcileTransaction['type'],
  date: string,
  amountCents: number,
  account: string,
  destinationAccount: string | null = null,
): ReconcileTransaction => ({ type, transactionDate: date, amountCents, account, destinationAccount })

const sample = [
  tx('expense', '2025-12-31', 1000, 'A'),
  tx('expense', '2026-01-01', 250, 'A'),
  tx('expense', '2026-02-01', 750, ' a '),
  tx('income', '2026-02-02', 5000, 'B'),
  tx('transfer', '2026-02-03', 300, 'B', 'A'),
]

describe('totalsFromTransactions', () => {
  it('somma per anno, conto e tipo, con i trasferimenti su origine e destinazione', () => {
    const totals = totalsFromTransactions(sample)
    expect(totals).toEqual([
      { year: 2025, account: 'A', kind: 'expense', cents: 1000 },
      { year: 2026, account: 'A', kind: 'expense', cents: 1000 },
      { year: 2026, account: 'A', kind: 'transfer_in', cents: 300 },
      { year: 2026, account: 'B', kind: 'income', cents: 5000 },
      { year: 2026, account: 'B', kind: 'transfer_out', cents: 300 },
    ])
  })

  it('anno senza movimenti: nessuna voce', () => {
    expect(totalsFromTransactions([])).toEqual([])
  })
})

describe('diffTotals', () => {
  it('con totali uguali non elenca nulla', () => {
    const totals = totalsFromTransactions(sample)
    expect(diffTotals(totals, totalsFromTransactions([...sample].reverse()))).toEqual([])
  })

  it('elenca solo le differenze: importo diverso, voce mancante nel database, voce in più', () => {
    const expected = totalsFromTransactions(sample)
    const actual = totalsFromTransactions([
      tx('expense', '2025-12-31', 900, 'A'), // importo diverso
      tx('expense', '2026-01-01', 250, 'A'),
      tx('expense', '2026-02-01', 750, 'A'),
      // entrata e trasferimento mancanti
      tx('income', '2027-01-01', 100, 'C'), // in più
    ])
    const diff = diffTotals(expected, actual)
    expect(diff.map((d) => [d.year, d.account, d.kind, d.expectedCents, d.actualCents, d.differenceCents])).toEqual([
      [2025, 'A', 'expense', 1000, 900, -100],
      [2026, 'A', 'transfer_in', 300, 0, -300],
      [2026, 'B', 'income', 5000, 0, -5000],
      [2026, 'B', 'transfer_out', 300, 0, -300],
      [2027, 'C', 'income', 0, 100, 100],
    ])
  })
})

describe('diffBalances', () => {
  it('elenca solo i saldi che non coincidono', () => {
    expect(diffBalances({ A: 1000, B: 500, C: 0 }, { a: 1000, B: 450, D: 10 })).toEqual([
      { account: 'B', expectedCents: 500, actualCents: 450, differenceCents: -50 },
      { account: 'D', expectedCents: 0, actualCents: 10, differenceCents: 10 },
    ])
  })
})
