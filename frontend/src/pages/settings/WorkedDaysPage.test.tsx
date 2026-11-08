import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revenueService } from '../../api/revenue.service.ts'
import { SnackbarProvider } from '../../components/Snackbar.tsx'
import WorkedDaysPage from './WorkedDaysPage.tsx'

type ClientRow = Awaited<ReturnType<typeof revenueService.clients.list>>[number]
type DaysRow = Awaited<ReturnType<typeof revenueService.listWorkedDays>>[number]
const year = new Date().getFullYear()
const client = (id: number, name: string, sort_order: number): ClientRow =>
  ({ id, name, sort_order, archived: false, budget_item_id: 10, collection_delay_months: 0, created_at: '' }) as ClientRow
const days = (id: number, client_id: number, month: number, value: number): DaysRow =>
  ({ id, client_id, year, month, days: value, created_at: '' }) as DaysRow

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <MemoryRouter>
          <WorkedDaysPage />
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(revenueService.clients, 'list').mockResolvedValue([client(1, 'Cliente A', 0), client(2, 'Cliente B', 1)])
  vi.spyOn(revenueService, 'listWorkedDays').mockResolvedValue([days(100, 1, 1, 10.5), days(101, 1, 2, 5), days(102, 2, 1, 4)])
  vi.spyOn(revenueService, 'setWorkedDays').mockResolvedValue({} as DaysRow)
  vi.spyOn(revenueService.workedDays, 'remove').mockResolvedValue()
})

describe('WorkedDaysPage', () => {
  it('mostra i giorni e i totali per cliente e per mese', async () => {
    setup()
    const grid = await screen.findByRole('region', { name: `Giorni lavorati previsti ${year}` })
    expect(within(grid).getByLabelText(`Giorni di Cliente A, Gennaio ${year}`)).toHaveValue('10,5')
    const rowA = within(grid).getByRole('row', { name: /Cliente A/ })
    expect(rowA).toHaveTextContent('15,5')
    const total = within(grid).getAllByRole('row').at(-1)!
    // gennaio 10,5 + 4 = 14,5; febbraio 5; totale 19,5
    expect(total).toHaveTextContent('14,5')
    expect(total).toHaveTextContent('19,5')
  })

  it('salva una cella uscendo dal campo, con decimali', async () => {
    setup()
    const cell = await screen.findByLabelText(`Giorni di Cliente B, Marzo ${year}`)
    await userEvent.type(cell, '7,5{Enter}')
    await vi.waitFor(() => expect(revenueService.setWorkedDays).toHaveBeenCalledWith(2, year, 3, 7.5))
  })

  it('giorni negativi non si salvano e mostrano un messaggio', async () => {
    setup()
    const cell = await screen.findByLabelText(`Giorni di Cliente B, Marzo ${year}`)
    await userEvent.type(cell, '-2{Enter}')
    expect(await screen.findByText('I giorni non possono essere negativi.')).toBeInTheDocument()
    expect(revenueService.setWorkedDays).not.toHaveBeenCalled()
    expect(cell).toHaveAttribute('aria-invalid', 'true')
  })

  it('svuotando una cella con dato elimina la riga', async () => {
    setup()
    const cell = await screen.findByLabelText(`Giorni di Cliente A, Febbraio ${year}`)
    await userEvent.clear(cell)
    await userEvent.tab()
    await vi.waitFor(() => expect(revenueService.workedDays.remove).toHaveBeenCalledWith(101))
  })

  it('un anno futuro senza dati mostra la griglia vuota e si può compilare', async () => {
    vi.mocked(revenueService.listWorkedDays).mockResolvedValue([])
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Anno successivo' }))
    const cell = await screen.findByLabelText(`Giorni di Cliente A, Gennaio ${year + 1}`)
    expect(cell).toHaveValue('')
    await userEvent.type(cell, '20{Enter}')
    await vi.waitFor(() => expect(revenueService.setWorkedDays).toHaveBeenCalledWith(1, year + 1, 1, 20))
  })
})
