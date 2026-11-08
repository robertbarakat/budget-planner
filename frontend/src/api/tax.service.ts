import { BaseService, unwrap, type InsertOf, type RowOf } from './base-service.ts'
import { toReplaceArgs, toReplaceResult, type BudgetEntryDraft, type MonthRange, type ReplaceResult } from './month-range.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'

/** Valori dei parametri di un anno (tutto tranne l'id e l'anno, che è la chiave). */
export type TaxParametersValues = Omit<InsertOf<'tax_parameters'>, 'year'>

/** Scadenza calcolata da salvare nel calendario (importo in euro). */
export interface PlannedDeadline {
  referenceYear: number
  taxType: RowOf<'f24_deadlines'>['tax_type']
  dueDate: string
  amount: number
}

export interface SyncResult {
  created: number
  updated: number
  kept: number
}

/**
 * Area "fiscale": parametri per anno, rateizzazioni con le rate e calendario F24.
 * I calcoli (base imponibile, imposta, acconti, calendario) sono in `shared/`: qui solo lettura e scrittura.
 */
export class TaxService {
  readonly parameters: BaseService<'tax_parameters'>
  readonly installmentPlans: BaseService<'installment_plans'>
  readonly installments: BaseService<'installments'>
  readonly f24Deadlines: BaseService<'f24_deadlines'>
  private readonly getClient: () => TypedSupabaseClient

  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    this.getClient = getClient
    this.parameters = new BaseService('tax_parameters', getClient)
    this.installmentPlans = new BaseService('installment_plans', getClient)
    this.installments = new BaseService('installments', getClient)
    this.f24Deadlines = new BaseService('f24_deadlines', getClient)
  }

  /** Parametri fiscali di un anno, o `null` se non sono ancora stati inseriti. */
  async getParametersForYear(year: number): Promise<RowOf<'tax_parameters'> | null> {
    const [row] = await this.parameters.list({ where: { year } })
    return row ?? null
  }

  /** Salva i parametri di un anno: li crea o, se ci sono già, li aggiorna (una riga per anno). */
  async saveParametersForYear(year: number, values: TaxParametersValues) {
    const existing = await this.getParametersForYear(year)
    return existing
      ? this.parameters.update(existing.id, values)
      : this.parameters.create({ ...values, year })
  }

  /** Rate di una rateizzazione, in ordine di numero. */
  listInstallments(planId: number): Promise<RowOf<'installments'>[]> {
    return this.installments.list({ where: { plan_id: planId }, orderBy: [{ column: 'number' }] })
  }

  /** Scadenze F24 che cadono in un anno solare, in ordine di data. */
  listDeadlinesDueInYear(year: number): Promise<RowOf<'f24_deadlines'>[]> {
    return this.f24Deadlines.list({
      range: { column: 'due_date', from: `${year}-01-01`, to: `${year}-12-31` },
      orderBy: [{ column: 'due_date' }, { column: 'id' }],
    })
  }

  /** Collega una scadenza al versamento reale (un movimento), o scollega con `null`. */
  linkDeadlineToTransaction(deadlineId: number, transactionId: number | null) {
    return this.f24Deadlines.update(deadlineId, { transaction_id: transactionId })
  }

  /**
   * Allinea il calendario salvato al calcolo: crea le scadenze mancanti e aggiorna l'importo di quelle non
   * ancora collegate a un movimento e non modificate a mano. Le scadenze collegate a un versamento non si toccano e nulla si cancella.
   * `year` è l'anno solare delle scadenze.
   */
  async syncDeadlines(year: number, planned: readonly PlannedDeadline[]): Promise<SyncResult> {
    const existing = await this.listDeadlinesDueInYear(year)
    const result: SyncResult = { created: 0, updated: 0, kept: 0 }
    for (const item of planned) {
      const found = existing.find((d) => d.reference_year === item.referenceYear && d.tax_type === item.taxType && d.due_date === item.dueDate)
      if (!found) {
        await this.f24Deadlines.create({ reference_year: item.referenceYear, tax_type: item.taxType, due_date: item.dueDate, amount: item.amount })
        result.created += 1
      } else if (found.transaction_id === null && !found.is_amount_manual && Number(found.amount) !== item.amount) {
        await this.f24Deadlines.update(found.id, { amount: item.amount })
        result.updated += 1
      } else {
        result.kept += 1
      }
    }
    return result
  }

  /**
   * Sostituisce le righe `tax` del budget nell'intervallo di mesi (le altre origini non si toccano).
   * Gli importi vengono dal modulo fiscale di `shared/` (calendario F24).
   */
  async replaceTaxEntries(range: MonthRange, entries: readonly BudgetEntryDraft[]): Promise<ReplaceResult> {
    const [row] = unwrap(await this.getClient().rpc('replace_tax_entries', toReplaceArgs(range, entries)))
    return toReplaceResult(row)
  }
}

export const taxService = new TaxService()
