import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { budgetService } from '../api/budget.service.ts'
import { accountsService } from '../api/accounts.service.ts'
import { transactionsService } from '../api/transactions.service.ts'
import { classificationService } from '../api/classification.service.ts'
import { SnackbarProvider } from '../components/Snackbar.tsx'
import BudgetPage from './BudgetPage.tsx'

type MacroRow = Awaited<ReturnType<typeof classificationService.macroAreas.list>>[number]
type ItemRow = Awaited<ReturnType<typeof classificationService.budgetItems.list>>[number]
type EntryRow = Awaited<ReturnType<typeof budgetService.entries.list>>[number]

const year = new Date().getFullYear()
const entry = (id: number, budget_item_id: number, month: number, amount: number, source: EntryRow['source'] = 'manual'): EntryRow =>
  ({ id, budget_item_id, year, month, amount, source, created_at: '' }) as EntryRow

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(classificationService.macroAreas, 'list').mockResolvedValue([
    { id: 1, name: 'Casa', sort_order: 0, archived: false, is_professional: false, created_at: '' } as MacroRow,
  ])
  vi.spyOn(classificationService.budgetItems, 'list').mockResolvedValue([
    { id: 10, macro_area_id: 1, name: 'Affitto', kind: 'expense', sort_order: 0, archived: false, created_at: '' } as ItemRow,
  ])
  vi.spyOn(classificationService.categories, 'list').mockResolvedValue([])
  vi.spyOn(budgetService.entries, 'list').mockResolvedValue([entry(1, 10, 1, 400), entry(2, 10, 2, 100, 'recurrence')])
  vi.spyOn(budgetService.closedMonths, 'list').mockResolvedValue([{ id: 1, year, month: 1, closed_at: '' }] as never)
  vi.spyOn(transactionsService, 'listForYear').mockResolvedValue([
    { id: 1, type: 'expense', budget_item_id: 10, category_id: 1, transaction_date: `${year}-01-05`, amount: 380 } as never,
  ])
  vi.spyOn(accountsService.openingBalances, 'list').mockResolvedValue([])
})

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <BudgetPage />
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

describe('BudgetPage', () => {
  it('mostra importi con segno, totali e origine delle righe non manuali', async () => {
    setup()
    const grid = await screen.findByRole('region', { name: `Budget previsto ${year}` })
    const row = within(grid).getAllByRole('row').find((r) => r.textContent?.includes('Affitto'))!
    expect(within(row).getAllByText(/400,00/).length).toBeGreaterThan(0)
    expect(within(row).getByText('Ricorrente')).toBeInTheDocument()
    // totale della voce: 500
    expect(within(row).getAllByText(/500,00/).length).toBeGreaterThan(0)
    expect(within(row).getAllByText('−').length).toBeGreaterThan(0)
  })

  it('nei mesi chiusi mostra il reale', async () => {
    setup()
    const grid = await screen.findByRole('region', { name: `Budget previsto ${year}` })
    const row = within(grid).getAllByRole('row').find((r) => r.textContent?.includes('Affitto'))!
    await vi.waitFor(() => expect(within(row).getAllByText(/380,00/).length).toBeGreaterThan(0))
  })

  it('chiude e riapre una macro-area nascondendo le sue voci', async () => {
    setup()
    await screen.findByRole('region', { name: `Budget previsto ${year}` })
    expect(screen.getByRole('button', { name: `Modifica Affitto, Gennaio ${year}` })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Casa' }))
    expect(screen.queryByRole('button', { name: `Modifica Affitto, Gennaio ${year}` })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Espandi tutto' }))
    expect(screen.getByRole('button', { name: `Modifica Affitto, Gennaio ${year}` })).toBeInTheDocument()
  })

  it('cambia anno e rilegge le righe di quell\'anno', async () => {
    setup()
    await screen.findByRole('region', { name: `Budget previsto ${year}` })
    await userEvent.click(screen.getByRole('button', { name: 'Anno successivo' }))
    expect(await screen.findByRole('region', { name: `Budget previsto ${year + 1}` })).toBeInTheDocument()
    expect(budgetService.entries.list).toHaveBeenLastCalledWith(expect.objectContaining({ where: { year: year + 1 } }))
  })
})

describe('BudgetPage: modifica di una cella', () => {
  it('in una cella vuota crea una riga manuale e conferma', async () => {
    const setManual = vi.spyOn(budgetService, 'setManualAmount').mockResolvedValue()
    setup()
    await screen.findByRole('region', { name: `Budget previsto ${year}` })
    await userEvent.click(screen.getByRole('button', { name: `Modifica Affitto, Marzo ${year}` }))
    await userEvent.type(screen.getByLabelText(/Importo previsto manuale/), '1.250,50')
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    await vi.waitFor(() => expect(setManual).toHaveBeenCalledWith(10, year, 3, 1250.5, null))
    expect(await screen.findByText('Budget salvato.')).toBeInTheDocument()
  })

  it('svuotando una cella con riga manuale la elimina', async () => {
    const setManual = vi.spyOn(budgetService, 'setManualAmount').mockResolvedValue()
    setup()
    await screen.findByRole('region', { name: `Budget previsto ${year}` })
    await userEvent.click(screen.getByRole('button', { name: `Modifica Affitto, Gennaio ${year}` }))
    const input = screen.getByLabelText(/Importo previsto manuale/)
    expect(input).toHaveValue('400,00')
    await userEvent.clear(input)
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    await vi.waitFor(() => expect(setManual).toHaveBeenCalledWith(10, year, 1, null, null))
  })

  it('un importo non valido o negativo non si salva e mostra l\'errore', async () => {
    const setManual = vi.spyOn(budgetService, 'setManualAmount').mockResolvedValue()
    setup()
    await screen.findByRole('region', { name: `Budget previsto ${year}` })
    await userEvent.click(screen.getByRole('button', { name: `Modifica Affitto, Marzo ${year}` }))
    await userEvent.type(screen.getByLabelText(/Importo previsto manuale/), '-5')
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await within(screen.getByRole('dialog')).findByText(/Scrivi l'importo senza segno: entrata/)).toBeInTheDocument()
    expect(setManual).not.toHaveBeenCalled()
  })

  it('con una riga di altra origine mostra la riga e chiede conferma prima di aggiungere', async () => {
    const setManual = vi.spyOn(budgetService, 'setManualAmount').mockResolvedValue()
    setup()
    await screen.findByRole('region', { name: `Budget previsto ${year}` })
    await userEvent.click(screen.getByRole('button', { name: `Modifica Affitto, Febbraio ${year}` }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Ricorrenza')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText(/Importo previsto manuale/), '30')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('non la sostituisce')
    expect(setManual).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Aggiungi accanto' }))
    await vi.waitFor(() => expect(setManual).toHaveBeenCalledWith(10, year, 2, 30, null))
  })

  it('annullando la conferma non scrive nulla', async () => {
    const setManual = vi.spyOn(budgetService, 'setManualAmount').mockResolvedValue()
    setup()
    await screen.findByRole('region', { name: `Budget previsto ${year}` })
    await userEvent.click(screen.getByRole('button', { name: `Modifica Affitto, Febbraio ${year}` }))
    await userEvent.type(screen.getByLabelText(/Importo previsto manuale/), '30')
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Annulla' }))
    expect(setManual).not.toHaveBeenCalled()
  })
})
