import { describe, expect, it } from 'vitest'
import { mapImportedTransactions, parseMappingRules } from './import-mapping.ts'
import type { MappingRule } from './import-mapping.ts'
import type { NormalizedTransaction } from './import-normalize.ts'

// Nomi di prova inventati: il codice non conosce nessuna categoria reale.
let row = 1
function tx(category: string | null, comment: string | null = null, type: NormalizedTransaction['type'] = 'expense'): NormalizedTransaction {
  return {
    type,
    transactionDate: '2026-03-10',
    amountCents: 1000,
    account: 'A',
    destinationAccount: type === 'transfer' ? 'B' : null,
    category,
    tag: null,
    comment,
    sourceRows: [{ sheet: 'Spese', rowNumber: row++ }],
  }
}

const rules: MappingRule[] = [
  { sourceCategory: 'Cat1', priority: 10, targetBudgetItem: 'VoceA', targetCategory: 'Cat1' },
  { sourceCategory: 'Cat2', priority: 10, targetBudgetItem: 'VoceA', targetCategory: 'Cat2' },
  { sourceCategory: 'Debiti', commentContains: 'primo', priority: 1, targetBudgetItem: 'DebitoUno', targetCategory: 'Rata' },
  { sourceCategory: 'Debiti', commentContains: 'secondo', priority: 1, targetBudgetItem: 'DebitoDue', targetCategory: 'Rata' },
  { sourceCategory: 'Debiti', priority: 20, targetBudgetItem: 'DebitiAltro', targetCategory: 'Altro' },
  { sourceCategory: 'Paga', commentContains: 'Cliente X', priority: 1, targetBudgetItem: 'RicaviX', targetCategory: 'Fattura' },
]

describe('mapImportedTransactions', () => {
  it('fa confluire più categorie in una stessa voce', () => {
    const { mapped, rejected } = mapImportedTransactions([tx('Cat1'), tx('Cat2')], rules)
    expect(rejected).toEqual([])
    expect(mapped.map((m) => [m.targetBudgetItem, m.targetCategory])).toEqual([
      ['VoceA', 'Cat1'],
      ['VoceA', 'Cat2'],
    ])
  })

  it('sceglie la voce in base al commento, con ripiego per priorità', () => {
    const { mapped } = mapImportedTransactions(
      [tx('Debiti', 'Rata del PRIMO prestito'), tx('Debiti', '  rata   Secondo '), tx('Debiti', 'altro'), tx('Debiti', null)],
      rules,
    )
    expect(mapped.map((m) => m.targetBudgetItem)).toEqual(['DebitoUno', 'DebitoDue', 'DebitiAltro', 'DebitiAltro'])
  })

  it('manda la paga del cliente nel commento alla voce di entrata del cliente', () => {
    const { mapped, rejected } = mapImportedTransactions([tx('Paga', 'saldo fattura cliente   x', 'income')], rules)
    expect(rejected).toEqual([])
    expect(mapped[0]).toMatchObject({ targetBudgetItem: 'RicaviX', targetCategory: 'Fattura' })
  })

  it('a parità di priorità vince la prima regola del file', () => {
    const tie: MappingRule[] = [
      { sourceCategory: 'C', priority: 5, targetBudgetItem: 'Prima', targetCategory: 'C' },
      { sourceCategory: 'C', priority: 5, targetBudgetItem: 'Seconda', targetCategory: 'C' },
    ]
    expect(mapImportedTransactions([tx('c')], tie).mapped[0]?.targetBudgetItem).toBe('Prima')
  })

  it('scarta senza regola, indicando categoria e commento', () => {
    const { mapped, rejected } = mapImportedTransactions([tx('Sconosciuta', 'nota'), tx(null)], rules)
    expect(mapped).toEqual([])
    expect(rejected.map((r) => r.reason)).toEqual([
      'Nessuna regola di mappatura (categoria: Sconosciuta, commento: nota)',
      'Nessuna regola di mappatura (categoria: (vuota), commento: (vuoto))',
    ])
    expect(rejected[0]).toMatchObject({ sheet: 'Spese' })
  })

  it('lascia passare i trasferimenti senza categoria', () => {
    const { mapped, rejected } = mapImportedTransactions([tx(null, null, 'transfer')], rules)
    expect(rejected).toEqual([])
    expect(mapped[0]).toMatchObject({ type: 'transfer', targetBudgetItem: null, targetCategory: null })
  })
})

describe('parseMappingRules', () => {
  it('legge un elenco valido, con o senza il contenitore "rules"', () => {
    const rule = { sourceCategory: 'A', priority: 1, targetBudgetItem: 'B', targetCategory: 'C' }
    expect(parseMappingRules({ rules: [rule] })).toEqual([
      { ...rule, commentContains: null, targetMacroArea: null, targetKind: null },
    ])
    expect(parseMappingRules([{ ...rule, targetMacroArea: 'M', targetKind: 'income' }])[0]).toMatchObject({
      targetMacroArea: 'M',
      targetKind: 'income',
    })
    expect(() => parseMappingRules([{ ...rule, targetKind: 'altro' }])).toThrow('"targetKind"')
    expect(parseMappingRules([rule])).toHaveLength(1)
  })

  it('segnala campi mancanti o errati', () => {
    expect(() => parseMappingRules({})).toThrow('"rules"')
    expect(() => parseMappingRules([{ priority: 1, targetBudgetItem: 'B', targetCategory: 'C' }])).toThrow('Regola 1: manca "sourceCategory"')
    expect(() => parseMappingRules([{ sourceCategory: 'A', priority: 'x', targetBudgetItem: 'B', targetCategory: 'C' }])).toThrow('"priority"')
    expect(() => parseMappingRules([{ sourceCategory: 'A', priority: 1, targetBudgetItem: 'B', targetCategory: 'C', commentContains: ' ' }])).toThrow('"commentContains"')
  })
})
