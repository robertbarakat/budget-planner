import type { MonthlyValue } from './monthly-values.ts'

/** Where a budget item sits in the classification (data, no names in code). Archived items stay in. */
export interface BudgetItemStructure {
  budgetItemId: number
  macroAreaId: number
}

export interface Totals {
  budgetedCents: number
  actualCents: number
  /** actual - budgeted. Amounts are signed (income > 0, expenses < 0): a negative variance is always unfavorable. */
  varianceCents: number
}

export type ItemMonthTotals = Totals & { budgetItemId: number; year: number; month: number }
export type ItemYearTotals = Totals & { budgetItemId: number; year: number }
export type MacroAreaMonthTotals = Totals & { macroAreaId: number; year: number; month: number }
export type MacroAreaYearTotals = Totals & { macroAreaId: number; year: number }
export type MonthTotals = Totals & { year: number; month: number }
export type YearTotals = Totals & { year: number }

export interface VarianceReport {
  byItemMonth: ItemMonthTotals[]
  byItem: ItemYearTotals[]
  byMacroAreaMonth: MacroAreaMonthTotals[]
  byMacroArea: MacroAreaYearTotals[]
  byMonth: MonthTotals[]
  byYear: YearTotals[]
}

interface Accumulator {
  budgetedCents: number
  actualCents: number
}

/**
 * Budgeted, real and variance (real - budgeted) per item, macro-area, month and year, from the
 * monthly values of `computeMonthlyValues` (docs/specifica.md, sections 4 and 5).
 *
 * - Totals are plain sums, so a macro-area is the sum of its items and a year the sum of its months.
 * - Items are never filtered by "archived": an item present in the values counts in the years it was used.
 * - Values of several years can be passed together; every total is split by year.
 * - Every output is sorted by its ids, year and month. Pure function, integer cents.
 */
export function aggregateMonthlyValues(
  structure: readonly BudgetItemStructure[],
  values: readonly MonthlyValue[],
): VarianceReport {
  const macroAreaOfItem = new Map<number, number>()
  for (const { budgetItemId, macroAreaId } of structure) {
    if (macroAreaOfItem.has(budgetItemId)) {
      throw new RangeError(`Duplicate budget item in the structure: ${budgetItemId}`)
    }
    macroAreaOfItem.set(budgetItemId, macroAreaId)
  }

  const byItemMonth = new Map<string, Accumulator & { budgetItemId: number; year: number; month: number }>()
  const byItem = new Map<string, Accumulator & { budgetItemId: number; year: number }>()
  const byMacroAreaMonth = new Map<string, Accumulator & { macroAreaId: number; year: number; month: number }>()
  const byMacroArea = new Map<string, Accumulator & { macroAreaId: number; year: number }>()
  const byMonth = new Map<string, Accumulator & { year: number; month: number }>()
  const byYear = new Map<string, Accumulator & { year: number }>()

  const accumulate = <T extends Accumulator>(
    map: Map<string, T>,
    key: string,
    create: () => T,
    value: MonthlyValue,
  ): void => {
    let entry = map.get(key)
    if (!entry) {
      entry = create()
      map.set(key, entry)
    }
    entry.budgetedCents += value.budgetedCents
    entry.actualCents += value.actualCents
  }

  for (const value of values) {
    const { budgetItemId, year, month } = value
    const macroAreaId = macroAreaOfItem.get(budgetItemId)
    if (macroAreaId === undefined) {
      throw new RangeError(`Value refers to an item missing from the structure: ${budgetItemId}`)
    }
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
      throw new RangeError(`Invalid year/month: ${year}-${month}`)
    }
    if (!Number.isInteger(value.budgetedCents) || !Number.isInteger(value.actualCents)) {
      throw new RangeError('Amounts must be integer cents')
    }
    const itemMonthKey = `${budgetItemId}|${year}|${month}`
    if (byItemMonth.has(itemMonthKey)) {
      throw new RangeError(`Duplicate value for item ${budgetItemId} in ${year}-${month}`)
    }

    const zero = { budgetedCents: 0, actualCents: 0 }
    accumulate(byItemMonth, itemMonthKey, () => ({ ...zero, budgetItemId, year, month }), value)
    accumulate(byItem, `${budgetItemId}|${year}`, () => ({ ...zero, budgetItemId, year }), value)
    accumulate(byMacroAreaMonth, `${macroAreaId}|${year}|${month}`, () => ({ ...zero, macroAreaId, year, month }), value)
    accumulate(byMacroArea, `${macroAreaId}|${year}`, () => ({ ...zero, macroAreaId, year }), value)
    accumulate(byMonth, `${year}|${month}`, () => ({ ...zero, year, month }), value)
    accumulate(byYear, `${year}`, () => ({ ...zero, year }), value)
  }

  const finish = <T extends Accumulator>(map: Map<string, T>): Array<T & { varianceCents: number }> =>
    [...map.values()].map((entry) => ({ ...entry, varianceCents: entry.actualCents - entry.budgetedCents }))
  const by = <T extends object>(...keys: Array<keyof T>) =>
    (a: T, b: T): number => {
      for (const key of keys) {
        const diff = (a[key] as number) - (b[key] as number)
        if (diff !== 0) return diff
      }
      return 0
    }

  return {
    byItemMonth: finish(byItemMonth).sort(by('budgetItemId', 'year', 'month')),
    byItem: finish(byItem).sort(by('budgetItemId', 'year')),
    byMacroAreaMonth: finish(byMacroAreaMonth).sort(by('macroAreaId', 'year', 'month')),
    byMacroArea: finish(byMacroArea).sort(by('macroAreaId', 'year')),
    byMonth: finish(byMonth).sort(by('year', 'month')),
    byYear: finish(byYear).sort(by('year')),
  }
}
