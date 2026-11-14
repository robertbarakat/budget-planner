import type { Figures, MacroAreaReport } from './macro-areas.ts'

/**
 * Spese del mese: previsto, reale e scostamento delle sole voci di tipo spesa (importi negativi),
 * sommate dal rapporto per macro-area dello stesso mese: la Home mostra così gli stessi numeri di quella vista.
 */
export function summarizeMonthExpenses(report: MacroAreaReport): Figures {
  return summarizeMonthKind(report, 'expense')
}

/** Entrate del mese: come le spese, ma per le voci di tipo entrata (importi positivi). */
export function summarizeMonthIncome(report: MacroAreaReport): Figures {
  return summarizeMonthKind(report, 'income')
}

function summarizeMonthKind(report: MacroAreaReport, kind: 'expense' | 'income'): Figures {
  let budgeted = 0
  let actual = 0
  for (const group of report.groups) {
    for (const item of group.items) {
      if (item.kind !== kind) continue
      budgeted += Math.round(item.budgeted * 100)
      actual += Math.round(item.actual * 100)
    }
  }
  return { budgeted: budgeted / 100, actual: actual / 100, variance: (actual - budgeted) / 100 }
}
