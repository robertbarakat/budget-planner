import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../api/accounts.service.ts'
import { budgetService } from '../api/budget.service.ts'
import { classificationService } from '../api/classification.service.ts'
import { taxService } from '../api/tax.service.ts'
import { transactionsService } from '../api/transactions.service.ts'
import { SnackbarProvider } from '../components/Snackbar.tsx'
import F24Page from './F24Page.tsx'

const year = new Date().getFullYear()
const row = (id: number, o: object) => ({ id, reference_year: year, tax_type: 'inps_advance', due_date: `${year + 5}-06-30`, amount: 100, transaction_id: null, installment_id: null, is_amount_manual: false, ...o })

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(taxService.installments, 'list').mockResolvedValue([])
  vi.spyOn(taxService.installmentPlans, 'list').mockResolvedValue([])
  vi.spyOn(budgetService.entries, 'list').mockResolvedValue([])
  vi.spyOn(budgetService.closedMonths, 'list').mockResolvedValue([])
  vi.spyOn(accountsService.openingBalances, 'list').mockResolvedValue([])
  vi.spyOn(taxService, 'getParametersForYear').mockResolvedValue(null)
  vi.spyOn(transactionsService, 'listForYear').mockResolvedValue([])
  vi.spyOn(classificationService.categories, 'list').mockResolvedValue([])
  vi.spyOn(classificationService.budgetItems, 'list').mockResolvedValue([])
  vi.spyOn(classificationService.macroAreas, 'list').mockResolvedValue([])
  vi.spyOn(taxService.f24Deadlines, 'list').mockResolvedValue([
    row(1, { transaction_id: 9 }),
    row(2, {}),
    row(3, { due_date: `${year - 5}-01-31` }),
  ] as never)
})

describe('F24Page', () => {
  it('stato "Versata" solo con movimento collegato; Modifica solo sulle non versate; totale', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SnackbarProvider>
          <MemoryRouter>
            <F24Page />
          </MemoryRouter>
        </SnackbarProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Versata')).toBeInTheDocument()
    expect(screen.getAllByText('Versata')).toHaveLength(1)
    expect(screen.getByText('Da versare')).toBeInTheDocument()
    expect(screen.getByText('Scaduta')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Modifica importo/ })).toHaveLength(2)
  })
})
