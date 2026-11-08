import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classificationService } from '../../api/classification.service.ts'
import { transactionsService } from '../../api/transactions.service.ts'
import { SnackbarProvider } from '../../components/Snackbar.tsx'
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
      <SnackbarProvider>
        <MemoryRouter>
          <CategoriesSettingsPage />
        </MemoryRouter>
      </SnackbarProvider>
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
    vi.spyOn(classificationService.transactions, 'listColumnsWhere').mockResolvedValue([] as never)
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

describe('CategoriesSettingsPage: riclassificare lo storico', () => {
  async function moveLuceToFood() {
    await screen.findByRole('heading', { level: 2, name: 'Utenze (Casa)' })
    await userEvent.click(group('Utenze (Casa)').getByRole('button', { name: 'Sposta Luce' }))
    const dialog = await screen.findByRole('dialog', { name: 'Sposta Luce' })
    await userEvent.selectOptions(within(dialog).getByLabelText(/Nuova voce di budget/), 'Food (Casa)')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sposta' }))
  }
  // Luce (id 10) ha 3 movimenti: due sulla voce di prima (1), uno già sulla nuova (2)
  const history = [{ budget_item_id: 1 }, { budget_item_id: 1 }, { budget_item_id: 2 }]

  it('dopo lo spostamento chiede se riclassificare, con il numero di movimenti; nessuna risposta è preselezionata', async () => {
    vi.spyOn(classificationService.transactions, 'listColumnsWhere').mockResolvedValue(history as never)
    setup()
    await moveLuceToFood()
    const question = await screen.findByRole('alertdialog', { name: 'Riclassificare anche lo storico?' })
    expect(question).toHaveTextContent('2 movimenti')
    const yes = within(question).getByRole('button', { name: 'Sì, riclassifica 2 movimenti' })
    const no = within(question).getByRole('button', { name: 'No, lascia lo storico' })
    expect(yes).toBeEnabled()
    expect(no).toBeEnabled()
    expect(within(question).queryByRole('radio')).not.toBeInTheDocument()
    expect(within(question).queryByRole('checkbox')).not.toBeInTheDocument()
    // Nulla si è mosso senza una scelta
    expect(classificationService.categories.update).toHaveBeenCalledWith(10, { budget_item_id: 2 })
  })

  it('con "No" i movimenti già registrati restano invariati', async () => {
    vi.spyOn(classificationService.transactions, 'listColumnsWhere').mockResolvedValue(history as never)
    const rpc = vi.spyOn(classificationService, 'reclassifyCategoryHistory')
    setup()
    await moveLuceToFood()
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'No, lascia lo storico' }))
    expect(rpc).not.toHaveBeenCalled()
    expect(await screen.findByText(/Lo storico non è cambiato/)).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('chiudere la finestra con Esc vale "no"', async () => {
    vi.spyOn(classificationService.transactions, 'listColumnsWhere').mockResolvedValue(history as never)
    const rpc = vi.spyOn(classificationService, 'reclassifyCategoryHistory')
    setup()
    await moveLuceToFood()
    await screen.findByRole('alertdialog')
    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(rpc).not.toHaveBeenCalled()
  })

  it('con "Sì" chiama la funzione SQL con categoria e nuova voce e mostra l\'esito con il numero modificato', async () => {
    vi.spyOn(classificationService.transactions, 'listColumnsWhere').mockResolvedValue(history as never)
    const rpc = vi.spyOn(classificationService, 'reclassifyCategoryHistory').mockResolvedValue(2)
    setup()
    await moveLuceToFood()
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Sì, riclassifica 2 movimenti' }))
    await vi.waitFor(() => expect(rpc).toHaveBeenCalledWith(10, 2))
    expect(await screen.findByText(/Riclassificati 2 movimenti alla voce «Food \(Casa\)»/)).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('se la riclassificazione fallisce la finestra resta aperta per riprovare', async () => {
    vi.spyOn(classificationService.transactions, 'listColumnsWhere').mockResolvedValue(history as never)
    const rpc = vi.spyOn(classificationService, 'reclassifyCategoryHistory').mockRejectedValueOnce(new Error('rete'))
    setup()
    await moveLuceToFood()
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Sì, riclassifica 2 movimenti' }))
    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    rpc.mockResolvedValueOnce(2)
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sì, riclassifica 2 movimenti' }))
    expect(await screen.findByText(/Riclassificati 2 movimenti/)).toBeInTheDocument()
  })

  it('senza movimenti da riclassificare non fa la domanda', async () => {
    vi.spyOn(classificationService.transactions, 'listColumnsWhere').mockResolvedValue([{ budget_item_id: 2 }] as never)
    setup()
    await moveLuceToFood()
    expect(await screen.findByText(/Nessun movimento da riclassificare/)).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('con un solo movimento usa il singolare', async () => {
    vi.spyOn(classificationService.transactions, 'listColumnsWhere').mockResolvedValue([{ budget_item_id: 1 }] as never)
    setup()
    await moveLuceToFood()
    const question = await screen.findByRole('alertdialog')
    expect(within(question).getByRole('button', { name: 'Sì, riclassifica 1 movimento' })).toBeInTheDocument()
    expect(question).toHaveTextContent('1 movimento già registrato')
  })
})
