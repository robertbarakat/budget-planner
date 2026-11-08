import { describe, expect, it } from 'vitest'
import { buildMatrix, cellValue, readMatrixMode } from './matrix.ts'

const areas = [
  { id: 1, name: 'Introiti', archived: false, sortOrder: 0 },
  { id: 2, name: 'Casa', archived: false, sortOrder: 1 },
  { id: 3, name: 'Vecchia', archived: true, sortOrder: 2 },
]
const items = [
  { id: 10, macroAreaId: 1, name: 'Fatture', kind: 'income' as const, archived: false, sortOrder: 0 },
  { id: 20, macroAreaId: 2, name: 'Affitto', kind: 'expense' as const, archived: false, sortOrder: 0 },
  { id: 21, macroAreaId: 2, name: 'Bollette', kind: 'expense' as const, archived: false, sortOrder: 1 },
  { id: 30, macroAreaId: 3, name: 'Voce vecchia', kind: 'expense' as const, archived: true, sortOrder: 0 },
]
const entry = (budgetItemId: number, month: number, amount: number, year = 2026) => ({ budgetItemId, year, month, amount })
const entries = [
  entry(10, 1, 1000),
  entry(10, 1, 200), // due righe nella stessa cella: si sommano
  entry(20, 1, 400),
  entry(20, 2, 400),
  entry(21, 2, 100),
  entry(20, 1, 999, 2025), // altro anno: ignorata
]
const tx = (budgetItemId: number | null, type: 'income' | 'expense' | 'transfer', transactionDate: string, amount: number) => ({
  type,
  budgetItemId,
  categoryId: null,
  transactionDate,
  amount,
})
const transactions = [
  tx(10, 'income', '2026-01-10', 900),
  tx(20, 'expense', '2026-01-02', 430),
  tx(null, 'transfer', '2026-01-05', 5000), // trasferimento: escluso
  tx(21, 'expense', '2026-02-20', 80),
]

describe('buildMatrix', () => {
  const matrix = buildMatrix(2026, areas, items, entries, transactions, [])
  const rent = matrix.groups[1]!.items[0]!

  it('in Previsto la cella è la somma delle righe di budget; in Reale la somma dei movimenti, trasferimenti esclusi', () => {
    expect(matrix.groups[0]!.items[0]!.months[0]).toMatchObject({ budgeted: 1200, actual: 900 })
    expect(cellValue(rent.months[0]!, 'budgeted')).toBe(-400)
    expect(cellValue(rent.months[0]!, 'actual')).toBe(-430)
    expect(rent.months[2]).toEqual({ budgeted: 0, actual: 0, shown: 0, variance: 0 })
    expect(matrix.months[0]!.actual).toBe(900 - 430)
  })

  it('i totali coincidono con la somma delle celle (voce, area, mese, anno)', () => {
    for (const group of matrix.groups) {
      for (const item of group.items) {
        expect(item.months.reduce((s, c) => s + c.budgeted, 0)).toBeCloseTo(item.year.budgeted, 2)
        expect(item.months.reduce((s, c) => s + c.actual, 0)).toBeCloseTo(item.year.actual, 2)
      }
      group.months.forEach((cell, m) => {
        expect(group.items.reduce((s, i) => s + i.months[m]!.budgeted, 0)).toBeCloseTo(cell.budgeted, 2)
        expect(group.items.reduce((s, i) => s + i.months[m]!.actual, 0)).toBeCloseTo(cell.actual, 2)
      })
      expect(group.items.reduce((s, i) => s + i.year.budgeted, 0)).toBeCloseTo(group.year.budgeted, 2)
    }
    matrix.months.forEach((cell, m) => {
      expect(matrix.groups.reduce((s, g) => s + g.months[m]!.budgeted, 0)).toBeCloseTo(cell.budgeted, 2)
    })
    expect(matrix.months.reduce((s, c) => s + c.budgeted, 0)).toBeCloseTo(matrix.total.budgeted, 2)
    expect(matrix.months.reduce((s, c) => s + c.actual, 0)).toBeCloseTo(matrix.total.actual, 2)
    expect(matrix.total.budgeted).toBe(1200 - 400 - 400 - 100)
  })

  it('le voci archiviate compaiono solo se hanno importi nell\'anno', () => {
    expect(matrix.groups.map((g) => g.name)).toEqual(['Introiti', 'Casa'])
    const withOld = buildMatrix(2026, areas, items, [...entries, entry(30, 3, 50)], transactions, [])
    expect(withOld.groups.map((g) => g.name)).toEqual(['Introiti', 'Casa', 'Vecchia'])
  })
})

describe('modalità Misto e Scostamento', () => {
  const closed = [{ year: 2026, month: 1 }]
  const matrix = buildMatrix(2026, areas, items, entries, transactions, closed)
  const everyCell = matrix.groups.flatMap((g) => [g, ...g.items]).flatMap((row) => [...row.months, row.year]).concat(matrix.months, [matrix.total])

  it('segna i mesi chiusi', () => {
    expect(matrix.closedMonths.slice(0, 3)).toEqual([true, false, false])
  })

  it('in Misto un mese chiuso coincide con Reale e uno aperto con Previsto, anche nei totali', () => {
    const rent = matrix.groups[1]!.items[0]!
    expect(cellValue(rent.months[0]!, 'mixed')).toBe(cellValue(rent.months[0]!, 'actual'))
    expect(cellValue(rent.months[1]!, 'mixed')).toBe(cellValue(rent.months[1]!, 'budgeted'))
    // totale del mese chiuso = reale, del mese aperto = previsto; anno = somma dei mesi
    expect(cellValue(matrix.months[0]!, 'mixed')).toBeCloseTo(cellValue(matrix.months[0]!, 'actual'), 2)
    expect(cellValue(matrix.months[1]!, 'mixed')).toBeCloseTo(cellValue(matrix.months[1]!, 'budgeted'), 2)
    expect(matrix.months.reduce((s, c) => s + c.shown, 0)).toBeCloseTo(matrix.total.shown, 2)
  })

  it('in Scostamento ogni cella è Reale − Previsto della stessa cella', () => {
    for (const cell of everyCell) {
      expect(cellValue(cell, 'variance')).toBeCloseTo(cellValue(cell, 'actual') - cellValue(cell, 'budgeted'), 2)
    }
    // affitto gennaio: previsto −400, reale −430 → scostamento −30 (sfavorevole)
    expect(cellValue(matrix.groups[1]!.items[0]!.months[0]!, 'variance')).toBe(-30)
  })
})

describe('readMatrixMode', () => {
  it('accetta le modalità note e ripiega sul predefinito (Misto)', () => {
    expect(readMatrixMode('actual')).toBe('actual')
    expect(readMatrixMode('variance')).toBe('variance')
    expect(readMatrixMode('boh')).toBe('mixed')
    expect(readMatrixMode(null)).toBe('mixed')
  })
})
