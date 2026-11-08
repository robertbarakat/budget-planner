import { computeOpeningBalancesFromCurrent } from 'budget-planner-shared'
import type { OpeningBalancesFromCurrent } from 'budget-planner-shared'
import type { DatabaseSnapshot } from './reconcile.ts'

// Saldi iniziali al momento dell'import (BP-151). Il calcolo sta in shared/: qui solo il collegamento ai dati.

const key = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase()

/** Conti attivi (non archiviati) del database: sono quelli di cui chiedere il saldo attuale. */
export const activeAccounts = (db: DatabaseSnapshot): Array<{ id: number; name: string }> =>
  db.accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name }))

/**
 * Calcola i saldi iniziali dell'anno. `currentCentsByName`: saldo attuale per nome conto (senza distinguere maiuscole).
 * Errore se mancano conti attivi o se ci sono nomi sconosciuti (un refuso non deve passare in silenzio).
 */
export function planOpeningBalances(options: {
  db: DatabaseSnapshot
  year: number
  currentCentsByName: Readonly<Record<string, number>>
  expectedTotalCents: number
}): OpeningBalancesFromCurrent {
  const accounts = activeAccounts(options.db)
  const byName = new Map(accounts.map((a) => [key(a.name), a]))
  const currentBalancesCents: Record<number, number> = {}
  for (const [name, cents] of Object.entries(options.currentCentsByName)) {
    const account = byName.get(key(name))
    if (!account) throw new RangeError(`Conto sconosciuto o archiviato: "${name}"`)
    currentBalancesCents[account.id] = cents
  }
  return computeOpeningBalancesFromCurrent({
    year: options.year,
    accounts,
    currentBalancesCents,
    transactions: options.db.transactions.map((t) => ({
      type: t.type,
      transactionDate: t.transactionDate,
      accountId: t.accountId,
      destinationAccountId: t.destinationAccountId,
      amountCents: t.amountCents,
    })),
    expectedTotalCents: options.expectedTotalCents,
  })
}
