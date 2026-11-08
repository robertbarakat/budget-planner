import { describe, expect, it } from 'vitest'
import { summarizeMonthExpenses } from './home.ts'
import { buildMacroAreaReport } from './macro-areas.ts'

describe('summarizeMonthExpenses', () => {
  const areas = [
    { id: 1, name: 'Introiti', archived: false, sortOrder: 0 },
    { id: 2, name: 'Casa', archived: false, sortOrder: 1 },
  ]
  const items = [
    { id: 10, macroAreaId: 1, name: 'Fatture', kind: 'income' as const, archived: false, sortOrder: 0 },
    { id: 20, macroAreaId: 2, name: 'Affitto', kind: 'expense' as const, archived: false, sortOrder: 0 },
    { id: 21, macroAreaId: 2, name: 'Bollette', kind: 'expense' as const, archived: false, sortOrder: 1 },
  ]
  const entries = [
    { budgetItemId: 10, year: 2026, month: 3, amount: 5000 },
    { budgetItemId: 20, year: 2026, month: 3, amount: 400 },
    { budgetItemId: 21, year: 2026, month: 3, amount: 100.1 },
  ]
  const tx = (budgetItemId: number, type: 'income' | 'expense', amount: number) => ({
    type,
    budgetItemId,
    categoryId: null,
    transactionDate: '2026-03-10',
    amount,
  })
  const transactions = [tx(10, 'income', 4000), tx(20, 'expense', 430), tx(21, 'expense', 90.05)]

  it('somma solo le voci di spesa del mese e dà lo scostamento (reale − previsto)', () => {
    const report = buildMacroAreaReport(2026, 3, areas, items, entries, transactions, [])
    const expenses = summarizeMonthExpenses(report)
    expect(expenses).toEqual({ budgeted: -500.1, actual: -520.05, variance: -19.95 })
  })

  it('coincide con la somma delle righe di spesa della vista per macro-area dello stesso mese', () => {
    const report = buildMacroAreaReport(2026, 3, areas, items, entries, transactions, [])
    const home = report.groups.find((g) => g.name === 'Casa')!
    const expenses = summarizeMonthExpenses(report)
    expect(expenses.budgeted).toBeCloseTo(home.budgeted, 2)
    expect(expenses.actual).toBeCloseTo(home.actual, 2)
  })

  it('un mese senza importi vale zero', () => {
    const report = buildMacroAreaReport(2026, 4, areas, items, entries, transactions, [])
    expect(summarizeMonthExpenses(report)).toEqual({ budgeted: 0, actual: 0, variance: 0 })
  })
})
