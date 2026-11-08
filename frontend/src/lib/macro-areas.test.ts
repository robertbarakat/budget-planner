import { describe, expect, it } from 'vitest'
import { buildCashFlow } from './cash-flow.ts'
import { buildMacroAreaReport } from './macro-areas.ts'

const areas = [
  { id: 1, name: 'Introiti', archived: false, sortOrder: 0 },
  { id: 2, name: 'Casa', archived: false, sortOrder: 1 },
  { id: 3, name: 'Vecchia', archived: true, sortOrder: 2 },
]
const items = [
  { id: 10, macroAreaId: 1, name: 'Fatture', kind: 'income' as const, archived: false, sortOrder: 0 },
  { id: 20, macroAreaId: 2, name: 'Affitto', kind: 'expense' as const, archived: false, sortOrder: 0 },
  { id: 21, macroAreaId: 2, name: 'Bollette', kind: 'expense' as const, archived: false, sortOrder: 1 },
  { id: 30, macroAreaId: 3, name: 'Voce archiviata', kind: 'expense' as const, archived: true, sortOrder: 0 },
]
const entries = [
  { budgetItemId: 10, year: 2026, month: 1, amount: 1000 },
  { budgetItemId: 20, year: 2026, month: 1, amount: 400 },
  { budgetItemId: 21, year: 2026, month: 1, amount: 100 },
  { budgetItemId: 20, year: 2026, month: 2, amount: 400 },
  { budgetItemId: 30, year: 2026, month: 2, amount: 50 },
]
const tx = (budgetItemId: number, type: 'income' | 'expense', transactionDate: string, amount: number) => ({
  type,
  budgetItemId,
  categoryId: null,
  transactionDate,
  amount,
})
const transactions = [tx(10, 'income', '2026-01-10', 900), tx(20, 'expense', '2026-01-02', 400), tx(21, 'expense', '2026-01-20', 130)]
const closed = [{ year: 2026, month: 1 }]

describe('buildMacroAreaReport', () => {
  const year = buildMacroAreaReport(2026, null, areas, items, entries, transactions, closed)

  it('il totale di un\'area è la somma delle sue voci', () => {
    const home = year.groups.find((g) => g.name === 'Casa')!
    expect(home.budgeted).toBe(-(400 + 100 + 400))
    expect(home.actual).toBe(-(400 + 130))
    expect(home.variance).toBeCloseTo(home.actual - home.budgeted, 2)
    expect(home.items.reduce((s, i) => s + i.budgeted, 0)).toBeCloseTo(home.budgeted, 2)
    expect(home.items.reduce((s, i) => s + i.actual, 0)).toBeCloseTo(home.actual, 2)
  })

  it('il totale generale è la somma delle aree', () => {
    expect(year.total.budgeted).toBeCloseTo(year.groups.reduce((s, g) => s + g.budgeted, 0), 2)
    expect(year.total.variance).toBeCloseTo(year.total.actual - year.total.budgeted, 2)
  })

  it('una voce archiviata compare solo negli anni in cui ha importi', () => {
    expect(year.groups.map((g) => g.name)).toEqual(['Introiti', 'Casa', 'Vecchia'])
    const other = buildMacroAreaReport(2027, null, areas, items, [], [], [])
    expect(other.groups.map((g) => g.name)).toEqual(['Introiti', 'Casa'])
  })

  it('con un mese scelto mostra solo quel mese', () => {
    const january = buildMacroAreaReport(2026, 1, areas, items, entries, transactions, closed)
    expect(january.total).toMatchObject({ budgeted: 1000 - 400 - 100, actual: 900 - 400 - 130 })
    const february = buildMacroAreaReport(2026, 2, areas, items, entries, transactions, closed)
    expect(february.groups.find((g) => g.name === 'Vecchia')?.budgeted).toBe(-50)
    expect(february.total.budgeted).toBe(-450)
  })

  it('a mesi tutti chiusi il reale annuo coincide col flusso annuo della vista cronologica, a tutti aperti il previsto', () => {
    const allClosed = Array.from({ length: 12 }, (_, i) => ({ year: 2026, month: i + 1 }))
    const cashItems = items.map((i) => ({ id: i.id, name: i.name, kind: i.kind, archived: i.archived }))
    const cashTx = transactions.map((t) => ({ type: t.type, budgetItemId: t.budgetItemId, transactionDate: t.transactionDate, amount: t.amount }))
    const flowClosed = buildCashFlow(2026, 0, cashItems, entries, cashTx, allClosed)
    const reportClosed = buildMacroAreaReport(2026, null, areas, items, entries, transactions, allClosed)
    expect(reportClosed.total.actual).toBeCloseTo(flowClosed.closingBalance, 2)
    const flowOpen = buildCashFlow(2026, 0, cashItems, entries, cashTx, [])
    const reportOpen = buildMacroAreaReport(2026, null, areas, items, entries, transactions, [])
    expect(reportOpen.total.budgeted).toBeCloseTo(flowOpen.closingBalance, 2)
  })
})
