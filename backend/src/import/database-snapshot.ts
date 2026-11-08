import { createClient } from '@supabase/supabase-js'
import type { Database } from 'budget-planner-shared'
import { eurosToCents } from 'budget-planner-shared'
import type { DatabaseSnapshot } from './reconcile.ts'

// Sola lettura (BP-126 e BP-151): chiave di servizio usata dagli script di import, mai in lettura di dati altrui.

const PAGE = 1000

export function createSnapshotReader(url: string, serviceRoleKey: string) {
  const client = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false } })

  async function read(openingYear: number | null): Promise<DatabaseSnapshot> {
    const accounts = await client.from('accounts').select('id, name, archived')
    if (accounts.error) throw new Error(`Lettura dei conti non riuscita: ${accounts.error.message}`)

    const transactions: DatabaseSnapshot['transactions'] = []
    for (let from = 0; ; from += PAGE) {
      const page = await client
        .from('transactions')
        .select('type, transaction_date, amount, account_id, destination_account_id')
        .order('id')
        .range(from, from + PAGE - 1)
      if (page.error) throw new Error(`Lettura dei movimenti non riuscita: ${page.error.message}`)
      for (const t of page.data) {
        transactions.push({
          type: t.type,
          transactionDate: t.transaction_date,
          amountCents: eurosToCents(t.amount),
          accountId: t.account_id,
          destinationAccountId: t.destination_account_id,
        })
      }
      if (page.data.length < PAGE) break
    }

    let openingBalances: DatabaseSnapshot['openingBalances'] = []
    if (openingYear !== null) {
      const opening = await client.from('opening_balances').select('account_id, amount').eq('year', openingYear)
      if (opening.error) throw new Error(`Lettura dei saldi iniziali non riuscita: ${opening.error.message}`)
      openingBalances = opening.data.map((o) => ({ accountId: o.account_id, amountCents: eurosToCents(o.amount) }))
    }
    return { accounts: accounts.data, transactions, openingBalances }
  }

  return { read, client, host: new URL(url).host }
}
