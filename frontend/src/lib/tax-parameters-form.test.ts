import { describe, expect, it } from 'vitest'
import { draftFromTaxParameters, emptyTaxParametersDraft, parsePercent, validateTaxParameters } from './tax-parameters-form.ts'

const draft = { ...emptyTaxParametersDraft, profitabilityCoefficient: '10,5', inpsRate: '20', substituteTaxRate: '5', activityStartYear: '2020' }

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
      values: { profitability_coefficient: 10.5, inps_rate: 20, substitute_tax_rate: 5, is_startup: false, has_other_pension_coverage: false, activity_start_year: 2020 },
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
    expect('errors' in result && Object.keys(result.errors).sort()).toEqual(['activityStartYear', 'inpsRate', 'profitabilityCoefficient', 'substituteTaxRate'])
  })
})

describe('draftFromTaxParameters', () => {
  it('mostra le percentuali con la virgola', () => {
    const result = draftFromTaxParameters({ profitability_coefficient: 67, inps_rate: 26.07, substitute_tax_rate: 15, is_startup: true, has_other_pension_coverage: false, activity_start_year: 2025 })
    expect(result).toMatchObject({ profitabilityCoefficient: '67', inpsRate: '26,07', isStartup: true, activityStartYear: '2025' })
  })
})
