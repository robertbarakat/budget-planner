import type { Database } from 'budget-planner-shared'
import { toAppError } from './api-error.ts'
import type { TypedSupabaseClient } from './supabase.ts'

type Tables = Database['public']['Tables']
export type TableName = keyof Tables
export type RowOf<T extends TableName> = Tables[T]['Row']
export type InsertOf<T extends TableName> = Tables[T]['Insert']
export type UpdateOf<T extends TableName> = Tables[T]['Update']

export interface ListOptions<T extends TableName> {
  /** Uguaglianza su una o più colonne (es. `{ year: 2026, archived: false }`). */
  where?: Partial<RowOf<T>>
  /** Ordinamento; se omesso, nessun ordine garantito. */
  orderBy?: ReadonlyArray<{ column: keyof RowOf<T> & string; ascending?: boolean }>
}

/**
 * Classe base dei servizi: CRUD generico su una tabella. Ogni area logica ne estende una o più istanze
 * e aggiunge i propri metodi specifici. Gli errori di Supabase diventano sempre `AppError`.
 */
export abstract class BaseService<T extends TableName> {
  protected readonly table: T
  private readonly getClient: () => TypedSupabaseClient

  protected constructor(table: T, getClient: () => TypedSupabaseClient) {
    this.table = table
    this.getClient = getClient
  }

  protected get client(): TypedSupabaseClient {
    return this.getClient()
  }

  /** Elenco, con filtri di uguaglianza e ordinamento. */
  async list(options: ListOptions<T> = {}): Promise<RowOf<T>[]> {
    // I tipi generici di Supabase non seguono un nome di tabella generico: il cast è confinato qui.
    let query = this.client.from(this.table).select('*') as unknown as FilterableQuery<RowOf<T>[]>
    if (options.where) query = query.match(options.where as Record<string, unknown>)
    for (const order of options.orderBy ?? []) {
      query = query.order(order.column, { ascending: order.ascending ?? true })
    }
    return unwrap(await query)
  }

  /** Una riga per id; `AppError` di tipo `not_found` se non esiste. */
  async getById(id: number): Promise<RowOf<T>> {
    const query = this.client.from(this.table).select('*').eq('id' as never, id as never) as unknown as SingleQuery<
      RowOf<T>
    >
    return unwrap(await query.single())
  }

  async create(values: InsertOf<T>): Promise<RowOf<T>> {
    const query = this.client.from(this.table).insert(values as never).select() as unknown as SingleQuery<RowOf<T>>
    return unwrap(await query.single())
  }

  async update(id: number, values: UpdateOf<T>): Promise<RowOf<T>> {
    const query = this.client
      .from(this.table)
      .update(values as never)
      .eq('id' as never, id as never)
      .select() as unknown as SingleQuery<RowOf<T>>
    return unwrap(await query.single())
  }

  async remove(id: number): Promise<void> {
    const result = (await this.client
      .from(this.table)
      .delete()
      .eq('id' as never, id as never)) as unknown as QueryResult<null>
    unwrap(result)
  }
}

export interface QueryResult<D> {
  data: D | null
  error: unknown
}

interface FilterableQuery<D> extends PromiseLike<QueryResult<D>> {
  match(values: Record<string, unknown>): FilterableQuery<D>
  order(column: string, options: { ascending: boolean }): FilterableQuery<D>
}

interface SingleQuery<D> {
  single(): PromiseLike<QueryResult<D>>
}

/** Restituisce i dati o lancia `AppError`. Usata anche dai servizi per le funzioni SQL. */
export function unwrap<D>(result: QueryResult<D>): D {
  if (result.error) throw toAppError(result.error)
  return result.data as D
}
