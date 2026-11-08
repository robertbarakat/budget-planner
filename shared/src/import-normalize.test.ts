import { describe, expect, it } from 'vitest'
import { normalizeImportedRows } from './import-normalize.ts'
import type { ImportRawRow } from './import-normalize.ts'

let counter = 1
function raw(sheet: ImportRawRow['sheet'], overrides: Partial<ImportRawRow> = {}): ImportRawRow {
  return {
    sheet,
    rowNumber: counter++,
    dateTime: new Date('2026-03-10T12:00:00Z'),
    category: 'Pizza',
    account: 'Cash',
    defaultAmount: 12.5,
    defaultCurrency: 'EUR',
    accountAmount: 12.5,
    accountCurrency: 'EUR',
    transactionAmount: 12.5,
    transactionCurrency: 'EUR',
    tag: null,
    comment: null,
    ...overrides,
  }
}

describe('normalizeImportedRows', () => {
  it('normalizza una spesa e una entrata', () => {
    const result = normalizeImportedRows([
      raw('Spese', { comment: 'cena' }),
      raw('Entrate', { category: 'Stipendio', account: 'Bancoposta', defaultAmount: '1.500,00' }),
    ])
    expect(result.rejected).toEqual([])
    expect(result.transactions).toMatchObject([
      { type: 'income', amountCents: 150000, account: 'Bancoposta', category: 'Stipendio', transactionDate: '2026-03-10' },
      { type: 'expense', amountCents: 1250, account: 'Cash', category: 'Pizza', comment: 'cena' },
    ])
  })

  it('abbina due righe opposte di Bonifici in un trasferimento', () => {
    const result = normalizeImportedRows([
      raw('Bonifici', { account: 'Bancoposta', defaultAmount: -100 }),
      raw('Bonifici', { account: 'Cash', defaultAmount: 100 }),
    ])
    expect(result.rejected).toEqual([])
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0]).toMatchObject({
      type: 'transfer',
      amountCents: 10000,
      account: 'Bancoposta',
      destinationAccount: 'Cash',
      category: null,
    })
    expect(result.transactions[0]?.sourceRows).toHaveLength(2)
  })

  it('riconosce la destinazione scritta nel commento di una riga singola', () => {
    const result = normalizeImportedRows(
      [raw('Bonifici', { account: 'Bancoposta', defaultAmount: 50, comment: 'verso Postepay' })],
      { accountNames: ['Bancoposta', 'Cash', 'Postepay'] },
    )
    expect(result.transactions[0]).toMatchObject({ type: 'transfer', account: 'Bancoposta', destinationAccount: 'Postepay' })
  })

  it('scarta un trasferimento di cui non si capisce la destinazione', () => {
    const result = normalizeImportedRows([raw('Bonifici', { defaultAmount: 50 }), raw('Bonifici', { defaultAmount: -30 })], {
      accountNames: ['Cash'],
    })
    expect(result.transactions).toEqual([])
    expect(result.rejected.map((r) => r.reason)).toEqual([
      'Trasferimento senza conto di destinazione riconoscibile',
      'Trasferimento senza riga di destinazione corrispondente',
    ])
  })

  it('scarta un trasferimento con origine uguale alla destinazione', () => {
    const result = normalizeImportedRows([
      raw('Bonifici', { account: 'Cash', defaultAmount: -100 }),
      raw('Bonifici', { account: 'cash', defaultAmount: 100 }),
    ])
    expect(result.transactions).toEqual([])
    expect(result.rejected).toHaveLength(2)
    expect(result.rejected[0]?.reason).toBe('Trasferimento con origine uguale alla destinazione')
  })

  it('scarta una valuta diversa da EUR con il motivo', () => {
    const result = normalizeImportedRows([
      raw('Spese', { transactionCurrency: 'USD' }),
      raw('Spese', { accountCurrency: 'LBP' }),
    ])
    expect(result.transactions).toEqual([])
    expect(result.rejected.map((r) => r.reason)).toEqual(['Valuta diversa da EUR (USD)', 'Valuta diversa da EUR (LBP)'])
  })

  it('usa il giorno scritto nel file vicino alla mezzanotte, senza conversione di fuso', () => {
    const result = normalizeImportedRows([
      raw('Spese', { dateTime: new Date('2026-03-31T23:50:00Z') }),
      raw('Spese', { dateTime: new Date('2026-04-01T00:10:00Z') }),
      raw('Spese', { dateTime: '31/03/2026 23:59' }),
    ])
    expect(result.transactions.map((t) => t.transactionDate)).toEqual(['2026-03-31', '2026-04-01', '2026-03-31'])
  })

  it('scarta importo zero, negativo, vuoto o non numerico', () => {
    const result = normalizeImportedRows([
      raw('Spese', { defaultAmount: 0 }),
      raw('Spese', { defaultAmount: -5 }),
      raw('Entrate', { defaultAmount: null }),
      raw('Entrate', { defaultAmount: 'abc' }),
    ])
    expect(result.transactions).toEqual([])
    expect(result.rejected.map((r) => r.reason)).toEqual([
      // ordinati per foglio (Entrate prima di Spese) e riga
      'Importo vuoto o non numerico',
      'Importo vuoto o non numerico',
      'Importo uguale a zero',
      'Importo negativo',
    ])
  })

  it('scarta data non valida e conto mancante', () => {
    const result = normalizeImportedRows([raw('Spese', { dateTime: '31/02/2026' }), raw('Spese', { account: null })])
    expect(result.rejected.map((r) => r.reason)).toEqual(['Data non valida', 'Conto mancante'])
  })

  it('arrotonda in centesimi interi senza errori di virgola mobile', () => {
    const result = normalizeImportedRows([raw('Spese', { defaultAmount: 0.1 + 0.2 }), raw('Spese', { defaultAmount: '19,99' })])
    expect(result.transactions.map((t) => t.amountCents)).toEqual([30, 1999])
  })
})
