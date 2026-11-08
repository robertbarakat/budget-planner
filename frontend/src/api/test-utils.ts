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

/**
 * Client Supabase simulato per i test dei servizi: ogni metodo del builder registra la chiamata e
 * restituisce lo stesso builder; `await` e `.single()` restituiscono `result`.
 */
export function fakeSupabase(result: QueryResult<unknown>): FakeSupabase {
  const calls: RecordedCall[] = []
  const builder: Record<string, unknown> = {}
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    }
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'match', 'order', 'gte', 'lte', 'in']) {
    builder[method] = record(method)
  }
  builder.single = () => {
    calls.push({ method: 'single', args: [] })
    return Promise.resolve(result)
  }
  // Il builder reale di Supabase è "thenable": va imitato per far funzionare `await`.
  // oxlint-disable-next-line unicorn/no-thenable
  builder.then = (resolve: (value: QueryResult<unknown>) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)

  const client = {
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] })
      return builder
    },
    rpc: (name: string, params: unknown) => {
      calls.push({ method: 'rpc', args: [name, params] })
      return builder
    },
  }
  return { client: client as unknown as TypedSupabaseClient, calls }
}
