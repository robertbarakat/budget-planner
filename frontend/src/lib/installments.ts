import { eurosToCents, summarizeInstallmentPlan, type F24TaxType } from 'budget-planner-shared'
import { parseAmount } from './parse-amount.ts'

export interface InstallmentRowDraft {
  dueDate: string
  amountText: string
}

export interface InstallmentPlanDraft {
  description: string
  totalText: string
  taxType: F24TaxType
  referenceYearText: string
  rows: InstallmentRowDraft[]
}

export interface InstallmentPlanValues {
  description: string
  totalAmount: number
  taxType: F24TaxType
  referenceYear: number
  /** Rate in ordine di scadenza inserita; il numero è la posizione (1, 2, …). */
  installments: { number: number; dueDate: string; amount: number }[]
}

export type InstallmentPlanErrors = Partial<Record<'description' | 'total' | 'referenceYear' | 'rows', string>>

export const emptyInstallmentPlanDraft: InstallmentPlanDraft = {
  description: '',
  totalText: '',
  taxType: 'substitute_tax',
  referenceYearText: '',
  rows: [{ dueDate: '', amountText: '' }],
}

/** Valida la bozza: messaggi in italiano; le rate devono coprire almeno l'importo rateizzato (la differenza sono gli interessi). */
export function validateInstallmentPlan(draft: InstallmentPlanDraft): { values: InstallmentPlanValues } | { errors: InstallmentPlanErrors } {
  const errors: InstallmentPlanErrors = {}
  if (draft.description.trim() === '') errors.description = 'La descrizione è obbligatoria.'
  const total = parseAmount(draft.totalText)
  if (total === null || total <= 0) errors.total = 'L\'importo rateizzato deve essere maggiore di zero.'
  const year = Number(draft.referenceYearText)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) errors.referenceYear = 'L\'anno deve essere tra 2000 e 2100.'

  const installments: InstallmentPlanValues['installments'] = []
  if (draft.rows.length === 0) errors.rows = 'Inserisci almeno una rata.'
  draft.rows.forEach((row, index) => {
    if (errors.rows) return
    const amount = parseAmount(row.amountText)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.dueDate)) errors.rows = `Rata ${index + 1}: la scadenza è obbligatoria.`
    else if (amount === null || amount <= 0) errors.rows = `Rata ${index + 1}: l'importo deve essere maggiore di zero.`
    else installments.push({ number: index + 1, dueDate: row.dueDate, amount })
  })
  if (!errors.rows && total !== null && total > 0) {
    const sum = installments.reduce((s, i) => s + eurosToCents(i.amount), 0)
    if (sum < eurosToCents(total)) errors.rows = 'Le rate devono sommare almeno l\'importo rateizzato (la differenza sono gli interessi).'
  }
  if (Object.keys(errors).length > 0 || total === null) return { errors }
  return { values: { description: draft.description.trim(), totalAmount: total, taxType: draft.taxType, referenceYear: year, installments } }
}

export interface PlanSummary {
  /** Interessi = somma delle rate − importo rateizzato (euro). */
  interest: number
  /** Ancora da pagare: somma delle rate non versate (euro). */
  remaining: number
  next: { number: number; dueDate: string; amount: number } | null
}

/** Interessi, residuo e rata successiva di una rateizzazione, dal calcolo di `shared/` (null se i dati non tornano). */
export function summarizePlan(
  totalAmount: number,
  installments: readonly { id: number; number: number; due_date: string; amount: number }[],
  paidInstallmentIds: ReadonlySet<number>,
): PlanSummary | null {
  try {
    const summary = summarizeInstallmentPlan({
      plannedAmountCents: eurosToCents(Number(totalAmount)),
      installments: installments.map((i) => ({ number: i.number, dueDate: i.due_date, amountCents: eurosToCents(Number(i.amount)), paid: paidInstallmentIds.has(i.id) })),
    })
    return {
      interest: summary.totalInterestCents / 100,
      remaining: summary.remainingCents / 100,
      next: summary.nextInstallment
        ? { number: summary.nextInstallment.number, dueDate: summary.nextInstallment.dueDate, amount: summary.nextInstallment.amountCents / 100 }
        : null,
    }
  } catch {
    return null
  }
}
