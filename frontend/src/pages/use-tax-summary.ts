import { useMemo } from 'react'
import { useBudgetItems, useCategories, useMacroAreas } from '../api/classification.queries.ts'
import { useF24Deadlines, useTaxParameters } from '../api/tax.queries.ts'
import { useYearTransactions } from '../api/transactions.queries.ts'
import { buildTaxSummary, confirmedAdvanceAmounts, previousAdvancesAndInps, selectProfessionalIncomes, type TaxSummary, type TaxSummaryParameters } from '../lib/tax-summary.ts'

export interface TaxSummaryState {
  isError: boolean
  isPending: boolean
  /** Parametri dell'anno (null se mancano o sono incompleti). */
  parameters: TaxSummaryParameters | null
  /** Riepilogo dell'anno; null se mancano i parametri o i dati non sono ancora arrivati. */
  summary: TaxSummary | null
}

/** Riepilogo fiscale di un anno dai dati dell'app: usato dalla pagina Fiscale e dal calendario F24. */
export function useTaxSummary(year: number): TaxSummaryState {
  const parameters = useTaxParameters(year)
  const transactions = useYearTransactions(year)
  const previousYear = useYearTransactions(year - 1)
  const deadlines = useF24Deadlines()
  const categories = useCategories()
  const budgetItems = useBudgetItems()
  const macroAreas = useMacroAreas()
  const queries = [parameters, transactions, previousYear, deadlines, categories, budgetItems, macroAreas]

  const state = useMemo(() => {
    const p = parameters.data
    if (!p || !p.first_advance_due_date || !p.second_advance_due_date) return { parameters: null, summary: null }
    if (!transactions.data || !deadlines.data || !categories.data || !budgetItems.data || !macroAreas.data || !previousYear.data) return { parameters: null, summary: null }
    const summaryParameters: TaxSummaryParameters = {
      profitabilityCoefficient: p.profitability_coefficient,
      inpsRate: p.inps_rate,
      substituteTaxRate: p.substitute_tax_rate,
      activityStartYear: p.activity_start_year,
      firstAdvanceDueDate: p.first_advance_due_date,
      secondAdvanceDueDate: p.second_advance_due_date,
      firstAdvanceMethod: p.first_advance_method,
      secondAdvanceMethod: p.second_advance_method,
    }
    const incomes = selectProfessionalIncomes(transactions.data, categories.data, budgetItems.data, macroAreas.data)
    const { previousAdvances, inpsPayments } = previousAdvancesAndInps(deadlines.data, [...transactions.data, ...previousYear.data], year)
    const confirmed = confirmedAdvanceAmounts(deadlines.data, year)
    const summary = buildTaxSummary({ year, parameters: summaryParameters, incomes, inpsPayments, previousAdvances, confirmedAdvances: confirmed })
    return { parameters: summaryParameters, summary }
  }, [year, parameters.data, transactions.data, previousYear.data, deadlines.data, categories.data, budgetItems.data, macroAreas.data])

  return { isError: queries.some((q) => q.isError), isPending: queries.some((q) => q.isPending), ...state }
}
