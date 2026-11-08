import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../api/accounts.service.ts'
import { queryKeys } from '../api/query-keys.ts'
import { todayIso } from '../lib/dates.ts'
import CurrentBalances from './CurrentBalances.tsx'

const accounts = [
  { id: 1, name: 'Conto A', archived: false },
  { id: 2, name: 'Conto B', archived: false },
  { id: 3, name: 'Conto C', archived: true },
]

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <CurrentBalances accounts={accounts} />
    </QueryClientProvider>,
  )
  return client
}
const rowOf = (name: string) => screen.getByText(name).closest('li')!

beforeEach(() => vi.restoreAllMocks())

describe('CurrentBalances', () => {
  it('mostra il saldo di ogni conto e il totale con Amount, chiedendolo all\'anno corrente fino a oggi', async () => {
    const current = vi.spyOn(accountsService, 'currentBalances').mockResolvedValue({ balances: { 1: 1234.5, 2: -42 }, total: 1192.5 })
    setup()
    expect(await screen.findByText('Conto A')).toBeInTheDocument()
    expect(current).toHaveBeenCalledWith(new Date().getFullYear(), todayIso())
    expect(rowOf('Conto A')).toHaveTextContent('1.234,50')
    // I conti in rosso hanno anche il segno meno
    expect(rowOf('Conto B').querySelector('.amount')).toHaveAttribute('data-sign', '-')
    expect(screen.getByText('Totale').closest('p')).toHaveTextContent('1.192,50')
  })

  it('un conto senza movimenti né saldo iniziale vale 0; l\'archiviato a zero non compare', async () => {
    vi.spyOn(accountsService, 'currentBalances').mockResolvedValue({ balances: { 1: 10 }, total: 10 })
    setup()
    await screen.findByText('Conto A')
    expect(rowOf('Conto B')).toHaveTextContent('0,00')
    expect(screen.queryByText('Conto C')).not.toBeInTheDocument()
  })

  it('l\'archiviato con saldo diverso da zero compare, così il totale torna', async () => {
    vi.spyOn(accountsService, 'currentBalances').mockResolvedValue({ balances: { 1: 10, 3: 5 }, total: 15 })
    setup()
    expect(await screen.findByText('Conto C')).toBeInTheDocument()
  })

  it('si aggiorna quando un movimento invalida i conti', async () => {
    const current = vi.spyOn(accountsService, 'currentBalances').mockResolvedValue({ balances: { 1: 100, 2: 0 }, total: 100 })
    const client = setup()
    await screen.findByText('Conto A')
    expect(screen.getByText('Totale').closest('p')).toHaveTextContent('100,00')
    // Come fa ogni mutazione dei movimenti (`invalidate` include `queryKeys.accounts.all`): spesa di 30 sul conto A
    current.mockResolvedValue({ balances: { 1: 70, 2: 0 }, total: 70 })
    await client.invalidateQueries({ queryKey: queryKeys.accounts.all })
    await vi.waitFor(() => expect(screen.getByText('Totale').closest('p')).toHaveTextContent('70,00'))
    expect(within(rowOf('Conto A')).getByText(/70,00/)).toBeInTheDocument()
  })

  it('un errore mostra un messaggio', async () => {
    vi.spyOn(accountsService, 'currentBalances').mockRejectedValue(new Error('rete'))
    setup()
    expect(await screen.findByRole('alert')).toHaveTextContent('Non riesco a calcolare i saldi')
  })
})
