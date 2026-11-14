import { useMemo } from 'react'
import { useBudgetItems, useCategories, useMacroAreas } from '../api/classification.queries.ts'
import { useAllInstallments, useF24Deadlines, useInstallmentPlans, useTaxParameters } from '../api/tax.queries.ts'
import { useYearData } from '../api/year-data.queries.ts'
import {
  buildTaxSummary,
  confirmedAdvanceAmounts,
  estimateCollections,
  priorBalances,
  selectProfessionalIncomes,
  type TaxSummary,
  type TaxSummaryParameters,
} from '../lib/tax-summary.ts'
import type { RowOf } from '../api/base-service.ts'

export interface TaxSummaryState {
  isError: boolean
  isPending: boolean
  /** Parametri dell'anno (null se mancano o sono incompleti). */
  parameters: TaxSummaryParameters | null
  /** Riepilogo dell'anno; null se mancano i parametri o i dati non sono ancora arrivati. */
  summary: TaxSummary | null
}

function toSummaryParameters(p: RowOf<'tax_parameters'> | null | undefined): TaxSummaryParameters | null {
  if (!p || !p.first_advance_due_date || !p.second_advance_due_date) return null
  return {
    profitabilityCoefficient: p.profitability_coefficient,
    inpsRate: p.inps_rate,
    substituteTaxRate: p.substitute_tax_rate,
    activityStartYear: p.activity_start_year,
    firstAdvanceDueDate: p.first_advance_due_date,
    secondAdvanceDueDate: p.second_advance_due_date,
    firstAdvanceMethod: p.first_advance_method,
    secondAdvanceMethod: p.second_advance_method,
    firstAdvancePercent: p.first_advance_percent,
    secondAdvancePercent: p.second_advance_percent,
  }
}

/** Riepilogo fiscale di un anno dai dati dell'app: usato dalla pagina Fiscale e dal calendario F24. */
export function useTaxSummary(year: number): TaxSummaryState {
  const parameters = useTaxParameters(year)
  const previousParameters = useTaxParameters(year - 1)
  const data = useYearData(year)
  const previousData = useYearData(year - 1)
  const deadlines = useF24Deadlines()
  const installments = useAllInstallments()
  const plans = useInstallmentPlans()
  const categories = useCategories()
  const budgetItems = useBudgetItems()
  const macroAreas = useMacroAreas()
  const queries = [parameters, previousParameters, deadlines, installments, plans, categories, budgetItems, macroAreas]

  const state = useMemo(() => {
    const none = { parameters: null, summary: null }
    const current = toSummaryParameters(parameters.data)
    if (!current) return none
    if (!data.isReady || !previousData.isReady || !deadlines.data || !installments.data || !plans.data || !categories.data || !budgetItems.data || !macroAreas.data) return none

    const activePlans = new Set(plans.data.filter((p) => !p.archived).map((p) => p.id))
    const rates = installments.data.filter((i) => activePlans.has(i.plan_id)).map((i) => ({ ...i, principal: Number(i.principal) }))
    const professionalIncomeItems = new Set(
      budgetItems.data.filter((i) => i.kind === 'income' && macroAreas.data.some((m) => m.id === i.macro_area_id && m.is_professional)).map((i) => i.id),
    )
    const currentYear = new Date().getFullYear()

    const build = (y: number, p: TaxSummaryParameters, yearData: typeof data, previous: { substituteTax: number; inpsDue: number } | null) => {
      const incomes = selectProfessionalIncomes(yearData.transactions ?? [], categories.data, budgetItems.data, macroAreas.data)
      const forecast = (yearData.entries ?? []).filter((e) => e.year === y && professionalIncomeItems.has(e.budget_item_id)).map((e) => ({ month: e.month, amount: Number(e.amount) }))
      const closed = (yearData.closedMonths ?? []).filter((c) => c.year === y).map((c) => c.month)
      return buildTaxSummary({
        year: y,
        parameters: p,
        incomes,
        estimatedCollections: estimateCollections(y, currentYear, incomes, forecast, closed),
        priorBalances: priorBalances(deadlines.data, rates, y),
        previous,
        confirmedAdvances: confirmedAdvanceAmounts(deadlines.data, rates, { first: p.firstAdvanceDueDate, second: p.secondAdvanceDueDate }, y),
      })
    }

    const previousParams = toSummaryParameters(previousParameters.data)
    const previousSummary = previousParams ? build(year - 1, previousParams, previousData, null) : null
    const summary = build(year, current, data, previousSummary ? { substituteTax: previousSummary.substituteTax, inpsDue: previousSummary.inpsDue } : null)
    return { parameters: current, summary }
  }, [year, parameters.data, previousParameters.data, data, previousData, deadlines.data, installments.data, plans.data, categories.data, budgetItems.data, macroAreas.data])

  return { isError: queries.some((q) => q.isError) || data.isError || previousData.isError, isPending: queries.some((q) => q.isPending) || data.isLoading || previousData.isLoading, ...state }
}
