import { AppError } from './api-error.ts'
import { BaseService, unwrap, type InsertOf, type RowOf } from './base-service.ts'
import { toReplaceArgs, toReplaceResult, type BudgetEntryDraft, type MonthRange, type ReplaceResult } from './month-range.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'

/** Valori dei parametri di un anno (tutto tranne l'id e l'anno, che è la chiave). */
export type TaxParametersValues = Omit<InsertOf<'tax_parameters'>, 'year'>

/** Scadenza calcolata da salvare nel calendario (importo in euro). */
export interface PlannedDeadline {
  /** Id della rata, se la scadenza è una rata di una rateizzazione. */
  installmentId?: number
  referenceYear: number
  taxType: RowOf<'f24_deadlines'>['tax_type']
  dueDate: string
  amount: number
}

/** Riga di capitale di una rateizzazione (importi in euro). */
export interface PlanLineValues {
  taxType: RowOf<'installment_lines'>['tax_type']
  referenceYear: number
  quota: number
  lastNumber: number | null
}

/** Una rata per riga di capitale (importi in euro). */
export interface PlanRowValues {
  number: number
  dueDate: string
  taxType: RowOf<'installments'>['tax_type']
  referenceYear: number
  principal: number
  interest: number
}

const rowKey = (r: { number: number; taxType: string; referenceYear: number }) => `${r.number}|${r.taxType}|${r.referenceYear}`
const sumCents = (rows: readonly { principal: number }[]) => Math.round(rows.reduce((s, r) => s + r.principal * 100, 0)) / 100

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
  readonly installmentLines: BaseService<'installment_lines'>
  readonly f24Deadlines: BaseService<'f24_deadlines'>
  private readonly getClient: () => TypedSupabaseClient

  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    this.getClient = getClient
    this.parameters = new BaseService('tax_parameters', getClient)
    this.installmentPlans = new BaseService('installment_plans', getClient)
    this.installments = new BaseService('installments', getClient)
    this.installmentLines = new BaseService('installment_lines', getClient)
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

  /**
   * Crea una rateizzazione con le sue righe di capitale e le rate calcolate. Se qualcosa non si salva,
   * si toglie tutto ciò che era già stato scritto, così non resta un'entità a metà.
   */
  async createPlanFromSchedule(
    description: string,
    lines: readonly PlanLineValues[],
    rows: readonly PlanRowValues[],
  ): Promise<RowOf<'installment_plans'>> {
    const first = lines[0]
    if (!first) throw new AppError('invalid', null, undefined, 'Inserisci almeno una riga da rateizzare.')
    const created = await this.installmentPlans.create({
      description,
      total_amount: sumCents(rows),
      tax_type: first.taxType,
      reference_year: first.referenceYear,
    })
    const writtenRows: number[] = []
    const writtenLines: number[] = []
    try {
      for (const line of lines) {
        const l = await this.installmentLines.create({
          plan_id: created.id,
          tax_type: line.taxType,
          reference_year: line.referenceYear,
          quota: line.quota,
          last_number: line.lastNumber,
        })
        writtenLines.push(l.id)
      }
      for (const row of rows) {
        const r = await this.installments.create(this.rowInsert(created.id, row))
        writtenRows.push(r.id)
      }
    } catch (error) {
      for (const id of writtenRows) await this.installments.remove(id)
      for (const id of writtenLines) await this.installmentLines.remove(id)
      await this.installmentPlans.remove(created.id)
      throw error
    }
    return created
  }

  private rowInsert(planId: number, row: PlanRowValues): InsertOf<'installments'> {
    return {
      plan_id: planId,
      number: row.number,
      due_date: row.dueDate,
      tax_type: row.taxType,
      reference_year: row.referenceYear,
      principal: row.principal,
      interest: row.interest,
      amount: Math.round((row.principal + row.interest) * 100) / 100,
    }
  }

  /**
   * Ricalcola una rateizzazione esistente: le rate già versate (`frozenIds`) non si toccano; le altre si aggiornano,
   * si creano o si tolgono (con le loro scadenze F24 non versate). Così chiudere una riga da una rata in poi
   * toglie capitale, interessi e scadenze di quella riga dalle rate successive.
   */
  async rebuildPlan(
    planId: number,
    lines: readonly PlanLineValues[],
    rows: readonly PlanRowValues[],
    frozenIds: ReadonlySet<number>,
  ): Promise<void> {
    const existing = await this.listInstallments(planId)
    const frozen = existing.filter((r) => frozenIds.has(r.id))
    const frozenKeys = new Set(frozen.map((r) => rowKey({ number: r.number, taxType: r.tax_type, referenceYear: r.reference_year })))
    const target = rows.filter((r) => !frozenKeys.has(rowKey(r)))
    const total = Math.round((sumCents(target) + frozen.reduce((s, r) => s + Number(r.principal), 0)) * 100) / 100
    await this.installmentPlans.update(planId, { total_amount: total })

    for (const old of await this.installmentLines.list({ where: { plan_id: planId } })) await this.installmentLines.remove(old.id)
    for (const line of lines) {
      await this.installmentLines.create({
        plan_id: planId,
        tax_type: line.taxType,
        reference_year: line.referenceYear,
        quota: line.quota,
        last_number: line.lastNumber,
      })
    }

    const loose = existing.filter((r) => !frozenIds.has(r.id))
    const byKey = new Map(loose.map((r) => [rowKey({ number: r.number, taxType: r.tax_type, referenceYear: r.reference_year }), r]))
    for (const row of target) {
      const found = byKey.get(rowKey(row))
      if (found) {
        byKey.delete(rowKey(row))
        const next = this.rowInsert(planId, row)
        await this.installments.update(found.id, { due_date: next.due_date, principal: next.principal, interest: next.interest, amount: next.amount })
      } else {
        await this.installments.create(this.rowInsert(planId, row))
      }
    }
    for (const gone of byKey.values()) {
      for (const deadline of await this.f24Deadlines.list({ where: { installment_id: gone.id } })) {
        if (deadline.transaction_id === null) await this.f24Deadlines.remove(deadline.id)
      }
      await this.installments.remove(gone.id)
    }
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
  async linkDeadlineToTransaction(deadlineId: number, transactionId: number | null) {
    try {
      return await this.f24Deadlines.update(deadlineId, { transaction_id: transactionId })
    } catch (error) {
      // Indice unico sul movimento: lo stesso versamento non può chiudere due scadenze.
      if (error instanceof AppError && error.kind === 'duplicate') {
        throw new AppError('duplicate', error.code, error.cause, 'Questo movimento è già collegato a un\'altra scadenza.')
      }
      throw error
    }
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
      const found =
        item.installmentId !== undefined
          ? existing.find((d) => d.installment_id === item.installmentId)
          : existing.find((d) => d.installment_id === null && d.reference_year === item.referenceYear && d.tax_type === item.taxType && d.due_date === item.dueDate)
      if (!found) {
        await this.f24Deadlines.create({
          reference_year: item.referenceYear,
          tax_type: item.taxType,
          due_date: item.dueDate,
          amount: item.amount,
          installment_id: item.installmentId ?? null,
        })
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

  /** Applica più tratti di mesi (i mesi chiusi sono già esclusi dal chiamante): una sostituzione per tratto. */
  async applyTaxEntries(segments: readonly { range: MonthRange; entries: readonly BudgetEntryDraft[] }[]): Promise<ReplaceResult> {
    const total: ReplaceResult = { deletedCount: 0, insertedCount: 0 }
    for (const segment of segments) {
      const result = await this.replaceTaxEntries(segment.range, segment.entries)
      total.deletedCount += result.deletedCount
      total.insertedCount += result.insertedCount
    }
    return total
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
