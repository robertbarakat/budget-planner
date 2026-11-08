import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { taxService } from '../../api/tax.service.ts'
import { SnackbarProvider } from '../../components/Snackbar.tsx'
import TaxParametersPage from './TaxParametersPage.tsx'

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <MemoryRouter>
          <TaxParametersPage />
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.restoreAllMocks())

describe('TaxParametersPage', () => {
  it('mostra i parametri salvati dell\'anno', async () => {
    vi.spyOn(taxService, 'getParametersForYear').mockResolvedValue({
      id: 1, year: 2026, profitability_coefficient: 67, inps_rate: 26.07, substitute_tax_rate: 15,
      is_startup: false, has_other_pension_coverage: false, activity_start_year: 2025, created_at: '',
    })
    setup()
    expect(await screen.findByLabelText(/Aliquota INPS/)).toHaveValue('26,07')
  })

  it('non salva percentuali fuori da 0–100', async () => {
    vi.spyOn(taxService, 'getParametersForYear').mockResolvedValue(null)
    const save = vi.spyOn(taxService, 'saveParametersForYear')
    setup()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/Coefficiente/), '101')
    await user.type(screen.getByLabelText(/Aliquota INPS/), '20')
    await user.type(screen.getByLabelText(/Aliquota imposta/), '5')
    await user.type(screen.getByLabelText(/Anno di inizio/), '2020')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText(/deve essere tra 0 e 100/)).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('salva i valori validi', async () => {
    vi.spyOn(taxService, 'getParametersForYear').mockResolvedValue(null)
    const save = vi.spyOn(taxService, 'saveParametersForYear').mockResolvedValue({} as never)
    setup()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/Coefficiente/), '10')
    await user.type(screen.getByLabelText(/Aliquota INPS/), '20,5')
    await user.type(screen.getByLabelText(/Aliquota imposta/), '5')
    await user.type(screen.getByLabelText(/Anno di inizio/), '2020')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(save).toHaveBeenCalledWith(new Date().getFullYear(), expect.objectContaining({ inps_rate: 20.5, substitute_tax_rate: 5 }))
  })
})
