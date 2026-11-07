import { describe, expect, it } from 'vitest'
import { summarizeInstallmentPlan } from './installment-plan.ts'

const rate = (number: number, amountCents: number, paid: boolean) => ({
  number,
  dueDate: `2031-${String(number).padStart(2, '0')}-28`,
  amountCents,
  paid,
})

describe('summarizeInstallmentPlan', () => {
  it('interest = sum of the instalments - rescheduled amount', () => {
    const result = summarizeInstallmentPlan({
      plannedAmountCents: 300_000,
      installments: [rate(1, 105_000, false), rate(2, 105_000, false), rate(3, 105_050, false)],
    })
    expect(result.installmentsTotalCents).toBe(315_050)
    expect(result.totalInterestCents).toBe(15_050)
  })

  it('remaining decreases as instalments are paid; next is the first unpaid', () => {
    const installments = [rate(1, 100_000, false), rate(2, 100_000, false), rate(3, 100_000, false)]
    const none = summarizeInstallmentPlan({ plannedAmountCents: 290_000, installments })
    expect(none.remainingCents).toBe(300_000)
    expect(none.nextInstallment?.number).toBe(1)

    const one = summarizeInstallmentPlan({
      plannedAmountCents: 290_000,
      installments: [rate(1, 100_000, true), rate(2, 100_000, false), rate(3, 100_000, false)],
    })
    expect(one.remainingCents).toBe(200_000)
    expect(one.nextInstallment?.number).toBe(2)

    const all = summarizeInstallmentPlan({
      plannedAmountCents: 290_000,
      installments: installments.map((i) => ({ ...i, paid: true })),
    })
    expect(all.remainingCents).toBe(0)
    expect(all.nextInstallment).toBeNull()
    expect(all.totalInterestCents).toBe(10_000)
  })

  it('next instalment follows the number, whatever the order of the list', () => {
    const result = summarizeInstallmentPlan({
      plannedAmountCents: 200_000,
      installments: [rate(3, 70_000, false), rate(1, 70_000, true), rate(2, 70_000, false)],
    })
    expect(result.nextInstallment?.number).toBe(2)
  })

  it('instalments equal to the rescheduled amount: interest 0', () => {
    const result = summarizeInstallmentPlan({
      plannedAmountCents: 200_000,
      installments: [rate(1, 100_000, false), rate(2, 100_000, false)],
    })
    expect(result.totalInterestCents).toBe(0)
  })

  it('no instalments and nothing rescheduled: interest 0, no next instalment', () => {
    expect(summarizeInstallmentPlan({ plannedAmountCents: 0, installments: [] })).toEqual({
      installmentsTotalCents: 0,
      totalInterestCents: 0,
      remainingCents: 0,
      nextInstallment: null,
    })
  })

  it('explicit error if the instalments sum to less than the rescheduled amount', () => {
    expect(() =>
      summarizeInstallmentPlan({ plannedAmountCents: 300_000, installments: [rate(1, 100_000, false), rate(2, 100_000, false)] }),
    ).toThrow(RangeError)
    expect(() => summarizeInstallmentPlan({ plannedAmountCents: 1, installments: [] })).toThrow(RangeError)
  })

  it('rejects invalid amounts and duplicate or invalid numbers', () => {
    expect(() => summarizeInstallmentPlan({ plannedAmountCents: 10.5, installments: [] })).toThrow(RangeError)
    expect(() => summarizeInstallmentPlan({ plannedAmountCents: 0, installments: [rate(1, 0, false)] })).toThrow(RangeError)
    expect(() =>
      summarizeInstallmentPlan({ plannedAmountCents: 0, installments: [rate(1, 100, false), rate(1, 100, false)] }),
    ).toThrow(RangeError)
    expect(() => summarizeInstallmentPlan({ plannedAmountCents: 0, installments: [rate(0, 100, false)] })).toThrow(RangeError)
  })
})
