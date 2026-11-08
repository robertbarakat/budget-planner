import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../api/accounts.service.ts'
import { classificationService } from '../api/classification.service.ts'
import { transactionsService } from '../api/transactions.service.ts'
import { SnackbarProvider } from '../components/Snackbar.tsx'
import EditTransactionPage from './EditTransactionPage.tsx'

const row = <T,>(values: Record<string, unknown>) => ({ created_at: '', ...values }) as T

function setup(path = '/transactions/7/edit') {
  const router = createMemoryRouter(
    [
      { path: '/transactions/:id/edit', element: <EditTransactionPage /> },
      { path: '/transactions', element: <p>Elenco movimenti</p> },
    ],
    { initialEntries: [path] },
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <RouterProvider router={router} />
      </SnackbarProvider>
    </QueryClientProvider>,
  )
  return router
}

const saved = {
  id: 7, type: 'expense', amount: 14.9, transaction_date: '2026-11-05', account_id: 2, destination_account_id: null,
  category_id: 100, budget_item_id: 10, comment: 'cena', tag: null,
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(accountsService.accounts, 'list').mockResolvedValue([
    row({ id: 1, name: 'Conto A', sort_order: 0, archived: false }),
    row({ id: 2, name: 'Conto B', sort_order: 1, archived: true }),
  ])
  vi.spyOn(classificationService.macroAreas, 'list').mockResolvedValue([row({ id: 1, name: 'Svago', sort_order: 0, archived: false, is_professional: false })])
  vi.spyOn(classificationService.budgetItems, 'list').mockResolvedValue([
    row({ id: 10, macro_area_id: 1, name: 'Food', kind: 'expense', sort_order: 0, archived: false }),
  ])
  vi.spyOn(classificationService.categories, 'list').mockResolvedValue([
    row({ id: 100, budget_item_id: 10, name: 'Pizza', sort_order: 0, archived: true }),
    row({ id: 101, budget_item_id: 10, name: 'Bar', sort_order: 1, archived: false }),
  ])
  vi.spyOn(transactionsService, 'getById').mockResolvedValue(row(saved))
})

describe('EditTransactionPage', () => {
  it('apre il form con i valori attuali, anche se conto e categoria sono archiviati', async () => {
    setup()
    expect(await screen.findByLabelText(/Importo/)).toHaveValue('14,90')
    expect(screen.getByRole('radio', { name: /Conto B/ })).toBeChecked()
    expect(screen.getByLabelText(/Categoria/)).toHaveValue('100')
    expect(screen.getByLabelText(/Data/)).toHaveValue('2026-11-05')
    expect(screen.getByLabelText('Commento')).toHaveValue('cena')
    expect(screen.getByText('Food · Svago')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salva modifiche' })).toBeInTheDocument()
  })

  it('salva la modifica con i valori completi, conferma e torna all\'elenco', async () => {
    const update = vi.spyOn(transactionsService, 'update').mockResolvedValue(row(saved))
    const router = setup()
    const amount = await screen.findByLabelText(/Importo/)
    await userEvent.clear(amount)
    await userEvent.type(amount, '20')
    await userEvent.selectOptions(screen.getByLabelText(/Categoria/), 'Bar')
    await userEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update).toHaveBeenCalledWith(7, {
      type: 'expense',
      amount: 20,
      transaction_date: '2026-11-05',
      account_id: 2,
      destination_account_id: null,
      category_id: 101,
      budget_item_id: 10,
      comment: 'cena',
      tag: null,
    })
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/transactions'))
    expect(await screen.findByText(/Spesa aggiornata\./)).toBeInTheDocument()
  })

  it('trasformare una spesa in trasferimento azzera categoria e voce', async () => {
    const update = vi.spyOn(transactionsService, 'update').mockResolvedValue(row(saved))
    setup()
    await userEvent.click(await screen.findByRole('radio', { name: /Trasferimento/ }))
    await userEvent.click(within(screen.getByRole('radiogroup', { name: /Conto di destinazione/ })).getByRole('radio', { name: /Conto A/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await vi.waitFor(() => expect(update).toHaveBeenCalled())
    expect(update.mock.calls[0]?.[1]).toMatchObject({ type: 'transfer', category_id: null, budget_item_id: null })
  })

  it('con errore resta nel form con i valori digitati', async () => {
    vi.spyOn(transactionsService, 'update').mockRejectedValue(new Error('rete'))
    const router = setup()
    const amount = await screen.findByLabelText(/Importo/)
    await userEvent.clear(amount)
    await userEvent.type(amount, '30')
    await userEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await vi.waitFor(() => expect(transactionsService.update).toHaveBeenCalled())
    expect(router.state.location.pathname).toBe('/transactions/7/edit')
    expect(screen.getByLabelText(/Importo/)).toHaveValue('30')
  })

  it('un movimento che non esiste mostra un messaggio', async () => {
    vi.spyOn(transactionsService, 'getById').mockRejectedValue(new Error('non trovato'))
    setup()
    expect(await screen.findByRole('alert')).toHaveTextContent('Non trovo il movimento')
  })

  it('un indirizzo senza numero torna all\'elenco', async () => {
    const router = setup('/transactions/abc/edit')
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/transactions'))
  })
})
