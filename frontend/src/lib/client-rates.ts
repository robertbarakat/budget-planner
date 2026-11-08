import { parseAmount } from './parse-amount.ts'

export type Validated<T> = { ok: true; value: T } | { ok: false; message: string }

/** Ritardo d'incasso in mesi: intero, zero o più. */
export function validateDelay(text: string): Validated<number> {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: false, message: 'Inserisci il ritardo in mesi (0 se incassi nello stesso mese).' }
  if (!/^-?\d+$/.test(trimmed)) return { ok: false, message: 'Il ritardo è un numero intero di mesi.' }
  const value = Number(trimmed)
  if (value < 0) return { ok: false, message: 'Il ritardo non può essere negativo.' }
  if (value > 120) return { ok: false, message: 'Il ritardo massimo è 120 mesi.' }
  return { ok: true, value }
}

export interface RateFormInput {
  dailyRateText: string
  year: number
  month: number
}

export interface RateFormErrors {
  dailyRate?: string
  validFrom?: string
}

export interface RateForValidation {
  id: number
  validFromYear: number
  validFromMonth: number
}

/**
 * Controlla una tariffa del cliente: importo maggiore di zero e nessun'altra tariffa che inizi nello stesso mese.
 * `editingId` esclude la tariffa che si sta modificando dal controllo dei doppioni.
 */
export function validateRate(
  input: RateFormInput,
  existing: readonly RateForValidation[],
  editingId?: number,
): { ok: true; dailyRate: number } | { ok: false; errors: RateFormErrors } {
  const errors: RateFormErrors = {}
  const dailyRate = parseAmount(input.dailyRateText)
  if (input.dailyRateText.trim() === '') errors.dailyRate = 'Inserisci la tariffa giornaliera.'
  else if (dailyRate === null) errors.dailyRate = 'Importo non valido: scrivi un numero, per esempio 250,00.'
  else if (dailyRate <= 0) errors.dailyRate = 'La tariffa deve essere maggiore di zero.'

  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
    errors.validFrom = 'Scegli un anno tra 2000 e 2100.'
  } else if (existing.some((rate) => rate.id !== editingId && rate.validFromYear === input.year && rate.validFromMonth === input.month)) {
    errors.validFrom = 'Esiste già una tariffa che inizia in questo mese.'
  }

  if (errors.dailyRate || errors.validFrom || dailyRate === null) return { ok: false, errors }
  return { ok: true, dailyRate }
}
