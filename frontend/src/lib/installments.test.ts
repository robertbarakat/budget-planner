import { describe, expect, it } from 'vitest'
import { emptyInstallmentPlanDraft, summarizePlan, validateInstallmentPlan, type InstallmentPlanDraft } from './installments.ts'

const draft: InstallmentPlanDraft = {
  description: 'Rateizzazione 2026',
  lines: [
    { taxType: 'substitute_tax_balance', referenceYearText: '2025', quotaText: '1.196,71', lastNumberText: '' },
    { taxType: 'inps_advance', referenceYearText: '2026', quotaText: '831,98', lastNumberText: '5' },
  ],
  countText: '7',
  firstDueDate: '2026-12-16',
}

describe('validateInstallmentPlan', () => {
  it('calcola le rate con gli interessi per riga', () => {
    const result = validateInstallmentPlan(draft)
    if (!('values' in result)) throw new Error('attesi valori')
    const second = result.values.rows.filter((r) => r.number === 2)
    expect(second.map((r) => r.interest)).toEqual([2.15, 1.5])
    expect(result.values.rows.filter((r) => r.number === 1).every((r) => r.interest === 0)).toBe(true)
  })
  it('la riga chiusa alla rata 5 non compare dalla 6', () => {
    const result = validateInstallmentPlan(draft)
    if (!('values' in result)) throw new Error('attesi valori')
    expect(result.values.rows.filter((r) => r.number === 6).map((r) => r.taxType)).toEqual(['substitute_tax_balance'])
  })
  it('chiede i campi obbligatori', () => {
    const result = validateInstallmentPlan(emptyInstallmentPlanDraft)
    expect('errors' in result && Object.keys(result.errors).sort()).toEqual(['count', 'description', 'firstDueDate', 'lines'])
  })
  it('l\'ultima rata non può superare il numero di rate', () => {
    const result = validateInstallmentPlan({ ...draft, lines: [{ ...draft.lines[0]!, lastNumberText: '9' }] })
    expect('errors' in result && result.errors.lines).toMatch(/ultima rata/)
  })
})

describe('summarizePlan', () => {
  const rows = [
    { id: 1, number: 1, due_date: '2026-12-16', amount: 100, principal: 100 },
    { id: 2, number: 1, due_date: '2026-12-16', amount: 50, principal: 50 },
    { id: 3, number: 2, due_date: '2027-01-16', amount: 100.2, principal: 100 },
    { id: 4, number: 2, due_date: '2027-01-16', amount: 50.1, principal: 50 },
  ]
  it('somma le righe della stessa rata e ricava gli interessi', () => {
    const s = summarizePlan(rows, new Set([1, 2]))
    expect(s?.interest).toBeCloseTo(0.3)
    expect(s?.remaining).toBeCloseTo(150.3)
    expect(s?.next?.number).toBe(2)
  })
  it('una rata è versata solo se lo sono tutte le sue righe', () => {
    expect(summarizePlan(rows, new Set([1]))?.next?.number).toBe(1)
  })
})
