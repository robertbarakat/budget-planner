import { describe, expect, it } from 'vitest'
import { readPeriod, writePeriod } from './period.ts'

const now = new Date(2026, 10, 8)

describe('readPeriod', () => {
  it('senza parametri usa il periodo corrente', () => {
    expect(readPeriod(new URLSearchParams(), 'required', now)).toEqual({ year: 2026, month: 11 })
    expect(readPeriod(new URLSearchParams(), 'optional', now)).toEqual({ year: 2026, month: null })
    expect(readPeriod(new URLSearchParams(), 'none', now)).toEqual({ year: 2026, month: null })
  })

  it('legge anno e mese, anche futuri', () => {
    expect(readPeriod(new URLSearchParams('year=2031&month=3'), 'required', now)).toEqual({ year: 2031, month: 3 })
  })

  it('ignora il mese se la vista non lo usa', () => {
    expect(readPeriod(new URLSearchParams('year=2027&month=3'), 'none', now)).toEqual({ year: 2027, month: null })
  })

  it('scarta valori non validi', () => {
    expect(readPeriod(new URLSearchParams('year=abc&month=13'), 'required', now)).toEqual({ year: 2026, month: 11 })
    expect(readPeriod(new URLSearchParams('year=1999&month=0'), 'optional', now)).toEqual({ year: 2026, month: null })
  })
})

describe('writePeriod', () => {
  it('scrive anno e mese e conserva gli altri parametri', () => {
    const next = writePeriod(new URLSearchParams('mode=actual'), { year: 2028, month: 5 })
    expect(next.toString()).toBe('mode=actual&year=2028&month=5')
  })

  it('con mese null toglie il parametro del mese', () => {
    expect(writePeriod(new URLSearchParams('year=2026&month=4'), { year: 2026, month: null }).toString()).toBe('year=2026')
  })
})
