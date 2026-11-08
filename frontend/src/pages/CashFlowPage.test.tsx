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
import CashFlowPage from './CashFlowPage.tsx'

type ClosedRow = Awaited<ReturnType<typeof budgetService.closedMonths.list>>[number]
type TxRow = Awaited<ReturnType<typeof transactionsService.listForYear>>[number]

const tx = (id: number, transaction_date: string, type: 'income' | 'expense', budget_item_id: number, amount: number) =>
  ({ id, transaction_date, type, budget_item_id, amount }) as TxRow

let closed: ClosedRow[]

beforeEach(() => {
  vi.restoreAllMocks()
  closed = [{ id: 1, year: 2026, month: 1, closed_at: '' } as ClosedRow]
  vi.spyOn(classificationService.budgetItems, 'list').mockResolvedValue([
    { id: 1, macro_area_id: 1, name: 'Fatture', kind: 'income', sort_order: 0, archived: false, created_at: '' } as never,
    { id: 2, macro_area_id: 1, name: 'Affitto', kind: 'expense', sort_order: 1, archived: false, created_at: '' } as never,
  ])
  vi.spyOn(budgetService.entries, 'list').mockResolvedValue([
    { id: 1, budget_item_id: 1, year: 2026, month: 2, amount: 300, source: 'manual' } as never,
    { id: 2, budget_item_id: 2, year: 2026, month: 2, amount: 100, source: 'manual' } as never,
  ])
  vi.spyOn(budgetService.closedMonths, 'list').mockImplementation(async () => closed)
  vi.spyOn(transactionsService, 'listForYear').mockResolvedValue([tx(1, '2026-01-05', 'income', 1, 450), tx(2, '2026-02-10', 'expense', 2, 40), tx(3, '2026-02-11', 'expense', 2, 5)])
  vi.spyOn(accountsService.openingBalances, 'list').mockResolvedValue([
    { id: 1, account_id: 1, year: 2026, amount: 1000, source: 'manual' } as never,
  ])
})

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={['/cash-flow?year=2026']}>
          <CashFlowPage />
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

const rowOf = async (name: string) => {
  const list = await screen.findByRole('region', { name: 'Flusso di cassa 2026' })
  return within(list).getAllByRole('listitem').find((row) => row.textContent?.toLowerCase().startsWith(name))!
}

describe('CashFlowPage: saldo progressivo', () => {
  it('mostra saldo iniziale, mesi con stato a parole e saldo a fine anno', async () => {
    setup()
    expect(await screen.findByText(/Saldo iniziale 2026/)).toHaveTextContent('1.000,00')
    const january = await rowOf('gennaio')
    expect(within(january).getByText('Chiuso')).toBeInTheDocument()
    expect(within(january).getByText('Reale', { selector: '.cash-month__basis' })).toBeInTheDocument()
    // gen chiuso: +450 → 1.450; feb aperto previsto +300 −100 → 1.650, fino a dicembre
    expect(within(january).getByText('Saldo a fine mese').nextElementSibling).toHaveTextContent('1.450,00')
    const february = await rowOf('febbraio')
    expect(within(february).getByText('Aperto')).toBeInTheDocument()
    expect(within(february).getByText('Previsto', { selector: '.cash-month__basis' })).toBeInTheDocument()
    expect(within(february).getByText('Saldo a fine mese').nextElementSibling).toHaveTextContent('1.650,00')
    expect(screen.getByText(/Saldo a fine anno/)).toHaveTextContent('1.650,00')
  })
})

describe('CashFlowPage: dettaglio del mese', () => {
  it('si apre da tastiera con aria-expanded e mostra previsto, reale parziale e scostamento', async () => {
    const user = userEvent.setup()
    setup()
    const february = await rowOf('febbraio')
    const toggle = within(february).getByRole('button', { name: 'Dettaglio di febbraio 2026' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const table = within(february).getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Reale parziale' })).toBeInTheDocument()
    const rent = within(table).getByRole('row', { name: /Affitto/ })
    // previsto −100, reale parziale −45 (40 + 5), scostamento +55
    expect(rent).toHaveTextContent('100,00')
    expect(rent).toHaveTextContent('45,00')
    expect(rent).toHaveTextContent('+55,00')
    expect(within(table).getByRole('row', { name: /Totale del mese \(previsto\)/ })).toHaveTextContent('+200,00')
    expect(within(february).getByRole('link', { name: 'Movimenti di febbraio 2026' })).toHaveAttribute(
      'href',
      '/transactions?year=2026&month=2',
    )
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('nel mese chiuso la colonna è "Reale" e il totale è quello reale', async () => {
    const user = userEvent.setup()
    setup()
    const january = await rowOf('gennaio')
    await user.click(within(january).getByRole('button', { name: 'Dettaglio di gennaio 2026' }))
    const table = within(january).getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Reale' })).toBeInTheDocument()
    expect(within(table).getByRole('row', { name: /Totale del mese \(reale\)/ })).toHaveTextContent('+450,00')
  })
})

describe('CashFlowPage: stato dei mesi', () => {
  it('mostra Chiuso/Aperto con testo e il numero di movimenti', async () => {
    setup()
    const january = await rowOf('gennaio')
    expect(within(january).getByText('Chiuso')).toBeInTheDocument()
    const february = await rowOf('febbraio')
    expect(within(february).getByText('Aperto')).toBeInTheDocument()
  })

  it('chiude un mese solo dopo la conferma, che riporta mese e movimenti', async () => {
    const user = userEvent.setup()
    const close = vi.spyOn(budgetService, 'closeMonth').mockImplementation(async (year, month) => {
      closed = [...closed, { id: 2, year, month, closed_at: '' } as ClosedRow]
      return closed.at(-1)!
    })
    setup()
    await user.click(within(await rowOf('febbraio')).getByRole('button', { name: 'Chiudi febbraio 2026' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/2 movimenti registrati/)).toBeInTheDocument()
    expect(close).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Chiudi' }))
    expect(close).toHaveBeenCalledExactlyOnceWith(2026, 2)
    expect(within(await rowOf('febbraio')).getByText('Chiuso')).toBeInTheDocument()
  })

  it('annullando la conferma non cambia nulla', async () => {
    const user = userEvent.setup()
    const close = vi.spyOn(budgetService, 'closeMonth')
    setup()
    await user.click(within(await rowOf('febbraio')).getByRole('button', { name: 'Chiudi febbraio 2026' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Annulla' }))
    expect(close).not.toHaveBeenCalled()
    expect(within(await rowOf('febbraio')).getByText('Aperto')).toBeInTheDocument()
  })

  it('riapre un mese chiuso dopo la conferma', async () => {
    const user = userEvent.setup()
    const reopen = vi.spyOn(budgetService, 'reopenMonth').mockImplementation(async () => {
      closed = []
    })
    setup()
    await user.click(within(await rowOf('gennaio')).getByRole('button', { name: 'Riapri gennaio 2026' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Riapri' }))
    expect(reopen).toHaveBeenCalledExactlyOnceWith(2026, 1)
    expect(within(await rowOf('gennaio')).getByText('Aperto')).toBeInTheDocument()
  })
})
