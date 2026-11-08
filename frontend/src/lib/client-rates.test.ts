import { describe, expect, it } from 'vitest'
import { validateDelay, validateRate } from './client-rates.ts'

describe('validateDelay', () => {
  it('accetta interi da zero in su', () => {
    expect(validateDelay('0')).toEqual({ ok: true, value: 0 })
    expect(validateDelay(' 2 ')).toEqual({ ok: true, value: 2 })
  })
  it('rifiuta vuoto, negativi, decimali e testo', () => {
    for (const text of ['', '-1', '1,5', 'due', '121']) expect(validateDelay(text).ok).toBe(false)
  })
  it('il messaggio del negativo è leggibile', () => {
    expect(validateDelay('-1')).toEqual({ ok: false, message: 'Il ritardo non può essere negativo.' })
  })
})

describe('validateRate', () => {
  const existing = [
    { id: 1, validFromYear: 2026, validFromMonth: 1 },
    { id: 2, validFromYear: 2026, validFromMonth: 7 },
  ]
  it('accetta una tariffa positiva con un mese libero', () => {
    expect(validateRate({ dailyRateText: '280,50', year: 2026, month: 9 }, existing)).toEqual({ ok: true, dailyRate: 280.5 })
  })
  it('rifiuta tariffa zero, negativa o non numerica', () => {
    for (const dailyRateText of ['0', '-5', 'abc', '']) {
      const result = validateRate({ dailyRateText, year: 2026, month: 9 }, existing)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.dailyRate).toBeTruthy()
    }
  })
  it('rifiuta una tariffa con la stessa data di inizio, ma non se è quella in modifica', () => {
    const duplicate = validateRate({ dailyRateText: '300', year: 2026, month: 7 }, existing)
    expect(duplicate).toEqual({ ok: false, errors: { validFrom: 'Esiste già una tariffa che inizia in questo mese.' } })
    expect(validateRate({ dailyRateText: '300', year: 2026, month: 7 }, existing, 2).ok).toBe(true)
  })
  it('rifiuta un anno fuori intervallo', () => {
    const result = validateRate({ dailyRateText: '300', year: 1999, month: 1 }, existing)
    expect(result.ok).toBe(false)
  })
})
