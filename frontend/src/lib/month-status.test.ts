import { describe, expect, it } from 'vitest'
import { buildMonthStatuses, transactionCountLabel } from './month-status.ts'

describe('buildMonthStatuses', () => {
  it('segna i mesi chiusi dell\'anno e conta i movimenti per mese', () => {
    const statuses = buildMonthStatuses(
      2026,
      [
        { year: 2026, month: 2 },
        { year: 2025, month: 5 },
      ],
      [{ transactionDate: '2026-02-03' }, { transactionDate: '2026-02-28' }, { transactionDate: '2026-12-01' }, { transactionDate: '2025-02-10' }],
    )
    expect(statuses).toHaveLength(12)
    expect(statuses[1]).toEqual({ month: 2, closed: true, transactionCount: 2 })
    expect(statuses[4]).toEqual({ month: 5, closed: false, transactionCount: 0 })
    expect(statuses[11]).toEqual({ month: 12, closed: false, transactionCount: 1 })
  })
})

describe('transactionCountLabel', () => {
  it('concorda singolare e plurale', () => {
    expect([0, 1, 12].map(transactionCountLabel)).toEqual(['nessun movimento', '1 movimento', '12 movimenti'])
  })
})
