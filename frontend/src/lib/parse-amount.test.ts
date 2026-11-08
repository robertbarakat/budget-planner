import { describe, expect, it } from 'vitest'
import { parseAmount } from './parse-amount.ts'

describe('parseAmount', () => {
  it.each([
    ['1.234,50', 1234.5],
    ['1234,5', 1234.5],
    ['42', 42],
    ['0,99', 0.99],
    ['-42,50', -42.5],
    ['−42,50', -42.5],
    ['€ 10', 10],
    ['1.234', 1234],
    ['1.234.567,89', 1234567.89],
    ['1234.5', 1234.5],
    ['  7,00  ', 7],
  ])('"%s" -> %s', (text, expected) => {
    expect(parseAmount(text)).toBe(expected)
  })

  it.each(['', '  ', 'abc', '1,234,5', '12,345', '1..2', '--5', '1,2,3'])('"%s" non è valido', (text) => {
    expect(parseAmount(text)).toBeNull()
  })
})
