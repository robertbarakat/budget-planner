import { AppError } from './api-error.ts'
import { BaseService, fetchAllRows, unwrap, type InsertOf, type PagedQuery, type RowOf, type UpdateOf } from './base-service.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'

export interface TransactionFilters {
  /** Data minima (inclusa), `YYYY-MM-DD`. */
  from?: string
  /** Data massima (inclusa), `YYYY-MM-DD`. */
  to?: string
  /** Movimenti in cui il conto è origine o destinazione (trasferimenti inclusi). */
  accountId?: number
  categoryId?: number
  budgetItemId?: number
  type?: RowOf<'transactions'>['type']
  /** Numero massimo di movimenti (i più recenti, per l'ordinamento). */
  limit?: number
}

/** Area "movimenti": spese, entrate e trasferimenti reali. */
export class TransactionsService extends BaseService<'transactions'> {
  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    super('transactions', getClient)
  }

  /** Movimenti filtrati, dal più recente al più vecchio. */
  async listFiltered(filters: TransactionFilters = {}): Promise<RowOf<'transactions'>[]> {
    const build = () => {
      let query = this.client.from('transactions').select('*')
      if (filters.from !== undefined) query = query.gte('transaction_date', filters.from)
      if (filters.to !== undefined) query = query.lte('transaction_date', filters.to)
      if (filters.accountId !== undefined) {
        query = query.or(`account_id.eq.${filters.accountId},destination_account_id.eq.${filters.accountId}`)
      }
      if (filters.categoryId !== undefined) query = query.eq('category_id', filters.categoryId)
      if (filters.budgetItemId !== undefined) query = query.eq('budget_item_id', filters.budgetItemId)
      if (filters.type !== undefined) query = query.eq('type', filters.type)
      query = query.order('transaction_date', { ascending: false }).order('id', { ascending: false })
      return query
    }
    // Con `limit` una sola risposta; altrimenti tutte le righe, anche oltre il tetto di Supabase.
    if (filters.limit !== undefined) return unwrap(await build().limit(filters.limit))
    return fetchAllRows(build as unknown as () => PagedQuery<RowOf<'transactions'>[]>, true)
  }

  /** Tutti i movimenti di un anno solare, dal più recente al più vecchio. */
  listForYear(year: number): Promise<RowOf<'transactions'>[]> {
    return this.listFiltered({ from: `${year}-01-01`, to: `${year}-12-31` })
  }

  /** Id delle categorie che hanno almeno un movimento: servono a sapere quali non si possono eliminare. */
  async listCategoryIdsInUse(): Promise<number[]> {
    const rows = await this.listColumn('category_id')
    return [...new Set(rows.flatMap((row) => (row.category_id === null ? [] : [row.category_id])))]
  }

  /**
   * Aggiorna un movimento. Se la modifica include il tipo (come fa il form, che invia sempre i valori
   * completi) controlla prima le regole del vincolo; gli aggiornamenti parziali senza tipo passano così come sono.
   */
  override async update(id: number, values: UpdateOf<'transactions'>): Promise<RowOf<'transactions'>> {
    if (values.type !== undefined) checkTransactionShape(values as InsertOf<'transactions'>)
    return await super.update(id, values)
  }

  /** Crea un movimento dopo aver controllato le regole che il database imposta con un vincolo. */
  override async create(values: InsertOf<'transactions'>): Promise<RowOf<'transactions'>> {
    checkTransactionShape(values)
    return await super.create(values)
  }
}

/** Regole del vincolo `transactions_type_consistency`, controllate prima per dare un messaggio chiaro. */
export function checkTransactionShape(values: InsertOf<'transactions'>): void {
  if (values.type === 'transfer') {
    if (values.destination_account_id == null) {
      throw new AppError('invalid', null, undefined, 'Per un trasferimento serve il conto di destinazione.')
    }
    if (values.destination_account_id === values.account_id) {
      throw new AppError('invalid', null, undefined, 'Il conto di destinazione deve essere diverso da quello di origine.')
    }
    return
  }
  if (values.destination_account_id != null) {
    throw new AppError('invalid', null, undefined, 'Il conto di destinazione serve solo per i trasferimenti.')
  }
  if (values.category_id == null || values.budget_item_id == null) {
    throw new AppError('invalid', null, undefined, 'Per spese ed entrate servono categoria e voce di budget.')
  }
}

export const transactionsService = new TransactionsService()
