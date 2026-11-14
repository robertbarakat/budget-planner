import { eurosToCents } from 'budget-planner-shared'
import type { BudgetEntryDraft } from '../api/month-range.ts'
import { planReplacement, type DriverApplyPlan, type YearMonth } from './driver-apply.ts'

/**
 * Cosa scrive "Applica al budget" per le imposte: una riga `tax` per voce e per mese di scadenza, con la somma delle parti
 * di quel mese (positiva: il segno di spesa viene dalla voce). Si sostituiscono le righe `tax` da gennaio a dicembre dell'anno,
 * sui soli mesi non chiusi: rifare l'operazione dà lo stesso risultato e non crea doppioni.
 */
export function planTaxApply(
  year: number,
  parts: readonly { due_date: string; budgetItemId: number; amount: number }[],
  existingTaxRows: readonly YearMonth[],
  closedMonths: readonly YearMonth[],
): DriverApplyPlan {
  const byKey = new Map<string, { budgetItemId: number; month: number; cents: number }>()
  for (const part of parts) {
    if (Number(part.due_date.slice(0, 4)) !== year) continue
    const month = Number(part.due_date.slice(5, 7))
    const key = `${part.budgetItemId}|${month}`
    const cur = byKey.get(key) ?? { budgetItemId: part.budgetItemId, month, cents: 0 }
    cur.cents += eurosToCents(Number(part.amount))
    byKey.set(key, cur)
  }
  const entries: BudgetEntryDraft[] = [...byKey.values()]
    .filter((v) => v.cents > 0)
    .sort((a, b) => a.month - b.month || a.budgetItemId - b.budgetItemId)
    .map((v) => ({ budgetItemId: v.budgetItemId, year, month: v.month, amount: v.cents / 100 }))
  return planReplacement({ year, month: 1 }, { year, month: 12 }, entries, existingTaxRows, closedMonths)
}
