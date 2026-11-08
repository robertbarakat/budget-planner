import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revenueService } from '../../api/revenue.service.ts'
import { SnackbarProvider } from '../../components/Snackbar.tsx'
import ClientDetailPage from './ClientDetailPage.tsx'

type ClientRow = Awaited<ReturnType<typeof revenueService.clients.list>>[number]
type RateRow = Awaited<ReturnType<typeof revenueService.listRates>>[number]
const rate = (id: number, daily_rate: number, valid_from_year: number, valid_from_month: number): RateRow =>
  ({ id, client_id: 1, daily_rate, valid_from_year, valid_from_month, created_at: '' }) as RateRow

let rates: RateRow[]

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={['/settings/clients/1']}>
          <Routes>
            <Route path="/settings/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  rates = [rate(1, 250, 2026, 1), rate(2, 280, 2026, 7)]
  vi.spyOn(revenueService.clients, 'getById').mockResolvedValue({
    id: 1, name: 'Cliente A', budget_item_id: 10, collection_delay_months: 2, sort_order: 0, archived: false, created_at: '',
  } as ClientRow)
  vi.spyOn(revenueService, 'listRates').mockImplementation(async () => [...rates].reverse())
  vi.spyOn(revenueService.clients, 'update').mockResolvedValue({} as ClientRow)
  vi.spyOn(revenueService.rates, 'create').mockResolvedValue({} as RateRow)
  vi.spyOn(revenueService.rates, 'update').mockResolvedValue({} as RateRow)
  vi.spyOn(revenueService.rates, 'remove').mockResolvedValue()
})

describe('ClientDetailPage', () => {
  it('mostra nome, ritardo e storico delle tariffe in formato it-IT', async () => {
    setup()
    expect(await screen.findByRole('heading', { level: 1, name: 'Cliente A' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Mesi di ritardo/)).toHaveValue('2')
    const list = screen.getByRole('list', { name: 'Storico delle tariffe' })
    expect(list).toHaveTextContent('Dal luglio 2026')
    expect(list).toHaveTextContent('280,00')
    expect(list).toHaveTextContent('Dal gennaio 2026')
  })

  it('salva il ritardo; un ritardo negativo non si salva', async () => {
    setup()
    const input = await screen.findByLabelText(/Mesi di ritardo/)
    await userEvent.clear(input)
    await userEvent.type(input, '-1')
    await userEvent.click(screen.getByRole('button', { name: 'Salva ritardo' }))
    expect(await screen.findByText('Il ritardo non può essere negativo.')).toBeInTheDocument()
    expect(revenueService.clients.update).not.toHaveBeenCalled()
    await userEvent.clear(input)
    await userEvent.type(input, '3')
    await userEvent.click(screen.getByRole('button', { name: 'Salva ritardo' }))
    await vi.waitFor(() => expect(revenueService.clients.update).toHaveBeenCalledWith(1, { collection_delay_months: 3 }))
  })

  it('aggiunge una tariffa con data di inizio', async () => {
    setup()
    await userEvent.type(await screen.findByLabelText(/Tariffa giornaliera/), '300,50')
    await userEvent.selectOptions(screen.getByLabelText(/Valida dal mese/), 'Settembre')
    const year = screen.getByLabelText(/^Anno/)
    await userEvent.clear(year)
    await userEvent.type(year, '2026')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi tariffa' }))
    await vi.waitFor(() =>
      expect(revenueService.rates.create).toHaveBeenCalledWith({ client_id: 1, daily_rate: 300.5, valid_from_year: 2026, valid_from_month: 9 }),
    )
  })

  it('una tariffa con la stessa data di inizio mostra un errore e non si salva', async () => {
    setup()
    await userEvent.type(await screen.findByLabelText(/Tariffa giornaliera/), '300')
    await userEvent.selectOptions(screen.getByLabelText(/Valida dal mese/), 'Luglio')
    const year = screen.getByLabelText(/^Anno/)
    await userEvent.clear(year)
    await userEvent.type(year, '2026')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi tariffa' }))
    expect(await screen.findByText('Esiste già una tariffa che inizia in questo mese.')).toBeInTheDocument()
    expect(revenueService.rates.create).not.toHaveBeenCalled()
  })

  it('una tariffa a zero o negativa non si salva', async () => {
    setup()
    const input = await screen.findByLabelText(/Tariffa giornaliera/)
    await userEvent.type(input, '0')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi tariffa' }))
    expect(await screen.findByText('La tariffa deve essere maggiore di zero.')).toBeInTheDocument()
    await userEvent.clear(input)
    await userEvent.type(input, '-10')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi tariffa' }))
    expect(revenueService.rates.create).not.toHaveBeenCalled()
  })

  it('modifica ed elimina una tariffa', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Modifica tariffa dal luglio 2026' }))
    const input = screen.getByLabelText(/Tariffa giornaliera/)
    expect(input).toHaveValue('280,00')
    await userEvent.clear(input)
    await userEvent.type(input, '270')
    await userEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await vi.waitFor(() =>
      expect(revenueService.rates.update).toHaveBeenCalledWith(2, { daily_rate: 270, valid_from_year: 2026, valid_from_month: 7 }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Elimina tariffa dal gennaio 2026' }))
    await vi.waitFor(() => expect(revenueService.rates.remove).toHaveBeenCalledWith(1))
  })
})
