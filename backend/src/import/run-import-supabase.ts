import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from 'budget-planner-shared'
import type { ImportStore } from './run-import.ts'

// Funzione amministrativa esplicita (BP-125): chiave di servizio, usata solo dal comando di import
// dopo la conferma digitata. Chiama la funzione SQL import_transactions (BP-124).

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]'])
export const isLocalUrl = (url: string): boolean => LOCAL_HOSTS.has(new URL(url).hostname)

export function createSupabaseImportStore(url: string, serviceRoleKey: string): { store: ImportStore; host: string } {
  const client = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false } })
  const store: ImportStore = {
    async countTransactions() {
      const { count, error } = await client.from('transactions').select('id', { count: 'exact', head: true })
      if (error) throw new Error(`Controllo del database non riuscito: ${error.message}`)
      return count ?? 0
    },
    async importTransactions(rows) {
      const { data, error } = await client.rpc('import_transactions', { p_transactions: rows as unknown as Json })
      if (error) throw new Error(`Import non riuscito (nessun movimento scritto): ${error.message}`)
      const result = data[0]
      if (!result) throw new Error('Import: risposta vuota dal database.')
      return result
    },
  }
  return { store, host: new URL(url).host }
}
