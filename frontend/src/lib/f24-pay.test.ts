import { describe, expect, it } from 'vitest'
import { planPayment, splitDeadline, taxBudgetParts, type TaxRole } from './f24-pay.ts'

const roles = new Map<TaxRole, number>([['substitute_tax', 1], ['inps', 2], ['substitute_tax_interest', 3], ['inps_interest', 4]])
const categories = new Map([[1, 11], [2, 12], [3, 13], [4, 14]])
const installments = new Map([[10, { interest: 31.2 }], [11, { interest: 17.95 }]])
// F24 della rata 6: INPS saldo 2.080 + interessi 31,20; imposta saldo 1.196,71 + interessi 17,95.
const deadlines = [
  { id: 1, tax_type: 'inps_balance' as const, due_date: '2026-11-16', amount: 2111.2, installment_id: 10 },
  { id: 2, tax_type: 'substitute_tax_balance' as const, due_date: '2026-11-16', amount: 1214.66, installment_id: 11 },
]

describe('F24: capitale e interessi', () => {
  it('le rate hanno gli interessi nella riga, le scadenze singole sono tutto capitale', () => {
    expect(splitDeadline(deadlines[0], { interest: 31.2 })).toEqual({ principal: 2080, interest: 31.2 })
    expect(splitDeadline({ ...deadlines[0], installment_id: null, amount: 8887 }, undefined)).toEqual({ principal: 8887, interest: 0 })
  })
  it('"Pago": un movimento di capitale per riga (collegato alla scadenza) e uno di interessi per tributo', () => {
    const plan = planPayment(deadlines, installments, roles, categories)
    expect('movements' in plan && plan.movements).toEqual([
      { budgetItemId: 2, categoryId: 12, amount: 2080, deadlineId: 1 },
      { budgetItemId: 1, categoryId: 11, amount: 1196.71, deadlineId: 2 },
      { budgetItemId: 4, categoryId: 14, amount: 31.2, deadlineId: null },
      { budgetItemId: 3, categoryId: 13, amount: 17.95, deadlineId: null },
    ])
  })
  it('senza le voci fiscali dice cosa manca invece di registrare a metà', () => {
    const plan = planPayment(deadlines, installments, new Map([['inps', 2]]), categories)
    expect('error' in plan).toBe(true)
  })
  it('budget: capitale e interessi sulle voci giuste', () => {
    expect(taxBudgetParts(deadlines, installments, roles)).toEqual([
      { due_date: '2026-11-16', budgetItemId: 2, amount: 2080 },
      { due_date: '2026-11-16', budgetItemId: 4, amount: 31.2 },
      { due_date: '2026-11-16', budgetItemId: 1, amount: 1196.71 },
      { due_date: '2026-11-16', budgetItemId: 3, amount: 17.95 },
    ])
  })
})
