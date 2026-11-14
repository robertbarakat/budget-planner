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
  /** Intervallo (estremi inclusi) su una colonna, tipicamente una data (`YYYY-MM-DD`). */
  range?: { column: keyof RowOf<T> & string; from?: string; to?: string }
}

/**
 * Classe base dei servizi: CRUD generico su una tabella. Ogni area logica ne estende una o più istanze
 * e aggiunge i propri metodi specifici. Gli errori di Supabase diventano sempre `AppError`.
 */
export class BaseService<T extends TableName> {
  protected readonly table: T
  private readonly getClient: () => TypedSupabaseClient

  constructor(table: T, getClient: () => TypedSupabaseClient) {
    this.table = table
    this.getClient = getClient
  }

  protected get client(): TypedSupabaseClient {
    return this.getClient()
  }

  /** Elenco, con filtri di uguaglianza e ordinamento. */
  async list(options: ListOptions<T> = {}): Promise<RowOf<T>[]> {
    const build = (): FilterableQuery<RowOf<T>[]> => {
      // I tipi generici di Supabase non seguono un nome di tabella generico: il cast è confinato qui.
      let query = this.client.from(this.table).select('*') as unknown as FilterableQuery<RowOf<T>[]>
      if (options.where) query = query.match(options.where as Record<string, unknown>)
      if (options.range?.from !== undefined) query = query.gte(options.range.column, options.range.from)
      if (options.range?.to !== undefined) query = query.lte(options.range.column, options.range.to)
      for (const order of options.orderBy ?? []) {
        query = query.order(order.column, { ascending: order.ascending ?? true })
      }
      return query
    }
    return fetchAllRows(build, (options.orderBy?.length ?? 0) > 0)
  }

  /** Solo una colonna di tutte le righe (più leggero di `list` quando serve poco). */
  async listColumn<K extends keyof RowOf<T> & string>(column: K): Promise<Pick<RowOf<T>, K>[]> {
    return fetchAllRows(
      () => this.client.from(this.table).select(column) as unknown as FilterableQuery<Pick<RowOf<T>, K>[]>,
      false,
    )
  }

  /** Una colonna delle righe che soddisfano un'uguaglianza (es. `{ category_id: 5 }`). */
  async listColumnsWhere<K extends keyof RowOf<T> & string>(
    where: Partial<RowOf<T>>,
    column: K,
  ): Promise<Pick<RowOf<T>, K>[]> {
    return fetchAllRows(
      () =>
        (this.client.from(this.table).select(column) as unknown as FilterableQuery<Pick<RowOf<T>, K>[]>).match(
          where as Record<string, unknown>,
        ),
      false,
    )
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

/** Servizio per le tabelle con `archived` e `sort_order` (anagrafiche): aggiunge archivia, ripristina, riordina. */
export class ArchivableService<T extends ArchivableTable> extends BaseService<T> {
  /** Archivia: l'elemento sparisce dalle scelte ma resta nello storico (specifica, sezione 3). */
  archive(id: number): Promise<RowOf<T>> {
    return this.update(id, { archived: true } as UpdateOf<T>)
  }

  unarchive(id: number): Promise<RowOf<T>> {
    return this.update(id, { archived: false } as UpdateOf<T>)
  }

  /** Imposta la posizione nell'elenco. */
  reorder(id: number, sortOrder: number): Promise<RowOf<T>> {
    return this.update(id, { sort_order: sortOrder } as UpdateOf<T>)
  }

  /**
   * Applica un nuovo ordine: `orderedIds[i]` prende `sort_order = i`. Con `currentOrder` (id -> posizione
   * attuale) salta chi è già al suo posto, così un riordino tocca poche righe.
   */
  async reorderAll(orderedIds: number[], currentOrder: Readonly<Record<number, number>> = {}): Promise<void> {
    const changed = orderedIds.flatMap((id, index) => (currentOrder[id] === index ? [] : [{ id, index }]))
    await Promise.all(changed.map(({ id, index }) => this.reorder(id, index)))
  }
}

/** Tabelle con le colonne `archived` e `sort_order`. */
export type ArchivableTable = 'macro_areas' | 'budget_items' | 'categories' | 'accounts' | 'clients'

export interface QueryResult<D> {
  data: D | null
  error: unknown
}

interface FilterableQuery<D> extends PromiseLike<QueryResult<D>> {
  match(values: Record<string, unknown>): FilterableQuery<D>
  gte(column: string, value: string): FilterableQuery<D>
  lte(column: string, value: string): FilterableQuery<D>
  order(column: string, options: { ascending: boolean }): FilterableQuery<D>
  range(from: number, to: number): FilterableQuery<D>
}

/** Query che si può leggere a pagine: ordinabile e con `range`. */
export interface PagedQuery<D> extends PromiseLike<QueryResult<D>> {
  order(column: string, options: { ascending: boolean }): PagedQuery<D>
  range(from: number, to: number): PagedQuery<D>
}

/** Righe massime per risposta: è il limite predefinito di Supabase (PostgREST). */
export const PAGE_SIZE = 1000

/**
 * Legge tutte le righe di una query anche oltre `PAGE_SIZE`. Se la prima risposta è piena rilegge a pagine
 * (`range`); senza un ordine esplicito aggiunge `id` perché le pagine non si sovrappongano né perdano righe.
 */
export async function fetchAllRows<R>(build: () => PagedQuery<R[]>, ordered: boolean): Promise<R[]> {
  const first = unwrap(await build())
  if (first.length < PAGE_SIZE) return first
  const rows: R[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const base = build()
    const query = ordered ? base : base.order('id', { ascending: true })
    const page = unwrap(await query.range(from, from + PAGE_SIZE - 1))
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

interface SingleQuery<D> {
  single(): PromiseLike<QueryResult<D>>
}

/** Restituisce i dati o lancia `AppError`. Usata anche dai servizi per le funzioni SQL. */
export function unwrap<D>(result: QueryResult<D>): D {
  if (result.error) throw toAppError(result.error)
  return result.data as D
}
