import { describe, expect, it } from 'vitest'
import { deadlineStatus, planDeadlines } from './f24-plan.ts'
import type { TaxSummary } from './tax-summary.ts'

const line = (amount: number | null) => ({ amount, explanation: '' })
const summary = (adv: [number, number], inps: [number, number], taxBalance: number, inpsBalance: number): TaxSummary => ({
  collections: 0, taxableBase: 0, inpsDue: 0, inpsPaid: 0, substituteTax: 0,
  advances: [
    { position: 'first', dueDate: '2026-06-30', method: 'historic', substituteTax: line(adv[0]), inps: line(inps[0]) },
    { position: 'second', dueDate: '2026-11-30', method: 'forecast', substituteTax: line(adv[1]), inps: line(inps[1]) },
  ],
  substituteTaxBalance: taxBalance, inpsBalance,
})

describe('planDeadlines', () => {
  const plan = planDeadlines(2026, { summary: summary([120, 201], [80, 349.34], 116.25, 356.67), firstAdvanceDueDate: '2026-06-30' }, { summary: summary([0, 0], [0, 0], 500, 300) })
  it('elenca acconti dell\'anno e saldo dell\'anno prima alla data del primo acconto', () => {
    expect(plan.deadlines.map((d) => [d.referenceYear, d.taxType, d.dueDate, d.amountCents])).toEqual([
      [2025, 'inps_balance', '2026-06-30', 30000],
      [2025, 'substitute_tax_balance', '2026-06-30', 50000],
      [2026, 'inps_advance', '2026-06-30', 8000],
      [2026, 'substitute_tax_advance', '2026-06-30', 12000],
      [2026, 'inps_advance', '2026-11-30', 34934],
      [2026, 'substitute_tax_advance', '2026-11-30', 20100],
    ])
  })
  it('il totale è la somma di acconti dell\'anno e saldo dell\'anno prima', () => {
    expect(plan.totalCents).toBe(30000 + 50000 + 8000 + 12000 + 34934 + 20100)
  })
  it('senza anno prima restano solo gli acconti', () => {
    expect(planDeadlines(2026, { summary: summary([1, 2], [3, 4], 9, 9), firstAdvanceDueDate: '2026-06-30' }, null).deadlines).toHaveLength(4)
  })
})

describe('deadlineStatus', () => {
  it('versata solo con un movimento collegato; scaduta se la data è passata', () => {
    expect(deadlineStatus({ due_date: '2020-01-01', transaction_id: 5 }, '2026-11-08')).toBe('paid')
    expect(deadlineStatus({ due_date: '2020-01-01', transaction_id: null }, '2026-11-08')).toBe('overdue')
    expect(deadlineStatus({ due_date: '2030-01-01', transaction_id: null }, '2026-11-08')).toBe('due')
  })
})

describe('rate delle rateizzazioni nel calendario', () => {
  it('compaiono alla loro scadenza con l\'id della rata e contano nel totale', () => {
    const plan = planDeadlines(
      2026,
      { summary: summary([0, 0], [0, 0], 0, 0), firstAdvanceDueDate: '2026-06-30' },
      null,
      [{ id: 9, referenceYear: 2024, taxType: 'substitute_tax_balance', number: 1, dueDate: '2026-03-31', amount: 550 }, { id: 10, referenceYear: 2024, taxType: 'substitute_tax_balance', number: 2, dueDate: '2027-03-31', amount: 550 }],
    )
    expect(plan.deadlines).toHaveLength(1)
    expect(plan.deadlines[0]).toMatchObject({ dueDate: '2026-03-31', amountCents: 55000, installmentId: 9, installmentNumber: 1 })
    expect(plan.totalCents).toBe(55000)
  })
})
