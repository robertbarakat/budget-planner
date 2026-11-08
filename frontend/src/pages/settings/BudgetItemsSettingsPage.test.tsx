import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { budgetService } from '../../api/budget.service.ts'
import { classificationService } from '../../api/classification.service.ts'
import BudgetItemsSettingsPage from './BudgetItemsSettingsPage.tsx'

type MacroRow = Awaited<ReturnType<typeof classificationService.macroAreas.list>>[number]
type ItemRow = Awaited<ReturnType<typeof classificationService.budgetItems.list>>[number]
type CategoryRow = Awaited<ReturnType<typeof classificationService.categories.list>>[number]

const area = (id: number, name: string, archived = false): MacroRow => ({
  id, name, sort_order: id, archived, is_professional: false, created_at: '',
})
const item = (id: number, macro_area_id: number, name: string, sort_order: number, kind: ItemRow['kind'] = 'expense', archived = false): ItemRow =>
  ({ id, macro_area_id, name, kind, sort_order, archived, created_at: '' }) as ItemRow

let areas: MacroRow[]
let items: ItemRow[]
let categories: CategoryRow[]
let inUse: number[]

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <BudgetItemsSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const group = (name: string) => within(screen.getByRole('region', { name }))

beforeEach(() => {
  vi.restoreAllMocks()
  areas = [area(1, 'Casa'), area(2, 'Svago'), area(3, 'Vecchia', true)]
  items = [item(10, 1, 'Affitto', 0), item(11, 1, 'Utenze', 1), item(20, 2, 'Cene', 0), item(30, 3, 'Orfana', 0, 'income')]
  categories = [{ id: 100, budget_item_id: 11, name: 'Luce', sort_order: 0, archived: false, created_at: '' } as CategoryRow]
  inUse = [20]
  vi.spyOn(classificationService.macroAreas, 'list').mockImplementation(async () => areas)
  vi.spyOn(classificationService.budgetItems, 'list').mockImplementation(async () => [...items].sort((a, b) => a.sort_order - b.sort_order))
  vi.spyOn(classificationService.categories, 'list').mockImplementation(async () => categories)
  vi.spyOn(budgetService.entries, 'listColumn').mockImplementation((async () => inUse.map((id) => ({ budget_item_id: id }))) as never)
  vi.spyOn(classificationService.budgetItems, 'create').mockImplementation(async (values) => {
    const row = item(200, values.macro_area_id, values.name, values.sort_order ?? 0, values.kind)
    items.push(row)
    return row
  })
  vi.spyOn(classificationService.budgetItems, 'update').mockImplementation(async (id, values) => {
    items = items.map((i) => (i.id === id ? ({ ...i, ...values } as ItemRow) : i))
    return items.find((i) => i.id === id)!
  })
})

describe('BudgetItemsSettingsPage', () => {
  it('raggruppa per macro-area; la macro-area archiviata compare solo perché ha voci', async () => {
    setup()
    expect(await screen.findByRole('heading', { level: 2, name: 'Casa' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Svago' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Vecchia (archiviata)' })).toBeInTheDocument()
    expect(group('Casa').getByText('Affitto')).toBeInTheDocument()
    // niente aggiunta nel gruppo archiviato
    expect(within(screen.getByRole('region', { name: 'Vecchia (archiviata)' })).queryByLabelText('Nuova voce')).not.toBeInTheDocument()
  })

  it('aggiunge una voce alla macro-area scelta con il tipo indicato', async () => {
    setup()
    await screen.findByRole('heading', { level: 2, name: 'Svago' })
    const svago = group('Svago')
    await userEvent.type(svago.getByLabelText('Nuova voce'), 'Cinema')
    await userEvent.selectOptions(svago.getByLabelText(/Tipo/), 'income')
    await userEvent.click(svago.getByRole('button', { name: 'Aggiungi' }))
    await vi.waitFor(() =>
      expect(classificationService.budgetItems.create).toHaveBeenCalledWith({ name: 'Cinema', kind: 'income', macro_area_id: 2, sort_order: 1 }),
    )
  })

  it('rinomina e riordina dentro il gruppo', async () => {
    const reorder = vi.spyOn(classificationService.budgetItems, 'reorder').mockResolvedValue({} as ItemRow)
    setup()
    await screen.findByRole('heading', { level: 2, name: 'Casa' })
    await userEvent.click(group('Casa').getByRole('button', { name: 'Sposta giù Affitto' }))
    await vi.waitFor(() => expect(reorder).toHaveBeenCalledTimes(2))
    expect(reorder).toHaveBeenCalledWith(11, 0)
    expect(reorder).toHaveBeenCalledWith(10, 1)
    await userEvent.click(group('Svago').getByRole('button', { name: 'Rinomina Cene' }))
    await userEvent.type(screen.getByLabelText('Nome di Cene'), 'X{Enter}')
    await vi.waitFor(() => expect(classificationService.budgetItems.update).toHaveBeenCalledWith(20, { name: 'CeneX' }))
  })

  it('sposta una voce in un\'altra macro-area; le archiviate non sono tra le scelte', async () => {
    setup()
    await screen.findByRole('heading', { level: 2, name: 'Casa' })
    await userEvent.click(group('Casa').getByRole('button', { name: 'Sposta Affitto' }))
    const dialog = await screen.findByRole('dialog', { name: 'Sposta Affitto' })
    const options = within(dialog).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Scegli…', 'Svago'])
    await userEvent.selectOptions(within(dialog).getByLabelText(/Nuova macro-area/), 'Svago')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sposta' }))
    await vi.waitFor(() =>
      expect(classificationService.budgetItems.update).toHaveBeenCalledWith(10, { macro_area_id: 2, sort_order: 1 }),
    )
  })

  it('senza destinazione il pulsante Sposta chiede di sceglierne una', async () => {
    setup()
    await screen.findByRole('heading', { level: 2, name: 'Casa' })
    await userEvent.click(group('Casa').getByRole('button', { name: 'Sposta Affitto' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sposta' }))
    expect(within(dialog).getByText('Scegli una destinazione.')).toBeInTheDocument()
    expect(classificationService.budgetItems.update).not.toHaveBeenCalled()
  })

  it('"Elimina" manca per voci con categorie o righe di budget, c\'è per le altre', async () => {
    setup()
    await screen.findByRole('heading', { level: 2, name: 'Casa' })
    expect(screen.queryByRole('button', { name: 'Elimina Utenze' })).not.toBeInTheDocument() // ha categorie
    expect(screen.queryByRole('button', { name: 'Elimina Cene' })).not.toBeInTheDocument() // ha righe di budget
    expect(screen.getByRole('button', { name: 'Elimina Affitto' })).toBeInTheDocument()
  })

  it('mostra il tipo in chiaro accanto al nome', async () => {
    setup()
    await screen.findByRole('heading', { level: 2, name: 'Casa' })
    expect(group('Vecchia (archiviata)').getByText('Entrata')).toBeInTheDocument()
    expect(group('Casa').getAllByText('Spesa').length).toBeGreaterThan(0)
  })

  it('senza macro-aree rimanda alla loro gestione', async () => {
    areas = []
    items = []
    setup()
    expect(await screen.findByText(/Prima crea almeno una macro-area/)).toBeInTheDocument()
  })
})
