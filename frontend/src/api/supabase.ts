import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from 'budget-planner-shared'
import { readSupabaseEnv } from './env.ts'

export type TypedSupabaseClient = SupabaseClient<Database>

let client: TypedSupabaseClient | undefined

// Crea il client alla prima chiamata; lancia EnvError se mancano le variabili.
export function getSupabase(): TypedSupabaseClient {
  if (!client) {
    const { url, anonKey } = readSupabaseEnv()
    client = createClient<Database>(url, anonKey)
  }
  return client
}
