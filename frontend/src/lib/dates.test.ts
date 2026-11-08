import { describe, expect, it } from 'vitest'
import { isValidIsoDate, todayIso } from './dates.ts'

describe('todayIso', () => {
  it('usa la data locale con zeri iniziali', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(todayIso(new Date(2026, 10, 8, 0, 1))).toBe('2026-11-08')
  })
})

describe('isValidIsoDate', () => {
  it.each(['2026-11-08', '2024-02-29'])('%s è valida', (text) => expect(isValidIsoDate(text)).toBe(true))
  it.each(['', '2026-02-30', '2026-13-01', '8/11/2026', '2026-1-1', '2025-02-29'])('"%s" non è valida', (text) =>
    expect(isValidIsoDate(text)).toBe(false),
  )
})
