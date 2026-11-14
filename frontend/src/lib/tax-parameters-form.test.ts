import { describe, expect, it } from 'vitest'
import { defaultAdvanceDates, draftFromTaxParameters, emptyTaxParametersDraft, parsePercent, validateTaxParameters } from './tax-parameters-form.ts'

const draft = { ...emptyTaxParametersDraft, profitabilityCoefficient: '10,5', inpsRate: '20', substituteTaxRate: '5', activityStartYear: '2020', firstAdvanceDueDate: '2026-06-30', secondAdvanceDueDate: '2026-11-30' }

describe('parsePercent', () => {
  it('accetta virgola e punto, rifiuta il resto', () => {
    expect(parsePercent('12,34')).toBe(12.34)
    expect(parsePercent('12.3')).toBe(12.3)
    expect(parsePercent('1,234')).toBeNull()
    expect(parsePercent('abc')).toBeNull()
    expect(parsePercent('-1')).toBeNull()
  })
})

describe('validateTaxParameters', () => {
  it('restituisce i valori da salvare', () => {
    expect(validateTaxParameters(draft, 2026)).toEqual({
      values: { profitability_coefficient: 10.5, inps_rate: 20, substitute_tax_rate: 5, is_startup: false, has_other_pension_coverage: false, activity_start_year: 2020,
      first_advance_due_date: '2026-06-30', second_advance_due_date: '2026-11-30', first_advance_method: 'historic', second_advance_method: 'forecast', first_advance_percent: 50, second_advance_percent: 50 },
    })
  })
  it('rifiuta percentuali fuori da 0–100', () => {
    const result = validateTaxParameters({ ...draft, inpsRate: '100,01', substituteTaxRate: '101' }, 2026)
    expect('errors' in result && Object.keys(result.errors)).toEqual(['inpsRate', 'substituteTaxRate'])
  })
  it('accetta i limiti 0 e 100', () => {
    expect('values' in validateTaxParameters({ ...draft, inpsRate: '0', substituteTaxRate: '100' }, 2026)).toBe(true)
  })
  it('chiede i campi vuoti e un anno di inizio non successivo all\'anno', () => {
    const result = validateTaxParameters({ ...emptyTaxParametersDraft, activityStartYear: '2030' }, 2026)
    expect('errors' in result && Object.keys(result.errors).sort()).toEqual(['activityStartYear', 'firstAdvanceDueDate', 'inpsRate', 'profitabilityCoefficient', 'secondAdvanceDueDate', 'substituteTaxRate'])
  })
})

describe('draftFromTaxParameters', () => {
  it('mostra le percentuali con la virgola', () => {
    const result = draftFromTaxParameters({ profitability_coefficient: 67, inps_rate: 26.07, substitute_tax_rate: 15, is_startup: true, has_other_pension_coverage: false, activity_start_year: 2025, first_advance_due_date: '2025-06-30', second_advance_due_date: null, first_advance_method: 'historic', second_advance_method: 'forecast', first_advance_percent: 50, second_advance_percent: 50 })
    expect(result).toMatchObject({ profitabilityCoefficient: '67', inpsRate: '26,07', isStartup: true, activityStartYear: '2025' })
  })
})

describe('date degli acconti', () => {
  it('propone 30/6 e 30/11 la prima volta e poi le date dell\'ultimo anno salvato', () => {
    expect(defaultAdvanceDates(2026, [])).toEqual({ firstAdvanceDueDate: '2026-06-30', secondAdvanceDueDate: '2026-11-30' })
    const saved = [{ year: 2026, first_advance_due_date: '2026-07-01', second_advance_due_date: '2026-12-01' }]
    expect(defaultAdvanceDates(2027, saved)).toEqual({ firstAdvanceDueDate: '2027-07-01', secondAdvanceDueDate: '2027-12-01' })
  })
  it('rifiuta secondo acconto non dopo il primo e date di un altro anno', () => {
    const wrong = validateTaxParameters({ ...draft, secondAdvanceDueDate: '2026-06-30' }, 2026)
    expect('errors' in wrong && wrong.errors.secondAdvanceDueDate).toMatch(/dopo il primo/)
    const other = validateTaxParameters({ ...draft, firstAdvanceDueDate: '2025-06-30' }, 2026)
    expect('errors' in other && other.errors.firstAdvanceDueDate).toMatch(/2026/)
  })
})
