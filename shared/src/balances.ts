import { sumCents } from './cents.ts'
import type { TransactionType } from './domain.ts'

/** Opening balance of an account for the year, in integer cents. */
export interface OpeningBalanceInput {
  accountId: number
  amountCents: number
}

/** A real transaction, in integer cents. The amount is always positive: the sign comes from the type. */
export interface TransactionInput {
  type: TransactionType
  accountId: number
  /** Required for transfers, ignored otherwise. */
  destinationAccountId: number | null
  amountCents: number
}

export interface AccountBalance {
  accountId: number
  balanceCents: number
}

export interface AccountBalances {
  /** One entry per account, ordered by account id. */
  accounts: AccountBalance[]
  /** Sum of all account balances. Transfers never change it. */
  totalCents: number
}

/**
 * Balance of each account = opening balance + income - expenses +/- transfers.
 *
 * - An account that appears only in transactions has an opening balance of 0.
 * - A transfer removes the amount from the source account and adds it to the destination,
 *   so the total is unchanged.
 * - Pure function: no I/O, amounts in integer cents (no floating point errors).
 */
export function computeAccountBalances(
  openingBalances: readonly OpeningBalanceInput[],
  transactions: readonly TransactionInput[],
): AccountBalances {
  const balances = new Map<number, number>()

  for (const { accountId, amountCents } of openingBalances) {
    assertIntegerCents(amountCents)
    if (balances.has(accountId)) {
      throw new RangeError(`Duplicate opening balance for account ${accountId}`)
    }
    balances.set(accountId, amountCents)
  }

  const add = (accountId: number, deltaCents: number): void => {
    balances.set(accountId, (balances.get(accountId) ?? 0) + deltaCents)
  }

  for (const transaction of transactions) {
    const { type, accountId, destinationAccountId, amountCents } = transaction
    assertIntegerCents(amountCents)
    if (amountCents <= 0) {
      throw new RangeError(`Transaction amount must be positive: ${amountCents}`)
    }
    switch (type) {
      case 'expense':
        add(accountId, -amountCents)
        break
      case 'income':
        add(accountId, amountCents)
        break
      case 'transfer':
        if (destinationAccountId === null || destinationAccountId === accountId) {
          throw new RangeError('A transfer needs a destination account different from the source')
        }
        add(accountId, -amountCents)
        add(destinationAccountId, amountCents)
        break
    }
  }

  const accounts = [...balances.entries()]
    .map(([accountId, balanceCents]) => ({ accountId, balanceCents }))
    .sort((a, b) => a.accountId - b.accountId)

  return { accounts, totalCents: sumCents(accounts.map((account) => account.balanceCents)) }
}

function assertIntegerCents(amountCents: number): void {
  if (!Number.isInteger(amountCents)) {
    throw new RangeError(`Amount is not an integer number of cents: ${amountCents}`)
  }
}
