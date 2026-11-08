import { computeAccountBalances, diffBalances, diffTotals, parseAmountCents, totalsFromTransactions } from 'budget-planner-shared'
import type { BalanceDifference, ReconcileTransaction, TotalsDifference } from 'budget-planner-shared'
import { SHEET_NAMES } from './excel-parser.ts'
import type { RawExport, SheetName } from './excel-parser.ts'
import type { ImportPreview } from './preview.ts'

// Riconciliazione dopo l'import (BP-126): confronta i totali per anno, conto e tipo del database con quelli
// del file (movimenti accettati dall'anteprima). Non corregge nulla.

/** Fotografia del database: solo lettura. */
export interface DatabaseSnapshot {
  accounts: Array<{ id: number; name: string }>
  transactions: Array<{
    type: 'expense' | 'income' | 'transfer'
    transactionDate: string
    amountCents: number
    accountId: number
    destinationAccountId: number | null
  }>
  /** Saldi iniziali dell'anno richiesto (vuoto se non ancora salvati). */
  openingBalances: Array<{ accountId: number; amountCents: number }>
}

export interface RejectedTotals {
  sheet: SheetName
  rows: number
  /** Somma degli importi (assoluti) delle righe scartate di cui l'importo è leggibile. */
  cents: number
}

export interface Reconciliation {
  totalsDifferences: TotalsDifference[]
  /** null se non sono stati forniti i saldi attesi. */
  balanceDifferences: BalanceDifference[] | null
  rejected: RejectedTotals[]
  dbTransactions: number
  fileTransactions: number
}

export interface ReconcileOptions {
  preview: ImportPreview
  raw: RawExport
  db: DatabaseSnapshot
  /** Anno dei saldi iniziali e saldi attuali attesi per conto (centesimi), se l'utente li ha confermati. */
  balances?: { year: number; expectedCents: Record<string, number> }
}

export function reconcileImport({ preview, raw, db, balances }: ReconcileOptions): Reconciliation {
  const names = new Map(db.accounts.map((a) => [a.id, a.name]))
  const nameOf = (id: number): string => names.get(id) ?? `#${id}`

  const actual: ReconcileTransaction[] = db.transactions.map((t) => ({
    type: t.type,
    transactionDate: t.transactionDate,
    amountCents: t.amountCents,
    account: nameOf(t.accountId),
    destinationAccount: t.destinationAccountId === null ? null : nameOf(t.destinationAccountId),
  }))
  const expected: ReconcileTransaction[] = preview.transactions.map((t) => ({
    type: t.type,
    transactionDate: t.transactionDate,
    amountCents: t.amountCents,
    account: t.account,
    destinationAccount: t.destinationAccount,
  }))

  const rejected: RejectedTotals[] = SHEET_NAMES.map((sheet) => {
    const rejectedRows = new Set(preview.rejected.filter((r) => r.sheet === sheet).map((r) => r.rowNumber))
    let cents = 0
    for (const row of raw[sheet]) {
      if (!rejectedRows.has(row.rowNumber)) continue
      const parsed = parseAmountCents(row.defaultAmount)
      if (parsed !== null) cents += Math.abs(parsed)
    }
    return { sheet, rows: rejectedRows.size, cents }
  })

  let balanceDifferences: BalanceDifference[] | null = null
  if (balances) {
    const computed = computeAccountBalances(
      db.openingBalances,
      db.transactions
        .filter((t) => t.transactionDate >= `${balances.year}-01-01`)
        .map((t) => ({
          type: t.type,
          accountId: t.accountId,
          destinationAccountId: t.destinationAccountId,
          amountCents: t.amountCents,
        })),
    )
    balanceDifferences = diffBalances(
      balances.expectedCents,
      Object.fromEntries(computed.accounts.map((a) => [nameOf(a.accountId), a.balanceCents])),
    )
  }

  return {
    totalsDifferences: diffTotals(totalsFromTransactions(expected), totalsFromTransactions(actual)),
    balanceDifferences,
    rejected,
    dbTransactions: db.transactions.length,
    fileTransactions: preview.transactions.length,
  }
}

const euros = (cents: number): string => (cents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Report in Markdown con le sole differenze. Può contenere nomi di conti: resta in docs/import-data/. */
export function renderReconciliationReport(r: Reconciliation): string {
  const lines = ['# Riconciliazione import', '', `Movimenti nel file (accettati): ${r.fileTransactions}. Movimenti nel database: ${r.dbTransactions}.`, '']
  lines.push('## Differenze nei totali (database - file)', '')
  if (r.totalsDifferences.length === 0) lines.push('Nessuna differenza.')
  else {
    lines.push('| Anno | Conto | Tipo | File EUR | Database EUR | Differenza EUR |', '|---:|---|---|---:|---:|---:|')
    for (const d of r.totalsDifferences) {
      lines.push(`| ${d.year} | ${d.account} | ${d.kind} | ${euros(d.expectedCents)} | ${euros(d.actualCents)} | ${euros(d.differenceCents)} |`)
    }
  }
  lines.push('', '## Scarti dell\'anteprima (possibile spiegazione delle differenze)', '', '| Foglio | Righe scartate | Importi leggibili EUR |', '|---|---:|---:|')
  for (const s of r.rejected) lines.push(`| ${s.sheet} | ${s.rows} | ${euros(s.cents)} |`)
  lines.push('', '## Saldi per conto (calcolati - attesi)', '')
  if (r.balanceDifferences === null) lines.push('Saldi attesi non forniti: controllo non eseguito.')
  else if (r.balanceDifferences.length === 0) lines.push('Nessuna differenza.')
  else {
    lines.push('| Conto | Atteso EUR | Calcolato EUR | Differenza EUR |', '|---|---:|---:|---:|')
    for (const d of r.balanceDifferences) {
      lines.push(`| ${d.account} | ${euros(d.expectedCents)} | ${euros(d.actualCents)} | ${euros(d.differenceCents)} |`)
    }
  }
  lines.push('')
  return lines.join('\n')
}

/** Per il terminale: solo conteggi, nessun nome di conto, importo o commento. */
export function renderReconciliationSummary(r: Reconciliation): string {
  const lines = [
    `Movimenti nel file: ${r.fileTransactions}, nel database: ${r.dbTransactions}`,
    `Differenze nei totali: ${r.totalsDifferences.length}`,
    r.balanceDifferences === null ? 'Saldi per conto: controllo non eseguito' : `Differenze nei saldi per conto: ${r.balanceDifferences.length}`,
  ]
  return lines.join('\n')
}
