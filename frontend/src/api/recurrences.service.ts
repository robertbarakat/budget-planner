import { generateRecurrenceDueDates, type Recurrence, type RecurrenceOccurrence } from 'budget-planner-shared'
import { BaseService, unwrap, type InsertOf, type UpdateOf } from './base-service.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'

/** Mesi di scadenze generate in anticipo quando la ricorrenza non ha una data di fine (da confermare). */
export const RECURRENCE_HORIZON_MONTHS = 24

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

  /** Ricorrenze, per nome. Con `includeArchived` false (default) solo quelle attive. */
  listRecurrences(includeArchived = false): Promise<Recurrence[]> {
    return this.recurrences.list({
      where: includeArchived ? {} : { archived: false },
      orderBy: [{ column: 'name' }],
    })
  }

  /** Prossime scadenze (dalla data indicata in poi, dalla più vicina) delle sole ricorrenze attive. */
  async listUpcomingOccurrences(fromDate: string, limit = 5): Promise<RecurrenceOccurrence[]> {
    const [occurrences, recurrences] = await Promise.all([
      this.occurrences.list({ range: { column: 'due_date', from: fromDate }, orderBy: [{ column: 'due_date' }] }),
      this.listRecurrences(false),
    ])
    const activeIds = new Set(recurrences.map((recurrence) => recurrence.id))
    return occurrences.filter((occurrence) => activeIds.has(occurrence.recurrence_id)).slice(0, limit)
  }

  /** Scadenze di una ricorrenza, dalla più vicina. */
  listOccurrences(recurrenceId: number) {
    return this.occurrences.list({
      where: { recurrence_id: recurrenceId },
      orderBy: [{ column: 'due_date' }],
    })
  }

  /**
   * Riporta una scadenza all'importo base. Il database segna "modificata a mano" ogni cambio di importo:
   * con un secondo aggiornamento (che non tocca l'importo, quindi non riattiva il segno) si toglie il segno,
   * così la scadenza torna a seguire l'importo base.
   */
  async restoreOccurrenceAmount(occurrenceId: number, baseAmount: number): Promise<void> {
    await this.occurrences.update(occurrenceId, { amount: baseAmount })
    await this.occurrences.update(occurrenceId, { is_manually_modified: false })
  }

  /**
   * Crea la ricorrenza e le sue scadenze: date calcolate con `shared/` (fino alla data di fine, o
   * all'orizzonte da `referenceDate`), poi scritte con `apply_recurrence`.
   */
  async createRecurrence(
    values: InsertOf<'recurrences'>,
    referenceDate: string,
  ): Promise<{ recurrence: Recurrence; createdCount: number }> {
    const recurrence = await this.recurrences.create(values)
    const createdCount = await this.applyRecurrence(recurrence.id, this.dueDatesOf(recurrence, referenceDate))
    return { recurrence, createdCount }
  }

  /**
   * Modifica la ricorrenza e ricalcola le scadenze future non modificate a mano (le passate non cambiano).
   * `today` è la data di riferimento, passata dall'app.
   */
  async updateRecurrence(
    recurrenceId: number,
    values: UpdateOf<'recurrences'>,
    today: string,
  ): Promise<{ recurrence: Recurrence; result: RegenerationResult }> {
    const recurrence = await this.recurrences.update(recurrenceId, values)
    const result = await this.regenerateOccurrences(recurrence.id, this.dueDatesOf(recurrence, today), today)
    return { recurrence, result }
  }

  private dueDatesOf(recurrence: Recurrence, referenceDate: string): string[] {
    return generateRecurrenceDueDates({
      frequency: recurrence.frequency,
      startDate: recurrence.start_date,
      endDate: recurrence.end_date,
      referenceDate,
      horizonMonths: RECURRENCE_HORIZON_MONTHS,
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
