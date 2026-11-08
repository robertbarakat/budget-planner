export interface MonthStatus {
  month: number
  closed: boolean
  /** Movimenti registrati nel mese (trasferimenti inclusi). */
  transactionCount: number
}

/** Stato dei 12 mesi di un anno: chiuso/aperto e numero di movimenti, dai mesi chiusi e dalle date dei movimenti. */
export function buildMonthStatuses(
  year: number,
  closedMonths: readonly { year: number; month: number }[],
  transactions: readonly { transactionDate: string }[],
): MonthStatus[] {
  const closed = new Set(closedMonths.filter((row) => row.year === year).map((row) => row.month))
  const counts = Array.from({ length: 12 }, () => 0)
  for (const transaction of transactions) {
    const [y, m] = transaction.transactionDate.split('-').map(Number) as [number, number]
    if (y === year && m >= 1 && m <= 12) counts[m - 1] = (counts[m - 1] ?? 0) + 1
  }
  return counts.map((transactionCount, index) => ({ month: index + 1, closed: closed.has(index + 1), transactionCount }))
}

/** "1 movimento" / "12 movimenti" / "nessun movimento". */
export function transactionCountLabel(count: number): string {
  if (count === 0) return 'nessun movimento'
  return count === 1 ? '1 movimento' : `${count} movimenti`
}
