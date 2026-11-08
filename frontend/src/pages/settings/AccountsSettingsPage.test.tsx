import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountsService } from '../../api/accounts.service.ts'
import { SnackbarProvider } from '../../components/Snackbar.tsx'
import AccountsSettingsPage from './AccountsSettingsPage.tsx'

type AccountRow = Awaited<ReturnType<typeof accountsService.accounts.list>>[number]
const account = (id: number, name: string, sort_order: number, archived = false): AccountRow =>
  ({ id, name, sort_order, archived, created_at: '' }) as AccountRow

let rows: AccountRow[]

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <MemoryRouter>
          <AccountsSettingsPage />
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}
const names = () =>
  within(screen.getByRole('region', { name: 'Conti' }))
    .getAllByRole('listitem')
    .map((li) => li.querySelector('.editable-list__name span')?.textContent)

beforeEach(() => {
  vi.restoreAllMocks()
  rows = [account(1, 'Conto A', 0), account(2, 'Conto B', 1), account(3, 'Conto C', 2, true)]
  vi.spyOn(accountsService.accounts, 'list').mockImplementation(async () => rows)
  vi.spyOn(accountsService, 'listAccountIdsInUse').mockResolvedValue([1])
  vi.spyOn(accountsService.openingBalances, 'list').mockResolvedValue([])
  vi.spyOn(accountsService.accounts, 'create').mockImplementation(async (values) => {
    const row = account(50, values.name, values.sort_order ?? 0)
    rows.push(row)
    return row
  })
  vi.spyOn(accountsService.accounts, 'update').mockImplementation(async (id, values) => {
    rows = rows.map((r) => (r.id === id ? ({ ...r, ...values } as AccountRow) : r))
    return rows.find((r) => r.id === id)!
  })
  vi.spyOn(accountsService.accounts, 'archive').mockImplementation(async (id) => {
    rows = rows.map((r) => (r.id === id ? { ...r, archived: true } : r))
    return rows.find((r) => r.id === id)!
  })
})

describe('AccountsSettingsPage', () => {
  it('elenca i conti dai dati, senza archiviati', async () => {
    setup()
    await screen.findByRole('region', { name: 'Conti' })
    expect(names()).toEqual(['Conto A', 'Conto B'])
  })

  it('aggiunge in coda, rinomina e archivia', async () => {
    setup()
    await userEvent.type(await screen.findByLabelText('Nuovo conto'), 'Conto D')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    await vi.waitFor(() => expect(accountsService.accounts.create).toHaveBeenCalledWith({ name: 'Conto D', sort_order: 3 }))
    await userEvent.click(await screen.findByRole('button', { name: 'Rinomina Conto B' }))
    await userEvent.type(screen.getByLabelText('Nome di Conto B'), '2{Enter}')
    await vi.waitFor(() => expect(accountsService.accounts.update).toHaveBeenCalledWith(2, { name: 'Conto B2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Archivia Conto A' }))
    await vi.waitFor(() => expect(accountsService.accounts.archive).toHaveBeenCalledWith(1))
  })

  it('riordina aggiornando solo le righe che cambiano', async () => {
    const reorder = vi.spyOn(accountsService.accounts, 'reorder').mockResolvedValue({} as AccountRow)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Sposta su Conto B' }))
    await vi.waitFor(() => expect(reorder).toHaveBeenCalledTimes(2))
    expect(reorder).toHaveBeenCalledWith(2, 0)
    expect(reorder).toHaveBeenCalledWith(1, 1)
  })

  it('un conto con movimenti o saldi collegati non si elimina', async () => {
    setup()
    await screen.findByRole('region', { name: 'Conti' })
    expect(screen.queryByRole('button', { name: 'Elimina Conto A' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Elimina Conto B' })).toBeInTheDocument()
  })
})
