import { describe, expect, it } from 'vitest'
import { buildItemDetail } from './item-detail.ts'
import { buildMacroAreaReport } from './macro-areas.ts'

const item = { id: 20, kind: 'expense' as const }
const entries = [
  { budgetItemId: 20, year: 2026, month: 1, amount: 400 },
  { budgetItemId: 20, year: 2026, month: 2, amount: 400 },
  { budgetItemId: 99, year: 2026, month: 1, amount: 5 },
]
const tx = (categoryId: number, transactionDate: string, amount: number, type: 'expense' | 'income' | 'transfer' = 'expense') => ({
  type,
  budgetItemId: type === 'transfer' ? null : 20,
  categoryId: type === 'transfer' ? null : categoryId,
  transactionDate,
  amount,
})
const transactions = [tx(1, '2026-01-02', 300), tx(2, '2026-01-15', 130), tx(1, '2026-02-03', 50), tx(1, '2025-12-31', 77), tx(0, '2026-01-20', 900, 'transfer')]
const closed = [{ year: 2026, month: 1 }]
const categories = [
  { id: 1, budgetItemId: 20, name: 'Canone', archived: false },
  { id: 2, budgetItemId: 20, name: 'Spese condominio', archived: false },
  { id: 3, budgetItemId: 20, name: 'Vecchia categoria', archived: true },
  { id: 4, budgetItemId: 20, name: 'Mai usata', archived: false },
]

describe('buildItemDetail', () => {
  const detail = buildItemDetail(2026, item, entries, transactions, closed, categories)

  it('ha 12 mesi con previsto, reale e scostamento (reale − previsto)', () => {
    expect(detail.months).toHaveLength(12)
    expect(detail.months[0]).toMatchObject({ month: 1, isClosed: true, budgeted: -400, actual: -430, variance: -30 })
    expect(detail.months[1]).toMatchObject({ month: 2, isClosed: false, budgeted: -400, actual: -50, variance: 350 })
  })

  it('il totale annuo coincide con la riga della voce nella vista per macro-area', () => {
    const report = buildMacroAreaReport(
      2026,
      null,
      [{ id: 2, name: 'Casa', archived: false, sortOrder: 0 }],
      [{ id: 20, macroAreaId: 2, name: 'Affitto', kind: 'expense', archived: false, sortOrder: 0 }],
      entries.filter((e) => e.budgetItemId === 20),
      transactions,
      closed,
    )
    const row = report.groups[0]!.items[0]!
    expect(detail.total).toEqual({ budgeted: row.budgeted, actual: row.actual, variance: row.variance })
  })

  it('la somma delle categorie coincide con il reale della voce', () => {
    expect(detail.categories.reduce((s, c) => s + c.actual, 0)).toBeCloseTo(detail.total.actual, 2)
    expect(detail.categories.find((c) => c.name === 'Canone')?.actual).toBe(-350)
  })

  it('mostra le categorie non archiviate (anche a 0) e solo le archiviate usate nell\'anno', () => {
    expect(detail.categories.map((c) => c.name)).toEqual(['Canone', 'Spese condominio', 'Mai usata'])
  })
})
