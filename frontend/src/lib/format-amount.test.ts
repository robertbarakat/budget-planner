import { describe, expect, it } from 'vitest'
import { amountSign, formatAmount } from './format-amount.ts'

// Intl usa lo spazio non separabile (U+00A0) prima del simbolo.
const nbsp = ' '

describe('formatAmount', () => {
  it('formatta 1234.5 come "1.234,50 €"', () => {
    expect(formatAmount(1234.5)).toBe(`1.234,50${nbsp}€`)
  })

  it('mostra il segno meno per i negativi', () => {
    expect(formatAmount(-42)).toBe(`−42,00${nbsp}€`)
  })

  it('mostra il più solo se richiesto', () => {
    expect(formatAmount(42)).toBe(`42,00${nbsp}€`)
    expect(formatAmount(42, { explicitPlus: true })).toBe(`+42,00${nbsp}€`)
  })

  it('gestisce lo zero senza segno (anche -0 e valori che arrotondano a zero)', () => {
    expect(formatAmount(0, { explicitPlus: true })).toBe(`0,00${nbsp}€`)
    expect(formatAmount(-0)).toBe(`0,00${nbsp}€`)
    expect(formatAmount(-0.001)).toBe(`0,00${nbsp}€`)
    expect(amountSign(-0.004, true)).toBe('')
  })

  it('gestisce i valori grandi', () => {
    expect(formatAmount(1234567.89)).toBe(`1.234.567,89${nbsp}€`)
    expect(formatAmount(-48299.66)).toBe(`−48.299,66${nbsp}€`)
    expect(formatAmount(999)).toBe(`999,00${nbsp}€`)
  })

  it('arrotonda ai centesimi', () => {
    expect(formatAmount(10.005)).toBe(formatAmount(10.01))
    expect(formatAmount(0.1 + 0.2)).toBe(`0,30${nbsp}€`)
  })
})
