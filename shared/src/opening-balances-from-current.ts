import { computeAccountBalances } from './balances.ts'
import type { TransactionInput } from './balances.ts'

// Saldi iniziali dell'anno ricavati il giorno dell'import (BP-151, specifica sez. 8):
//   saldo iniziale = saldo attuale - effetto netto dei movimenti dal 1 gennaio dell'anno in poi.
// L'effetto netto di un conto è entrate - spese +/- trasferimenti (stessa regola di computeAccountBalances).
// I movimenti con data precedente al 1 gennaio dell'anno non contano: il saldo iniziale è quello a inizio anno.
// Funzione pura, centesimi interi. Il saldo iniziale può risultare negativo (conto in rosso a inizio anno).

export interface OpeningAccountInput {
  id: number
  name: string
}

export interface DatedTransactionInput extends TransactionInput {
  /** YYYY-MM-DD */
  transactionDate: string
}

export interface OpeningBalancesFromCurrentInput {
  year: number
  /** Conti attivi: ognuno ha bisogno del saldo attuale. */
  accounts: readonly OpeningAccountInput[]
  /** Saldo attuale per id conto, in centesimi. */
  currentBalancesCents: Readonly<Record<number, number>>
  transactions: readonly DatedTransactionInput[]
  /** Totale atteso dei saldi iniziali (es. dal foglio "Budget 2026"), in centesimi. */
  expectedTotalCents: number
}

export interface OpeningBalanceResult {
  accountId: number
  name: string
  currentCents: number
  movementsCents: number
  openingCents: number
}

export interface OpeningBalancesFromCurrent {
  balances: OpeningBalanceResult[]
  totalCents: number
  expectedTotalCents: number
  /** totale calcolato - totale atteso: 0 = coincide. */
  differenceCents: number
}

export function computeOpeningBalancesFromCurrent(input: OpeningBalancesFromCurrentInput): OpeningBalancesFromCurrent {
  const missing = input.accounts.filter((a) => input.currentBalancesCents[a.id] === undefined).map((a) => a.name)
  if (missing.length > 0) throw new RangeError(`Manca il saldo attuale dei conti: ${missing.join(', ')}`)
  for (const account of input.accounts) {
    if (!Number.isInteger(input.currentBalancesCents[account.id])) {
      throw new RangeError(`Saldo attuale non intero in centesimi per il conto ${account.name}`)
    }
  }

  const start = `${input.year}-01-01`
  const net = computeAccountBalances(
    [],
    input.transactions.filter((t) => t.transactionDate >= start),
  )
  const movements = new Map(net.accounts.map((a) => [a.accountId, a.balanceCents]))

  const balances = input.accounts.map((account): OpeningBalanceResult => {
    const currentCents = input.currentBalancesCents[account.id]!
    const movementsCents = movements.get(account.id) ?? 0
    return { accountId: account.id, name: account.name, currentCents, movementsCents, openingCents: currentCents - movementsCents }
  })
  const totalCents = balances.reduce((sum, b) => sum + b.openingCents, 0)
  return { balances, totalCents, expectedTotalCents: input.expectedTotalCents, differenceCents: totalCents - input.expectedTotalCents }
}
