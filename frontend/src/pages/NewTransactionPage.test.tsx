import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../api/accounts.service.ts'
import { AppError } from '../api/api-error.ts'
import { classificationService } from '../api/classification.service.ts'
import { createQueryClient } from '../api/query-client.ts'
import { transactionsService } from '../api/transactions.service.ts'
import { SnackbarProvider } from '../components/Snackbar.tsx'
import NewTransactionPage from './NewTransactionPage.tsx'

function setup() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <SnackbarProvider>
        <MemoryRouter>
          <NewTransactionPage />
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}

const row = <T,>(values: Record<string, unknown>) => ({ created_at: '', ...values }) as T

async function fillValidForm() {
  await userEvent.type(await screen.findByLabelText(/Importo/), '14,90')
  await userEvent.click(screen.getByRole('radio', { name: /Conto B/ }))
  await userEvent.selectOptions(screen.getByLabelText(/Categoria/), 'Pizza')
  await userEvent.type(screen.getByLabelText('Commento'), 'cena')
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(accountsService.accounts, 'list').mockResolvedValue([
    row({ id: 1, name: 'Conto A', sort_order: 0, archived: false }),
    row({ id: 2, name: 'Conto B', sort_order: 1, archived: false }),
  ])
  vi.spyOn(classificationService.macroAreas, 'list').mockResolvedValue([row({ id: 1, name: 'Svago', sort_order: 0, archived: false, is_professional: false })])
  vi.spyOn(classificationService.budgetItems, 'list').mockResolvedValue([
    row({ id: 10, macro_area_id: 1, name: 'Food', kind: 'expense', sort_order: 0, archived: false }),
  ])
  vi.spyOn(classificationService.categories, 'list').mockResolvedValue([row({ id: 100, budget_item_id: 10, name: 'Pizza', sort_order: 0, archived: false })])
})

describe('NewTransactionPage salvataggio', () => {
  it('salva con tipo, importo, data, conto, categoria e voce corretti, poi svuota il form e conferma', async () => {
    const create = vi.spyOn(transactionsService, 'create').mockResolvedValue(row({ id: 1 }))
    setup()
    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: 'Salva spesa' }))
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create).toHaveBeenCalledWith({
      type: 'expense',
      amount: 14.9,
      transaction_date: new Date().toLocaleDateString('sv-SE'),
      account_id: 2,
      category_id: 100,
      budget_item_id: 10,
      comment: 'cena',
      tag: null,
    })
    expect(await screen.findByText(/Spesa salvata\./)).toBeInTheDocument()
    expect(screen.getByLabelText(/Importo/)).toHaveValue('')
    expect(screen.getByLabelText('Commento')).toHaveValue('')
  })

  it('un doppio tocco su "Salva" crea un solo movimento', async () => {
    let release: () => void = () => undefined
    const create = vi.spyOn(transactionsService, 'create').mockImplementation(
      () => new Promise((resolve) => { release = () => resolve(row({ id: 1 })) }),
    )
    setup()
    await fillValidForm()
    const save = screen.getByRole('button', { name: 'Salva spesa' })
    await userEvent.dblClick(save)
    expect(create).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Salva spesa/ })).toBeDisabled()
    release()
    await screen.findByText(/Spesa salvata\./)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('con rete assente mostra l\'errore e i valori restano nel form', async () => {
    const create = vi.spyOn(transactionsService, 'create').mockRejectedValue(new AppError('network'))
    setup()
    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: 'Salva spesa' }))
    expect(await screen.findByText(/Connessione assente/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Importo/)).toHaveValue('14,90')
    expect(screen.getByLabelText('Commento')).toHaveValue('cena')
    expect(screen.getByRole('button', { name: 'Salva spesa' })).toBeEnabled()
    // si può riprovare
    create.mockResolvedValueOnce(row({ id: 2 }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva spesa' }))
    expect(await screen.findByText(/Spesa salvata\./)).toBeInTheDocument()
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('non salva se il form non è valido', async () => {
    const create = vi.spyOn(transactionsService, 'create')
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Salva spesa' }))
    expect(create).not.toHaveBeenCalled()
  })
})
