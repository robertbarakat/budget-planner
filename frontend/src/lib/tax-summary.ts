import { computeSubstituteTax, computeTaxableBaseAndInps, eurosToCents } from 'budget-planner-shared'
import { formatAbsoluteAmount } from './format-amount.ts'
import type { AdvanceMethod } from './tax-parameters-form.ts'

export interface TaxSummaryParameters {
  profitabilityCoefficient: number
  inpsRate: number
  substituteTaxRate: number
  activityStartYear: number
  firstAdvanceDueDate: string
  secondAdvanceDueDate: string
  firstAdvanceMethod: AdvanceMethod
  secondAdvanceMethod: AdvanceMethod
}

/** Importo in euro con il testo che spiega come ci siamo arrivati; `amount` è null se non si può calcolare. */
export interface TaxLine {
  amount: number | null
  explanation: string
}

export interface AdvanceSummary {
  position: 'first' | 'second'
  dueDate: string
  method: AdvanceMethod
  substituteTax: TaxLine
  inps: TaxLine
}

export interface TaxSummary {
  collections: number
  taxableBase: number
  inpsDue: number
  inpsPaid: number
  substituteTax: number
  advances: AdvanceSummary[]
  /** Saldo = dovuto - acconti; null se un acconto non è calcolabile. */
  substituteTaxBalance: number | null
  inpsBalance: number | null
}

export interface TaxSummaryInput {
  year: number
  parameters: TaxSummaryParameters
  /** Entrate professionali dell'anno (importi in euro, date `YYYY-MM-DD`). */
  incomes: readonly { date: string; amount: number }[]
  /** Versamenti INPS fatti (qualunque anno: conta la data del versamento). */
  inpsPayments: readonly { date: string; amount: number; isInstalment: boolean }[]
  /** Acconti dell'anno scorso in euro, nell'ordine di scadenza. */
  previousAdvances: { substituteTax: readonly number[]; inps: readonly number[] }
  /** Importi già salvati nel calendario F24 per questo anno (nell'ordine di scadenza): hanno la precedenza sul calcolo. */
  confirmedAdvances?: { substituteTax: readonly (number | undefined)[]; inps: readonly (number | undefined)[] }
}

const pct = (n: number) => String(n).replace('.', ',')
function savedLine(values: readonly (number | undefined)[] | undefined, index: number): TaxLine | null {
  const amount = values?.[index]
  return amount === undefined ? null : { amount, explanation: `Importo del calendario F24 (versato o modificato a mano): ${formatAbsoluteAmount(amount)}.` }
}
const toEuros = (cents: number) => cents / 100
const italianDate = (date: string) => date.split('-').reverse().join('/')

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Riepilogo fiscale dell'anno: incassi, base, INPS, imposta e acconti con il metodo scelto (storico o previsionale). */
export function buildTaxSummary(input: TaxSummaryInput): TaxSummary {
  const { year, parameters, incomes } = input
  const rates = { profitabilityCoefficient: parameters.profitabilityCoefficient, inpsRate: parameters.inpsRate }
  const collectionsIn = (from: string, to: string) =>
    eurosToCents(incomes.filter((i) => i.date >= from && i.date <= to).reduce((sum, i) => sum + i.amount, 0))

  const yearCollections = collectionsIn(`${year}-01-01`, `${year}-12-31`)
  const { taxableBaseCents, inpsDueCents } = computeTaxableBaseAndInps(yearCollections, rates)
  const tax = computeSubstituteTax({
    year,
    taxableBaseCents,
    substituteTaxRate: parameters.substituteTaxRate,
    inpsPayments: input.inpsPayments.map((p) => ({ amountCents: eurosToCents(p.amount), paymentDate: p.date, isInstalment: p.isInstalment })),
    // Contributi pagati a rate deducibili (indicazione dell'autore, specifica sez. 7).
    deductInstalments: true,
  })

  const noAdvances = year <= parameters.activityStartYear
  const periods = [
    { position: 'first' as const, dueDate: parameters.firstAdvanceDueDate, method: parameters.firstAdvanceMethod, from: `${year}-01-01` },
    { position: 'second' as const, dueDate: parameters.secondAdvanceDueDate, method: parameters.secondAdvanceMethod, from: nextDay(parameters.firstAdvanceDueDate) },
  ]
  const computed: AdvanceSummary[] = periods.map((period, index) => {
    if (noAdvances) {
      const line: TaxLine = { amount: 0, explanation: 'Primo anno di attività: nessun acconto dovuto.' }
      return { position: period.position, dueDate: period.dueDate, method: period.method, substituteTax: line, inps: line }
    }
    if (period.method === 'historic') {
      const line = (previous: readonly number[]): TaxLine => {
        const amount = previous[index]
        return amount === undefined
          ? { amount: null, explanation: 'Storico: nessun acconto dell\'anno scorso registrato, importo non calcolabile.' }
          : { amount, explanation: `Storico: acconto versato l'anno scorso, ${formatAbsoluteAmount(amount)}.` }
      }
      return { position: period.position, dueDate: period.dueDate, method: 'historic', substituteTax: line(input.previousAdvances.substituteTax), inps: line(input.previousAdvances.inps) }
    }
    const collections = collectionsIn(period.from, period.dueDate)
    const base = computeTaxableBaseAndInps(collections, rates)
    const advanceTax = computeSubstituteTax({ year, taxableBaseCents: base.taxableBaseCents, substituteTaxRate: parameters.substituteTaxRate, inpsPayments: [], deductInstalments: true })
    const head = `Previsionale: incassi dal ${italianDate(period.from)} al ${italianDate(period.dueDate)} ${formatAbsoluteAmount(toEuros(collections))}, base imponibile (${pct(parameters.profitabilityCoefficient)}%) ${formatAbsoluteAmount(toEuros(base.taxableBaseCents))}`
    return {
      position: period.position,
      dueDate: period.dueDate,
      method: 'forecast',
      substituteTax: { amount: toEuros(advanceTax.taxCents), explanation: `${head}, imposta ${pct(parameters.substituteTaxRate)}% ${formatAbsoluteAmount(toEuros(advanceTax.taxCents))}.` },
      inps: { amount: toEuros(base.inpsDueCents), explanation: `${head}, INPS ${pct(parameters.inpsRate)}% ${formatAbsoluteAmount(toEuros(base.inpsDueCents))}.` },
    }
  })

  const advances = computed.map((advance, index) => ({
    ...advance,
    substituteTax: savedLine(input.confirmedAdvances?.substituteTax, index) ?? advance.substituteTax,
    inps: savedLine(input.confirmedAdvances?.inps, index) ?? advance.inps,
  }))

  const balance = (dueCents: number, lines: readonly TaxLine[]): number | null => {
    if (lines.some((l) => l.amount === null)) return null
    const paid = lines.reduce((sum, l) => sum + eurosToCents(l.amount ?? 0), 0)
    return toEuros(Math.max(0, dueCents - paid))
  }
  return {
    collections: toEuros(yearCollections),
    taxableBase: toEuros(taxableBaseCents),
    inpsDue: toEuros(inpsDueCents),
    inpsPaid: toEuros(tax.inpsPaidInYearCents),
    substituteTax: toEuros(tax.taxCents),
    advances,
    substituteTaxBalance: balance(tax.taxCents, advances.map((a) => a.substituteTax)),
    inpsBalance: balance(inpsDueCents, advances.map((a) => a.inps)),
  }
}

