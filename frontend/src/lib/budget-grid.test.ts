import { describe, expect, it } from 'vitest'
import { buildBudgetGrid, type GridEntryInput, type GridItemInput, type GridMacroAreaInput } from './budget-grid.ts'

const areas: GridMacroAreaInput[] = [
  { id: 1, name: 'Ricavi', archived: false, sortOrder: 0 },
  { id: 2, name: 'Casa', archived: false, sortOrder: 1 },
  { id: 3, name: 'Vecchia', archived: true, sortOrder: 2 },
]
const items: GridItemInput[] = [
  { id: 10, macroAreaId: 1, name: 'Fatture', kind: 'income', archived: false, sortOrder: 0 },
  { id: 20, macroAreaId: 2, name: 'Affitto', kind: 'expense', archived: false, sortOrder: 0 },
  { id: 21, macroAreaId: 2, name: 'Utenze', kind: 'expense', archived: false, sortOrder: 1 },
  { id: 30, macroAreaId: 3, name: 'Orfana', kind: 'expense', archived: true, sortOrder: 0 },
]
const entry = (id: number, budgetItemId: number, month: number, amount: number, source: GridEntryInput['source'] = 'manual', year = 2026): GridEntryInput => ({
  id, budgetItemId, year, month, amount, source,
})

describe('buildBudgetGrid', () => {
  it('dà segno al tipo della voce e i totali coincidono con la somma delle celle', () => {
    const grid = buildBudgetGrid(2026, areas, items, [
      entry(1, 10, 1, 1000),
      entry(2, 10, 2, 500.5),
      entry(3, 20, 1, 400),
      entry(4, 21, 1, 50.25),
      entry(5, 21, 1, 10, 'recurrence'),
    ])
    const [ricavi, casa] = grid.groups
    expect(ricavi!.items[0]!.months[0]!.cents).toBe(100000)
    expect(casa!.items[0]!.months[0]!.cents).toBe(-40000)
    // due righe sulla stessa cella si sommano
    expect(casa!.items[1]!.months[0]!.cents).toBe(-6025)
    expect(casa!.monthCents[0]).toBe(-46025)
    expect(grid.monthCents[0]).toBe(100000 - 46025)
    expect(grid.monthCents[1]).toBe(50050)
    expect(casa!.items[1]!.yearCents).toBe(-6025)
    expect(ricavi!.yearCents).toBe(150050)
    expect(grid.yearCents).toBe(150050 - 46025)
    const sumOfCells = grid.groups.flatMap((g) => g.items).flatMap((i) => i.months).reduce((s, c) => s + c.cents, 0)
    expect(grid.yearCents).toBe(sumOfCells)
  })

  it('segnala le origini diverse da manual e tiene le righe della cella', () => {
    const grid = buildBudgetGrid(2026, areas, items, [entry(1, 21, 3, 20), entry(2, 21, 3, 30, 'tax'), entry(3, 21, 3, 5, 'tax')])
    const cell = grid.groups[1]!.items[1]!.months[2]!
    expect(cell.otherSources).toEqual(['tax'])
    expect(cell.entries).toHaveLength(3)
    expect(grid.groups[1]!.items[1]!.months[3]!.otherSources).toEqual([])
  })

  it('ignora altri anni e mostra gli archiviati solo se usati nell\'anno', () => {
    const noArchived = buildBudgetGrid(2027, areas, items, [entry(1, 20, 1, 100, 'manual', 2026)])
    expect(noArchived.groups.map((g) => g.name)).toEqual(['Ricavi', 'Casa'])
    expect(noArchived.yearCents).toBe(0)
    const withArchived = buildBudgetGrid(2026, areas, items, [entry(1, 30, 5, 80)])
    expect(withArchived.groups.map((g) => g.name)).toEqual(['Ricavi', 'Casa', 'Vecchia'])
    expect(withArchived.groups[2]!.items[0]!.months[4]!.cents).toBe(-8000)
  })

  it('funziona su un anno senza dati', () => {
    const grid = buildBudgetGrid(2040, areas, items, [])
    expect(grid.monthCents).toEqual(Array.from({ length: 12 }, () => 0))
    expect(grid.groups).toHaveLength(2)
  })
})
