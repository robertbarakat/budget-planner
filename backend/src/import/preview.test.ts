import { describe, expect, it } from 'vitest'
import { buildImportPreview, renderPreviewReport, renderTerminalSummary } from './preview.ts'
import type { RawExport, RawRow, SheetName } from './excel-parser.ts'

let n = 2
function row(sheet: SheetName, o: Partial<RawRow>): RawRow {
  return {
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
    comment: null,
    ...o,
  }
}

const rules = [
  { sourceCategory: 'Cat1', commentContains: null, priority: 1, targetBudgetItem: 'VoceX', targetCategory: 'Cat1' },
  { sourceCategory: 'Paga', commentContains: null, priority: 1, targetBudgetItem: 'RicaviY', targetCategory: 'Paga' },
]

const raw: RawExport = {
  Spese: [
    row('Spese', { defaultAmount: 12.5 }),
    row('Spese', { category: 'Sconosciuta', comment: 'SEGRETO-PERSONALE' }),
    row('Spese', { defaultAmount: 0 }),
    row('Spese', { transactionCurrency: 'USD' }),
  ],
  Entrate: [row('Entrate', { category: 'Paga', account: 'ContoB', defaultAmount: 100 })],
  Bonifici: [
    row('Bonifici', { account: 'ContoB', defaultAmount: -30 }),
    row('Bonifici', { account: 'ContoA', defaultAmount: 30 }),
    row('Bonifici', { account: 'ContoA', defaultAmount: 5 }),
  ],
}

describe('buildImportPreview', () => {
  const preview = buildImportPreview(raw, rules)

  it('accettate + scartate = lette, per ogni foglio', () => {
    for (const s of Object.values(preview.sheets)) expect(s.accepted + s.rejected).toBe(s.read)
    expect(preview.sheets.Spese).toEqual({ read: 4, accepted: 1, rejected: 3 })
    expect(preview.sheets.Bonifici).toEqual({ read: 3, accepted: 2, rejected: 1 })
  })

  it('ogni scarto indica foglio, riga e motivo', () => {
    expect(preview.rejected).toHaveLength(4)
    for (const r of preview.rejected) {
      expect(r.sheet).toBeTruthy()
      expect(r.rowNumber).toBeGreaterThan(1)
      expect(r.reason).not.toBe('')
    }
  })

  it('calcola i totali per voce e mese e per conto', () => {
    expect(preview.totalsByItemAndMonth.get('VoceX|2026-03')).toBe(-1250)
    expect(preview.totalsByItemAndMonth.get('RicaviY|2026-03')).toBe(10000)
    expect(preview.totalsByAccount.get('ContoA')).toBe(-1250 + 3000)
    expect(preview.totalsByAccount.get('ContoB')).toBe(10000 - 3000)
  })

  it('il terminale mostra solo conteggi, il report mostra gli scarti', () => {
    const terminal = renderTerminalSummary(preview)
    expect(terminal).not.toContain('SEGRETO-PERSONALE')
    expect(terminal).not.toContain('Sconosciuta')
    expect(terminal).toContain('Spese: lette 4, accettate 1, scartate 3')
    const report = renderPreviewReport(preview)
    expect(report).toContain('SEGRETO-PERSONALE')
    expect(report).toContain('| Spese |')
  })
})
