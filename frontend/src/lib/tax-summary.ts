import { computeSubstituteTax, computeTaxableBaseAndInps, eurosToCents, percentOfCents } from 'budget-planner-shared'
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
  /** Percentuale del dovuto per ogni acconto (50 e 50; la decide l'utente). */
  firstAdvancePercent: number
  secondAdvancePercent: number
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
  /** Incassi professionali reali dell'anno, fino a oggi. */
  collectionsToDate: number
  /** Incassi stimati a fine anno (mesi chiusi reali, mesi aperti dal budget): base di tutti i calcoli. */
  collections: number
  taxableBase: number
  inpsDue: number
  /** INPS pagata nell'anno: saldo dell'anno prima + acconti dell'anno (versati o previsti). Si deduce dall'imponibile. */
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
  /** Entrate professionali reali dell'anno (euro, date `YYYY-MM-DD`). */
  incomes: readonly { date: string; amount: number }[]
  /** Incassi stimati a fine anno (euro), da `estimateCollections`. */
  estimatedCollections: number
  /** Saldo dell'anno prima pagato in quest'anno (capitale, euro), da `priorBalances`. */
  priorBalances: { substituteTax: number; inps: number }
  /** Dovuto dell'anno prima (euro), per il metodo storico; null se non c'è. */
  previous: { substituteTax: number; inpsDue: number } | null
  /** Acconti già decisi (rate, versati o modificati a mano), per posizione (primo, secondo); `undefined` = segue il calcolo. */
  confirmedAdvances?: { substituteTax: readonly (number | undefined)[]; inps: readonly (number | undefined)[] }
}

const pct = (n: number) => String(n).replace('.', ',')
const toEuros = (cents: number) => cents / 100
const fmt = (euros: number) => formatAbsoluteAmount(euros)

function savedLine(values: readonly (number | undefined)[] | undefined, index: number): TaxLine | null {
  const amount = values?.[index]
  return amount === undefined ? null : { amount, explanation: `Già deciso (rate, versato o modificato a mano): ${fmt(amount)}.` }
}

/** Incassi stimati a fine anno: per l'anno in corso mesi chiusi reali + mesi aperti dal budget; per gli anni passati i reali. */
export function estimateCollections(
  year: number,
  currentYear: number,
  incomes: readonly { date: string; amount: number }[],
  forecast: readonly { month: number; amount: number }[],
  closedMonths: readonly number[],
): number {
  const total = (values: number[]) => eurosToCents(values.reduce((s, v) => s + v, 0)) / 100
  if (year < currentYear) return total(incomes.map((i) => i.amount))
  const closed = new Set(closedMonths)
  return total([
    ...incomes.filter((i) => closed.has(Number(i.date.slice(5, 7)))).map((i) => i.amount),
    ...forecast.filter((f) => !closed.has(f.month)).map((f) => f.amount),
  ])
}

/** Saldo dell'anno prima che si paga nell'anno `year` (solo capitale): righe delle rate e scadenze singole, versate o previste. */
export function priorBalances(
  deadlines: readonly { tax_type: string; due_date: string; amount: number; installment_id: number | null }[],
  installments: readonly { tax_type: string; due_date: string; principal: number }[],
  year: number,
): { substituteTax: number; inps: number } {
  const inYear = (date: string) => Number(date.slice(0, 4)) === year
  const sum = (balance: string) =>
    (installments.filter((i) => i.tax_type === balance && inYear(i.due_date)).reduce((s, i) => s + eurosToCents(Number(i.principal)), 0) +
      deadlines.filter((d) => d.installment_id === null && d.tax_type === balance && inYear(d.due_date)).reduce((s, d) => s + eurosToCents(Number(d.amount)), 0)) /
    100
  return { substituteTax: sum('substitute_tax_balance'), inps: sum('inps_balance') }
}

/**
 * Importi degli acconti dell'anno già decisi, per posizione (primo, secondo):
 * - il primo acconto pagato a rate vale la somma del capitale delle rate;
 * - le scadenze singole valgono se sono versate (movimento collegato) o modificate a mano; la posizione si riconosce dalla data.
 */
export function confirmedAdvanceAmounts(
  deadlines: readonly { reference_year: number; tax_type: string; due_date: string; amount: number; transaction_id: number | null; installment_id: number | null; is_amount_manual: boolean }[],
  installments: readonly { tax_type: string; reference_year: number; principal: number }[],
  dates: { first: string; second: string },
  year: number,
): { substituteTax: (number | undefined)[]; inps: (number | undefined)[] } {
  const of = (type: string) => {
    const result: (number | undefined)[] = [undefined, undefined]
    const scheduled = installments.filter((i) => i.tax_type === type && i.reference_year === year).reduce((s, i) => s + eurosToCents(Number(i.principal)), 0)
    if (scheduled > 0) result[0] = scheduled / 100
    for (const d of deadlines) {
      if (d.installment_id !== null || d.reference_year !== year || d.tax_type !== type) continue
      if (d.transaction_id === null && !d.is_amount_manual) continue
      const index = d.due_date === dates.first ? 0 : d.due_date === dates.second ? 1 : -1
      if (index < 0 || (index === 0 && result[0] !== undefined)) continue
      result[index] = Number(d.amount)
    }
    return result
  }
  return { substituteTax: of('substitute_tax_advance'), inps: of('inps_advance') }
}

