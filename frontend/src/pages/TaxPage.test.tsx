import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../api/accounts.service.ts'
import { budgetService } from '../api/budget.service.ts'
import { classificationService } from '../api/classification.service.ts'
import { taxService } from '../api/tax.service.ts'
import { transactionsService } from '../api/transactions.service.ts'
import TaxPage from './TaxPage.tsx'

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <TaxPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const year = new Date().getFullYear()

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(taxService.installments, 'list').mockResolvedValue([])
  vi.spyOn(taxService.installmentPlans, 'list').mockResolvedValue([])
  vi.spyOn(budgetService.entries, 'list').mockResolvedValue([])
  vi.spyOn(budgetService.closedMonths, 'list').mockResolvedValue([])
  vi.spyOn(accountsService.openingBalances, 'list').mockResolvedValue([])
  vi.spyOn(transactionsService, 'listForYear').mockImplementation(async (y) =>
    y === year ? ([{ id: 1, type: 'income', transaction_date: `${year}-01-10`, amount: 1000, budget_item_id: 1, category_id: null }] as never) : [],
  )
  vi.spyOn(taxService.f24Deadlines, 'list').mockResolvedValue([])
  vi.spyOn(classificationService.categories, 'list').mockResolvedValue([])
  vi.spyOn(classificationService.budgetItems, 'list').mockResolvedValue([{ id: 1, macro_area_id: 1 }] as never)
  vi.spyOn(classificationService.macroAreas, 'list').mockResolvedValue([{ id: 1, is_professional: true }] as never)
})

describe('TaxPage', () => {
  it('senza parametri mostra il messaggio e nessun valore', async () => {
    vi.spyOn(taxService, 'getParametersForYear').mockResolvedValue(null)
    setup()
    expect(await screen.findByText(/Mancano i parametri fiscali/)).toBeInTheDocument()
    expect(screen.queryByText('Base imponibile stimata')).not.toBeInTheDocument()
  })

  it('con i parametri mostra incassi e base imponibile stimata (gennaio chiuso: 1.000 x 67% = 670)', async () => {
    vi.spyOn(budgetService.closedMonths, 'list').mockResolvedValue([{ id: 1, year, month: 1, closed_at: '' }] as never)
    vi.spyOn(taxService, 'getParametersForYear').mockResolvedValue({
      id: 1, year, profitability_coefficient: 67, inps_rate: 26.07, substitute_tax_rate: 15, is_startup: false, has_other_pension_coverage: false,
      activity_start_year: year, created_at: '', first_advance_due_date: `${year}-06-30`, second_advance_due_date: `${year}-11-30`,
      first_advance_method: 'historic', second_advance_method: 'forecast', first_advance_percent: 50, second_advance_percent: 50,
    })
    setup()
    expect(await screen.findByText('Base imponibile stimata')).toBeInTheDocument()
    expect(screen.getAllByText(/670,00/).length).toBeGreaterThan(0)
  })
})
