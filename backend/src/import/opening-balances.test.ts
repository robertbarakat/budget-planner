import { describe, expect, it } from 'vitest'
import { planOpeningBalances } from './opening-balances.ts'
import type { DatabaseSnapshot } from './reconcile.ts'

const db: DatabaseSnapshot = {
  accounts: [
    { id: 1, name: 'ContoA', archived: false },
    { id: 2, name: 'ContoB', archived: false },
    { id: 3, name: 'ContoVecchio', archived: true },
  ],
  transactions: [
    { type: 'expense', transactionDate: '2026-03-11', amountCents: 4000, accountId: 1, destinationAccountId: null },
    { type: 'income', transactionDate: '2026-03-15', amountCents: 100000, accountId: 1, destinationAccountId: null },
    { type: 'transfer', transactionDate: '2026-03-16', amountCents: 5000, accountId: 1, destinationAccountId: 2 },
  ],
  openingBalances: [],
}

describe('planOpeningBalances', () => {
  it('calcola i saldi iniziali dei soli conti attivi, trasferimenti compresi, e lo scarto dal totale atteso', () => {
    const result = planOpeningBalances({
      db,
      year: 2026,
      currentCentsByName: { contoa: 191000, ' ContoB ': 5000 },
      expectedTotalCents: 100000,
    })
    expect(result.balances.map((b) => [b.name, b.openingCents])).toEqual([
      ['ContoA', 100000],
      ['ContoB', 0],
    ])
    expect(result.totalCents).toBe(100000)
    expect(result.differenceCents).toBe(0)
  })

  it('segnala un conto attivo senza saldo e un nome sconosciuto o archiviato', () => {
    expect(() => planOpeningBalances({ db, year: 2026, currentCentsByName: { ContoA: 0 }, expectedTotalCents: 0 })).toThrow(
      'Manca il saldo attuale dei conti: ContoB',
    )
    expect(() => planOpeningBalances({ db, year: 2026, currentCentsByName: { ContoA: 0, ContoB: 0, ContoVecchio: 0 }, expectedTotalCents: 0 })).toThrow(
      'Conto sconosciuto o archiviato: "ContoVecchio"',
    )
  })
})
