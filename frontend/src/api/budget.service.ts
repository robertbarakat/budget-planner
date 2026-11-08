import { BaseService, type RowOf } from './base-service.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'

export interface BudgetEntryFilters {
  year?: number
  month?: number
  budgetItemId?: number
  source?: RowOf<'budget_entries'>['source']
}

/** Area "budget": righe di budget (previsto) e mesi chiusi. */
export class BudgetService {
  readonly entries: BaseService<'budget_entries'>
  readonly closedMonths: BaseService<'closed_months'>

  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    this.entries = new BaseService('budget_entries', getClient)
    this.closedMonths = new BaseService('closed_months', getClient)
  }

  /** Righe di budget filtrate per anno, mese, voce e origine, in ordine di anno e mese. */
  listEntries(filters: BudgetEntryFilters = {}) {
    const where: Partial<RowOf<'budget_entries'>> = {}
    if (filters.year !== undefined) where.year = filters.year
    if (filters.month !== undefined) where.month = filters.month
    if (filters.budgetItemId !== undefined) where.budget_item_id = filters.budgetItemId
    if (filters.source !== undefined) where.source = filters.source
    return this.entries.list({ where, orderBy: [{ column: 'year' }, { column: 'month' }, { column: 'id' }] })
  }

  /** Id delle voci che hanno almeno una riga di budget: servono a sapere quali non si possono eliminare. */
  async listBudgetItemIdsInUse(): Promise<number[]> {
    const rows = await this.entries.listColumn('budget_item_id')
    return [...new Set(rows.map((row) => row.budget_item_id))]
  }

  /** Mesi chiusi, opzionalmente di un solo anno. */
  listClosedMonths(year?: number) {
    return this.closedMonths.list({
      where: year === undefined ? {} : { year },
      orderBy: [{ column: 'year' }, { column: 'month' }],
    })
  }

  /** Chiude un mese (da qui le viste mostrano il reale). Se è già chiuso non fa nulla e restituisce la riga esistente. */
  async closeMonth(year: number, month: number) {
    const [existing] = await this.closedMonths.list({ where: { year, month } })
    return existing ?? (await this.closedMonths.create({ year, month }))
  }

  /** Riapre un mese chiuso. Se non era chiuso non fa nulla. */
  async reopenMonth(year: number, month: number): Promise<void> {
    const [existing] = await this.closedMonths.list({ where: { year, month } })
    if (existing) await this.closedMonths.remove(existing.id)
  }
}

export const budgetService = new BudgetService()
