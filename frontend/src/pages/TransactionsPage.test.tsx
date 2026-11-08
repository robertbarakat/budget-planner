import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../api/accounts.service.ts'
import { classificationService } from '../api/classification.service.ts'
import { transactionsService } from '../api/transactions.service.ts'
import TransactionsPage from './TransactionsPage.tsx'

type TransactionRow = Awaited<ReturnType<typeof transactionsService.listFiltered>>[number]
const row = (values: Partial<TransactionRow> & Pick<TransactionRow, 'id' | 'type' | 'transaction_date' | 'amount' | 'account_id'>): TransactionRow =>
  ({ destination_account_id: null, category_id: null, budget_item_id: null, comment: null, tag: null, created_at: '', ...values }) as TransactionRow

const now = new Date()
const mm = String(now.getMonth() + 1).padStart(2, '0')
const y = now.getFullYear()

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TransactionsPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(accountsService.accounts, 'list').mockResolvedValue([
    { id: 1, name: 'Conto A', sort_order: 0, archived: false, created_at: '' },
    { id: 2, name: 'Conto B', sort_order: 1, archived: true, created_at: '' },
  ] as never)
  vi.spyOn(classificationService.categories, 'list').mockResolvedValue([
    { id: 100, budget_item_id: 10, name: 'Pizza', sort_order: 0, archived: true, created_at: '' },
    { id: 101, budget_item_id: 11, name: 'Cliente X', sort_order: 0, archived: false, created_at: '' },
  ] as never)
})

describe('TransactionsPage', () => {
  it('parte dal mese corrente e chiede solo i movimenti di quel mese', async () => {
    const list = vi.spyOn(transactionsService, 'listFiltered').mockResolvedValue([])
    setup()
    await screen.findByText(/Nessun movimento a/)
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
    expect(list).toHaveBeenCalledWith({ from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` })
    expect(screen.getByLabelText('Mese')).toHaveValue(String(now.getMonth() + 1))
    expect(screen.getByLabelText('Anno')).toHaveValue(y)
  })

  it('il filtro per mese e anno cambia l\'intervallo richiesto', async () => {
    const list = vi.spyOn(transactionsService, 'listFiltered').mockResolvedValue([])
    setup()
    await screen.findByText(/Nessun movimento a/)
    await userEvent.selectOptions(screen.getByLabelText('Mese'), 'Febbraio')
    await vi.waitFor(() => expect(list).toHaveBeenCalledWith({ from: `${y}-02-01`, to: `${y}-02-${y % 4 === 0 ? 29 : 28}` }))
    const year = screen.getByLabelText('Anno')
    await userEvent.clear(year)
    await userEvent.type(year, '2024')
    await vi.waitFor(() => expect(list).toHaveBeenCalledWith({ from: '2024-02-01', to: '2024-02-29' }))
    expect(await screen.findByText('Nessun movimento a febbraio 2024.')).toBeInTheDocument()
  })

  it('raggruppa per giorno, dal più recente, con titolo del giorno in italiano', async () => {
    vi.spyOn(transactionsService, 'listFiltered').mockResolvedValue([
      row({ id: 3, type: 'expense', transaction_date: `${y}-${mm}-10`, amount: 5, account_id: 1, category_id: 100 }),
      row({ id: 2, type: 'expense', transaction_date: `${y}-${mm}-10`, amount: 7, account_id: 1, category_id: 100 }),
      row({ id: 1, type: 'income', transaction_date: `${y}-${mm}-03`, amount: 100, account_id: 1, category_id: 101 }),
    ])
    setup()
    const days = await screen.findAllByRole('heading', { level: 2 })
    expect(days).toHaveLength(2)
    expect(days[0]).toHaveTextContent(/10/)
    expect(days[1]).toHaveTextContent(/3/)
    expect(within(screen.getByRole('region', { name: days[0]!.textContent! })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('spesa col meno, entrata col più, trasferimento senza segno e con "A → B": tutto leggibile senza colore', async () => {
    vi.spyOn(transactionsService, 'listFiltered').mockResolvedValue([
      row({ id: 1, type: 'expense', transaction_date: `${y}-${mm}-05`, amount: 14.9, account_id: 1, category_id: 100, comment: 'cena' }),
      row({ id: 2, type: 'income', transaction_date: `${y}-${mm}-05`, amount: 1000, account_id: 1, category_id: 101 }),
      row({ id: 3, type: 'transfer', transaction_date: `${y}-${mm}-05`, amount: 50, account_id: 1, destination_account_id: 2 }),
    ])
    setup()
    const items = await screen.findAllByRole('listitem')
    const [expense, income, transfer] = items as [HTMLElement, HTMLElement, HTMLElement]
    expect(expense).toHaveTextContent('Pizza')
    expect(expense).toHaveTextContent('Spesa')
    expect(expense).toHaveTextContent('Conto A')
    expect(expense).toHaveTextContent('cena')
    expect(expense.querySelector('.amount')).toHaveAttribute('data-sign', '-')
    expect(expense.querySelector('.amount')).toHaveTextContent('14,90')
    expect(income).toHaveTextContent('Entrata')
    expect(income.querySelector('.amount')).toHaveAttribute('data-sign', '+')
    expect(income.querySelector('.amount')).toHaveTextContent('1.000,00')
    expect(transfer).toHaveTextContent('Conto A → Conto B')
    expect(transfer).toHaveTextContent('Trasferimento')
    expect(transfer.querySelector('.amount')).not.toHaveAttribute('data-sign')
    expect(transfer.querySelector('.amount')).not.toHaveClass('amount--negative')
  })

  it('mostra conti e categorie archiviati nello storico', async () => {
    vi.spyOn(transactionsService, 'listFiltered').mockResolvedValue([
      row({ id: 1, type: 'expense', transaction_date: `${y}-${mm}-05`, amount: 3, account_id: 2, category_id: 100 }),
    ])
    setup()
    const item = (await screen.findAllByRole('listitem'))[0]!
    expect(item).toHaveTextContent('Pizza')
    expect(item).toHaveTextContent('Conto B')
  })

  it('stato di caricamento, poi stato vuoto in italiano', async () => {
    vi.spyOn(transactionsService, 'listFiltered').mockResolvedValue([])
    setup()
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento…')
    expect(await screen.findByText(/Nessun movimento a/)).toBeInTheDocument()
  })

  it('un errore di lettura mostra un messaggio', async () => {
    vi.spyOn(transactionsService, 'listFiltered').mockRejectedValue(new Error('rete'))
    setup()
    expect(await screen.findByRole('alert')).toHaveTextContent('Non riesco a leggere i movimenti')
  })
})
