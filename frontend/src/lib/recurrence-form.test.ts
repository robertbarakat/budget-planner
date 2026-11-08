import { describe, expect, it } from 'vitest'
import { emptyRecurrenceForm, validateRecurrenceForm, type RecurrenceFormState } from './recurrence-form.ts'

const valid: RecurrenceFormState = {
  name: ' TEST-Mutuo ',
  budgetItemId: '3',
  accountId: '1',
  amountText: '650,50',
  frequency: 'monthly',
  startDate: '2026-01-05',
  endDate: '',
}

describe('validateRecurrenceForm', () => {
  it('accetta un form valido e normalizza i valori', () => {
    expect(validateRecurrenceForm(valid)).toEqual({
      ok: true,
      values: {
        name: 'TEST-Mutuo', budget_item_id: 3, account_id: 1, base_amount: 650.5,
        frequency: 'monthly', start_date: '2026-01-05', end_date: null,
      },
    })
  })

  it('segnala i campi obbligatori mancanti', () => {
    const result = validateRecurrenceForm(emptyRecurrenceForm('2026-01-05'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['account', 'amount', 'budgetItem', 'name'])
  })

  it.each(['0', '-5', 'abc', ''])('rifiuta l\'importo "%s"', (amountText) => {
    const result = validateRecurrenceForm({ ...valid, amountText })
    expect(result.ok === false && result.errors.amount).toBeTruthy()
  })

  it('rifiuta una fine precedente all\'inizio e accetta fine uguale', () => {
    const before = validateRecurrenceForm({ ...valid, endDate: '2026-01-04' })
    expect(before.ok === false && before.errors.endDate).toBeTruthy()
    expect(validateRecurrenceForm({ ...valid, endDate: '2026-01-05' }).ok).toBe(true)
  })

  it('rifiuta date non valide', () => {
    const result = validateRecurrenceForm({ ...valid, startDate: '2026-02-30', endDate: 'x' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['endDate', 'startDate'])
  })
})
