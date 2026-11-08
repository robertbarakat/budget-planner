import { describe, expect, it } from 'vitest'
import { isOccurrenceModified, validateOccurrenceAmount } from './occurrence-amount.ts'

describe('isOccurrenceModified', () => {
  it('confronta in centesimi', () => {
    expect(isOccurrenceModified(100.5, 100.5)).toBe(false)
    expect(isOccurrenceModified(0.1 + 0.2, 0.3)).toBe(false)
    expect(isOccurrenceModified(120, 100.5)).toBe(true)
  })
})

describe('validateOccurrenceAmount', () => {
  it('accetta importi positivi con la virgola', () => {
    expect(validateOccurrenceAmount('120,5')).toEqual({ ok: true, amount: 120.5 })
  })
  it.each(['0', '-1', '', 'abc'])('rifiuta "%s"', (text) => {
    expect(validateOccurrenceAmount(text).ok).toBe(false)
  })
})
