// Riconciliazione dell'import storico (BP-126): totali per anno, conto e tipo, e confronto tra file e database.
// Funzioni pure, importi in centesimi interi.

export interface ReconcileTransaction {
  type: 'expense' | 'income' | 'transfer'
  /** YYYY-MM-DD */
  transactionDate: string
  amountCents: number
  account: string
  destinationAccount: string | null
}

/** Un trasferimento pesa sul conto di origine (`transfer_out`) e su quello di destinazione (`transfer_in`). */
export type TotalsKind = 'expense' | 'income' | 'transfer_out' | 'transfer_in'

export interface TotalsEntry {
  year: number
  account: string
  kind: TotalsKind
  cents: number
}

export interface TotalsDifference extends TotalsEntry {
  expectedCents: number
  actualCents: number
  /** actual - expected */
  differenceCents: number
}

const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase()
const keyOf = (year: number, account: string, kind: TotalsKind): string => `${year}|${normalizeName(account)}|${kind}`

/** Somma gli importi per anno, conto e tipo. I nomi dei conti si confrontano senza maiuscole né spazi extra. */
export function totalsFromTransactions(transactions: readonly ReconcileTransaction[]): TotalsEntry[] {
  const map = new Map<string, TotalsEntry>()
  const add = (year: number, account: string, kind: TotalsKind, cents: number): void => {
    const key = keyOf(year, account, kind)
    const entry = map.get(key)
    if (entry) entry.cents += cents
    else map.set(key, { year, account: account.trim(), kind, cents })
  }
  for (const t of transactions) {
    const year = Number(t.transactionDate.slice(0, 4))
    if (t.type === 'transfer') {
      add(year, t.account, 'transfer_out', t.amountCents)
      if (t.destinationAccount) add(year, t.destinationAccount, 'transfer_in', t.amountCents)
    } else {
      add(year, t.account, t.type, t.amountCents)
    }
  }
  return [...map.values()].sort(
    (a, b) => a.year - b.year || normalizeName(a.account).localeCompare(normalizeName(b.account)) || a.kind.localeCompare(b.kind),
  )
}

/** Elenca solo le differenze (totale atteso dal file ≠ totale nel database), ordinate per anno, conto e tipo. */
export function diffTotals(expected: readonly TotalsEntry[], actual: readonly TotalsEntry[]): TotalsDifference[] {
  const expectedMap = new Map(expected.map((e) => [keyOf(e.year, e.account, e.kind), e]))
  const actualMap = new Map(actual.map((e) => [keyOf(e.year, e.account, e.kind), e]))
  const differences: TotalsDifference[] = []
  for (const key of new Set([...expectedMap.keys(), ...actualMap.keys()])) {
    const e = expectedMap.get(key)
    const a = actualMap.get(key)
    const expectedCents = e?.cents ?? 0
    const actualCents = a?.cents ?? 0
    if (expectedCents === actualCents) continue
    const base = (e ?? a)!
    differences.push({
      year: base.year,
      account: base.account,
      kind: base.kind,
      cents: base.cents,
      expectedCents,
      actualCents,
      differenceCents: actualCents - expectedCents,
    })
  }
  return differences.sort(
    (a, b) => a.year - b.year || normalizeName(a.account).localeCompare(normalizeName(b.account)) || a.kind.localeCompare(b.kind),
  )
}

export interface BalanceDifference {
  account: string
  expectedCents: number
  actualCents: number
  differenceCents: number
}

/** Confronta i saldi attesi (digitati dall'utente) con quelli calcolati; elenca solo le differenze. */
export function diffBalances(
  expected: Readonly<Record<string, number>>,
  actual: Readonly<Record<string, number>>,
): BalanceDifference[] {
  const expectedMap = new Map(Object.entries(expected).map(([name, cents]) => [normalizeName(name), { name, cents }]))
  const actualMap = new Map(Object.entries(actual).map(([name, cents]) => [normalizeName(name), { name, cents }]))
  const result: BalanceDifference[] = []
  for (const key of [...new Set([...expectedMap.keys(), ...actualMap.keys()])].sort()) {
    const e = expectedMap.get(key)
    const a = actualMap.get(key)
    const expectedCents = e?.cents ?? 0
    const actualCents = a?.cents ?? 0
    if (expectedCents !== actualCents) {
      result.push({ account: (e ?? a)!.name, expectedCents, actualCents, differenceCents: actualCents - expectedCents })
    }
  }
  return result
}
