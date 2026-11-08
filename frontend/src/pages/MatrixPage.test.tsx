import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../api/accounts.service.ts'
import { budgetService } from '../api/budget.service.ts'
import { classificationService } from '../api/classification.service.ts'
import { transactionsService } from '../api/transactions.service.ts'
import { SnackbarProvider } from '../components/Snackbar.tsx'
import MatrixPage from './MatrixPage.tsx'

beforeEach(() => {
  vi.restoreAllMocks()
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
    { id: 3, budget_item_id: 20, year: 2026, month: 2, amount: 400 } as never,
  ])
  vi.spyOn(budgetService.closedMonths, 'list').mockResolvedValue([])
  vi.spyOn(transactionsService, 'listForYear').mockResolvedValue([
    { id: 1, type: 'expense', budget_item_id: 20, category_id: 1, transaction_date: '2026-01-02', amount: 430 } as never,
    { id: 2, type: 'transfer', budget_item_id: null, category_id: null, transaction_date: '2026-01-03', amount: 5000 } as never,
  ])
  vi.spyOn(accountsService.openingBalances, 'list').mockResolvedValue([])
})

function Search() {
  return <output data-testid="search">{useLocation().search}</output>
}

function setup(url = '/matrix?year=2026') {
  const router = createMemoryRouter(
    [
      {
        path: '/matrix',
        element: (
          <>
            <MatrixPage />
            <Search />
          </>
        ),
      },
    ],
    { initialEntries: [url] },
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <RouterProvider router={router} />
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

const rowOf = (grid: HTMLElement, name: string) => within(grid).getAllByRole('row').find((r) => r.textContent?.startsWith(name))!

describe('MatrixPage', () => {
  it('in Previsto mostra le righe di budget con totali per voce, area, mese e anno', async () => {
    setup()
    const grid = await screen.findByRole('region', { name: /Previsto 2026/ })
    const rent = rowOf(grid, 'Affitto')
    const cells = within(rent).getAllByRole('gridcell')
    expect(cells).toHaveLength(13)
    expect(cells[0]).toHaveTextContent('400,00')
    expect(cells[1]).toHaveTextContent('400,00')
    expect(cells[12]).toHaveTextContent('800,00')
    expect(within(rowOf(grid, 'Casa')).getAllByRole('gridcell')[12]).toHaveTextContent('800,00')
    // totale generale: gen +1000 −400 = 600, feb −400, anno +200
    const total = within(rowOf(grid, 'Totale')).getAllByRole('gridcell')
    expect(total[0]).toHaveTextContent('600,00')
    expect(total[1]).toHaveTextContent('400,00')
    expect(total[12]).toHaveTextContent('200,00')
  })

  it('in Reale mostra i movimenti (trasferimenti esclusi) e la modalità sta nell\'indirizzo', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('region', { name: /Previsto 2026/ })
    await user.click(screen.getByRole('radio', { name: 'Reale' }))
    expect(screen.getByTestId('search')).toHaveTextContent('mode=actual')
    const grid = await screen.findByRole('region', { name: /Reale 2026/ })
    const cells = within(rowOf(grid, 'Affitto')).getAllByRole('gridcell')
    expect(cells[0]).toHaveTextContent('430,00')
    expect(cells[1]).toHaveTextContent('0,00')
    expect(within(rowOf(grid, 'Totale')).getAllByRole('gridcell')[12]).toHaveTextContent('430,00')
  })

  it('la navigazione con le frecce sposta il fuoco tra le celle', async () => {
    const user = userEvent.setup()
    setup()
    const grid = await screen.findByRole('region', { name: /Previsto 2026/ })
    const first = within(rowOf(grid, 'Introiti')).getAllByRole('gridcell')[0]!
    first.focus()
    await user.keyboard('{ArrowRight}')
    expect(within(rowOf(grid, 'Introiti')).getAllByRole('gridcell')[1]).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(within(rowOf(grid, 'Fatture')).getAllByRole('gridcell')[1]).toHaveFocus()
    await user.keyboard('{End}')
    expect(within(rowOf(grid, 'Fatture')).getAllByRole('gridcell')[12]).toHaveFocus()
    await user.keyboard('{ArrowRight}{Home}{ArrowUp}')
    expect(within(rowOf(grid, 'Introiti')).getAllByRole('gridcell')[0]).toHaveFocus()
  })
})
