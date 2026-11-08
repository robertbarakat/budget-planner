import type { QueryResult } from './base-service.ts'
import type { TypedSupabaseClient } from './supabase.ts'

/** Chiamata registrata dal client simulato: nome del metodo e argomenti. */
export interface RecordedCall {
  method: string
  args: unknown[]
}

export interface FakeSupabase {
  client: TypedSupabaseClient
  /** Chiamate fatte, in ordine: `from`, `select`, `eq`, `rpc`... */
  calls: RecordedCall[]
}

/** Risultato fisso, oppure calcolato dalle chiamate fatte su quella query (es. i filtri di `match`). */
export type FakeResult = QueryResult<unknown> | ((queryCalls: RecordedCall[]) => QueryResult<unknown>)

/** Risultato unico per ogni tabella, oppure un risultato per nome di tabella (o di funzione per `rpc`). */
export type FakeResults = FakeResult | Record<string, FakeResult>

function isResult(results: FakeResults): results is FakeResult {
  return typeof results === 'function' || ('data' in results && 'error' in results)
}

/**
 * Client Supabase simulato per i test dei servizi: ogni metodo del builder registra la chiamata e
 * restituisce lo stesso builder; `await` e `.single()` restituiscono il risultato della tabella.
 */
export function fakeSupabase(results: FakeResults): FakeSupabase {
  const calls: RecordedCall[] = []
  const resultFor = (name: string, queryCalls: RecordedCall[]): QueryResult<unknown> => {
    const picked = isResult(results) ? results : (results[name] ?? { data: [], error: null })
    return typeof picked === 'function' ? picked(queryCalls) : picked
  }

  const makeBuilder = (name: string): Record<string, unknown> => {
    const builder: Record<string, unknown> = {}
    const queryCalls: RecordedCall[] = []
    const record =
      (method: string) =>
      (...args: unknown[]) => {
        calls.push({ method, args })
        queryCalls.push({ method, args })
        return builder
      }
    for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'match', 'order', 'gte', 'lte', 'in']) {
      builder[method] = record(method)
    }
    builder.single = () => {
      calls.push({ method: 'single', args: [] })
      return Promise.resolve(resultFor(name, queryCalls))
    }
    // Il builder reale di Supabase è "thenable": va imitato per far funzionare `await`.
    // oxlint-disable-next-line unicorn/no-thenable
    builder.then = (resolve: (value: QueryResult<unknown>) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(resultFor(name, queryCalls)).then(resolve, reject)
    return builder
  }

  const client = {
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] })
      return makeBuilder(table)
    },
    rpc: (fn: string, params: unknown) => {
      calls.push({ method: 'rpc', args: [fn, params] })
      return makeBuilder(fn)
    },
  }
  return { client: client as unknown as TypedSupabaseClient, calls }
}
