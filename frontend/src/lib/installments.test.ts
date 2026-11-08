import { describe, expect, it } from 'vitest'
import { emptyInstallmentPlanDraft, summarizePlan, validateInstallmentPlan, type InstallmentPlanDraft } from './installments.ts'

const draft: InstallmentPlanDraft = {
  description: 'Saldo 2024', totalText: '1.000,00', taxType: 'substitute_tax', referenceYearText: '2024',
  rows: [{ dueDate: '2026-03-31', amountText: '550' }, { dueDate: '2026-06-30', amountText: '550,50' }],
}

describe('validateInstallmentPlan', () => {
  it('numera le rate in ordine e legge gli importi all\'italiana', () => {
    expect(validateInstallmentPlan(draft)).toEqual({
      values: {
        description: 'Saldo 2024', totalAmount: 1000, taxType: 'substitute_tax', referenceYear: 2024,
        installments: [{ number: 1, dueDate: '2026-03-31', amount: 550 }, { number: 2, dueDate: '2026-06-30', amount: 550.5 }],
      },
    })
  })
  it('chiede i campi obbligatori', () => {
    const result = validateInstallmentPlan(emptyInstallmentPlanDraft)
    expect('errors' in result && Object.keys(result.errors).sort()).toEqual(['description', 'referenceYear', 'rows', 'total'])
  })
  it('le rate devono sommare almeno l\'importo rateizzato', () => {
    const result = validateInstallmentPlan({ ...draft, rows: [{ dueDate: '2026-03-31', amountText: '900' }] })
    expect('errors' in result && result.errors.rows).toMatch(/almeno l'importo rateizzato/)
  })
  it('rifiuta rata senza scadenza o con importo non valido', () => {
    const noDate = validateInstallmentPlan({ ...draft, rows: [{ dueDate: '', amountText: '1000' }] })
    expect('errors' in noDate && noDate.errors.rows).toMatch(/Rata 1: la scadenza/)
    const badAmount = validateInstallmentPlan({ ...draft, rows: [{ dueDate: '2026-03-31', amountText: '0' }] })
    expect('errors' in badAmount && badAmount.errors.rows).toMatch(/Rata 1: l'importo/)
  })
})

describe('summarizePlan', () => {
  const rows = [
    { id: 1, number: 1, due_date: '2026-03-31', amount: 550 },
    { id: 2, number: 2, due_date: '2026-06-30', amount: 550.5 },
  ]
  it('interessi = somma rate − importo (1.100,50 − 1.000 = 100,50); residuo e prossima rata', () => {
    expect(summarizePlan(1000, rows, new Set())).toEqual({ interest: 100.5, remaining: 1100.5, next: { number: 1, dueDate: '2026-03-31', amount: 550 } })
    expect(summarizePlan(1000, rows, new Set([1]))).toEqual({ interest: 100.5, remaining: 550.5, next: { number: 2, dueDate: '2026-06-30', amount: 550.5 } })
    expect(summarizePlan(1000, rows, new Set([1, 2]))?.next).toBeNull()
  })
  it('null se le rate sommano meno dell\'importo', () => {
    expect(summarizePlan(5000, rows, new Set())).toBeNull()
  })
})
