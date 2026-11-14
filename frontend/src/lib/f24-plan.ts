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
  /** Rate delle rateizzazioni non archiviate (importi in euro). */
  installments: readonly { id: number; referenceYear: number; taxType: F24TaxType; number: number; dueDate: string; amount: number }[] = [],
): { deadlines: (F24Deadline & { installmentId?: number })[]; totalCents: number } {
  const cents = (value: number | null) => eurosToCents(value ?? 0)
  // Ciò che è già nelle rate non si ripete come scadenza singola: saldo dell'anno prima e primo acconto.
  const covered = (taxType: F24TaxType, referenceYear: number) => installments.some((i) => i.taxType === taxType && i.referenceYear === referenceYear)
  const monthDay = current.firstAdvanceDueDate.slice(4)
  const source = (referenceYear: number, tax: 'substitute_tax' | 'inps', summary: TaxSummary, balanceDate: string, withAdvances: boolean): F24TaxSource => ({
    referenceYear,
    tax,
    result: {
      advances: withAdvances
        ? summary.advances
            .filter((_, index) => !(index === 0 && covered(`${tax}_advance`, referenceYear)))
            .map((a) => ({ amountCents: cents((tax === 'inps' ? a.inps : a.substituteTax).amount), dueDate: a.dueDate }))
        : [],
      balance: {
        amountCents: covered(`${tax}_balance`, referenceYear) ? 0 : cents(tax === 'inps' ? summary.inpsBalance : summary.substituteTaxBalance),
        dueDate: balanceDate,
      },
    },
  })
  const sources: F24TaxSource[] = (['substitute_tax', 'inps'] as const).flatMap((tax) => [
    // Anno corrente: acconti nell'anno, saldo nell'anno dopo (fuori da questo calendario).
    source(year, tax, current.summary, `${year + 1}${monthDay}`, true),
    // Anno prima: gli acconti sono già passati, resta il saldo alla data del primo acconto.
    ...(previous ? [source(year - 1, tax, previous.summary, current.firstAdvanceDueDate, false)] : []),
  ])
  const calendar = buildF24Calendar({
    year,
    sources,
    installments: installments.map((i) => ({ referenceYear: i.referenceYear, taxType: i.taxType, number: i.number, dueDate: i.dueDate, amountCents: cents(i.amount) })),
  })
  // Le rate tornano con il loro id (riferimento, tributo, numero e data le identificano).
  const idOf = new Map(installments.map((i) => [`${i.referenceYear}|${i.taxType}|${i.number}|${i.dueDate}`, i.id]))
  return {
    ...calendar,
    deadlines: calendar.deadlines.map((d) => {
      const installmentId = d.installmentNumber === undefined ? undefined : idOf.get(`${d.referenceYear}|${d.taxType}|${d.installmentNumber}|${d.dueDate}`)
      return installmentId === undefined ? d : { ...d, installmentId }
    }),
  }
}
