import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../api/accounts.service.ts'
import { budgetService } from '../api/budget.service.ts'
import { transactionsService } from '../api/transactions.service.ts'
import { SnackbarProvider } from '../components/Snackbar.tsx'
import CashFlowPage from './CashFlowPage.tsx'

type ClosedRow = Awaited<ReturnType<typeof budgetService.closedMonths.list>>[number]
type TxRow = Awaited<ReturnType<typeof transactionsService.listForYear>>[number]

const tx = (id: number, transaction_date: string) => ({ id, transaction_date }) as TxRow

let closed: ClosedRow[]

beforeEach(() => {
  vi.restoreAllMocks()
  closed = [{ id: 1, year: 2026, month: 1, closed_at: '' } as ClosedRow]
  vi.spyOn(budgetService.entries, 'list').mockResolvedValue([])
  vi.spyOn(budgetService.closedMonths, 'list').mockImplementation(async () => closed)
  vi.spyOn(transactionsService, 'listForYear').mockResolvedValue([tx(1, '2026-01-05'), tx(2, '2026-02-10'), tx(3, '2026-02-11')])
  vi.spyOn(accountsService.openingBalances, 'list').mockResolvedValue([])
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
  const list = await screen.findByRole('region', { name: 'Stato dei mesi 2026' })
  return within(list).getAllByRole('listitem').find((row) => row.textContent?.toLowerCase().startsWith(name))!
}

describe('CashFlowPage: stato dei mesi', () => {
  it('mostra Chiuso/Aperto con testo e il numero di movimenti', async () => {
    setup()
    const january = await rowOf('gennaio')
    expect(within(january).getByText('Chiuso')).toBeInTheDocument()
    expect(within(january).getByText('1 movimento')).toBeInTheDocument()
    const february = await rowOf('febbraio')
    expect(within(february).getByText('Aperto')).toBeInTheDocument()
    expect(within(february).getByText('2 movimenti')).toBeInTheDocument()
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
