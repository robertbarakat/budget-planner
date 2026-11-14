import { describe, expect, it } from 'vitest'
import { buildShares } from './shares.ts'

const areas = [{ id: 1, name: 'Casa' }, { id: 2, name: 'Lavoro' }]
const items = [
  { id: 10, name: 'Affitto', macroAreaId: 1 },
  { id: 11, name: 'Utenze', macroAreaId: 1 },
  { id: 20, name: 'Software', macroAreaId: 2 },
]
const tx = [
  { type: 'expense', budgetItemId: 10, amountCents: 60000 },
  { type: 'expense', budgetItemId: 11, amountCents: 20000 },
  { type: 'expense', budgetItemId: 20, amountCents: 20000 },
  { type: 'income', budgetItemId: 20, amountCents: 500000 },
  { type: 'transfer', budgetItemId: null, amountCents: 99999 },
]

describe('buildShares', () => {
  it('pesa gruppi e voci sul totale delle spese, senza entrate né trasferimenti', () => {
    const r = buildShares('expense', tx, items, areas)
    expect(r.totalCents).toBe(100000)
    expect(r.areas.map((a) => [a.name, a.percent])).toEqual([['Casa', 80], ['Lavoro', 20]])
    expect(r.areas[0]!.items.map((i) => [i.name, i.percent])).toEqual([['Affitto', 60], ['Utenze', 20]])
  })
  it('conta solo le entrate per le entrate', () => {
    expect(buildShares('income', tx, items, areas).areas.map((a) => [a.name, a.percent])).toEqual([['Lavoro', 100]])
  })
  it('senza movimenti il totale è zero e non ci sono righe', () => {
    expect(buildShares('expense', [], items, areas)).toEqual({ totalCents: 0, areas: [] })
  })
  it('un movimento senza voce va in «Senza voce»', () => {
    const r = buildShares('expense', [{ type: 'expense', budgetItemId: null, amountCents: 100 }], items, areas)
    expect(r.areas[0]!.name).toBe('Senza voce')
  })
})
