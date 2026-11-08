import type { MappingRule } from 'budget-planner-shared'

// Anagrafiche mancanti prima dell'import (BP-122).
// planMasterData confronta le destinazioni della mappatura e i conti dell'export con quelle esistenti
// e decide cosa creare; applyMasterDataPlan lo esegue tramite uno store (nel codice reale Supabase).
// Si crea solo ciò che manca: rieseguire dopo la scrittura dà un piano vuoto (idempotente).
// I conti non si creano mai in automatico: un conto assente è un errore bloccante.

export interface ExistingMasterData {
  macroAreas: Array<{ id: number; name: string; sortOrder: number; archived: boolean }>
  budgetItems: Array<{ id: number; name: string; macroAreaId: number; sortOrder: number; archived: boolean }>
  categories: Array<{ id: number; name: string; budgetItemId: number; sortOrder: number; archived: boolean }>
  accounts: Array<{ name: string; archived: boolean }>
}

export interface MasterDataPlan {
  macroAreas: string[]
  budgetItems: Array<{ name: string; macroArea: string; kind: 'income' | 'expense' }>
  categories: Array<{ name: string; budgetItem: string }>
  /** Errori bloccanti: se ce ne sono, non si scrive nulla. */
  errors: string[]
}

const key = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase()

export function planMasterData(
  rules: readonly MappingRule[],
  existing: ExistingMasterData,
  exportAccountNames: readonly string[],
): MasterDataPlan {
  const plan: MasterDataPlan = { macroAreas: [], budgetItems: [], categories: [], errors: [] }

  const activeAccounts = new Set(existing.accounts.filter((a) => !a.archived).map((a) => key(a.name)))
  for (const name of new Set(exportAccountNames.map((n) => n.trim()).filter(Boolean))) {
    if (!activeAccounts.has(key(name))) plan.errors.push(`Conto "${name}" dell'export assente nel database (non si crea in automatico).`)
  }

  const macroAreaByName = new Map(existing.macroAreas.map((m) => [key(m.name), m]))
  const itemByName = new Map(existing.budgetItems.map((b) => [key(b.name), b]))
  const categoryByName = new Map(existing.categories.map((c) => [key(c.name), c]))
  const plannedMacroAreas = new Set<string>()
  const plannedItems = new Map<string, string>() // voce -> macro-area pianificata
  const plannedCategories = new Map<string, string>() // categoria -> voce

  for (const rule of rules) {
    const itemKey = key(rule.targetBudgetItem)
    const existingItem = itemByName.get(itemKey)

    if (existingItem?.archived) {
      plan.errors.push(`La voce "${rule.targetBudgetItem}" esiste ma è archiviata: riattivala o cambia la mappatura.`)
    } else if (!existingItem && !plannedItems.has(itemKey)) {
      if (!rule.targetMacroArea || !rule.targetKind) {
        plan.errors.push(`La voce "${rule.targetBudgetItem}" non esiste: nella regola servono "targetMacroArea" e "targetKind" per crearla.`)
      } else {
        const areaKey = key(rule.targetMacroArea)
        const area = macroAreaByName.get(areaKey)
        if (area?.archived) {
          plan.errors.push(`La macro-area "${rule.targetMacroArea}" esiste ma è archiviata.`)
        } else {
          if (!area && !plannedMacroAreas.has(areaKey)) {
            plannedMacroAreas.add(areaKey)
            plan.macroAreas.push(rule.targetMacroArea.trim())
          }
          plannedItems.set(itemKey, rule.targetMacroArea)
          plan.budgetItems.push({ name: rule.targetBudgetItem.trim(), macroArea: rule.targetMacroArea.trim(), kind: rule.targetKind })
        }
      }
    }

    const categoryKey = key(rule.targetCategory)
    const existingCategory = categoryByName.get(categoryKey)
    if (existingCategory) {
      if (existingCategory.archived) {
        plan.errors.push(`La categoria "${rule.targetCategory}" esiste ma è archiviata: riattivala o cambia la mappatura.`)
      } else if (existingItem && existingCategory.budgetItemId !== existingItem.id) {
        plan.errors.push(`La categoria "${rule.targetCategory}" esiste già sotto un'altra voce, non sotto "${rule.targetBudgetItem}".`)
      } else if (!existingItem) {
        plan.errors.push(`La categoria "${rule.targetCategory}" esiste già sotto un'altra voce, non sotto "${rule.targetBudgetItem}".`)
      }
    } else {
      const planned = plannedCategories.get(categoryKey)
      if (planned === undefined) {
        plannedCategories.set(categoryKey, itemKey)
        plan.categories.push({ name: rule.targetCategory.trim(), budgetItem: rule.targetBudgetItem.trim() })
      } else if (planned !== itemKey) {
        plan.errors.push(`La categoria "${rule.targetCategory}" è mappata su due voci diverse.`)
      }
    }
  }
  plan.errors = [...new Set(plan.errors)]
  return plan
}

export const planIsEmpty = (plan: MasterDataPlan): boolean =>
  plan.macroAreas.length + plan.budgetItems.length + plan.categories.length === 0

export function describePlan(plan: MasterDataPlan): string[] {
  return [
    ...plan.errors.map((e) => `ERRORE BLOCCANTE: ${e}`),
    ...plan.macroAreas.map((m) => `Creerei macro-area "${m}"`),
    ...plan.budgetItems.map((b) => `Creerei voce "${b.name}" (${b.kind}) in "${b.macroArea}"`),
    ...plan.categories.map((c) => `Creerei categoria "${c.name}" nella voce "${c.budgetItem}"`),
  ]
}

export interface MasterDataStore {
  createMacroArea(name: string, sortOrder: number): Promise<number>
  createBudgetItem(macroAreaId: number, name: string, kind: 'income' | 'expense', sortOrder: number): Promise<number>
  createCategory(budgetItemId: number, name: string, sortOrder: number): Promise<void>
}

const nextSort = (values: number[]): (() => number) => {
  let current = values.reduce((max, v) => Math.max(max, v), 0)
  return () => ++current
}

/** Esegue il piano. Rifiuta di scrivere se ci sono errori bloccanti. */
export async function applyMasterDataPlan(plan: MasterDataPlan, existing: ExistingMasterData, store: MasterDataStore): Promise<void> {
  if (plan.errors.length > 0) throw new Error('Il piano ha errori bloccanti: nessuna scrittura.')
  const macroAreaIds = new Map(existing.macroAreas.map((m) => [key(m.name), m.id]))
  const itemIds = new Map(existing.budgetItems.map((b) => [key(b.name), b.id]))
  const nextArea = nextSort(existing.macroAreas.map((m) => m.sortOrder))
  const nextItem = nextSort(existing.budgetItems.map((b) => b.sortOrder))
  const nextCategory = nextSort(existing.categories.map((c) => c.sortOrder))

  for (const name of plan.macroAreas) macroAreaIds.set(key(name), await store.createMacroArea(name, nextArea()))
  for (const item of plan.budgetItems) {
    const areaId = macroAreaIds.get(key(item.macroArea))!
    itemIds.set(key(item.name), await store.createBudgetItem(areaId, item.name, item.kind, nextItem()))
  }
  for (const category of plan.categories) {
    await store.createCategory(itemIds.get(key(category.budgetItem))!, category.name, nextCategory())
  }
}
