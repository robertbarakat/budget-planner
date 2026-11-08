import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { taxService } from '../api/tax.service.ts'
import { SnackbarProvider } from '../components/Snackbar.tsx'
import InstallmentsPage from './InstallmentsPage.tsx'

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <MemoryRouter>
          <InstallmentsPage />
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(taxService.installmentPlans, 'list').mockResolvedValue([
    { id: 1, description: 'Saldo 2024', total_amount: 1000, tax_type: 'substitute_tax', reference_year: 2024, archived: false, created_at: '' },
  ] as never)
  vi.spyOn(taxService.installments, 'list').mockResolvedValue([
    { id: 1, plan_id: 1, number: 1, due_date: '2026-03-31', amount: 550, created_at: '' },
    { id: 2, plan_id: 1, number: 2, due_date: '2026-06-30', amount: 550.5, created_at: '' },
  ] as never)
  vi.spyOn(taxService.f24Deadlines, 'list').mockResolvedValue([
    { id: 5, reference_year: 2024, tax_type: 'substitute_tax', due_date: '2026-03-31', amount: 550, transaction_id: 9, installment_id: 1, is_amount_manual: false },
  ] as never)
})

describe('InstallmentsPage', () => {
  it('mostra interessi (somma rate − importo), residuo e rata successiva; nessun pulsante elimina', async () => {
    setup()
    expect(await screen.findByText('Saldo 2024')).toBeInTheDocument()
    expect(screen.getByText(/100,50/)).toBeInTheDocument() // 1.100,50 − 1.000
    expect(screen.getAllByText(/550,50/).length).toBeGreaterThan(0) // residuo: solo la rata 2, la rata 1 è versata
    expect(screen.getByText(/n\. 2/)).toBeInTheDocument()
    expect(screen.getByText('Versata')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /elimina/i })).not.toBeInTheDocument()
  })

  it('archivia la rateizzazione', async () => {
    const update = vi.spyOn(taxService.installmentPlans, 'update').mockResolvedValue({} as never)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Archivia Saldo 2024' }))
    expect(update).toHaveBeenCalledWith(1, { archived: true })
  })
})
