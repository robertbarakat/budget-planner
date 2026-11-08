import { computeAccountBalances, eurosToCents } from 'budget-planner-shared'
import { ArchivableService, BaseService } from './base-service.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'

/** Saldi correnti per conto (id -> euro) e totale. */
export interface CurrentBalances {
  balances: Record<number, number>
  total: number
}

/** Area "conti": conti e saldi iniziali per anno. */
export class AccountsService {
  readonly accounts: ArchivableService<'accounts'>
  readonly openingBalances: BaseService<'opening_balances'>
  private readonly transactions: BaseService<'transactions'>

  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    this.accounts = new ArchivableService('accounts', getClient)
    this.openingBalances = new BaseService('opening_balances', getClient)
    this.transactions = new BaseService('transactions', getClient)
  }

  /**
   * Imposta il saldo iniziale di un conto per un anno: lo crea o, se c'è già, lo aggiorna.
   * `source` è `manual` quando lo scrive l'utente (specifica, sezione 3).
   */
  async setOpeningBalance(accountId: number, year: number, amount: number) {
    return this.saveOpeningBalance(accountId, year, amount, 'manual')
  }

  /**
   * Riporta il saldo finale dell'anno prima come saldo iniziale di `year`:
   * saldo iniziale dell'anno prima (0 se manca) + movimenti dell'anno prima del conto,
   * calcolati con `computeAccountBalances` di `shared/`. Restituisce la riga salvata (`carried_over`).
   */
  async carryOverOpeningBalance(accountId: number, year: number) {
    const previousYear = year - 1
    const range = { column: 'transaction_date' as const, from: `${previousYear}-01-01`, to: `${previousYear}-12-31` }
    const [openings, outgoing, incoming] = await Promise.all([
      this.openingBalances.list({ where: { account_id: accountId, year: previousYear } }),
      this.transactions.list({ where: { account_id: accountId }, range }),
      this.transactions.list({ where: { destination_account_id: accountId }, range }),
    ])
    const balances = computeAccountBalances(
      openings.map((row) => ({ accountId, amountCents: eurosToCents(row.amount) })),
      [...outgoing, ...incoming].map((row) => ({
        type: row.type,
        accountId: row.account_id,
        destinationAccountId: row.destination_account_id,
        amountCents: eurosToCents(row.amount),
      })),
    )
    const balanceCents = balances.accounts.find((entry) => entry.accountId === accountId)?.balanceCents ?? 0
    return this.saveOpeningBalance(accountId, year, balanceCents / 100, 'carried_over')
  }

  /**
   * Saldo corrente di ogni conto e totale, in euro: saldo iniziale dell'anno + movimenti dell'anno fino a `today`
   * (estremo incluso), calcolati con `computeAccountBalances` di `shared/`. Un conto senza saldo iniziale parte da 0.
   * I trasferimenti spostano denaro tra due conti senza cambiare il totale.
   */
  async currentBalances(year: number, today: string): Promise<CurrentBalances> {
    const [openings, rows] = await Promise.all([
      this.openingBalances.list({ where: { year } }),
      this.transactions.list({ range: { column: 'transaction_date', from: `${year}-01-01`, to: today } }),
    ])
    const result = computeAccountBalances(
      openings.map((row) => ({ accountId: row.account_id, amountCents: eurosToCents(row.amount) })),
      rows.map((row) => ({
        type: row.type,
        accountId: row.account_id,
        destinationAccountId: row.destination_account_id,
        amountCents: eurosToCents(row.amount),
      })),
    )
    return {
      balances: Object.fromEntries(result.accounts.map((entry) => [entry.accountId, entry.balanceCents / 100])),
      total: result.totalCents / 100,
    }
  }

  /**
   * Id dei conti collegati a movimenti (come origine o destinazione) o a saldi iniziali:
   * quelli non si eliminano, si archiviano.
   */
  async listAccountIdsInUse(): Promise<number[]> {
    const [fromRows, toRows, balanceRows] = await Promise.all([
      this.transactions.listColumn('account_id'),
      this.transactions.listColumn('destination_account_id'),
      this.openingBalances.listColumn('account_id'),
    ])
    const ids = new Set<number>()
    for (const row of fromRows) ids.add(row.account_id)
    for (const row of toRows) if (row.destination_account_id !== null) ids.add(row.destination_account_id)
    for (const row of balanceRows) ids.add(row.account_id)
    return [...ids]
  }

  private async saveOpeningBalance(accountId: number, year: number, amount: number, source: 'manual' | 'carried_over') {
    const [existing] = await this.openingBalances.list({ where: { account_id: accountId, year } })
    return existing
      ? this.openingBalances.update(existing.id, { amount, source })
      : this.openingBalances.create({ account_id: accountId, year, amount, source })
  }
}

export const accountsService = new AccountsService()
