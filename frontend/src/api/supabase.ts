import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readSupabaseEnv } from './env.ts'

let client: SupabaseClient | undefined

// Crea il client alla prima chiamata; lancia EnvError se mancano le variabili.
export function getSupabase(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = readSupabaseEnv()
    client = createClient(url, anonKey)
  }
  return client
}
