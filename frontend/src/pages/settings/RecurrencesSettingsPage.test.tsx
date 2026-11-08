import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../../api/accounts.service.ts'
import { classificationService } from '../../api/classification.service.ts'
import { recurrencesService } from '../../api/recurrences.service.ts'
import { SnackbarProvider } from '../../components/Snackbar.tsx'
import RecurrencesSettingsPage from './RecurrencesSettingsPage.tsx'

type Rec = Awaited<ReturnType<typeof recurrencesService.recurrences.list>>[number]
const recurrence = (id: number, name: string, archived = false): Rec =>
  ({ id, name, archived, base_amount: 650, frequency: 'monthly', start_date: '2026-01-05', end_date: null, account_id: 1, budget_item_id: 1, created_at: '' }) as Rec

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <MemoryRouter>
          <RecurrencesSettingsPage />
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

describe('RecurrencesSettingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(recurrencesService.recurrences, 'list').mockResolvedValue([recurrence(1, 'TEST-Mutuo'), recurrence(2, 'TEST-Vecchia', true)])
    vi.spyOn(classificationService.budgetItems, 'list').mockResolvedValue([
      { id: 1, name: 'Casa', kind: 'expense', archived: false, sort_order: 0 },
      { id: 2, name: 'Vecchia voce', kind: 'expense', archived: true, sort_order: 1 },
    ] as never)
    vi.spyOn(accountsService.accounts, 'list').mockResolvedValue([
      { id: 1, name: 'Bancoposta', archived: false, sort_order: 0 },
      { id: 2, name: 'Conto chiuso', archived: true, sort_order: 1 },
    ] as never)
  })

  it('elenca le ricorrenze attive e mostra le archiviate a richiesta', async () => {
    setup()
    expect(await screen.findByText('TEST-Mutuo')).toBeInTheDocument()
    expect(screen.queryByText('TEST-Vecchia')).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Mostra archiviate'))
    expect(screen.getByText('TEST-Vecchia')).toBeInTheDocument()
  })

  it('il form non propone voci e conti archiviati e blocca l\'importo non valido', async () => {
    const createSpy = vi.spyOn(recurrencesService, 'createRecurrence')
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Nuova ricorrenza' }))
    expect(screen.queryByRole('option', { name: 'Vecchia voce' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Conto chiuso' })).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Nome/), 'TEST-Nuova')
    await userEvent.selectOptions(screen.getByLabelText(/Voce di budget/), 'Casa')
    await userEvent.selectOptions(screen.getByLabelText(/Conto/), 'Bancoposta')
    await userEvent.type(screen.getByLabelText(/Importo base/), '0')
    await userEvent.click(screen.getByRole('button', { name: 'Crea' }))
    expect(await screen.findByText('Inserisci un importo maggiore di zero.')).toBeInTheDocument()
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('crea la ricorrenza con i valori validati', async () => {
    const createSpy = vi
      .spyOn(recurrencesService, 'createRecurrence')
      .mockResolvedValue({ recurrence: recurrence(9, 'TEST-Nuova'), createdCount: 24 })
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Nuova ricorrenza' }))
    await userEvent.type(screen.getByLabelText(/Nome/), 'TEST-Nuova')
    await userEvent.selectOptions(screen.getByLabelText(/Voce di budget/), 'Casa')
    await userEvent.selectOptions(screen.getByLabelText(/Conto/), 'Bancoposta')
    await userEvent.type(screen.getByLabelText(/Importo base/), '49,90')
    await userEvent.click(screen.getByRole('button', { name: 'Crea' }))
    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy.mock.calls[0]?.[0]).toMatchObject({ name: 'TEST-Nuova', base_amount: 49.9, budget_item_id: 1, account_id: 1, end_date: null })
    expect(await screen.findByText(/24 scadenze nel budget/)).toBeInTheDocument()
  })

  it('archivia dopo la conferma', async () => {
    const archiveSpy = vi.spyOn(recurrencesService, 'archiveRecurrence').mockResolvedValue(3)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Archivia TEST-Mutuo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Archivia' }))
    await waitFor(() => expect(archiveSpy).toHaveBeenCalledWith(1, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)))
  })
})
