import { describe, expect, it } from 'vitest'
import { formatDay, monthName, monthOptions, monthRange } from './months.ts'

describe('months', () => {
  it('nomi dei mesi in italiano', () => {
    expect(monthName(1)).toBe('gennaio')
    expect(monthName(11)).toBe('novembre')
    expect(monthOptions().map((m) => m.label)).toEqual([
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
    ])
  })

  it.each([
    [2026, 11, '2026-11-01', '2026-11-30'],
    [2026, 2, '2026-02-01', '2026-02-28'],
    [2028, 2, '2028-02-01', '2028-02-29'],
    [2026, 12, '2026-12-01', '2026-12-31'],
  ])('monthRange(%s, %s)', (year, month, from, to) => {
    expect(monthRange(year, month)).toEqual({ from, to })
  })

  it('formatDay scrive il giorno esteso', () => {
    expect(formatDay('2026-11-08')).toBe('domenica 8 novembre 2026')
    expect(formatDay('2026-01-01')).toBe('giovedì 1 gennaio 2026')
  })
})
