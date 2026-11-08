import { ArchivableService, BaseService, unwrap, type RowOf } from './base-service.ts'
import { toReplaceArgs, toReplaceResult, type BudgetEntryDraft, type MonthRange, type ReplaceResult } from './month-range.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'

export interface WorkedDaysFilters {
  clientId?: number
  year?: number
  month?: number
}

/** Area "ricavi": clienti, tariffe giornaliere con validità, giorni lavorati e righe del driver ricavi. */
export class RevenueService {
  readonly clients: ArchivableService<'clients'>
  readonly rates: BaseService<'client_rates'>
  readonly workedDays: BaseService<'worked_days'>
  private readonly getClient: () => TypedSupabaseClient

  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    this.getClient = getClient
    this.clients = new ArchivableService('clients', getClient)
    this.rates = new BaseService('client_rates', getClient)
    this.workedDays = new BaseService('worked_days', getClient)
  }

  /** Id dei clienti con tariffe o giorni lavorati collegati: quelli non si eliminano, si archiviano. */
  async listClientIdsInUse(): Promise<number[]> {
    const [rateRows, dayRows] = await Promise.all([
      this.rates.listColumn('client_id'),
      this.workedDays.listColumn('client_id'),
    ])
    return [...new Set([...rateRows, ...dayRows].map((row) => row.client_id))]
  }

  /** Tariffe di un cliente, dalla più recente. */
  listRates(clientId: number): Promise<RowOf<'client_rates'>[]> {
    return this.rates.list({
      where: { client_id: clientId },
      orderBy: [
        { column: 'valid_from_year', ascending: false },
        { column: 'valid_from_month', ascending: false },
      ],
    })
  }

  /** Giorni lavorati filtrati per cliente, anno e mese. */
  listWorkedDays(filters: WorkedDaysFilters = {}): Promise<RowOf<'worked_days'>[]> {
    const where: Partial<RowOf<'worked_days'>> = {}
    if (filters.clientId !== undefined) where.client_id = filters.clientId
    if (filters.year !== undefined) where.year = filters.year
    if (filters.month !== undefined) where.month = filters.month
    return this.workedDays.list({ where, orderBy: [{ column: 'year' }, { column: 'month' }] })
  }

  /** Imposta i giorni lavorati di un cliente in un mese (crea o aggiorna: uno solo per cliente e mese). */
  async setWorkedDays(clientId: number, year: number, month: number, days: number) {
    const [existing] = await this.workedDays.list({ where: { client_id: clientId, year, month } })
    return existing
      ? this.workedDays.update(existing.id, { days })
      : this.workedDays.create({ client_id: clientId, year, month, days })
  }

  /**
   * Sostituisce le righe `revenue_driver` del budget nell'intervallo di mesi (le altre origini non si toccano).
   * Gli importi li calcola `computeExpectedCollections` di `shared/`; l'app passa solo i mesi non chiusi.
   */
  async replaceRevenueDriverEntries(range: MonthRange, entries: readonly BudgetEntryDraft[]): Promise<ReplaceResult> {
    const [row] = unwrap(await this.getClient().rpc('replace_revenue_driver_entries', toReplaceArgs(range, entries)))
    return toReplaceResult(row)
  }
}

export const revenueService = new RevenueService()
