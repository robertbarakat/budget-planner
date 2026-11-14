import type { TaxParametersValues } from '../api/tax.service.ts'

/** Bozza del modulo dei parametri fiscali: tutto testo, come lo scrive l'utente. */
export interface TaxParametersDraft {
  profitabilityCoefficient: string
  inpsRate: string
  substituteTaxRate: string
  isStartup: boolean
  hasOtherPensionCoverage: boolean
  activityStartYear: string
  firstAdvanceDueDate: string
  secondAdvanceDueDate: string
  firstAdvanceMethod: AdvanceMethod
  secondAdvanceMethod: AdvanceMethod
  firstAdvancePercent: string
  secondAdvancePercent: string
}

export type AdvanceMethod = 'historic' | 'forecast'

export type TaxParametersErrors = Partial<
  Record<'profitabilityCoefficient' | 'inpsRate' | 'substituteTaxRate' | 'activityStartYear' | 'firstAdvanceDueDate' | 'secondAdvanceDueDate' | 'firstAdvancePercent' | 'secondAdvancePercent', string>
>

export const emptyTaxParametersDraft: TaxParametersDraft = {
  profitabilityCoefficient: '',
  inpsRate: '',
  substituteTaxRate: '',
  isStartup: false,
  hasOtherPensionCoverage: false,
  activityStartYear: '',
  firstAdvanceDueDate: '',
  secondAdvanceDueDate: '',
  firstAdvanceMethod: 'historic',
  secondAdvanceMethod: 'forecast',
  firstAdvancePercent: '50',
  secondAdvancePercent: '50',
}

/** Scadenze di partenza della prima volta (30 giugno e 30 novembre): poi si ripropone l'ultimo anno salvato. */
const DEFAULT_FIRST_ADVANCE = '06-30'
const DEFAULT_SECOND_ADVANCE = '11-30'

/**
 * Date degli acconti da proporre per un anno: quelle dell'ultimo anno salvato (stesso giorno e mese),
 * altrimenti 30 giugno e 30 novembre.
 */
export function defaultAdvanceDates(
  year: number,
  saved: readonly { year: number; first_advance_due_date: string | null; second_advance_due_date: string | null }[],
): { firstAdvanceDueDate: string; secondAdvanceDueDate: string } {
  const latest = [...saved].filter((r) => r.first_advance_due_date && r.second_advance_due_date).sort((a, b) => b.year - a.year)[0]
  const monthDay = (date: string | null | undefined, fallback: string) => (date ? date.slice(5) : fallback)
  return {
    firstAdvanceDueDate: `${year}-${monthDay(latest?.first_advance_due_date, DEFAULT_FIRST_ADVANCE)}`,
    secondAdvanceDueDate: `${year}-${monthDay(latest?.second_advance_due_date, DEFAULT_SECOND_ADVANCE)}`,
  }
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
  const advancePercents = { firstAdvancePercent: 'La percentuale del primo acconto', secondAdvancePercent: 'La percentuale del secondo acconto' } as const
  const parsedAdvance = { firstAdvancePercent: 0, secondAdvancePercent: 0 }
  for (const field of Object.keys(advancePercents) as (keyof typeof advancePercents)[]) {
    const value = parsePercent(draft[field])
    if (value === null || value > 100) errors[field] = `${advancePercents[field]} deve essere un numero tra 0 e 100 con al massimo 2 decimali.`
    else parsedAdvance[field] = value
  }
  const startText = draft.activityStartYear.trim()
  const startYear = Number(startText)
  if (startText === '') errors.activityStartYear = 'L\'anno di inizio attività è obbligatorio.'
  else if (!Number.isInteger(startYear) || startYear < MIN_START_YEAR) errors.activityStartYear = `L'anno di inizio attività deve essere un anno dal ${MIN_START_YEAR} in poi.`
  else if (startYear > year) errors.activityStartYear = `L'anno di inizio attività non può essere dopo il ${year}.`

  const first = draft.firstAdvanceDueDate
  const second = draft.secondAdvanceDueDate
  if (!/^\d{4}-\d{2}-\d{2}$/.test(first)) errors.firstAdvanceDueDate = 'La data del primo acconto è obbligatoria.'
  else if (Number(first.slice(0, 4)) !== year) errors.firstAdvanceDueDate = `La data del primo acconto deve cadere nel ${year}.`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(second)) errors.secondAdvanceDueDate = 'La data del secondo acconto è obbligatoria.'
  else if (Number(second.slice(0, 4)) !== year) errors.secondAdvanceDueDate = `La data del secondo acconto deve cadere nel ${year}.`
  else if (!errors.firstAdvanceDueDate && second <= first) errors.secondAdvanceDueDate = 'Il secondo acconto deve essere dopo il primo.'

  if (Object.keys(errors).length > 0) return { errors }
  return {
    values: {
      profitability_coefficient: parsed.profitabilityCoefficient,
      inps_rate: parsed.inpsRate,
      substitute_tax_rate: parsed.substituteTaxRate,
      is_startup: draft.isStartup,
      has_other_pension_coverage: draft.hasOtherPensionCoverage,
      activity_start_year: startYear,
      first_advance_due_date: first,
      second_advance_due_date: second,
      first_advance_method: draft.firstAdvanceMethod,
      second_advance_method: draft.secondAdvanceMethod,
      first_advance_percent: parsedAdvance.firstAdvancePercent,
      second_advance_percent: parsedAdvance.secondAdvancePercent,
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
  first_advance_due_date: string | null
  second_advance_due_date: string | null
  first_advance_method: AdvanceMethod
  second_advance_method: AdvanceMethod
  first_advance_percent: number
  second_advance_percent: number
}): TaxParametersDraft {
  const percent = (n: number) => String(n).replace('.', ',')
  return {
    profitabilityCoefficient: percent(row.profitability_coefficient),
    inpsRate: percent(row.inps_rate),
    substituteTaxRate: percent(row.substitute_tax_rate),
    isStartup: row.is_startup,
    hasOtherPensionCoverage: row.has_other_pension_coverage,
    activityStartYear: String(row.activity_start_year),
    firstAdvanceDueDate: row.first_advance_due_date ?? '',
    secondAdvanceDueDate: row.second_advance_due_date ?? '',
    firstAdvanceMethod: row.first_advance_method,
    secondAdvanceMethod: row.second_advance_method,
    firstAdvancePercent: percent(row.first_advance_percent),
    secondAdvancePercent: percent(row.second_advance_percent),
  }
}
