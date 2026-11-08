import type { Recurrence, RecurrenceOccurrence } from 'budget-planner-shared'
import { describe, expect, it } from 'vitest'
import { buildUpcomingDues, shiftIsoDate, upcomingRange } from './upcoming-dues.ts'

const rec = (id: number, name: string, budget_item_id = 1, archived = false): Recurrence =>
  ({ id, name, archived, budget_item_id, account_id: 1, base_amount: 10 }) as Recurrence
const occ = (id: number, recurrence_id: number, due_date: string, amount = 10): RecurrenceOccurrence =>
  ({ id, recurrence_id, due_date, amount }) as RecurrenceOccurrence
const kinds = new Map<number, 'income' | 'expense'>([[1, 'expense'], [2, 'income']])
const base = { kinds, today: '2026-11-08' }

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

  it('segnala "scaduta" una scadenza passata non registrata e toglie quella già registrata dal database', () => {
    const args = { ...base, recurrences: [rec(1, 'Mutuo')] }
    expect(buildUpcomingDues({ ...args, occurrences: [occ(1, 1, '2026-11-05')] })).toMatchObject([{ occurrenceId: 1, overdue: true }])
    const registered = { ...occ(1, 1, '2026-11-05'), registered_at: '2026-11-06T00:05:00Z' } as RecurrenceOccurrence
    expect(buildUpcomingDues({ ...args, occurrences: [registered] })).toEqual([])
  })

  it('ignora le scadenze passate oltre i 30 giorni', () => {
    expect(buildUpcomingDues({ ...base, recurrences: [rec(1, 'x')], occurrences: [occ(1, 1, '2026-10-08')] })).toEqual([])
  })
})
