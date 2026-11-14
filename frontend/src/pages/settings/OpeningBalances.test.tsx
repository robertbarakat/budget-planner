import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../../api/accounts.service.ts'
import { SnackbarProvider } from '../../components/Snackbar.tsx'
import OpeningBalances from './OpeningBalances.tsx'

type BalanceRow = Awaited<ReturnType<typeof accountsService.openingBalances.list>>[number]
const balance = (id: number, account_id: number, year: number, amount: number, source: BalanceRow['source'] = 'manual'): BalanceRow =>
  ({ id, account_id, year, amount, source, created_at: '' }) as BalanceRow

const accounts = [
  { id: 1, name: 'Conto A', archived: false },
  { id: 2, name: 'Conto B', archived: false },
  { id: 3, name: 'Conto C', archived: true },
]

let stored: BalanceRow[]
const YEAR = new Date().getFullYear()

function setup(list = accounts) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <OpeningBalances accounts={list} />
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  stored = [balance(1, 1, YEAR, 1000.5), balance(2, 2, YEAR, 250, 'carried_over'), balance(3, 3, YEAR, 10)]
  vi.spyOn(accountsService.openingBalances, 'list').mockImplementation(async (options) =>
    stored.filter((row) => (options?.where as { year?: number } | undefined)?.year === row.year),
  )
  vi.spyOn(accountsService.openingBalances, 'create').mockImplementation(async (values) => {
    const row = balance(99, values.account_id, values.year, Number(values.amount), values.source ?? 'manual')
    stored.push(row)
    return row
  })
  vi.spyOn(accountsService.openingBalances, 'update').mockImplementation(async (id, values) => {
    stored = stored.map((row) => (row.id === id ? ({ ...row, ...values } as BalanceRow) : row))
    return stored.find((row) => row.id === id)!
  })
})

const edit = async (name: string) => {
  await userEvent.click(await screen.findByRole('button', { name: `Modifica saldo iniziale ${name}` }))
  return screen.getByLabelText(`Saldo iniziale ${name}`)
}

describe('OpeningBalances', () => {
  it('mostra in sola lettura il saldo di ogni conto con la sua origine e la somma', async () => {
    setup()
    await screen.findByText('Conto A')
    expect(screen.queryByLabelText('Saldo iniziale Conto A')).not.toBeInTheDocument()
    expect(screen.getAllByText('Manuale')).toHaveLength(2)
    expect(screen.getByText('Riportato')).toBeInTheDocument()
    expect(screen.getByText(`Somma dei saldi iniziali ${YEAR}`).closest('p')).toHaveTextContent('1.260,50')
  })

  it('un conto archiviato senza saldo nell\'anno non compare', async () => {
    stored = [balance(1, 1, YEAR, 5)]
    setup()
    await screen.findByText('Conto A')
    expect(screen.queryByText('Conto C')).not.toBeInTheDocument()
  })

  it('un conto senza saldo mostra "Non impostato" e la prima scrittura crea la riga', async () => {
    stored = []
    setup()
    const field = await edit('Conto A')
    await userEvent.type(field, '1.234,50')
    await userEvent.click(screen.getByRole('button', { name: 'Salva saldo iniziale Conto A' }))
    await vi.waitFor(() =>
      expect(accountsService.openingBalances.create).toHaveBeenCalledWith({ account_id: 1, year: YEAR, amount: 1234.5, source: 'manual' }),
    )
    expect(await screen.findByText(/Saldo iniziale di Conto A salvato/)).toBeInTheDocument()
  })

  it('un secondo saldo per lo stesso conto e anno aggiorna la riga esistente (nessun doppione)', async () => {
    setup()
    const field = await edit('Conto A')
    await userEvent.clear(field)
    await userEvent.type(field, '2000')
    await userEvent.click(screen.getByRole('button', { name: 'Salva saldo iniziale Conto A' }))
    await vi.waitFor(() =>
      expect(accountsService.openingBalances.update).toHaveBeenCalledWith(1, { amount: 2000, source: 'manual' }),
    )
    expect(accountsService.openingBalances.create).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(screen.getByText(`Somma dei saldi iniziali ${YEAR}`).closest('p')).toHaveTextContent('2.260,00'))
  })

  it('un importo non valido mostra un errore e non salva', async () => {
    setup()
    const field = await edit('Conto A')
    await userEvent.clear(field)
    await userEvent.type(field, 'abc')
    await userEvent.click(screen.getByRole('button', { name: 'Salva saldo iniziale Conto A' }))
    expect(screen.getByText(/Scrivi un importo valido/)).toBeInTheDocument()
    expect(accountsService.openingBalances.update).not.toHaveBeenCalled()
  })

  it('cambiando anno rilegge i saldi di quell\'anno', async () => {
    stored.push(balance(50, 1, YEAR + 1, 77))
    setup()
    await screen.findByText('Conto A')
    const year = screen.getByLabelText('Anno')
    await userEvent.clear(year)
    await userEvent.type(year, String(YEAR + 1))
    const field = await vi.waitFor(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Modifica saldo iniziale Conto A' }))
      return screen.getByLabelText('Saldo iniziale Conto A')
    })
    expect(field).toHaveValue('77')
  })
})
