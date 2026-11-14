import { describe, expect, it } from 'vitest'
import { addMonthsIso, buildInstallmentSchedule, installmentInterestBasisPoints } from './installment-schedule.ts'

const lines = [
  { taxType: 'substitute_tax_balance', referenceYear: 2025, quotaCents: 119671, lastNumber: null },
  { taxType: 'substitute_tax_advance', referenceYear: 2026, quotaCents: 59836, lastNumber: null },
  { taxType: 'inps_balance', referenceYear: 2025, quotaCents: 208000, lastNumber: null },
  { taxType: 'inps_advance', referenceYear: 2026, quotaCents: 83198, lastNumber: null },
] as const

describe('installmentInterestBasisPoints', () => {
  it('0 alla prima rata, 0,18% alla seconda, +0,33 punti a rata', () => {
    expect([1, 2, 3, 4, 7].map(installmentInterestBasisPoints)).toEqual([0, 18, 51, 84, 183])
  })
})

describe('addMonthsIso', () => {
  it('somma mesi e tronca a fine mese', () => {
    expect(addMonthsIso('2026-12-16', 1)).toBe('2027-01-16')
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28')
  })
})

describe('buildInstallmentSchedule', () => {
  const rows = buildInstallmentSchedule({ lines, count: 7, firstDueDate: '2026-12-16' })
  const interest = (number: number) => rows.filter((r) => r.number === number).map((r) => r.interestCents)

  it('rata 1 senza interessi', () => expect(interest(1)).toEqual([0, 0, 0, 0]))
  it('rata 2 sui dati reali', () => expect(interest(2)).toEqual([215, 108, 374, 150]))
  it('rata 7 sui dati reali (±1 cent sull\'ultima riga: tabella arrotondata)', () => {
    expect(interest(7).slice(0, 3)).toEqual([2190, 1095, 3806])
    expect(interest(7)[3]).toBe(1523)
  })
  it('chiudere le righe 2026 dalla rata 6 toglie capitale e interessi', () => {
    const closed = buildInstallmentSchedule({
      lines: lines.map((l) => (l.referenceYear === 2026 ? { ...l, lastNumber: 5 } : l)),
      count: 7,
      firstDueDate: '2026-12-16',
    })
    expect(closed.filter((r) => r.number === 6).map((r) => r.referenceYear)).toEqual([2025, 2025])
    expect(closed.filter((r) => r.number === 7)).toHaveLength(2)
  })
})
