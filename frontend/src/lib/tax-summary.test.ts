import { describe, expect, it } from 'vitest'
import { buildTaxSummary, confirmedAdvanceAmounts, previousAdvancesAndInps, selectProfessionalIncomes, type TaxSummaryParameters } from './tax-summary.ts'

const parameters: TaxSummaryParameters = {
  profitabilityCoefficient: 67, inpsRate: 26.07, substituteTaxRate: 15, activityStartYear: 2025,
  firstAdvanceDueDate: '2026-06-30', secondAdvanceDueDate: '2026-11-30', firstAdvanceMethod: 'historic', secondAdvanceMethod: 'forecast',
}
// Incassi: 1.000 (5/1) + 500 (20/6) = 1.500 fino al 30/6; 2.000 (1/8) fino al 30/11; 1.000 (1/12). Totale 4.500.
const incomes = [
  { date: '2026-01-05', amount: 1000 }, { date: '2026-06-20', amount: 500 },
  { date: '2026-08-01', amount: 2000 }, { date: '2026-12-01', amount: 1000 },
]

describe('buildTaxSummary (calcolo manuale annotato)', () => {
  const summary = buildTaxSummary({
    year: 2026, parameters, incomes,
    inpsPayments: [{ date: '2026-03-01', amount: 100, isInstalment: false }, { date: '2025-12-01', amount: 999, isInstalment: false }],
    previousAdvances: { substituteTax: [120, 130], inps: [80, 90] },
  })
  it('anno: base 4.500 x 67% = 3.015; INPS dovuta 3.015 x 26,07% = 786,01; INPS versata 2026 = 100 (quella del 2025 non conta)', () => {
    expect(summary).toMatchObject({ collections: 4500, taxableBase: 3015, inpsDue: 786.01, inpsPaid: 100 })
  })
  it('imposta = 15% x (3.015 - 100) = 437,25', () => {
    expect(summary.substituteTax).toBe(437.25)
  })
  it('primo acconto storico: importi dell\'anno scorso', () => {
    expect(summary.advances[0].substituteTax.amount).toBe(120)
    expect(summary.advances[0].inps.amount).toBe(80)
  })
  it('secondo acconto previsionale sugli incassi 1/7–30/11 (2.000): base 1.340, imposta 201,00, INPS 349,34', () => {
    expect(summary.advances[1].substituteTax.amount).toBe(201)
    expect(summary.advances[1].inps.amount).toBe(349.34)
    expect(summary.advances[1].substituteTax.explanation).toContain('dal 01/07/2026 al 30/11/2026')
  })
  it('saldo = dovuto - acconti: 437,25 - (120 + 201) = 116,25; INPS 786,01 - (80 + 349,34) = 356,67', () => {
    expect(summary.substituteTaxBalance).toBe(116.25)
    expect(summary.inpsBalance).toBe(356.67)
  })
  it('primo acconto previsionale: 1.500 -> base 1.005, imposta 150,75, INPS 262,00', () => {
    const forecast = buildTaxSummary({ year: 2026, parameters: { ...parameters, firstAdvanceMethod: 'forecast' }, incomes, inpsPayments: [], previousAdvances: { substituteTax: [], inps: [] } })
    expect(forecast.advances[0].substituteTax.amount).toBe(150.75)
    expect(forecast.advances[0].inps.amount).toBe(262)
  })
  it('storico senza dati dell\'anno scorso: importo non calcolabile, nessun saldo inventato', () => {
    const none = buildTaxSummary({ year: 2026, parameters, incomes, inpsPayments: [], previousAdvances: { substituteTax: [], inps: [] } })
    expect(none.advances[0].substituteTax.amount).toBeNull()
    expect(none.substituteTaxBalance).toBeNull()
  })
  it('primo anno di attività: nessun acconto, saldo = dovuto', () => {
    const first = buildTaxSummary({ year: 2025, parameters: { ...parameters, firstAdvanceDueDate: '2025-06-30', secondAdvanceDueDate: '2025-11-30' }, incomes: [{ date: '2025-05-01', amount: 10000 }], inpsPayments: [], previousAdvances: { substituteTax: [], inps: [] } })
    expect(first.substituteTax).toBe(1005)
    expect(first.substituteTaxBalance).toBe(1005)
    expect(first.inpsBalance).toBe(1746.69)
  })
})

describe('importi salvati nel calendario', () => {
  it('hanno la precedenza sul metodo e cambiano il saldo (dovuto 437,25 - (150 + 201) = 86,25)', () => {
    const result = buildTaxSummary({
      year: 2026, parameters, incomes, inpsPayments: [{ date: '2026-03-01', amount: 100, isInstalment: false }],
      previousAdvances: { substituteTax: [120, 130], inps: [80, 90] }, confirmedAdvances: { substituteTax: [150, undefined], inps: [] },
    })
    expect(result.advances[0].substituteTax.amount).toBe(150)
    expect(result.advances[0].substituteTax.explanation).toContain('calendario F24')
    expect(result.advances[1].substituteTax.amount).toBe(201)
    expect(result.substituteTaxBalance).toBe(86.25)
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

describe('previousAdvancesAndInps', () => {
  it('acconti dell\'anno scorso in ordine di data e versamenti INPS con la data del movimento', () => {
    const d = (o: object) => ({ reference_year: 2025, tax_type: 'inps_advance', due_date: '2025-06-30', amount: 80, transaction_id: null, installment_id: null, ...o })
    const result = previousAdvancesAndInps(
      [d({ due_date: '2025-11-30', amount: 90 }), d({}), d({ reference_year: 2026, tax_type: 'inps_balance', transaction_id: 7, installment_id: 3 })],
      [{ id: 7, transaction_date: '2026-06-30', amount: -55 }], 2026,
    )
    expect(result.previousAdvances.inps).toEqual([80, 90])
    expect(result.inpsPayments).toEqual([{ date: '2026-06-30', amount: 55, isInstalment: true }])
  })
})

describe('confirmedAdvanceAmounts', () => {
  it('conta solo scadenze versate o modificate a mano, per posizione', () => {
    const d = (o: object) => ({ reference_year: 2026, tax_type: 'inps_advance', due_date: '2026-06-30', amount: 100, transaction_id: null, is_amount_manual: false, ...o })
    expect(confirmedAdvanceAmounts([d({}), d({ due_date: '2026-11-30', is_amount_manual: true, amount: 250 })], 2026).inps).toEqual([undefined, 250])
    expect(confirmedAdvanceAmounts([d({ transaction_id: 3 })], 2026).inps).toEqual([100])
  })
})
