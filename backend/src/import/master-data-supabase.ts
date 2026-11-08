import { createClient } from '@supabase/supabase-js'
import type { Database } from 'budget-planner-shared'
import type { ExistingMasterData, MasterDataStore } from './master-data.ts'

// Funzione amministrativa esplicita (BP-122): usa la chiave di servizio, quindi aggira la RLS.
// Serve solo allo script di preparazione dell'import, che scrive solo dopo conferma esplicita.

export function createSupabaseMasterData(url: string, serviceRoleKey: string) {
  const client = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false } })

  async function load(): Promise<ExistingMasterData> {
    const [macroAreas, budgetItems, categories, accounts] = await Promise.all([
      client.from('macro_areas').select('id, name, sort_order, archived'),
      client.from('budget_items').select('id, name, macro_area_id, sort_order, archived'),
      client.from('categories').select('id, name, budget_item_id, sort_order, archived'),
      client.from('accounts').select('name, archived'),
    ])
    for (const result of [macroAreas, budgetItems, categories, accounts]) {
      if (result.error) throw new Error(`Lettura delle anagrafiche non riuscita: ${result.error.message}`)
    }
    return {
      macroAreas: macroAreas.data!.map((r) => ({ id: r.id, name: r.name, sortOrder: r.sort_order, archived: r.archived })),
      budgetItems: budgetItems.data!.map((r) => ({
        id: r.id,
        name: r.name,
        macroAreaId: r.macro_area_id,
        sortOrder: r.sort_order,
        archived: r.archived,
      })),
      categories: categories.data!.map((r) => ({
        id: r.id,
        name: r.name,
        budgetItemId: r.budget_item_id,
        sortOrder: r.sort_order,
        archived: r.archived,
      })),
      accounts: accounts.data!.map((r) => ({ name: r.name, archived: r.archived })),
    }
  }

  const store: MasterDataStore = {
    async createMacroArea(name, sortOrder) {
      const { data, error } = await client.from('macro_areas').insert({ name, sort_order: sortOrder }).select('id').single()
      if (error) throw new Error(`Creazione macro-area "${name}" non riuscita: ${error.message}`)
      return data.id
    },
    async createBudgetItem(macroAreaId, name, kind, sortOrder) {
      const { data, error } = await client
        .from('budget_items')
        .insert({ macro_area_id: macroAreaId, name, kind, sort_order: sortOrder })
        .select('id')
        .single()
      if (error) throw new Error(`Creazione voce "${name}" non riuscita: ${error.message}`)
      return data.id
    },
    async createCategory(budgetItemId, name, sortOrder) {
      const { error } = await client.from('categories').insert({ budget_item_id: budgetItemId, name, sort_order: sortOrder })
      if (error) throw new Error(`Creazione categoria "${name}" non riuscita: ${error.message}`)
    },
  }

  return { load, store, host: new URL(url).host }
}
