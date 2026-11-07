import { describe, expect, it } from 'vitest'
import { buildF24Calendar } from './f24-calendar.ts'

const tax = {
  referenceYear: 2026,
  tax: 'substitute_tax' as const,
  result: {
    advances: [
      { amountCents: 40_000, dueDate: '2026-06-30' },
      { amountCents: 60_000, dueDate: '2026-11-30' },
    ],
    balance: { amountCents: 25_000, dueDate: '2027-06-30' },
  },
}
const inps = {
  referenceYear: 2026,
  tax: 'inps' as const,
  result: {
    advances: [{ amountCents: 30_000, dueDate: '2026-06-30' }],
    balance: { amountCents: 10_000, dueDate: '2027-06-30' },
  },
}

describe('buildF24Calendar', () => {
  it('every amount due appears on its expected date and type', () => {
    const { deadlines } = buildF24Calendar({ year: 2026, sources: [tax, inps], installments: [] })
    expect(deadlines).toEqual([
      { referenceYear: 2026, taxType: 'inps_advance', dueDate: '2026-06-30', amountCents: 30_000 },
      { referenceYear: 2026, taxType: 'substitute_tax_advance', dueDate: '2026-06-30', amountCents: 40_000 },
      { referenceYear: 2026, taxType: 'substitute_tax_advance', dueDate: '2026-11-30', amountCents: 60_000 },
    ])
    const next = buildF24Calendar({ year: 2027, sources: [tax, inps], installments: [] })
    expect(next.deadlines.map((d) => [d.taxType, d.dueDate, d.amountCents])).toEqual([
      ['inps_balance', '2027-06-30', 10_000],
      ['substitute_tax_balance', '2027-06-30', 25_000],
    ])
  })

  it('the total equals the sum of the single amounts', () => {
    const installments = [
      { referenceYear: 2025, taxType: 'inps_balance' as const, number: 1, dueDate: '2026-09-30', amountCents: 12_345 },
    ]
    const calendar = buildF24Calendar({ year: 2026, sources: [tax, inps], installments })
    expect(calendar.totalCents).toBe(30_000 + 40_000 + 60_000 + 12_345)
    expect(calendar.totalCents).toBe(calendar.deadlines.reduce((s, d) => s + d.amountCents, 0))
  })

  it('active instalments enter at their due dates and stay distinct', () => {
    const installments = [3, 1, 2].map((number) => ({
      referenceYear: 2025,
      taxType: 'substitute_tax_balance' as const,
      number,
      dueDate: `2026-0${number + 6}-30`,
      amountCents: 10_000 + number,
    }))
    const { deadlines } = buildF24Calendar({ year: 2026, sources: [], installments })
    expect(deadlines.map((d) => [d.installmentNumber, d.dueDate, d.amountCents])).toEqual([
      [1, '2026-07-30', 10_001],
      [2, '2026-08-30', 10_002],
      [3, '2026-09-30', 10_003],
    ])
  })

  it('an instalment due on the same day as a balance is not merged with it', () => {
    const { deadlines } = buildF24Calendar({
      year: 2027,
      sources: [tax],
      installments: [
        { referenceYear: 2026, taxType: 'substitute_tax_balance', number: 1, dueDate: '2027-06-30', amountCents: 500 },
      ],
    })
    expect(deadlines).toHaveLength(2)
  })

  it('merges equal reference year, type and date', () => {
    const { deadlines } = buildF24Calendar({ year: 2026, sources: [inps, inps], installments: [] })
    expect(deadlines).toEqual([
      { referenceYear: 2026, taxType: 'inps_advance', dueDate: '2026-06-30', amountCents: 60_000 },
    ])
  })

  it('a year with nothing due gives an empty calendar', () => {
    expect(buildF24Calendar({ year: 2030, sources: [tax, inps], installments: [] })).toEqual({
      deadlines: [],
      totalCents: 0,
    })
    const zero = { ...tax, result: { advances: [], balance: { amountCents: 0, dueDate: '2026-06-30' } } }
    expect(buildF24Calendar({ year: 2026, sources: [zero], installments: [] }).deadlines).toEqual([])
  })

  it('rejects invalid dates and amounts', () => {
    const bad = { ...tax, result: { advances: [], balance: { amountCents: 1, dueDate: '30/06/2026' } } }
    expect(() => buildF24Calendar({ year: 2026, sources: [bad], installments: [] })).toThrow(RangeError)
    expect(() =>
      buildF24Calendar({
        year: 2026,
        sources: [],
        installments: [{ referenceYear: 2025, taxType: 'inps', number: 1, dueDate: '2026-01-01', amountCents: 0 }],
      }),
    ).toThrow(RangeError)
  })
})
