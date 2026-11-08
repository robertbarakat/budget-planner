import { AppError } from './api-error.ts'
import { BaseService, unwrap, type InsertOf, type RowOf } from './base-service.ts'
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
}

/** Area "movimenti": spese, entrate e trasferimenti reali. */
export class TransactionsService extends BaseService<'transactions'> {
  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    super('transactions', getClient)
  }

  /** Movimenti filtrati, dal più recente al più vecchio. */
  async listFiltered(filters: TransactionFilters = {}): Promise<RowOf<'transactions'>[]> {
    let query = this.client.from('transactions').select('*')
    if (filters.from !== undefined) query = query.gte('transaction_date', filters.from)
    if (filters.to !== undefined) query = query.lte('transaction_date', filters.to)
    if (filters.accountId !== undefined) {
      query = query.or(`account_id.eq.${filters.accountId},destination_account_id.eq.${filters.accountId}`)
    }
    if (filters.categoryId !== undefined) query = query.eq('category_id', filters.categoryId)
    if (filters.budgetItemId !== undefined) query = query.eq('budget_item_id', filters.budgetItemId)
    if (filters.type !== undefined) query = query.eq('type', filters.type)
    return unwrap(await query.order('transaction_date', { ascending: false }).order('id', { ascending: false }))
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
