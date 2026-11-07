import { describe, expect, it } from 'vitest'
import { computeAccountBalances, type TransactionInput } from './balances.ts'
import { eurosToCents } from './cents.ts'

const expense = (accountId: number, amountCents: number): TransactionInput => ({
  type: 'expense',
  accountId,
  destinationAccountId: null,
  amountCents,
})
const income = (accountId: number, amountCents: number): TransactionInput => ({
  type: 'income',
  accountId,
  destinationAccountId: null,
  amountCents,
})
const transfer = (from: number, to: number, amountCents: number): TransactionInput => ({
  type: 'transfer',
  accountId: from,
  destinationAccountId: to,
  amountCents,
})
const balanceOf = (result: ReturnType<typeof computeAccountBalances>, accountId: number) =>
  result.accounts.find((account) => account.accountId === accountId)?.balanceCents

describe('computeAccountBalances', () => {
  const opening = [
    { accountId: 1, amountCents: 100_000 },
    { accountId: 2, amountCents: 50_000 },
  ]

  it('moves the balance between two accounts with a transfer and keeps the total', () => {
    const before = computeAccountBalances(opening, [])
    const after = computeAccountBalances(opening, [transfer(1, 2, 30_000)])
    expect(balanceOf(after, 1)).toBe(70_000)
    expect(balanceOf(after, 2)).toBe(80_000)
    expect(after.totalCents).toBe(before.totalCents)
    expect(after.totalCents).toBe(150_000)
  })

  it('applies expenses and income to an account', () => {
    const result = computeAccountBalances(opening, [
      expense(1, 12_345),
      income(1, 200_000),
      expense(1, 555),
    ])
    expect(balanceOf(result, 1)).toBe(100_000 - 12_345 + 200_000 - 555)
    expect(balanceOf(result, 2)).toBe(50_000)
    expect(result.totalCents).toBe(balanceOf(result, 1)! + 50_000)
  })

  it('returns the opening balance for an account without transactions', () => {
    const result = computeAccountBalances(opening, [expense(1, 1_000)])
    expect(balanceOf(result, 2)).toBe(50_000)
  })

  it('handles no accounts and no transactions', () => {
    expect(computeAccountBalances([], [])).toEqual({ accounts: [], totalCents: 0 })
  })

  it('treats an account with transactions but no opening balance as starting from 0', () => {
    const result = computeAccountBalances([], [income(7, 2_500)])
    expect(result.accounts).toEqual([{ accountId: 7, balanceCents: 2_500 }])
  })

  it('computes 0.1 + 0.2 EUR as exactly 0.30 EUR', () => {
    const result = computeAccountBalances(
      [{ accountId: 1, amountCents: 0 }],
      [income(1, eurosToCents(0.1)), income(1, eurosToCents(0.2))],
    )
    expect(balanceOf(result, 1)).toBe(30)
    expect(result.totalCents).toBe(30)
  })

  it('allows a negative balance', () => {
    const result = computeAccountBalances(opening, [expense(2, 60_000)])
    expect(balanceOf(result, 2)).toBe(-10_000)
  })

  it('rejects invalid input', () => {
    expect(() => computeAccountBalances(opening, [expense(1, 10.5)])).toThrow(RangeError)
    expect(() => computeAccountBalances(opening, [expense(1, 0)])).toThrow(RangeError)
    expect(() => computeAccountBalances(opening, [expense(1, -5)])).toThrow(RangeError)
    expect(() => computeAccountBalances(opening, [transfer(1, 1, 100)])).toThrow(RangeError)
    expect(() =>
      computeAccountBalances(opening, [
        { type: 'transfer', accountId: 1, destinationAccountId: null, amountCents: 100 },
      ]),
    ).toThrow(RangeError)
    expect(() =>
      computeAccountBalances([...opening, { accountId: 1, amountCents: 5 }], []),
    ).toThrow(RangeError)
  })
})
