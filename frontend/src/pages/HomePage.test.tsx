import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../api/accounts.service.ts'
import { budgetService } from '../api/budget.service.ts'
import { classificationService } from '../api/classification.service.ts'
import { recurrencesService } from '../api/recurrences.service.ts'
import { transactionsService } from '../api/transactions.service.ts'
import { SnackbarProvider } from '../components/Snackbar.tsx'
import { AppError } from '../api/api-error.ts'
import { queryKeys } from '../api/query-keys.ts'
import CashFlowPage from './CashFlowPage.tsx'
import HomePage from './HomePage.tsx'

// Data fissa: 15 marzo 2026 (mese corrente = marzo, aperto).
beforeEach(() => {
  vi.restoreAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 2, 15))
  vi.spyOn(classificationService.macroAreas, 'list').mockResolvedValue([
    { id: 1, name: 'Introiti', sort_order: 0, archived: false } as never,
    { id: 2, name: 'Casa', sort_order: 1, archived: false } as never,
  ])
  vi.spyOn(classificationService.budgetItems, 'list').mockResolvedValue([
    { id: 10, macro_area_id: 1, name: 'Fatture', kind: 'income', sort_order: 0, archived: false } as never,
    { id: 20, macro_area_id: 2, name: 'Affitto', kind: 'expense', sort_order: 0, archived: false } as never,
  ])
  vi.spyOn(budgetService.entries, 'list').mockResolvedValue([
    { id: 1, budget_item_id: 10, year: 2026, month: 1, amount: 1000 } as never,
    { id: 2, budget_item_id: 20, year: 2026, month: 1, amount: 400 } as never,
    { id: 3, budget_item_id: 10, year: 2026, month: 3, amount: 2000 } as never,
    { id: 4, budget_item_id: 20, year: 2026, month: 3, amount: 500 } as never,
  ])
  vi.spyOn(budgetService.closedMonths, 'list').mockResolvedValue([{ id: 1, year: 2026, month: 1 } as never])
  vi.spyOn(transactionsService, 'listForYear').mockResolvedValue([
    { id: 1, type: 'income', budget_item_id: 10, category_id: 1, transaction_date: '2026-01-10', amount: 900 } as never,
    { id: 2, type: 'expense', budget_item_id: 20, category_id: 2, transaction_date: '2026-01-02', amount: 430 } as never,
    { id: 3, type: 'expense', budget_item_id: 20, category_id: 2, transaction_date: '2026-03-05', amount: 120 } as never,
  ])
  vi.spyOn(accountsService.openingBalances, 'list').mockResolvedValue([{ id: 1, account_id: 1, year: 2026, amount: 1000 } as never])
  vi.spyOn(accountsService.accounts, 'list').mockResolvedValue([
    { id: 1, name: 'Bancoposta', archived: false, sort_order: 0 } as never,
    { id: 2, name: 'Cash', archived: false, sort_order: 1 } as never,
  ])
  vi.spyOn(accountsService, 'currentBalances').mockResolvedValue({ balances: { 1: 1500.5, 2: 200 }, total: 1700.5 })
  vi.spyOn(classificationService.categories, 'list').mockResolvedValue([
    { id: 1, name: 'Stipendio', budget_item_id: 10, archived: false } as never,
    { id: 2, name: 'Affitto', budget_item_id: 20, archived: false } as never,
  ])
  vi.spyOn(transactionsService, 'listFiltered').mockResolvedValue([
    { id: 3, type: 'expense', account_id: 1, category_id: 2, transaction_date: '2026-03-05', amount: 120 } as never,
    { id: 1, type: 'income', account_id: 2, category_id: 1, transaction_date: '2026-01-10', amount: 900 } as never,
  ])
  vi.spyOn(recurrencesService.recurrences, 'list').mockResolvedValue([])
  vi.spyOn(recurrencesService, 'listOccurrencesInRange').mockResolvedValue([])
})

