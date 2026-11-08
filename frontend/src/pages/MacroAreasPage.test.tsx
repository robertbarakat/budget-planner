import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../api/accounts.service.ts'
import { budgetService } from '../api/budget.service.ts'
import { classificationService } from '../api/classification.service.ts'
import { transactionsService } from '../api/transactions.service.ts'
import { SnackbarProvider } from '../components/Snackbar.tsx'
import MacroAreasPage from './MacroAreasPage.tsx'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(classificationService.macroAreas, 'list').mockResolvedValue([
    { id: 1, name: 'Introiti', sort_order: 0, archived: false } as never,
    { id: 2, name: 'Casa', sort_order: 1, archived: false } as never,
    { id: 3, name: 'Vecchia', sort_order: 2, archived: true } as never,
  ])
  vi.spyOn(classificationService.budgetItems, 'list').mockResolvedValue([
    { id: 10, macro_area_id: 1, name: 'Fatture', kind: 'income', sort_order: 0, archived: false } as never,
    { id: 20, macro_area_id: 2, name: 'Affitto', kind: 'expense', sort_order: 0, archived: false } as never,
    { id: 30, macro_area_id: 3, name: 'Voce vecchia', kind: 'expense', sort_order: 0, archived: true } as never,
  ])
  vi.spyOn(classificationService.categories, 'list').mockResolvedValue([
    { id: 1, budget_item_id: 20, name: 'Canone', archived: false } as never,
    { id: 2, budget_item_id: 20, name: 'Spese condominio', archived: false } as never,
  ])
  vi.spyOn(budgetService.entries, 'list').mockResolvedValue([
    { id: 1, budget_item_id: 10, year: 2026, month: 1, amount: 1000 } as never,
    { id: 2, budget_item_id: 20, year: 2026, month: 1, amount: 400 } as never,
    { id: 3, budget_item_id: 30, year: 2026, month: 2, amount: 50 } as never,
  ])
  vi.spyOn(budgetService.closedMonths, 'list').mockResolvedValue([{ id: 1, year: 2026, month: 1 } as never])
  vi.spyOn(transactionsService, 'listForYear').mockResolvedValue([
    { id: 1, type: 'income', budget_item_id: 10, category_id: 1, transaction_date: '2026-01-10', amount: 900 } as never,
    { id: 2, type: 'expense', budget_item_id: 20, category_id: 1, transaction_date: '2026-01-02', amount: 300 } as never,
    { id: 3, type: 'expense', budget_item_id: 20, category_id: 2, transaction_date: '2026-01-15', amount: 130 } as never,
  ])
  vi.spyOn(accountsService.openingBalances, 'list').mockResolvedValue([])
})

function setup(url = '/macro-areas?year=2026') {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={[url]}>
          <MacroAreasPage />
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

const rowOf = (grid: HTMLElement, name: string) => within(grid).getAllByRole('row').find((r) => r.textContent?.startsWith(name))!

describe('MacroAreasPage', () => {
  it('mostra previsto, reale e scostamento con segno per area e voce, e il totale', async () => {
    setup()
    const grid = await screen.findByRole('region', { name: /macro-area, 2026/ })
    const home = rowOf(grid, 'Casa')
    // previsto −400, reale −430, scostamento −30 con segno meno
    expect(home).toHaveTextContent('400,00')
    expect(home).toHaveTextContent('430,00')
    expect(within(home).getAllByText('−').length).toBe(3)
    expect(rowOf(grid, 'Affitto')).toHaveTextContent('430,00')
    // totale: previsto 1000−400−50 = 550; reale 900−430 = 470 (le voci non chiuse hanno reale 0); scostamento −80
    const total = rowOf(grid, 'Totale')
    expect(total).toHaveTextContent('550,00')
    expect(total).toHaveTextContent('470,00')
    expect(total).toHaveTextContent('80,00')
  })

  it('una voce e un\'area archiviate compaiono nell\'anno in cui hanno importi', async () => {
    setup()
    const grid = await screen.findByRole('region', { name: /macro-area, 2026/ })
    expect(rowOf(grid, 'Vecchia (archiviata)')).toBeInTheDocument()
    expect(rowOf(grid, 'Voce vecchia (archiviata)')).toBeInTheDocument()
  })

  it('con un mese nell\'indirizzo mostra solo quel mese', async () => {
    setup('/macro-areas?year=2026&month=2')
    const grid = await screen.findByRole('region', { name: /febbraio 2026/ })
    expect(rowOf(grid, 'Totale')).toHaveTextContent('50,00')
    expect(screen.getByLabelText('Mese')).toHaveValue('2')
  })

  it('l\'interruttore passa da anno intero a mese singolo', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('region', { name: /macro-area, 2026/ })
    await user.selectOptions(screen.getByLabelText('Mese'), 'Gennaio')
    expect(await screen.findByRole('region', { name: /gennaio 2026/ })).toBeInTheDocument()
  })

  it('selezionando una voce si apre il dettaglio mensile, con categorie e totale uguale alla riga; Esc lo chiude', async () => {
    const user = userEvent.setup()
    setup()
    const grid = await screen.findByRole('region', { name: /macro-area, 2026/ })
    const row = rowOf(grid, 'Affitto')
    await user.click(within(row).getByRole('button', { name: 'Affitto' }))
    const dialog = await screen.findByRole('dialog', { name: /Affitto · 2026/ })
    // gennaio chiuso: previsto −400, reale −430, scostamento −30; totale annuo = riga della vista
    const january = within(dialog).getAllByRole('row').find((r) => r.textContent?.toLowerCase().startsWith('gennaio'))!
    expect(january).toHaveTextContent('(chiuso)')
    expect(january).toHaveTextContent('400,00')
    expect(january).toHaveTextContent('430,00')
    const total = within(dialog).getByRole('row', { name: /Totale 2026/ })
    expect(total).toHaveTextContent('400,00')
    expect(total).toHaveTextContent('430,00')
    expect(total).toHaveTextContent('30,00')
    // categorie: 300 + 130 = reale della voce
    expect(within(dialog).getByText('Canone').parentElement).toHaveTextContent('300,00')
    expect(within(dialog).getByText('Spese condominio').parentElement).toHaveTextContent('130,00')
    expect(within(dialog).getByRole('link', { name: 'Movimenti di gennaio 2026' })).toHaveAttribute('href', '/transactions?year=2026&month=1')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
