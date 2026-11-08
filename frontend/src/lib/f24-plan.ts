import { buildF24Calendar, eurosToCents, type F24Deadline, type F24TaxSource, type F24TaxType } from 'budget-planner-shared'
import type { TaxSummary } from './tax-summary.ts'

export const taxTypeLabels: Record<F24TaxType, string> = {
  substitute_tax: 'Imposta sostitutiva',
  substitute_tax_advance: 'Imposta sostitutiva, acconto',
  substitute_tax_balance: 'Imposta sostitutiva, saldo',
  inps: 'INPS',
  inps_advance: 'INPS, acconto',
  inps_balance: 'INPS, saldo',
}

export type DeadlineStatus = 'due' | 'paid' | 'overdue'

export const statusLabels: Record<DeadlineStatus, string> = { due: 'Da versare', paid: 'Versata', overdue: 'Scaduta' }

/** "Versata" solo se è collegato un movimento; altrimenti "scaduta" se la data è passata. */
export function deadlineStatus(deadline: { due_date: string; transaction_id: number | null }, today: string): DeadlineStatus {
  if (deadline.transaction_id !== null) return 'paid'
  return deadline.due_date < today ? 'overdue' : 'due'
}

/**
 * Scadenze F24 dell'anno dal calcolo: acconti dell'anno (riepilogo dell'anno) e saldo dell'anno prima
 * (riepilogo precedente), pagato alla data del primo acconto. Il saldo dell'anno corrente cade nell'anno dopo.
 */
export function planDeadlines(
  year: number,
  current: { summary: TaxSummary; firstAdvanceDueDate: string },
  previous: { summary: TaxSummary } | null,
): { deadlines: F24Deadline[]; totalCents: number } {
  const cents = (value: number | null) => eurosToCents(value ?? 0)
  const monthDay = current.firstAdvanceDueDate.slice(4)
  const source = (referenceYear: number, tax: 'substitute_tax' | 'inps', summary: TaxSummary, balanceDate: string, withAdvances: boolean): F24TaxSource => ({
    referenceYear,
    tax,
    result: {
      advances: withAdvances
        ? summary.advances.map((a) => ({ amountCents: cents((tax === 'inps' ? a.inps : a.substituteTax).amount), dueDate: a.dueDate }))
        : [],
      balance: { amountCents: cents(tax === 'inps' ? summary.inpsBalance : summary.substituteTaxBalance), dueDate: balanceDate },
    },
  })
  const sources: F24TaxSource[] = (['substitute_tax', 'inps'] as const).flatMap((tax) => [
    // Anno corrente: acconti nell'anno, saldo nell'anno dopo (fuori da questo calendario).
    source(year, tax, current.summary, `${year + 1}${monthDay}`, true),
    // Anno prima: gli acconti sono già passati, resta il saldo alla data del primo acconto.
    ...(previous ? [source(year - 1, tax, previous.summary, current.firstAdvanceDueDate, false)] : []),
  ])
  return buildF24Calendar({ year, sources, installments: [] })
}
