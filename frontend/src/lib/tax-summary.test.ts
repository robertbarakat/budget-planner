import { describe, expect, it } from 'vitest'
import { buildTaxSummary, confirmedAdvanceAmounts, estimateCollections, priorBalances, selectProfessionalIncomes, type TaxSummaryParameters } from './tax-summary.ts'

const parameters: TaxSummaryParameters = {
  profitabilityCoefficient: 67, inpsRate: 26.07, substituteTaxRate: 15, activityStartYear: 2025,
  firstAdvanceDueDate: '2026-06-30', secondAdvanceDueDate: '2026-11-30', firstAdvanceMethod: 'historic', secondAdvanceMethod: 'forecast',
  firstAdvancePercent: 50, secondAdvancePercent: 50,
}
const base = { year: 2026, parameters, incomes: [], estimatedCollections: 100000, priorBalances: { substituteTax: 8377, inps: 14560 }, previous: { substituteTax: 8377, inpsDue: 14560 } }

describe('buildTaxSummary: 2026 con rate e secondo acconto che chiude l\'anno', () => {
  const summary = buildTaxSummary({ ...base, confirmedAdvances: { substituteTax: [2991.8], inps: [4159.9] } })
  it('base 67.000, INPS dovuta 17.466,90', () => {
    expect(summary).toMatchObject({ taxableBase: 67000, inpsDue: 17466.9 })
  })
  it('INPS secondo acconto = 100% del dovuto - primo acconto = 13.307', () => {
    expect(summary.advances[0].inps.amount).toBe(4159.9)
    expect(summary.advances[1].inps.amount).toBe(13307)
  })
  it('INPS pagata nell\'anno = saldo 2025 + acconti = 32.026,90; imposta = 15% x (67.000 - 32.026,90) = 5.245,97', () => {
    expect(summary.inpsPaid).toBe(32026.9)
    expect(summary.substituteTax).toBe(5245.97)
  })
  it('imposta: secondo acconto 5.245,97 - 2.991,80 = 2.254,17 e saldo 0 (nessuna eccedenza)', () => {
    expect(summary.advances[1].substituteTax.amount).toBe(2254.17)
    expect(summary.substituteTaxBalance).toBe(0)
    expect(summary.inpsBalance).toBe(0)
  })
})

describe('buildTaxSummary: metodi e percentuali', () => {
  it('storico: 50% del dovuto dell\'anno scorso (8.377 -> 4.188,50; INPS 14.560 -> 7.280)', () => {
    const s = buildTaxSummary(base)
    expect(s.advances[0].substituteTax.amount).toBe(4188.5)
    expect(s.advances[0].inps.amount).toBe(7280)
  })
  it('la percentuale la decide l\'utente: 40% del primo acconto', () => {
    const s = buildTaxSummary({ ...base, parameters: { ...parameters, firstAdvancePercent: 40 } })
    expect(s.advances[0].inps.amount).toBe(5824)
  })
  it('previsionale anche sul primo acconto: 50% del dovuto stimato', () => {
    const s = buildTaxSummary({ ...base, parameters: { ...parameters, firstAdvanceMethod: 'forecast' } })
    expect(s.advances[0].inps.amount).toBe(8733.45)
  })
  it('storico senza il dovuto dell\'anno scorso: non calcolabile, nessun saldo inventato', () => {
    const s = buildTaxSummary({ ...base, previous: null })
    expect(s.advances[0].substituteTax.amount).toBeNull()
    expect(s.substituteTaxBalance).toBeNull()
  })
  it('primo anno 2025: niente acconti, imposta senza deduzione INPS, saldo = dovuto', () => {
    const s = buildTaxSummary({ ...base, year: 2025, parameters: { ...parameters, firstAdvanceDueDate: '2025-06-30', secondAdvanceDueDate: '2025-11-30' }, estimatedCollections: 83355, priorBalances: { substituteTax: 0, inps: 0 }, previous: null })
    expect(s).toMatchObject({ taxableBase: 55847.85, substituteTax: 8377.18, substituteTaxBalance: 8377.18, inpsBalance: 14559.53 })
  })
})

describe('estimateCollections', () => {
  const incomes = [{ date: '2026-01-10', amount: 1000 }, { date: '2026-02-10', amount: 500 }]
  const forecast = [{ month: 1, amount: 900 }, { month: 2, amount: 700 }, { month: 3, amount: 300 }]
  it('anno in corso: mesi chiusi reali + mesi aperti dal budget', () => {
    expect(estimateCollections(2026, 2026, incomes, forecast, [1])).toBe(2000)
  })
  it('anno passato: solo i reali', () => {
    expect(estimateCollections(2025, 2026, incomes, forecast, [])).toBe(1500)
  })
})

describe('priorBalances e confirmedAdvanceAmounts', () => {
  const inst = [
    { tax_type: 'inps_balance', due_date: '2026-06-30', principal: 2080, reference_year: 2025 },
    { tax_type: 'inps_balance', due_date: '2026-07-16', principal: 2080, reference_year: 2025 },
    { tax_type: 'inps_advance', due_date: '2026-06-30', principal: 831.98, reference_year: 2026 },
    { tax_type: 'inps_advance', due_date: '2026-07-16', principal: 831.98, reference_year: 2026 },
  ]
  const d = (o: object) => ({ reference_year: 2026, tax_type: 'inps_advance', due_date: '2026-11-30', amount: 8887, transaction_id: null, installment_id: null, is_amount_manual: false, ...o })
  it('saldo dell\'anno prima pagato nell\'anno = capitale delle rate', () => {
    expect(priorBalances([], inst, 2026).inps).toBe(4160)
  })
  it('primo acconto = capitale delle rate; secondo = scadenza manuale o versata; il calcolo non conta', () => {
    const dates = { first: '2026-06-30', second: '2026-11-30' }
    expect(confirmedAdvanceAmounts([d({ is_amount_manual: true })], inst, dates, 2026).inps).toEqual([1663.96, 8887])
    expect(confirmedAdvanceAmounts([d({})], inst, dates, 2026).inps).toEqual([1663.96, undefined])
  })
})

describe('selectProfessionalIncomes', () => {
  it('conta solo le entrate della macro-area professionale (voce diretta o della categoria)', () => {
    const tx = (o: Partial<{ type: string; budget_item_id: number | null; category_id: number | null }>) => ({ type: 'income', transaction_date: '2026-01-01', amount: 10, budget_item_id: null, category_id: null, ...o })
    const result = selectProfessionalIncomes(
      [tx({ budget_item_id: 1 }), tx({ category_id: 5 }), tx({ budget_item_id: 2 }), tx({ type: 'expense', budget_item_id: 1 }), tx({})],
      [{ id: 5, budget_item_id: 1 }],
      [{ id: 1, macro_area_id: 10 }, { id: 2, macro_area_id: 11 }],
      [{ id: 10, is_professional: true }, { id: 11, is_professional: false }],
    )
    expect(result).toHaveLength(2)
  })
})
