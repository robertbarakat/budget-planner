import { BaseService, unwrap } from './base-service.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'

export interface RegenerationResult {
  createdCount: number
  updatedCount: number
  deletedCount: number
}

/** Area "ricorrenze": pagamenti periodici e relative scadenze (che generano righe di budget). */
export class RecurrencesService {
  readonly recurrences: BaseService<'recurrences'>
  readonly occurrences: BaseService<'recurrence_occurrences'>
  private readonly getClient: () => TypedSupabaseClient

  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    this.getClient = getClient
    this.recurrences = new BaseService('recurrences', getClient)
    this.occurrences = new BaseService('recurrence_occurrences', getClient)
  }

  /** Scadenze di una ricorrenza, dalla più vicina. */
  listOccurrences(recurrenceId: number) {
    return this.occurrences.list({
      where: { recurrence_id: recurrenceId },
      orderBy: [{ column: 'due_date' }],
    })
  }

  /** Cambia l'importo di una sola scadenza, senza toccare le altre né l'importo base (specifica, sezione 3). */
  changeOccurrenceAmount(occurrenceId: number, amount: number) {
    return this.occurrences.update(occurrenceId, { amount })
  }

  /**
   * Crea le scadenze (e le righe di budget collegate) per le date indicate; quelle già presenti non si toccano.
   * Le date si calcolano con `generateRecurrenceDueDates` di `shared/`. Restituisce quante ne ha create.
   */
  async applyRecurrence(recurrenceId: number, dueDates: readonly string[]): Promise<number> {
    return unwrap(
      await this.getClient().rpc('apply_recurrence', { p_recurrence_id: recurrenceId, p_due_dates: [...dueDates] }),
    )
  }

  /**
   * Dopo aver modificato la ricorrenza: ricalcola le scadenze future non modificate a mano
   * (`today` è la data di riferimento, passata dall'app).
   */
  async regenerateOccurrences(
    recurrenceId: number,
    dueDates: readonly string[],
    today: string,
  ): Promise<RegenerationResult> {
    const [row] = unwrap(
      await this.getClient().rpc('regenerate_recurrence_occurrences', {
        p_recurrence_id: recurrenceId,
        p_due_dates: [...dueDates],
        p_today: today,
      }),
    )
    return {
      createdCount: row?.created_count ?? 0,
      updatedCount: row?.updated_count ?? 0,
      deletedCount: row?.deleted_count ?? 0,
    }
  }

  /** Archivia la ricorrenza ed elimina le scadenze future non modificate. Restituisce quante ne ha eliminate. */
  async archiveRecurrence(recurrenceId: number, today: string): Promise<number> {
    return unwrap(await this.getClient().rpc('archive_recurrence', { p_recurrence_id: recurrenceId, p_today: today }))
  }
}

export const recurrencesService = new RecurrencesService()
