import type { RecurrenceFrequency } from 'budget-planner-shared'
import { isValidIsoDate } from './dates.ts'
import { parseAmount } from './parse-amount.ts'

export const FREQUENCY_OPTIONS: readonly { value: RecurrenceFrequency; label: string }[] = [
  { value: 'monthly', label: 'Mensile' },
  { value: 'bimonthly', label: 'Bimestrale' },
  { value: 'quarterly', label: 'Trimestrale' },
  { value: 'semiannual', label: 'Semestrale' },
  { value: 'annual', label: 'Annuale' },
]

export function frequencyLabel(frequency: RecurrenceFrequency): string {
  return FREQUENCY_OPTIONS.find((option) => option.value === frequency)?.label ?? frequency
}

/** Valori grezzi del form ricorrenza, così come li scrive l'utente. */
export interface RecurrenceFormState {
  name: string
  budgetItemId: string
  accountId: string
  amountText: string
  frequency: RecurrenceFrequency
  startDate: string
  /** Facoltativa: vuota = nessuna fine (si generano le scadenze dei prossimi mesi). */
  endDate: string
}

export interface RecurrenceFormErrors {
  name?: string
  budgetItem?: string
  account?: string
  amount?: string
  startDate?: string
  endDate?: string
}

/** Valori validati, pronti per il servizio. */
export interface RecurrenceFormValues {
  name: string
  budget_item_id: number
  account_id: number
  base_amount: number
  frequency: RecurrenceFrequency
  start_date: string
  end_date: string | null
}

export function emptyRecurrenceForm(today: string): RecurrenceFormState {
  return { name: '', budgetItemId: '', accountId: '', amountText: '', frequency: 'monthly', startDate: today, endDate: '' }
}

export type RecurrenceFormResult =
  | { ok: true; values: RecurrenceFormValues }
  | { ok: false; errors: RecurrenceFormErrors }

/** Regole: nome, voce e conto obbligatori; importo > 0; inizio valido; fine (se c'è) valida e >= inizio. */
export function validateRecurrenceForm(state: RecurrenceFormState): RecurrenceFormResult {
  const errors: RecurrenceFormErrors = {}
  const name = state.name.trim()
  if (!name) errors.name = 'Scrivi un nome.'
  if (!state.budgetItemId) errors.budgetItem = 'Scegli una voce di budget.'
  if (!state.accountId) errors.account = 'Scegli un conto.'
  const amount = parseAmount(state.amountText)
  if (amount === null || amount <= 0) errors.amount = 'Inserisci un importo maggiore di zero.'
  const startValid = isValidIsoDate(state.startDate)
  if (!startValid) errors.startDate = 'Scegli una data di inizio valida.'
  if (state.endDate) {
    if (!isValidIsoDate(state.endDate)) errors.endDate = 'La data di fine non è valida.'
    else if (startValid && state.endDate < state.startDate) {
      errors.endDate = 'La fine non può precedere l\'inizio.'
    }
  }
  if (Object.keys(errors).length > 0 || amount === null) return { ok: false, errors }
  return {
    ok: true,
    values: {
      name,
      budget_item_id: Number(state.budgetItemId),
      account_id: Number(state.accountId),
      base_amount: amount,
      frequency: state.frequency,
      start_date: state.startDate,
      end_date: state.endDate || null,
    },
  }
}
