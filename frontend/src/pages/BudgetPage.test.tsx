import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { budgetService } from '../api/budget.service.ts'
import { classificationService } from '../api/classification.service.ts'
import BudgetPage from './BudgetPage.tsx'

type MacroRow = Awaited<ReturnType<typeof classificationService.macroAreas.list>>[number]
type ItemRow = Awaited<ReturnType<typeof classificationService.budgetItems.list>>[number]
type EntryRow = Awaited<ReturnType<typeof budgetService.entries.list>>[number]

const year = new Date().getFullYear()
const entry = (id: number, budget_item_id: number, month: number, amount: number, source: EntryRow['source'] = 'manual'): EntryRow =>
  ({ id, budget_item_id, year, month, amount, source, created_at: '' }) as EntryRow

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(classificationService.macroAreas, 'list').mockResolvedValue([
    { id: 1, name: 'Casa', sort_order: 0, archived: false, is_professional: false, created_at: '' } as MacroRow,
  ])
  vi.spyOn(classificationService.budgetItems, 'list').mockResolvedValue([
    { id: 10, macro_area_id: 1, name: 'Affitto', kind: 'expense', sort_order: 0, archived: false, created_at: '' } as ItemRow,
  ])
  vi.spyOn(budgetService.entries, 'list').mockResolvedValue([entry(1, 10, 1, 400), entry(2, 10, 2, 100, 'recurrence')])
})

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BudgetPage />
    </QueryClientProvider>,
  )
}

describe('BudgetPage', () => {
  it('mostra importi con segno, totali e origine delle righe non manuali', async () => {
    setup()
    const grid = await screen.findByRole('region', { name: `Budget previsto ${year}` })
    const row = within(grid).getByRole('row', { name: /Affitto/ })
    expect(within(row).getAllByText(/400,00/).length).toBeGreaterThan(0)
    expect(within(row).getByText('Ricorr.')).toBeInTheDocument()
    // totale della voce: 500
    expect(within(row).getAllByText(/500,00/).length).toBeGreaterThan(0)
    expect(within(row).getAllByText('−').length).toBeGreaterThan(0)
  })

  it('cambia anno e rilegge le righe di quell\'anno', async () => {
    setup()
    await screen.findByRole('region', { name: `Budget previsto ${year}` })
    await userEvent.click(screen.getByRole('button', { name: 'Anno successivo' }))
    expect(await screen.findByRole('region', { name: `Budget previsto ${year + 1}` })).toBeInTheDocument()
    expect(budgetService.entries.list).toHaveBeenLastCalledWith(expect.objectContaining({ where: { year: year + 1 } }))
  })
})
