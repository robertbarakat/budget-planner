import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classificationService } from '../../api/classification.service.ts'
import { transactionsService } from '../../api/transactions.service.ts'
import CategoriesSettingsPage from './CategoriesSettingsPage.tsx'

type MacroRow = Awaited<ReturnType<typeof classificationService.macroAreas.list>>[number]
type ItemRow = Awaited<ReturnType<typeof classificationService.budgetItems.list>>[number]
type CategoryRow = Awaited<ReturnType<typeof classificationService.categories.list>>[number]

const area = (id: number, name: string): MacroRow => ({ id, name, sort_order: id, archived: false, is_professional: false, created_at: '' })
const item = (id: number, macro_area_id: number, name: string, archived = false): ItemRow =>
  ({ id, macro_area_id, name, kind: 'expense', sort_order: id, archived, created_at: '' }) as ItemRow
const cat = (id: number, budget_item_id: number, name: string, sort_order: number): CategoryRow =>
  ({ id, budget_item_id, name, sort_order, archived: false, created_at: '' }) as CategoryRow

let items: ItemRow[]
let categories: CategoryRow[]

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <CategoriesSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const group = (name: string) => within(screen.getByRole('region', { name }))

beforeEach(() => {
  vi.restoreAllMocks()
  items = [item(1, 1, 'Utenze'), item(2, 1, 'Food'), item(3, 1, 'Vecchia', true)]
  categories = [cat(10, 1, 'Luce', 0), cat(11, 1, 'Gas', 1), cat(20, 2, 'Pizza', 0)]
  vi.spyOn(classificationService.macroAreas, 'list').mockResolvedValue([area(1, 'Casa')])
  vi.spyOn(classificationService.budgetItems, 'list').mockImplementation(async () => items)
  vi.spyOn(classificationService.categories, 'list').mockImplementation(async () => categories)
  vi.spyOn(transactionsService, 'listColumn').mockResolvedValue([{ category_id: 20 }] as never)
  vi.spyOn(classificationService.categories, 'create').mockImplementation(async (values) => {
    const row = cat(300, values.budget_item_id, values.name, values.sort_order ?? 0)
    categories.push(row)
    return row
  })
  vi.spyOn(classificationService.categories, 'update').mockImplementation(async (id, values) => {
    categories = categories.map((c) => (c.id === id ? ({ ...c, ...values } as CategoryRow) : c))
    return categories.find((c) => c.id === id)!
  })
})

describe('CategoriesSettingsPage', () => {
  it('raggruppa per voce, con la macro-area nel titolo; la voce archiviata senza categorie non compare', async () => {
    setup()
    expect(await screen.findByRole('heading', { level: 2, name: 'Utenze (Casa)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Food (Casa)' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Vecchia/ })).not.toBeInTheDocument()
    expect(group('Utenze (Casa)').getByText('Luce')).toBeInTheDocument()
  })

  it('aggiunge una categoria alla voce con sort_order successivo', async () => {
    setup()
    await screen.findByRole('heading', { level: 2, name: 'Food (Casa)' })
    const food = group('Food (Casa)')
    await userEvent.type(food.getByLabelText('Nuova categoria'), 'Bar')
    await userEvent.click(food.getByRole('button', { name: 'Aggiungi' }))
    await vi.waitFor(() =>
      expect(classificationService.categories.create).toHaveBeenCalledWith({ name: 'Bar', budget_item_id: 2, sort_order: 1 }),
    )
  })

  it('rinomina e riordina', async () => {
    const reorder = vi.spyOn(classificationService.categories, 'reorder').mockResolvedValue({} as CategoryRow)
    setup()
    await screen.findByRole('heading', { level: 2, name: 'Utenze (Casa)' })
    await userEvent.click(group('Utenze (Casa)').getByRole('button', { name: 'Sposta su Gas' }))
    await vi.waitFor(() => expect(reorder).toHaveBeenCalledTimes(2))
    await userEvent.click(group('Food (Casa)').getByRole('button', { name: 'Rinomina Pizza' }))
    await userEvent.type(screen.getByLabelText('Nome di Pizza'), '!{Enter}')
    await vi.waitFor(() => expect(classificationService.categories.update).toHaveBeenCalledWith(20, { name: 'Pizza!' }))
  })

  it('lo spostamento cambia solo la categoria, senza toccare i movimenti', async () => {
    const transactionsUpdate = vi.spyOn(transactionsService, 'update')
    setup()
    await screen.findByRole('heading', { level: 2, name: 'Utenze (Casa)' })
    await userEvent.click(group('Utenze (Casa)').getByRole('button', { name: 'Sposta Luce' }))
    const dialog = await screen.findByRole('dialog', { name: 'Sposta Luce' })
    expect(within(dialog).getByText(/movimenti già registrati restano alla voce di prima/)).toBeInTheDocument()
    // La voce archiviata non è tra le scelte
    expect(within(dialog).getAllByRole('option').map((o) => o.textContent)).toEqual(['Scegli…', 'Food (Casa)'])
    await userEvent.selectOptions(within(dialog).getByLabelText(/Nuova voce di budget/), 'Food (Casa)')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sposta' }))
    await vi.waitFor(() => expect(classificationService.categories.update).toHaveBeenCalledWith(10, { budget_item_id: 2 }))
    expect(transactionsUpdate).not.toHaveBeenCalled()
  })

  it('"Elimina" manca per le categorie con movimenti', async () => {
    setup()
    await screen.findByRole('heading', { level: 2, name: 'Food (Casa)' })
    expect(screen.queryByRole('button', { name: 'Elimina Pizza' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Elimina Luce' })).toBeInTheDocument()
  })

  it('senza voci rimanda alla loro gestione', async () => {
    items = []
    setup()
    expect(await screen.findByText(/Prima crea almeno una voce di budget/)).toBeInTheDocument()
  })
})
