import { eurosToCents } from 'budget-planner-shared'
import type { BudgetEntryDraft } from '../api/month-range.ts'
import { planReplacement, type DriverApplyPlan, type YearMonth } from './driver-apply.ts'

/**
 * Cosa scrive "Applica al budget" per le imposte: una riga `tax` per mese di scadenza, sulla voce scelta, con la
 * somma delle scadenze di quel mese (positiva: il segno di spesa viene dalla voce). Si sostituiscono le righe `tax` da gennaio a
 * dicembre dell'anno, sui soli mesi non chiusi: rifare l'operazione dà lo stesso risultato e non crea doppioni.
 */
export function planTaxApply(
  year: number,
  deadlines: readonly { due_date: string; amount: number }[],
  budgetItemId: number,
  existingTaxRows: readonly YearMonth[],
  closedMonths: readonly YearMonth[],
): DriverApplyPlan {
  const byMonth = new Map<number, number>()
  for (const deadline of deadlines) {
    if (Number(deadline.due_date.slice(0, 4)) !== year) continue
    const month = Number(deadline.due_date.slice(5, 7))
    byMonth.set(month, (byMonth.get(month) ?? 0) + eurosToCents(Number(deadline.amount)))
  }
  const entries: BudgetEntryDraft[] = [...byMonth.entries()]
    .filter(([, cents]) => cents > 0)
    .sort(([a], [b]) => a - b)
    .map(([month, cents]) => ({ budgetItemId, year, month, amount: cents / 100 }))
  return planReplacement({ year, month: 1 }, { year, month: 12 }, entries, existingTaxRows, closedMonths)
}
