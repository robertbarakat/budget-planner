import type { Recurrence, RecurrenceOccurrence } from 'budget-planner-shared'
import { describe, expect, it } from 'vitest'
import { buildUpcomingDues, shiftIsoDate, upcomingRange, type UpcomingTransaction } from './upcoming-dues.ts'

const rec = (id: number, name: string, budget_item_id = 1, archived = false): Recurrence =>
  ({ id, name, archived, budget_item_id, account_id: 1, base_amount: 10 }) as Recurrence
const occ = (id: number, recurrence_id: number, due_date: string, amount = 10): RecurrenceOccurrence =>
  ({ id, recurrence_id, due_date, amount }) as RecurrenceOccurrence
const tx = (transaction_date: string, over: Partial<UpcomingTransaction> = {}): UpcomingTransaction => ({
  type: 'expense', account_id: 1, budget_item_id: 1, transaction_date, ...over,
})
const kinds = new Map<number, 'income' | 'expense'>([[1, 'expense'], [2, 'income']])
const base = { kinds, transactions: [] as UpcomingTransaction[], today: '2026-11-08' }

describe('upcoming dues', () => {
  it('shiftIsoDate e upcomingRange passano i confini di mese e anno', () => {
    expect(shiftIsoDate('2026-12-20', 30)).toBe('2027-01-19')
    expect(shiftIsoDate('2026-03-01', -1)).toBe('2026-02-28')
    expect(upcomingRange('2026-11-08')).toEqual({ from: '2026-10-09', to: '2026-12-08' })
  })

  it('tiene solo le scadenze nella finestra, in ordine di data, con segno dalla voce', () => {
    const rows = buildUpcomingDues({
      ...base,
      recurrences: [rec(1, 'Mutuo'), rec(2, 'Affitto studio', 2)],
      occurrences: [occ(3, 1, '2026-12-08'), occ(4, 1, '2026-12-09'), occ(2, 2, '2026-11-20', 300), occ(1, 1, '2026-11-08')],
    })
    expect(rows.map((r) => r.occurrenceId)).toEqual([1, 2, 3])
    expect(rows.map((r) => r.amount)).toEqual([-10, 300, -10])
    expect(rows.every((r) => !r.overdue)).toBe(true)
  })

  it('esclude le ricorrenze archiviate', () => {
    expect(buildUpcomingDues({ ...base, recurrences: [rec(1, 'x', 1, true)], occurrences: [occ(1, 1, '2026-11-10')] })).toEqual([])
  })

  it('segnala "scaduta" una scadenza passata senza movimento e la toglie se registrata', () => {
    const args = { ...base, recurrences: [rec(1, 'Mutuo')], occurrences: [occ(1, 1, '2026-11-05')] }
    expect(buildUpcomingDues(args)).toMatchObject([{ occurrenceId: 1, overdue: true }])
    expect(buildUpcomingDues({ ...args, transactions: [tx('2026-11-06')] })).toEqual([])
  })

  it('un movimento copre una sola scadenza e conto/voce devono coincidere', () => {
    const recurrences = [rec(1, 'A'), rec(2, 'B')]
    const occurrences = [occ(1, 1, '2026-11-02'), occ(2, 2, '2026-11-03')]
    const one = buildUpcomingDues({ ...base, recurrences, occurrences, transactions: [tx('2026-11-04')] })
    expect(one.map((r) => r.occurrenceId)).toEqual([2])
    const other = buildUpcomingDues({ ...base, recurrences, occurrences, transactions: [tx('2026-11-04', { account_id: 9 }), tx('2026-11-04', { type: 'transfer' })] })
    expect(other).toHaveLength(2)
  })

  it('ignora le scadenze passate oltre i 30 giorni', () => {
    expect(buildUpcomingDues({ ...base, recurrences: [rec(1, 'x')], occurrences: [occ(1, 1, '2026-10-08')] })).toEqual([])
  })
})
