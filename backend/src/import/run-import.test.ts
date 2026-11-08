import { describe, expect, it } from 'vitest'
import { buildImportPreview } from './preview.ts'
import { runImport, toPayload } from './run-import.ts'
import type { ImportPayloadRow, ImportStore } from './run-import.ts'
import { isLocalUrl } from './run-import-supabase.ts'
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
  comment: null,
  ...o,
})

const rules = [{ sourceCategory: 'Cat1', commentContains: null, priority: 1, targetBudgetItem: 'VoceX', targetCategory: 'Cat1' }]
const raw = (extra: RawRow[] = []): RawExport => ({
  Spese: [row('Spese', { defaultAmount: 12.5 }), row('Spese', { defaultAmount: 7.5 }), ...extra],
  Entrate: [],
  Bonifici: [row('Bonifici', { account: 'ContoB', defaultAmount: -30 }), row('Bonifici', { account: 'ContoA', defaultAmount: 30 })],
})

function fakeStore(existing = 0) {
  const calls: ImportPayloadRow[][] = []
  const store: ImportStore = {
    async countTransactions() {
      return existing
    },
    async importTransactions(rows) {
      calls.push(rows)
      return { inserted_count: rows.length, expense_total: 20, income_total: 0, transfer_total: 30 }
    },
  }
  return { store, calls }
}

const base = (store: ImportStore, answer: string, extra: RawRow[] = [], maxRejected = 0) => ({
  preview: buildImportPreview(raw(extra), rules),
  store,
  maxRejected,
  targetLabel: 'locale',
  ask: async () => answer,
  log: () => {},
})

describe('runImport', () => {
  it('senza la conferma digitata non scrive nulla', async () => {
    for (const answer of ['', 'si', 'IMPORTA', 'no']) {
      const { store, calls } = fakeStore()
      const result = await runImport(base(store, answer))
      expect(result.status).toBe('stopped')
      expect(calls).toEqual([])
    }
  })

  it('con database non vuoto si ferma prima di scrivere, con messaggio chiaro', async () => {
    const { store, calls } = fakeStore(3)
    const result = await runImport(base(store, 'importa'))
    expect(result).toEqual({ status: 'stopped', reason: expect.stringContaining('contiene già 3 movimenti') })
    expect(calls).toEqual([])
  })

  it('si ferma se gli scarti superano la soglia', async () => {
    const bad = row('Spese', { defaultAmount: 0 })
    const { store, calls } = fakeStore()
    const result = await runImport(base(store, 'importa', [bad], 0))
    expect(result).toEqual({ status: 'stopped', reason: expect.stringContaining('1 scarti, oltre la soglia di 0') })
    expect(calls).toEqual([])

    const ok = await runImport(base(fakeStore().store, 'importa', [bad], 1))
    expect(ok.status).toBe('imported')
  })

  it('con la conferma scrive esattamente i movimenti dell\'anteprima', async () => {
    const { store, calls } = fakeStore()
    const options = base(store, ' importa ')
    const result = await runImport(options)
    expect(result.status).toBe('imported')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toHaveLength(options.preview.transactions.length)
    expect(calls[0]).toEqual(toPayload(options.preview.transactions))
    expect(calls[0]!.map((r) => r.type).sort()).toEqual(['expense', 'expense', 'transfer'])
    expect(calls[0]!.find((r) => r.type === 'transfer')).toMatchObject({ amount: 30, account: 'ContoB', destination_account: 'ContoA', category: null })
  })

  it('segnala se il database inserisce un numero diverso di movimenti', async () => {
    const store: ImportStore = {
      countTransactions: async () => 0,
      importTransactions: async () => ({ inserted_count: 1, expense_total: 0, income_total: 0, transfer_total: 0 }),
    }
    await expect(runImport(base(store, 'importa'))).rejects.toThrow('Inseriti 1 movimenti invece di 3')
  })
})

describe('isLocalUrl', () => {
  it('riconosce solo gli indirizzi locali', () => {
    expect(isLocalUrl('http://127.0.0.1:54321')).toBe(true)
    expect(isLocalUrl('http://localhost:54321')).toBe(true)
    expect(isLocalUrl('https://joknxejlzsaogyuggzsy.supabase.co')).toBe(false)
  })
})
