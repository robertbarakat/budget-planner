import { describe, expect, it } from 'vitest'
import { parseNumber, proposeCollection } from './revenue-forecast.ts'

describe('proposeCollection', () => {
  it('senza storico propone lo stesso mese', () => {
    expect(proposeCollection(2026, 3, [])).toEqual({ year: 2026, month: 3 })
  })
  it('usa il ritardo dell\'ultima previsione e passa all\'anno dopo', () => {
    const previous = [{ id: 1, work_year: 2026, work_month: 3, collection_year: 2026, collection_month: 5 }]
    expect(proposeCollection(2026, 11, previous)).toEqual({ year: 2027, month: 1 })
  })
})

describe('parseNumber', () => {
  it('legge i numeri all\'italiana', () => {
    expect(parseNumber('1,5')).toBe(1.5)
    expect(parseNumber('1.350,00')).toBe(1350)
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
  })
})
