import type { TaxParametersValues } from '../api/tax.service.ts'

/** Bozza del modulo dei parametri fiscali: tutto testo, come lo scrive l'utente. */
export interface TaxParametersDraft {
  profitabilityCoefficient: string
  inpsRate: string
  substituteTaxRate: string
  isStartup: boolean
  hasOtherPensionCoverage: boolean
  activityStartYear: string
}

export type TaxParametersErrors = Partial<Record<'profitabilityCoefficient' | 'inpsRate' | 'substituteTaxRate' | 'activityStartYear', string>>

export const emptyTaxParametersDraft: TaxParametersDraft = {
  profitabilityCoefficient: '',
  inpsRate: '',
  substituteTaxRate: '',
  isStartup: false,
  hasOtherPensionCoverage: false,
  activityStartYear: '',
}

const MIN_START_YEAR = 2000

/** Legge una percentuale ("26,07" o "26.07"): `null` se non è un numero con al massimo 2 decimali. */
export function parsePercent(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Number(normalized)
}

/** Valida la bozza per l'anno indicato; restituisce i valori da salvare oppure i messaggi d'errore per campo. */
export function validateTaxParameters(
  draft: TaxParametersDraft,
  year: number,
): { values: TaxParametersValues } | { errors: TaxParametersErrors } {
  const errors: TaxParametersErrors = {}
  const percents = {
    profitabilityCoefficient: 'Il coefficiente',
    inpsRate: 'L\'aliquota INPS',
    substituteTaxRate: 'L\'aliquota dell\'imposta sostitutiva',
  } as const
  const parsed: Record<keyof typeof percents, number> = { profitabilityCoefficient: 0, inpsRate: 0, substituteTaxRate: 0 }
  for (const field of Object.keys(percents) as (keyof typeof percents)[]) {
    const value = parsePercent(draft[field])
    if (draft[field].trim() === '') errors[field] = `${percents[field]} è obbligatorio.`
    else if (value === null) errors[field] = `${percents[field]} deve essere un numero con al massimo 2 decimali.`
    else if (value > 100) errors[field] = `${percents[field]} deve essere tra 0 e 100.`
    else parsed[field] = value
  }
  const startText = draft.activityStartYear.trim()
  const startYear = Number(startText)
  if (startText === '') errors.activityStartYear = 'L\'anno di inizio attività è obbligatorio.'
  else if (!Number.isInteger(startYear) || startYear < MIN_START_YEAR) errors.activityStartYear = `L'anno di inizio attività deve essere un anno dal ${MIN_START_YEAR} in poi.`
  else if (startYear > year) errors.activityStartYear = `L'anno di inizio attività non può essere dopo il ${year}.`

  if (Object.keys(errors).length > 0) return { errors }
  return {
    values: {
      profitability_coefficient: parsed.profitabilityCoefficient,
      inps_rate: parsed.inpsRate,
      substitute_tax_rate: parsed.substituteTaxRate,
      is_startup: draft.isStartup,
      has_other_pension_coverage: draft.hasOtherPensionCoverage,
      activity_start_year: startYear,
    },
  }
}

/** Bozza dai valori salvati (percentuali con la virgola decimale). */
export function draftFromTaxParameters(row: {
  profitability_coefficient: number
  inps_rate: number
  substitute_tax_rate: number
  is_startup: boolean
  has_other_pension_coverage: boolean
  activity_start_year: number
}): TaxParametersDraft {
  const percent = (n: number) => String(n).replace('.', ',')
  return {
    profitabilityCoefficient: percent(row.profitability_coefficient),
    inpsRate: percent(row.inps_rate),
    substituteTaxRate: percent(row.substitute_tax_rate),
    isStartup: row.is_startup,
    hasOtherPensionCoverage: row.has_other_pension_coverage,
    activityStartYear: String(row.activity_start_year),
  }
}
