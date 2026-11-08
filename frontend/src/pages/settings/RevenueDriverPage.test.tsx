import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revenueService } from '../../api/revenue.service.ts'
import RevenueDriverPage from './RevenueDriverPage.tsx'

type ClientRow = Awaited<ReturnType<typeof revenueService.clients.list>>[number]
type RateRow = Awaited<ReturnType<typeof revenueService.rates.list>>[number]
type DaysRow = Awaited<ReturnType<typeof revenueService.listWorkedDays>>[number]
const year = new Date().getFullYear()

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <RevenueDriverPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(revenueService.clients, 'list').mockResolvedValue([
    { id: 1, name: 'Cliente A', sort_order: 0, archived: false, budget_item_id: 10, collection_delay_months: 2, created_at: '' } as ClientRow,
  ])
  vi.spyOn(revenueService.rates, 'list').mockResolvedValue([
    { id: 1, client_id: 1, daily_rate: 250, valid_from_year: year - 1, valid_from_month: 1, created_at: '' } as RateRow,
  ])
  vi.spyOn(revenueService, 'listWorkedDays').mockResolvedValue([
    { id: 1, client_id: 1, year: year - 1, month: 11, days: 10, created_at: '' } as DaysRow,
    { id: 2, client_id: 1, year, month: 3, days: 4, created_at: '' } as DaysRow,
    { id: 3, client_id: 1, year, month: 11, days: 2, created_at: '' } as DaysRow,
  ])
})

describe('RevenueDriverPage', () => {
  it('mostra gli incassi spostati del ritardo, quello da anno precedente e il riporto', async () => {
    setup()
    const current = await screen.findByRole('region', { name: `Incassi previsti ${year}` })
    const row = within(current).getAllByRole('row').find((r) => r.textContent?.includes('Cliente A'))!
    // novembre dell'anno prima: 10 × 250 = 2.500 a gennaio, segnalato; marzo: 4 × 250 = 1.000 a maggio
    expect(row).toHaveTextContent('2.500,00')
    expect(row).toHaveTextContent('da anno precedente')
    expect(row).toHaveTextContent('1.000,00')
    expect(row).toHaveTextContent('3.500,00')
    const carry = screen.getByRole('region', { name: `Incassi riportati su ${year + 1}` })
    // novembre: 2 × 250 = 500 a gennaio dell'anno dopo
    expect(within(carry).getAllByRole('row').find((r) => r.textContent?.includes('Cliente A'))).toHaveTextContent('500,00')
  })

  it('segnala i giorni senza tariffa valida', async () => {
    vi.mocked(revenueService.rates.list).mockResolvedValue([])
    setup()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('nessuna tariffa valida')
    expect(alert).toHaveTextContent(`Cliente A: marzo ${year}`)
  })

  it('cambiando anno ricalcola senza rileggere nulla di diverso', async () => {
    setup()
    await screen.findByRole('region', { name: `Incassi previsti ${year}` })
    await userEvent.click(screen.getByRole('button', { name: 'Anno successivo' }))
    expect(await screen.findByRole('region', { name: `Incassi previsti ${year + 1}` })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: `Riporto su ${year + 2}` })).toBeInTheDocument()
  })
})
