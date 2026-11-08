import { describe, expect, it } from 'vitest'
import { buildWorkedDaysGrid, formatDays, readDays } from './worked-days.ts'

describe('readDays', () => {
  it('vuoto = nessun dato; accetta interi e mezze giornate con virgola o punto', () => {
    expect(readDays('  ')).toEqual({ kind: 'empty' })
    expect(readDays('21')).toEqual({ kind: 'days', value: 21 })
    expect(readDays('10,5')).toEqual({ kind: 'days', value: 10.5 })
    expect(readDays('0.25')).toEqual({ kind: 'days', value: 0.25 })
    expect(readDays('0')).toEqual({ kind: 'days', value: 0 })
  })
  it('rifiuta negativi, oltre 31, testo e troppi decimali', () => {
    expect(readDays('-1')).toEqual({ kind: 'error', message: 'I giorni non possono essere negativi.' })
    expect(readDays('32')).toMatchObject({ kind: 'error' })
    expect(readDays('abc')).toMatchObject({ kind: 'error' })
    expect(readDays('1,234')).toMatchObject({ kind: 'error' })
  })
})

describe('formatDays', () => {
  it('scrive all\'italiana senza zeri inutili', () => {
    expect(formatDays(21)).toBe('21')
    expect(formatDays(10.5)).toBe('10,5')
    expect(formatDays(0.25)).toBe('0,25')
  })
})

describe('buildWorkedDaysGrid', () => {
  const clients = [
    { id: 2, name: 'B', archived: false, sortOrder: 1 },
    { id: 1, name: 'A', archived: false, sortOrder: 0 },
    { id: 3, name: 'Vecchio', archived: true, sortOrder: 2 },
    { id: 4, name: 'Vecchio senza giorni', archived: true, sortOrder: 3 },
  ]
  const rows = [
    { clientId: 1, year: 2026, month: 1, days: 10.5 },
    { clientId: 1, year: 2026, month: 2, days: 0.1 },
    { clientId: 2, year: 2026, month: 1, days: 0.2 },
    { clientId: 2, year: 2026, month: 3, days: 20 },
    { clientId: 3, year: 2026, month: 3, days: 2 },
    { clientId: 1, year: 2025, month: 1, days: 99 },
  ]

  it('somma per cliente, per mese e in totale senza errori di virgola mobile', () => {
    const grid = buildWorkedDaysGrid(2026, clients, rows)
    expect(grid.rows.map((r) => r.name)).toEqual(['A', 'B', 'Vecchio'])
    expect(grid.rows[0]!.totalDays).toBe(10.6)
    expect(grid.rows[1]!.totalDays).toBe(20.2)
    expect(grid.monthTotals.slice(0, 3)).toEqual([10.7, 0.1, 22])
    expect(grid.monthTotals[3]).toBe(0)
    expect(grid.totalDays).toBe(10.6 + 20.2 + 2)
    expect(grid.rows[0]!.days[0]).toBe(10.5)
    expect(grid.rows[0]!.days[5]).toBeNull()
  })

  it('un anno senza dati è una griglia vuota ma completa (anche futuro)', () => {
    const grid = buildWorkedDaysGrid(2040, clients, rows)
    expect(grid.rows.map((r) => r.name)).toEqual(['A', 'B'])
    expect(grid.totalDays).toBe(0)
    expect(grid.monthTotals).toHaveLength(12)
  })
})
