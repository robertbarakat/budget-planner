import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../api/accounts.service.ts'
import { budgetService } from '../api/budget.service.ts'
import { classificationService } from '../api/classification.service.ts'
import { transactionsService } from '../api/transactions.service.ts'
import { SnackbarProvider } from '../components/Snackbar.tsx'
import { AppError } from '../api/api-error.ts'
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
})

afterEach(() => vi.useRealTimers())

function wrap(ui: React.ReactNode, url = '/') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
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

  it('mostra caricamento ed errore', async () => {
    vi.spyOn(transactionsService, 'listForYear').mockRejectedValue(new AppError('network', null, undefined, 'Rete assente.'))
    wrap(<HomePage />)
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento')
    expect(await screen.findByRole('alert')).toHaveTextContent('Non riesco a leggere i dati')
  })
})
