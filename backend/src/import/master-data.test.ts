import { describe, expect, it } from 'vitest'
import { applyMasterDataPlan, describePlan, planIsEmpty, planMasterData } from './master-data.ts'
import type { ExistingMasterData, MasterDataStore } from './master-data.ts'

// Nomi inventati: nessuna anagrafica reale nel codice.
const rule = (item: string, category: string, extra: Record<string, unknown> = {}) => ({
  sourceCategory: 'x',
  commentContains: null,
  priority: 1,
  targetBudgetItem: item,
  targetCategory: category,
  targetMacroArea: 'AreaNuova',
  targetKind: 'expense' as const,
  ...extra,
})

function emptyData(): ExistingMasterData {
  return {
    macroAreas: [{ id: 1, name: 'AreaVecchia', sortOrder: 3, archived: false }],
    budgetItems: [{ id: 10, name: 'VoceVecchia', macroAreaId: 1, sortOrder: 7, archived: false }],
    categories: [{ id: 100, name: 'CatVecchia', budgetItemId: 10, sortOrder: 9, archived: false }],
    accounts: [{ name: 'ContoA', archived: false }],
  }
}

function fakeStore(data: ExistingMasterData) {
  const log: string[] = []
  let id = 1000
  const store: MasterDataStore = {
    async createMacroArea(name, sortOrder) {
      log.push(`area:${name}:${sortOrder}`)
      data.macroAreas.push({ id: ++id, name, sortOrder, archived: false })
      return id
    },
    async createBudgetItem(macroAreaId, name, _kind, sortOrder) {
      log.push(`item:${name}:${sortOrder}`)
      data.budgetItems.push({ id: ++id, name, macroAreaId, sortOrder, archived: false })
      return id
    },
    async createCategory(budgetItemId, name, sortOrder) {
      log.push(`cat:${name}:${sortOrder}`)
      data.categories.push({ id: ++id, name, budgetItemId, sortOrder, archived: false })
    },
  }
  return { store, log }
}

describe('planMasterData', () => {
  it('elenca solo ciò che manca', () => {
    const plan = planMasterData(
      [rule('VoceVecchia', 'CatVecchia'), rule('VoceNuova', 'CatNuova1'), rule('VoceNuova', 'CatNuova2'), rule('VoceVecchia', 'CatNuova3', { targetMacroArea: null })],
      emptyData(),
      ['ContoA'],
    )
    expect(plan.errors).toEqual([])
    expect(plan.macroAreas).toEqual(['AreaNuova'])
    expect(plan.budgetItems).toEqual([{ name: 'VoceNuova', macroArea: 'AreaNuova', kind: 'expense' }])
    expect(plan.categories.map((c) => c.name)).toEqual(['CatNuova1', 'CatNuova2', 'CatNuova3'])
    expect(describePlan(plan)).toContain('Creerei macro-area "AreaNuova"')
  })

  it('confronta i nomi senza distinguere maiuscole e spazi', () => {
    const plan = planMasterData([rule('  VOCEvecchia ', ' catVECCHIA ')], emptyData(), [])
    expect(planIsEmpty(plan)).toBe(true)
    expect(plan.errors).toEqual([])
  })

  it('un conto dell\'export assente è un errore bloccante', () => {
    const plan = planMasterData([], emptyData(), ['ContoA', 'ContoMancante'])
    expect(plan.errors).toEqual(['Conto "ContoMancante" dell\'export assente nel database (non si crea in automatico).'])
  })

  it('voce nuova senza macro-area o tipo: errore', () => {
    const plan = planMasterData([rule('VoceNuova', 'CatNuova', { targetKind: null })], emptyData(), [])
    expect(plan.errors[0]).toContain('servono "targetMacroArea" e "targetKind"')
  })

  it('categoria già esistente sotto un\'altra voce, o archiviata: errore', () => {
    const data = emptyData()
    data.categories.push({ id: 101, name: 'CatArchiviata', budgetItemId: 10, sortOrder: 10, archived: true })
    const plan = planMasterData([rule('AltraVoce', 'CatVecchia'), rule('VoceVecchia', 'CatArchiviata')], data, [])
    expect(plan.errors).toHaveLength(2)
  })
})

describe('applyMasterDataPlan', () => {
  const rules = [rule('VoceNuova', 'CatNuova'), rule('VoceVecchia', 'CatVecchia')]

  it('crea solo gli elementi mancanti, nell\'ordine giusto, con sort_order progressivo', async () => {
    const data = emptyData()
    const plan = planMasterData(rules, data, ['ContoA'])
    const { store, log } = fakeStore(data)
    await applyMasterDataPlan(plan, structuredClone(data), store)
    expect(log).toEqual(['area:AreaNuova:4', 'item:VoceNuova:8', 'cat:CatNuova:10'])
  })

  it('rieseguirlo non crea doppioni', async () => {
    const data = emptyData()
    const { store, log } = fakeStore(data)
    await applyMasterDataPlan(planMasterData(rules, data, []), structuredClone(data), store)
    const second = planMasterData(rules, data, [])
    expect(planIsEmpty(second)).toBe(true)
    const before = log.length
    await applyMasterDataPlan(second, structuredClone(data), store)
    expect(log).toHaveLength(before)
  })

  it('con errori bloccanti non scrive nulla', async () => {
    const data = emptyData()
    const { store, log } = fakeStore(data)
    const plan = planMasterData(rules, data, ['ContoMancante'])
    await expect(applyMasterDataPlan(plan, data, store)).rejects.toThrow('errori bloccanti')
    expect(log).toEqual([])
  })
})
