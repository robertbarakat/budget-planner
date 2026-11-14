import {
  buildInstallmentSchedule,
  eurosToCents,
  summarizeInstallmentPlan,
  type F24TaxType,
  type InstallmentScheduleRow,
} from 'budget-planner-shared'
import { isValidIsoDate } from './dates.ts'
import { parseAmount } from './parse-amount.ts'

export interface InstallmentLineDraft {
  taxType: F24TaxType
  referenceYearText: string
  quotaText: string
  /** Vuoto = la riga si paga fino all'ultima rata. */
  lastNumberText: string
}

export interface InstallmentPlanDraft {
  description: string
  lines: InstallmentLineDraft[]
  countText: string
  firstDueDate: string
  /** Date scelte a mano per singole rate (numero della rata → `YYYY-MM-DD`); le altre sono mensili dalla prima. */
  dateOverrides?: Record<number, string>
}

export interface InstallmentPlanValues {
  description: string
  lines: { taxType: F24TaxType; referenceYear: number; quota: number; lastNumber: number | null }[]
  count: number
  firstDueDate: string
  /** Rate calcolate: una riga per rata e per riga di capitale, importi in euro. */
  rows: { number: number; dueDate: string; taxType: F24TaxType; referenceYear: number; principal: number; interest: number }[]
}

export type InstallmentPlanErrors = Partial<Record<'description' | 'lines' | 'count' | 'firstDueDate', string>>

export const emptyLineDraft: InstallmentLineDraft = { taxType: 'substitute_tax_balance', referenceYearText: '', quotaText: '', lastNumberText: '' }

export const emptyInstallmentPlanDraft: InstallmentPlanDraft = {
  description: '',
  lines: [emptyLineDraft],
  countText: '',
  firstDueDate: '',
}

/** Valida la bozza e calcola le rate con gli interessi (messaggi in italiano). */
export function validateInstallmentPlan(draft: InstallmentPlanDraft): { values: InstallmentPlanValues } | { errors: InstallmentPlanErrors } {
  const errors: InstallmentPlanErrors = {}
  if (draft.description.trim() === '') errors.description = 'La descrizione è obbligatoria.'
  const count = Number(draft.countText)
  if (!Number.isInteger(count) || count < 1 || count > 120) errors.count = 'Il numero di rate deve essere tra 1 e 120.'
  if (!isValidIsoDate(draft.firstDueDate)) errors.firstDueDate = 'La data della prima rata è obbligatoria.'

  const lines: InstallmentPlanValues['lines'] = []
  if (draft.lines.length === 0) errors.lines = 'Inserisci almeno una riga da rateizzare.'
  draft.lines.forEach((line, index) => {
    if (errors.lines) return
    const year = Number(line.referenceYearText)
    const quota = parseAmount(line.quotaText)
    const last = line.lastNumberText.trim() === '' ? null : Number(line.lastNumberText)
    if (!Number.isInteger(year) || year < 2000 || year > 2100) errors.lines = `Riga ${index + 1}: l'anno deve essere tra 2000 e 2100.`
    else if (quota === null || quota <= 0) errors.lines = `Riga ${index + 1}: la quota per rata deve essere maggiore di zero.`
    else if (last !== null && (!Number.isInteger(last) || last < 1 || last > count)) errors.lines = `Riga ${index + 1}: l'ultima rata deve essere tra 1 e ${count || 'il numero di rate'}.`
    else lines.push({ taxType: line.taxType, referenceYear: year, quota, lastNumber: last })
  })
  if (Object.keys(errors).length > 0) return { errors }

  const schedule: InstallmentScheduleRow[] = buildInstallmentSchedule({
    lines: lines.map((l) => ({ taxType: l.taxType, referenceYear: l.referenceYear, quotaCents: eurosToCents(l.quota), lastNumber: l.lastNumber })),
    count,
    firstDueDate: draft.firstDueDate,
  })
  return {
    values: {
      description: draft.description.trim(),
      lines,
      count,
      firstDueDate: draft.firstDueDate,
      rows: schedule.map((r) => ({
        number: r.number,
        dueDate: draft.dateOverrides?.[r.number] && isValidIsoDate(draft.dateOverrides[r.number]!) ? draft.dateOverrides[r.number]! : r.dueDate,
        taxType: r.taxType,
        referenceYear: r.referenceYear,
        principal: r.principalCents / 100,
        interest: r.interestCents / 100,
      })),
    },
  }
}

export interface PlanSummary {
  /** Interessi totali del piano (euro). */
  interest: number
  /** Ancora da pagare: rate non versate, capitale e interessi (euro). */
  remaining: number
  next: { number: number; dueDate: string; amount: number } | null
}

/** Interessi, residuo e rata successiva. Le righe della stessa rata si sommano; una rata è versata se lo sono tutte le sue righe. */
export function summarizePlan(
  installments: readonly { id: number; number: number; due_date: string; amount: number; principal: number }[],
  paidInstallmentIds: ReadonlySet<number>,
): PlanSummary | null {
  try {
    const byNumber = new Map<number, { dueDate: string; cents: number; principalCents: number; paid: boolean }>()
    for (const i of installments) {
      const cur = byNumber.get(i.number) ?? { dueDate: i.due_date, cents: 0, principalCents: 0, paid: true }
      cur.cents += eurosToCents(Number(i.amount))
      cur.principalCents += eurosToCents(Number(i.principal))
      cur.paid = cur.paid && paidInstallmentIds.has(i.id)
      byNumber.set(i.number, cur)
    }
    const planned = [...byNumber.values()].reduce((s, r) => s + r.principalCents, 0)
    const summary = summarizeInstallmentPlan({
      plannedAmountCents: planned,
      installments: [...byNumber.entries()].map(([number, r]) => ({ number, dueDate: r.dueDate, amountCents: r.cents, paid: r.paid })),
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
