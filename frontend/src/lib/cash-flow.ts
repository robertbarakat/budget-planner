import { computeCashBalances, computeMonthlyValues, eurosToCents } from 'budget-planner-shared'

export interface CashFlowItem {
  id: number
  name: string
  kind: 'income' | 'expense'
  archived: boolean
}

export interface CashFlowEntry {
  budgetItemId: number
  year: number
  month: number
  amount: number
}

export interface CashFlowTransaction {
  type: 'expense' | 'income' | 'transfer'
  budgetItemId: number | null
  transactionDate: string
  amount: number
}

/** Una voce nel dettaglio di un mese, in euro con segno (entrate +, spese −). */
export interface MonthItemDetail {
  budgetItemId: number
  name: string
  kind: 'income' | 'expense'
  budgeted: number
  actual: number
  /** Reale − previsto. */
  variance: number
  /** Valore che entra nel flusso: il reale se il mese è chiuso, il previsto altrimenti. */
  shown: number
}

export interface CashFlowMonth {
  month: number
  isClosed: boolean
  income: number
  expenses: number
  flow: number
  endBalance: number
  details: MonthItemDetail[]
}

export interface CashFlow {
  year: number
  openingBalance: number
  months: CashFlowMonth[]
  /** Saldo a fine dicembre. */
  closingBalance: number
}

const toEuros = (cents: number) => cents / 100

/**
 * Flusso di cassa di un anno, mese per mese, con saldo progressivo: usa `computeMonthlyValues` e
 * `computeCashBalances` di `shared/` (mese chiuso = reale, aperto = previsto). Qui si fanno solo
 * conversioni e raggruppamenti. Le voci archiviate compaiono solo se hanno valori nell'anno.
 */
export function buildCashFlow(
  year: number,
  openingBalance: number,
  items: readonly CashFlowItem[],
  entries: readonly CashFlowEntry[],
  transactions: readonly CashFlowTransaction[],
  closedMonths: readonly { year: number; month: number }[],
): CashFlow {
  const values = computeMonthlyValues({
    year,
    budgetItems: items.map((item) => ({ budgetItemId: item.id, kind: item.kind })),
    budgetEntries: entries.map((e) => ({ budgetItemId: e.budgetItemId, year: e.year, month: e.month, amountCents: eurosToCents(e.amount) })),
    transactions: transactions.map((t) => ({
      type: t.type,
      budgetItemId: t.budgetItemId,
      transactionDate: t.transactionDate,
      amountCents: eurosToCents(t.amount),
    })),
    closedMonths: closedMonths.map((c) => ({ year: c.year, month: c.month })),
  })
  const balances = computeCashBalances(year, eurosToCents(openingBalance), values)
  const itemById = new Map(items.map((item) => [item.id, item]))

  const months = balances.map((balance): CashFlowMonth => {
    const details: MonthItemDetail[] = []
    let incomeCents = 0
    let expenseCents = 0
    for (const value of values) {
      if (value.month !== balance.month) continue
      const item = itemById.get(value.budgetItemId)
      if (!item) continue
      if (item.kind === 'income') incomeCents += value.shownCents
      else expenseCents += value.shownCents
      if (value.budgetedCents === 0 && value.actualCents === 0) continue
      details.push({
        budgetItemId: item.id,
        name: item.name,
        kind: item.kind,
        budgeted: toEuros(value.budgetedCents),
        actual: toEuros(value.actualCents),
        variance: toEuros(value.actualCents - value.budgetedCents),
        shown: toEuros(value.shownCents),
      })
    }
    return {
      month: balance.month,
      isClosed: balance.isClosed,
      income: toEuros(incomeCents),
      expenses: toEuros(expenseCents),
      flow: toEuros(balance.flowCents),
      endBalance: toEuros(balance.endBalanceCents),
      details,
    }
  })
  return { year, openingBalance, months, closingBalance: months.at(-1)?.endBalance ?? openingBalance }
}

/** Importi dei dettagli di un mese nella forma per la ripartizione: uscite e entrate in centesimi positivi (previsto o reale secondo il mese). */
export function shareRows(details: readonly MonthItemDetail[]): { type: 'expense' | 'income'; budgetItemId: number; amountCents: number }[] {
  return details.flatMap((d) => {
    const cents = Math.round(Math.abs(d.shown) * 100)
    return cents === 0 ? [] : [{ type: d.kind, budgetItemId: d.budgetItemId, amountCents: cents }]
  })
}
