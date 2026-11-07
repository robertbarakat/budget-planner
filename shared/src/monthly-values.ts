import type { TransactionType } from './domain.ts'

/** A budget line (docs/specifica.md, section 3). Amounts are signed: income positive, expenses negative. */
export interface BudgetEntryInput {
  budgetItemId: number
  year: number
  month: number
  amountCents: number
}

/** A real transaction. The amount is always positive: the sign comes from the type. */
export interface ActualTransactionInput {
  type: TransactionType
  /** Required for expenses and income, ignored for transfers. */
  budgetItemId: number | null
  /** ISO date `YYYY-MM-DD`, as stored in the database. */
  transactionDate: string
  amountCents: number
}

export interface ClosedMonthInput {
  year: number
  month: number
}

export interface MonthlyValuesInput {
  year: number
  /** Every budget item to report, archived ones included when they were used in the year. */
  budgetItemIds: readonly number[]
  budgetEntries: readonly BudgetEntryInput[]
  transactions: readonly ActualTransactionInput[]
  closedMonths: readonly ClosedMonthInput[]
}

export interface MonthlyValue {
  budgetItemId: number
  year: number
  month: number
  /** Sum of the budget lines of any origin on this item and month. */
  budgetedCents: number
  /** Real income minus real expenses (transfers excluded). For an open month it is the partial real. */
  actualCents: number
  /** Closed month: the real value. Open month: the budgeted value. */
  shownCents: number
  isClosed: boolean
}

/**
 * Value of each budget item in each month of a year, between real and budgeted
 * (docs/specifica.md, sections 3 and 4):
 *
 * - closed month: the shown value is the real one; open month: the budgeted one, with the
 *   partial real returned next to it;
 * - income is positive and expenses negative; transfers never enter the totals;
 * - several budget lines (any origin) on the same item and month are summed;
 * - a month with no lines and no transactions is worth 0.
 *
 * Returns 12 entries per item, ordered by item (as given) and month. Data of other years is ignored.
 * References to unknown items are an error. Pure function, integer cents.
 */
export function computeMonthlyValues(input: MonthlyValuesInput): MonthlyValue[] {
  const { year, budgetItemIds, budgetEntries, transactions, closedMonths } = input
  if (!Number.isInteger(year)) {
    throw new RangeError(`Invalid year: ${year}`)
  }
  const itemIds = new Set(budgetItemIds)
  if (itemIds.size !== budgetItemIds.length) {
    throw new RangeError('Duplicate budget item ids')
  }

  const budgeted = new Map<string, number>()
  const actual = new Map<string, number>()
  const key = (budgetItemId: number, month: number) => `${budgetItemId}-${month}`
  const add = (map: Map<string, number>, k: string, delta: number) =>
    map.set(k, (map.get(k) ?? 0) + delta)

  for (const entry of budgetEntries) {
    assertMonth(entry.month)
    assertCents(entry.amountCents)
    if (!itemIds.has(entry.budgetItemId)) {
      throw new RangeError(`Budget line refers to an unknown item: ${entry.budgetItemId}`)
    }
    if (entry.year === year) {
      add(budgeted, key(entry.budgetItemId, entry.month), entry.amountCents)
    }
  }

  for (const transaction of transactions) {
    assertCents(transaction.amountCents)
    if (transaction.amountCents <= 0) {
      throw new RangeError(`Transaction amount must be positive: ${transaction.amountCents}`)
    }
    const { year: transactionYear, month } = parseIsoDate(transaction.transactionDate)
    if (transaction.type === 'transfer') {
      continue
    }
    const { budgetItemId } = transaction
    if (budgetItemId === null || !itemIds.has(budgetItemId)) {
      throw new RangeError(`Transaction refers to an unknown or missing item: ${budgetItemId}`)
    }
    if (transactionYear === year) {
      const signed = transaction.type === 'income' ? transaction.amountCents : -transaction.amountCents
      add(actual, key(budgetItemId, month), signed)
    }
  }

  const closed = new Set<number>()
  for (const closedMonth of closedMonths) {
    assertMonth(closedMonth.month)
    if (closedMonth.year === year) {
      closed.add(closedMonth.month)
    }
  }

  const result: MonthlyValue[] = []
  for (const budgetItemId of budgetItemIds) {
    for (let month = 1; month <= 12; month++) {
      const budgetedCents = budgeted.get(key(budgetItemId, month)) ?? 0
      const actualCents = actual.get(key(budgetItemId, month)) ?? 0
      const isClosed = closed.has(month)
      result.push({
        budgetItemId,
        year,
        month,
        budgetedCents,
        actualCents,
        shownCents: isClosed ? actualCents : budgetedCents,
        isClosed,
      })
    }
  }
  return result
}

function assertMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid month: ${month}`)
  }
}

function assertCents(amountCents: number): void {
  if (!Number.isInteger(amountCents)) {
    throw new RangeError(`Amount is not an integer number of cents: ${amountCents}`)
  }
}

function parseIsoDate(isoDate: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(isoDate)
  if (!match) {
    throw new RangeError(`Invalid date, expected YYYY-MM-DD: ${isoDate}`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  assertMonth(month)
  return { year, month }
}