afterEach(() => vi.useRealTimers())

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrap(ui: React.ReactNode, url = '/', client = makeClient()) {
  return render(
    <QueryClientProvider client={client}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

describe('HomePage', () => {
  // gen chiuso reale: +900 −430 = +470 → 1.470; feb 0; mar aperto previsto: +2000 −500 = +1500 → 2.970
  it('la cassa a fine mese coincide con il saldo di fine mese della vista cronologica', async () => {
    const home = wrap(<HomePage />)
    const card = await screen.findByRole('region', { name: 'Cassa prevista a fine mese' })
    expect(card).toHaveTextContent('2.970,00')
    expect(screen.getByText('Aperto')).toBeInTheDocument()
    home.unmount()

    wrap(<CashFlowPage />, '/cash-flow?year=2026')
    const march = (await screen.findAllByRole('listitem')).find((li) => li.textContent?.toLowerCase().startsWith('marzo'))!
    expect(within(march).getByText('Saldo a fine mese').nextElementSibling).toHaveTextContent('2.970,00')
  })

  it('le spese del mese mostrano reale, previsto e scostamento con segno e testo', async () => {
    wrap(<HomePage />)
    const card = await screen.findByRole('region', { name: 'Spese del mese' })
    // previsto −500, reale −120 (parziale), scostamento +380
    expect(within(card).getByText('Reale').nextElementSibling).toHaveTextContent('120,00')
    expect(within(card).getByText('Previsto').nextElementSibling).toHaveTextContent('500,00')
    expect(within(card).getByText('Scostamento').nextElementSibling).toHaveTextContent('+380,00')
    expect(within(card).getByText('Reale').nextElementSibling).toHaveTextContent('−')
    expect(within(card).getByText('Spese sotto il previsto.')).toBeInTheDocument()
  })

  it('le prossime scadenze mostrano nome, data, importo con segno e "Scaduta" per le passate non registrate', async () => {
    vi.spyOn(recurrencesService.recurrences, 'list').mockResolvedValue([
      { id: 1, name: 'Mutuo', archived: false, budget_item_id: 20, account_id: 1, base_amount: 650 } as never,
      { id: 2, name: 'Affitto studio', archived: false, budget_item_id: 10, account_id: 1, base_amount: 300 } as never,
      { id: 3, name: 'Vecchio abbonamento', archived: true, budget_item_id: 20, account_id: 1, base_amount: 9 } as never,
    ])
    vi.spyOn(recurrencesService, 'listOccurrencesInRange').mockResolvedValue([
      { id: 1, recurrence_id: 1, due_date: '2026-03-10', amount: 650 } as never,
      { id: 3, recurrence_id: 3, due_date: '2026-03-16', amount: 9 } as never,
      { id: 2, recurrence_id: 2, due_date: '2026-03-20', amount: 300 } as never,
    ])
    wrap(<HomePage />)
    const card = await screen.findByRole('region', { name: 'Prossime scadenze' })
    const items = await within(card).findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Mutuo')
    expect(items[0]).toHaveTextContent('Scaduta')
    expect(items[0]).toHaveTextContent('−')
    expect(items[0]).toHaveTextContent('650,00')
    expect(items[1]).toHaveTextContent('Affitto studio')
    expect(items[1]).toHaveTextContent('+')
    expect(within(card).queryByText('Vecchio abbonamento')).not.toBeInTheDocument()
    expect(within(items[0]!).getByRole('link', { name: /Registra pagamento di Mutuo/ })).toHaveAttribute(
      'href',
      '/transactions/new?amount=650%2C00&account=1&item=20',
    )
  })

  it('senza scadenze mostra lo stato vuoto', async () => {
    wrap(<HomePage />)
    const card = await screen.findByRole('region', { name: 'Prossime scadenze' })
    expect(await within(card).findByText('Nessuna scadenza nei prossimi 30 giorni.')).toBeInTheDocument()
  })

  it('mostra caricamento ed errore', async () => {
    vi.spyOn(transactionsService, 'listForYear').mockRejectedValue(new AppError('network', null, undefined, 'Rete assente.'))
    wrap(<HomePage />)
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Caricamento')
    expect(await screen.findByText('Non riesco a leggere i dati. Riprova più tardi.')).toBeInTheDocument()
  })

  it('la scheda Conti mostra il saldo di ogni conto e un totale uguale alla somma', async () => {
    wrap(<HomePage />)
    const card = await screen.findByRole('region', { name: 'Conti' })
    const rows = await within(card).findAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Bancoposta')
    expect(rows[0]).toHaveTextContent('1.500,50')
    expect(rows[1]).toHaveTextContent('200,00')
    expect(within(card).getByText('Totale').parentElement).toHaveTextContent('1.700,50')
    expect(1500.5 + 200).toBe(1700.5)
  })

  it('le ultime registrazioni hanno segno e conto e rimandano a tutti i movimenti', async () => {
    wrap(<HomePage />)
    const card = await screen.findByRole('region', { name: 'Ultime registrazioni' })
    const rows = await within(card).findAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Affitto')
    expect(rows[0]).toHaveTextContent('5 mar')
    expect(rows[0]).toHaveTextContent('−120,00')
    expect(rows[1]).toHaveTextContent('+900,00')
    expect(within(card).getByRole('link', { name: 'Tutti i movimenti' })).toHaveAttribute('href', '/transactions')
    expect(transactionsService.listFiltered).toHaveBeenCalledWith({ limit: 5 })
  })

  it('dopo un nuovo movimento (invalidazione come nelle mutazioni) mostra la registrazione e i saldi aggiornati', async () => {
    const client = makeClient()
    wrap(<HomePage />, '/', client)
    const card = await screen.findByRole('region', { name: 'Ultime registrazioni' })
    await within(card).findAllByRole('listitem')
    vi.spyOn(transactionsService, 'listFiltered').mockResolvedValue([
      { id: 9, type: 'expense', account_id: 1, category_id: 2, transaction_date: '2026-03-15', amount: 7 } as never,
    ])
    vi.spyOn(accountsService, 'currentBalances').mockResolvedValue({ balances: { 1: 1493.5, 2: 200 }, total: 1693.5 })
    await act(async () => {
      // Le mutazioni dei movimenti invalidano movimenti, conti e budget (transactions.queries.ts).
      await Promise.all([queryKeys.transactions.all, queryKeys.accounts.all, queryKeys.budget.all].map((queryKey) => client.invalidateQueries({ queryKey })))
    })
    await waitFor(() => expect(within(card).getByText('15 mar · Spesa · Bancoposta')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('region', { name: 'Conti' })).toHaveTextContent('1.693,50'))
  })
})