/** Entrate dell'anno che contano come incassi professionali: voce (diretta o della categoria) in una macro-area `is_professional`. */
export function selectProfessionalIncomes(
  transactions: readonly { type: string; transaction_date: string; amount: number; budget_item_id: number | null; category_id: number | null }[],
  categories: readonly { id: number; budget_item_id: number }[],
  budgetItems: readonly { id: number; macro_area_id: number }[],
  macroAreas: readonly { id: number; is_professional: boolean }[],
): { date: string; amount: number }[] {
  const professional = new Set(macroAreas.filter((m) => m.is_professional).map((m) => m.id))
  const itemArea = new Map(budgetItems.map((i) => [i.id, i.macro_area_id]))
  const categoryItem = new Map(categories.map((c) => [c.id, c.budget_item_id]))
  return transactions.flatMap((t) => {
    if (t.type !== 'income') return []
    const itemId = t.budget_item_id ?? (t.category_id === null ? undefined : categoryItem.get(t.category_id))
    const areaId = itemId === undefined ? undefined : itemArea.get(itemId)
    return areaId !== undefined && professional.has(areaId) ? [{ date: t.transaction_date, amount: t.amount }] : []
  })
}

/** Acconti dell'anno scorso e versamenti INPS ricavati dalle scadenze F24 collegate a un movimento. */
export function previousAdvancesAndInps(
  deadlines: readonly { reference_year: number; tax_type: string; due_date: string; amount: number; transaction_id: number | null; installment_id: number | null }[],
  transactions: readonly { id: number; transaction_date: string; amount: number }[],
  year: number,
): { previousAdvances: TaxSummaryInput['previousAdvances']; inpsPayments: TaxSummaryInput['inpsPayments'] } {
  const advancesOf = (type: string) =>
    deadlines.filter((d) => d.reference_year === year - 1 && d.tax_type === type).sort((a, b) => a.due_date.localeCompare(b.due_date)).map((d) => d.amount)
  const byId = new Map(transactions.map((t) => [t.id, t]))
  const inpsPayments = deadlines.flatMap((d) => {
    const transaction = d.transaction_id === null ? undefined : byId.get(d.transaction_id)
    return d.tax_type.startsWith('inps') && transaction
      ? [{ date: transaction.transaction_date, amount: Math.abs(transaction.amount), isInstalment: d.installment_id !== null }]
      : []
  })
  return { previousAdvances: { substituteTax: advancesOf('substitute_tax_advance'), inps: advancesOf('inps_advance') }, inpsPayments }
}

/**
 * Importi degli acconti dell'anno che valgono al posto del calcolo: scadenze con movimento collegato (versate)
 * o con importo modificato a mano. Per posizione (primo, secondo acconto); `undefined` = segue il calcolo.
 */
export function confirmedAdvanceAmounts(
  deadlines: readonly { reference_year: number; tax_type: string; due_date: string; amount: number; transaction_id: number | null; is_amount_manual: boolean }[],
  year: number,
): { substituteTax: (number | undefined)[]; inps: (number | undefined)[] } {
  const byPosition = (type: string) =>
    deadlines
      .filter((d) => d.reference_year === year && d.tax_type === type)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .map((d) => (d.transaction_id !== null || d.is_amount_manual ? Number(d.amount) : undefined))
  return { substituteTax: byPosition('substitute_tax_advance'), inps: byPosition('inps_advance') }
}
