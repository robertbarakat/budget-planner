import { describe, expect, it } from 'vitest'
import { buildCashFlow } from './cash-flow.ts'

const items = [
  { id: 1, name: 'Fatture', kind: 'income' as const, archived: false },
  { id: 2, name: 'Affitto', kind: 'expense' as const, archived: false },
]
const entries = [
  { budgetItemId: 1, year: 2026, month: 1, amount: 500 },
  { budgetItemId: 2, year: 2026, month: 1, amount: 200 },
  { budgetItemId: 1, year: 2026, month: 2, amount: 300 },
  { budgetItemId: 2, year: 2026, month: 2, amount: 100 },
  { budgetItemId: 1, year: 2026, month: 12, amount: 100 },
  { budgetItemId: 1, year: 2025, month: 12, amount: 9999 },
]
const transactions = [
  { type: 'income' as const, budgetItemId: 1, transactionDate: '2026-01-15', amount: 450 },
  { type: 'expense' as const, budgetItemId: 2, transactionDate: '2026-01-20', amount: 250 },
  { type: 'transfer' as const, budgetItemId: null, transactionDate: '2026-01-21', amount: 700 },
  // reale parziale di un mese aperto: non entra nel flusso
  { type: 'expense' as const, budgetItemId: 2, transactionDate: '2026-02-03', amount: 40 },
]

describe('buildCashFlow', () => {
  // Calcolo manuale, saldo iniziale 1.000:
  //  gen (chiuso, reale): +450 − 250 = +200 → 1.200
  //  feb (aperto, previsto): +300 − 100 = +200 → 1.400
  //  mar..nov: 0 → 1.400
  //  dic (aperto, previsto): +100 → 1.500
  const flow = buildCashFlow(2026, 1000, items, entries, transactions, [{ year: 2026, month: 1 }])

  it('il saldo di dicembre coincide con il calcolo manuale', () => {
    expect(flow.months).toHaveLength(12)
    expect(flow.months.map((m) => m.endBalance).slice(0, 3)).toEqual([1200, 1400, 1400])
    expect(flow.months[11]?.endBalance).toBe(1500)
    expect(flow.closingBalance).toBe(1500)
  })

  it('un mese chiuso mostra il reale, uno aperto il previsto', () => {
    expect(flow.months[0]).toMatchObject({ isClosed: true, income: 450, expenses: -250, flow: 200 })
    expect(flow.months[1]).toMatchObject({ isClosed: false, income: 300, expenses: -100, flow: 200 })
  })

  it('la somma delle voci del dettaglio coincide con il flusso del mese', () => {
    for (const month of flow.months) {
      expect(month.details.reduce((sum, d) => sum + d.shown, 0)).toBeCloseTo(month.flow, 2)
    }
  })

  it('il dettaglio ha previsto, reale e scostamento (reale − previsto) per voce', () => {
    const rent = flow.months[1]?.details.find((d) => d.name === 'Affitto')
    expect(rent).toMatchObject({ budgeted: -100, actual: -40, variance: 60, shown: -100 })
  })

  it('senza dati il saldo resta quello iniziale', () => {
    const empty = buildCashFlow(2030, 250, items, [], [], [])
    expect(empty.months.every((m) => m.endBalance === 250 && m.flow === 0)).toBe(true)
  })
})
