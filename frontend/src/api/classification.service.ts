import { ArchivableService } from './base-service.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'
import { unwrap } from './base-service.ts'

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
  private readonly getClient: () => TypedSupabaseClient

  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    this.getClient = getClient
    this.macroAreas = new ArchivableService('macro_areas', getClient)
    this.budgetItems = new ArchivableService('budget_items', getClient)
    this.categories = new ArchivableService('categories', getClient)
  }

  /**
   * Sposta una categoria su un'altra voce di budget. Con `reclassifyHistory` aggiorna anche i
   * movimenti passati della categoria.
   *
   * Sono due scritture separate: prima la categoria, poi i movimenti. Se la seconda fallisce la
   * categoria è già spostata e basta ripetere la chiamata con `reclassifyHistory` (è idempotente).
   */
  async moveCategoryToBudgetItem(
    categoryId: number,
    budgetItemId: number,
    options: MoveCategoryOptions = {},
  ): Promise<void> {
    await this.categories.update(categoryId, { budget_item_id: budgetItemId })
    if (options.reclassifyHistory) {
      unwrap(
        await this.getClient()
          .from('transactions')
          .update({ budget_item_id: budgetItemId })
          .eq('category_id', categoryId),
      )
    }
  }
}

export const classificationService = new ClassificationService()
