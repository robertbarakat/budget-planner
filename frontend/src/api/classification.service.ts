import { ArchivableService, BaseService, unwrap } from './base-service.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'

export interface MoveCategoryOptions {
  /**
   * Se true, anche i movimenti già registrati con questa categoria passano alla nuova voce.
   * Se false (default), la nuova voce vale solo per i movimenti futuri (specifica, sezione 3).
   */
  reclassifyHistory?: boolean
}

/**
 * Area "classificazione": macro-aree, voci di budget e categorie
 * (categoria -> voce di budget -> macro-area).
 */
export class ClassificationService {
  readonly macroAreas: ArchivableService<'macro_areas'>
  readonly budgetItems: ArchivableService<'budget_items'>
  readonly categories: ArchivableService<'categories'>
  /** Solo per contare i movimenti da riclassificare: le scritture passano dalla funzione SQL. */
  readonly transactions: BaseService<'transactions'>
  private readonly getClient: () => TypedSupabaseClient

  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    this.getClient = getClient
    this.macroAreas = new ArchivableService('macro_areas', getClient)
    this.budgetItems = new ArchivableService('budget_items', getClient)
    this.categories = new ArchivableService('categories', getClient)
    this.transactions = new BaseService('transactions', getClient)
  }

  /**
   * Sposta una categoria su un'altra voce di budget. Con `reclassifyHistory` aggiorna anche i
   * movimenti passati della categoria.
   *
   * Sono due scritture separate: prima la categoria, poi i movimenti (in un'unica transazione SQL). Se la
   * seconda fallisce la categoria è già spostata e basta ripetere la chiamata con `reclassifyHistory` (è idempotente).
   */
  async moveCategoryToBudgetItem(
    categoryId: number,
    budgetItemId: number,
    options: MoveCategoryOptions = {},
  ): Promise<void> {
    await this.categories.update(categoryId, { budget_item_id: budgetItemId })
    if (options.reclassifyHistory) await this.reclassifyCategoryHistory(categoryId, budgetItemId)
  }

  /**
   * Quanti movimenti della categoria passerebbero alla voce indicata: quelli che oggi hanno un'altra voce.
   * È lo stesso criterio della funzione SQL, quindi il numero mostrato coincide con quello modificato.
   */
  async countHistoryToReclassify(categoryId: number, budgetItemId: number): Promise<number> {
    const rows = await this.transactions.listColumnsWhere({ category_id: categoryId }, 'budget_item_id')
    return rows.filter((row) => row.budget_item_id !== budgetItemId).length
  }

  /**
   * Riclassifica lo storico: i movimenti della categoria prendono la voce indicata, in un'unica transazione
   * (funzione SQL `reclassify_category_history`). Restituisce quanti ne ha modificati.
   */
  async reclassifyCategoryHistory(categoryId: number, budgetItemId: number): Promise<number> {
    return unwrap(
      await this.getClient().rpc('reclassify_category_history', {
        p_category_id: categoryId,
        p_budget_item_id: budgetItemId,
      }),
    )
  }
}

export const classificationService = new ClassificationService()