/**
 * Riepilogo fiscale dell'anno su incassi stimati a fine anno.
 * Acconto storico = percentuale del dovuto dell'anno scorso. Acconto previsionale = percentuale cumulata del dovuto stimato
 * meno quanto è già previsto (con 50 + 50 il secondo acconto chiude l'anno, senza eccedenze).
 * Imposta = aliquota × (base - INPS pagata nell'anno), con INPS pagata = saldo dell'anno prima + acconti INPS dell'anno.
 */
export function buildTaxSummary(input: TaxSummaryInput): TaxSummary {
  const { year, parameters: p } = input
  const rates = { profitabilityCoefficient: p.profitabilityCoefficient, inpsRate: p.inpsRate }
  const toDateCents = eurosToCents(input.incomes.reduce((sum, i) => sum + i.amount, 0))
  const estimatedCents = eurosToCents(input.estimatedCollections)
  const { taxableBaseCents, inpsDueCents } = computeTaxableBaseAndInps(estimatedCents, rates)

  const noAdvances = year <= p.activityStartYear
  const percents = [p.firstAdvancePercent, p.secondAdvancePercent]
  const methods = [p.firstAdvanceMethod, p.secondAdvanceMethod]

  const advancesOf = (tax: 'substituteTax' | 'inps', dueCents: number, previousDue: number | null): TaxLine[] => {
    let committed = 0
    return [0, 1].map((i) => {
      const saved = savedLine(input.confirmedAdvances?.[tax], i)
      let line: TaxLine
      if (noAdvances) line = { amount: 0, explanation: 'Primo anno di attività: nessun acconto dovuto.' }
      else if (saved) line = saved
      else if (methods[i] === 'historic') {
        line =
          previousDue === null
            ? { amount: null, explanation: "Storico: manca il dovuto dell'anno scorso (parametri o incassi), importo non calcolabile." }
            : { amount: toEuros(percentOfCents(eurosToCents(previousDue), percents[i] ?? 0)), explanation: `Storico: ${pct(percents[i] ?? 0)}% del dovuto dell'anno scorso (${fmt(previousDue)}).` }
      } else {
        const cumulative = Math.min(100, percents.slice(0, i + 1).reduce((a, b) => a + b, 0))
        const cents = Math.max(0, percentOfCents(dueCents, cumulative) - committed)
        line = { amount: toEuros(cents), explanation: `Previsionale: ${pct(cumulative)}% del dovuto stimato a fine anno (${fmt(toEuros(dueCents))}) meno ${fmt(toEuros(committed))} già previsti.` }
      }
      committed += eurosToCents(line.amount ?? 0)
      return line
    })
  }

  const inpsAdvances = advancesOf('inps', inpsDueCents, input.previous?.inpsDue ?? null)
  const inpsInYearCents = eurosToCents(input.priorBalances.inps) + inpsAdvances.reduce((s, l) => s + eurosToCents(l.amount ?? 0), 0)
  const tax = computeSubstituteTax({
    year,
    taxableBaseCents,
    substituteTaxRate: p.substituteTaxRate,
    inpsPayments: inpsInYearCents > 0 ? [{ amountCents: inpsInYearCents, paymentDate: `${year}-12-31` }] : [],
    deductInstalments: true,
  })
  const taxAdvances = advancesOf('substituteTax', tax.taxCents, input.previous?.substituteTax ?? null)

  const advances: AdvanceSummary[] = [0, 1].map((i) => ({
    position: i === 0 ? 'first' : 'second',
    dueDate: i === 0 ? p.firstAdvanceDueDate : p.secondAdvanceDueDate,
    method: methods[i] ?? 'forecast',
    substituteTax: taxAdvances[i] as TaxLine,
    inps: inpsAdvances[i] as TaxLine,
  }))

  const balance = (dueCents: number, lines: readonly TaxLine[]): number | null => {
    if (lines.some((l) => l.amount === null)) return null
    return toEuros(Math.max(0, dueCents - lines.reduce((s, l) => s + eurosToCents(l.amount ?? 0), 0)))
  }
  return {
    collectionsToDate: toEuros(toDateCents),
    collections: toEuros(estimatedCents),
    taxableBase: toEuros(taxableBaseCents),
    inpsDue: toEuros(inpsDueCents),
    inpsPaid: toEuros(tax.inpsPaidInYearCents),
    substituteTax: toEuros(tax.taxCents),
    advances,
    substituteTaxBalance: balance(tax.taxCents, taxAdvances),
    inpsBalance: balance(inpsDueCents, inpsAdvances),
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
