import { useYearOpeningBalances } from './accounts.queries.ts'
import { useBudgetEntries, useClosedMonths } from './budget.queries.ts'
import { useYearTransactions } from './transactions.queries.ts'

/**
 * Dati di un anno per le viste: righe di budget, movimenti, mesi chiusi e saldi iniziali.
 * Ogni lettura ha la chiave di cache dell'anno: cambiare vista sullo stesso anno non rilancia le richieste,
 * e una mutazione (movimento, budget, mese chiuso, saldo) invalida le chiavi della sua area.
 */
export function useYearData(year: number) {
  const entries = useBudgetEntries({ year })
  const transactions = useYearTransactions(year)
  const closedMonths = useClosedMonths(year)
  const openingBalances = useYearOpeningBalances(year)
  const queries = [entries, transactions, closedMonths, openingBalances]
  return {
    entries: entries.data,
    transactions: transactions.data,
    closedMonths: closedMonths.data,
    openingBalances: openingBalances.data,
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    isReady: queries.every((q) => q.data !== undefined),
  }
}
