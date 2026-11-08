import { describe, expect, it } from 'vitest'
import { buildImportPreview } from './preview.ts'
import { reconcileImport, renderReconciliationReport, renderReconciliationSummary } from './reconcile.ts'
import type { DatabaseSnapshot } from './reconcile.ts'
import type { RawExport, RawRow, SheetName } from './excel-parser.ts'

let n = 2
const row = (sheet: SheetName, o: Partial<RawRow>): RawRow => ({
  sheet,
  rowNumber: n++,
  dateTime: new Date('2026-03-10T12:00:00Z'),
  category: 'Cat1',
  account: 'ContoA',
  defaultAmount: 10,
  defaultCurrency: 'EUR',
  accountAmount: 10,
  accountCurrency: 'EUR',
  transactionAmount: 10,
  transactionCurrency: 'EUR',
  tag: null,
  comment: 'RISERVATO',
  ...o,
})

const rules = [
  { sourceCategory: 'Cat1', commentContains: null, priority: 1, targetBudgetItem: 'VoceX', targetCategory: 'Cat1' },
  { sourceCategory: 'Paga', commentContains: null, priority: 1, targetBudgetItem: 'RicaviY', targetCategory: 'Paga' },
]
const raw: RawExport = {
  Spese: [row('Spese', { defaultAmount: 12.5 }), row('Spese', { defaultAmount: 7.5 }), row('Spese', { defaultAmount: 0 }), row('Spese', { transactionCurrency: 'USD', defaultAmount: 99 })],
  Entrate: [row('Entrate', { category: 'Paga', account: 'ContoB', defaultAmount: 100 })],
  Bonifici: [row('Bonifici', { account: 'ContoB', defaultAmount: -30 }), row('Bonifici', { account: 'ContoA', defaultAmount: 30 })],
}
const preview = buildImportPreview(raw, rules)

// Database coerente con il file: A = id 1, B = id 2
const matching = (): DatabaseSnapshot => ({
  accounts: [
    { id: 1, name: 'ContoA' },
    { id: 2, name: 'ContoB' },
  ],
  transactions: [
    { type: 'expense', transactionDate: '2026-03-10', amountCents: 1250, accountId: 1, destinationAccountId: null },
    { type: 'expense', transactionDate: '2026-03-10', amountCents: 750, accountId: 1, destinationAccountId: null },
    { type: 'income', transactionDate: '2026-03-10', amountCents: 10000, accountId: 2, destinationAccountId: null },
    { type: 'transfer', transactionDate: '2026-03-10', amountCents: 3000, accountId: 2, destinationAccountId: 1 },
  ],
  openingBalances: [],
})

describe('reconcileImport', () => {
  it('con database coerente non ci sono differenze', () => {
    const r = reconcileImport({ preview, raw, db: matching() })
    expect(r.totalsDifferences).toEqual([])
    expect(r.balanceDifferences).toBeNull()
    expect(r.dbTransactions).toBe(4)
    expect(r.fileTransactions).toBe(4)
  })

  it('elenca le sole differenze quando il database non coincide', () => {
    const db = matching()
    db.transactions[0]!.amountCents = 1000 // spesa 12,50 diventata 10,00
    db.transactions.pop() // trasferimento mancante
    const r = reconcileImport({ preview, raw, db })
    expect(r.totalsDifferences.map((d) => [d.account, d.kind, d.differenceCents])).toEqual([
      ['ContoA', 'expense', -250],
      ['ContoA', 'transfer_in', -3000],
      ['ContoB', 'transfer_out', -3000],
    ])
  })

  it('riporta righe e importi degli scarti per spiegare le differenze', () => {
    const r = reconcileImport({ preview, raw, db: matching() })
    expect(r.rejected).toEqual([
      { sheet: 'Spese', rows: 2, cents: 9900 },
      { sheet: 'Entrate', rows: 0, cents: 0 },
      { sheet: 'Bonifici', rows: 0, cents: 0 },
    ])
  })

  it('confronta i saldi calcolati con quelli attesi, trasferimenti compresi', () => {
    const db = matching()
    db.openingBalances = [
      { accountId: 1, amountCents: 50000 },
      { accountId: 2, amountCents: 20000 },
    ]
    // A: 500 - 12,50 - 7,50 + 30 = 510 ; B: 200 + 100 - 30 = 270
    const ok = reconcileImport({ preview, raw, db, balances: { year: 2026, expectedCents: { ContoA: 51000, ContoB: 27000 } } })
    expect(ok.balanceDifferences).toEqual([])
    const ko = reconcileImport({ preview, raw, db, balances: { year: 2026, expectedCents: { ContoA: 51000, ContoB: 26000 } } })
    expect(ko.balanceDifferences).toEqual([{ account: 'ContoB', expectedCents: 26000, actualCents: 27000, differenceCents: 1000 }])
  })

  it('i movimenti prima del 1 gennaio dell\'anno non entrano nel saldo', () => {
    const db = matching()
    db.transactions.push({ type: 'expense', transactionDate: '2025-12-31', amountCents: 99900, accountId: 1, destinationAccountId: null })
    db.openingBalances = [{ accountId: 1, amountCents: 51000 - 3000 + 2000 }, { accountId: 2, amountCents: 20000 }]
    const r = reconcileImport({ preview, raw, db, balances: { year: 2026, expectedCents: { ContoA: 51000, ContoB: 27000 } } })
    expect(r.balanceDifferences).toEqual([])
  })

  it('il terminale non contiene nomi di conti né importi; il report sì', () => {
    const db = matching()
    db.transactions[0]!.amountCents = 1000
    const r = reconcileImport({ preview, raw, db })
    const summary = renderReconciliationSummary(r)
    expect(summary).not.toMatch(/Conto|RISERVATO|\d+,\d\d/)
    expect(summary).toContain('Differenze nei totali: 1')
    expect(renderReconciliationReport(r)).toContain('| 2026 | ContoA | expense |')
  })
})
