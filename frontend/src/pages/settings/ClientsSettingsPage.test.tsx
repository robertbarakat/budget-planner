import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classificationService } from '../../api/classification.service.ts'
import { revenueService } from '../../api/revenue.service.ts'
import { SnackbarProvider } from '../../components/Snackbar.tsx'
import ClientsSettingsPage from './ClientsSettingsPage.tsx'

type ClientRow = Awaited<ReturnType<typeof revenueService.clients.list>>[number]
type ItemRow = Awaited<ReturnType<typeof classificationService.budgetItems.list>>[number]
const client = (id: number, name: string, sort_order: number, budget_item_id = 10, archived = false): ClientRow =>
  ({ id, name, sort_order, archived, budget_item_id, collection_delay_months: 0, created_at: '' }) as ClientRow
const item = (id: number, name: string, kind: ItemRow['kind'], archived = false): ItemRow =>
  ({ id, name, kind, archived, macro_area_id: 1, sort_order: id, created_at: '' }) as ItemRow

let rows: ClientRow[]
let items: ItemRow[]

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SnackbarProvider>
        <MemoryRouter>
          <ClientsSettingsPage />
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
}
const list = () => within(screen.getByRole('region', { name: 'Clienti' }))

beforeEach(() => {
  vi.restoreAllMocks()
  rows = [client(1, 'Cliente A', 0), client(2, 'Cliente B', 1, 11)]
  items = [item(10, 'Fatture A', 'income'), item(11, 'Fatture B', 'income'), item(12, 'Affitto', 'expense'), item(13, 'Vecchia', 'income', true)]
  vi.spyOn(revenueService.clients, 'list').mockImplementation(async () => rows)
  vi.spyOn(classificationService.budgetItems, 'list').mockImplementation(async () => items)
  vi.spyOn(revenueService, 'listClientIdsInUse').mockResolvedValue([1])
  vi.spyOn(revenueService.clients, 'create').mockImplementation(async (values) => {
    const row = client(50, values.name, values.sort_order ?? 0, values.budget_item_id)
    rows.push(row)
    return row
  })
  vi.spyOn(revenueService.clients, 'update').mockImplementation(async (id, values) => {
    rows = rows.map((r) => (r.id === id ? ({ ...r, ...values } as ClientRow) : r))
    return rows.find((r) => r.id === id)!
  })
  vi.spyOn(revenueService.clients, 'archive').mockImplementation(async (id) => {
    rows = rows.map((r) => (r.id === id ? { ...r, archived: true } : r))
    return rows.find((r) => r.id === id)!
  })
})

describe('ClientsSettingsPage', () => {
  it('elenca i clienti con la voce di entrata', async () => {
    setup()
    await screen.findByRole('region', { name: 'Clienti' })
    expect(list().getByText('Cliente A')).toBeInTheDocument()
    expect(list().getByText('Voce: Fatture A')).toBeInTheDocument()
    expect(list().getByText('Voce: Fatture B')).toBeInTheDocument()
  })

  it('aggiunge un cliente con la voce scelta tra le sole entrate non archiviate', async () => {
    setup()
    const select = await screen.findByLabelText(/Voce di entrata/)
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Fatture A', 'Fatture B'])
    await userEvent.selectOptions(select, 'Fatture B')
    await userEvent.type(screen.getByLabelText('Nuovo cliente'), 'Cliente C')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    await vi.waitFor(() =>
      expect(revenueService.clients.create).toHaveBeenCalledWith({ name: 'Cliente C', budget_item_id: 11, sort_order: 2 }),
    )
  })

  it('rinomina, archivia e cambia voce', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Rinomina Cliente B' }))
    await userEvent.type(screen.getByLabelText('Nome di Cliente B'), '2{Enter}')
    await vi.waitFor(() => expect(revenueService.clients.update).toHaveBeenCalledWith(2, { name: 'Cliente B2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Archivia Cliente A' }))
    await vi.waitFor(() => expect(revenueService.clients.archive).toHaveBeenCalledWith(1))
    await userEvent.click(screen.getByRole('button', { name: 'Cambia voce di Cliente B2' }))
    await userEvent.selectOptions(screen.getByLabelText(/Nuova voce di entrata/), 'Fatture A')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sposta' }))
    await vi.waitFor(() => expect(revenueService.clients.update).toHaveBeenCalledWith(2, { budget_item_id: 10 }))
  })

  it('riordina aggiornando solo le righe che cambiano', async () => {
    const reorder = vi.spyOn(revenueService.clients, 'reorder').mockResolvedValue({} as ClientRow)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Sposta su Cliente B' }))
    await vi.waitFor(() => expect(reorder).toHaveBeenCalledTimes(2))
    expect(reorder).toHaveBeenCalledWith(2, 0)
    expect(reorder).toHaveBeenCalledWith(1, 1)
  })

  it('un cliente con tariffe o giorni collegati non offre "Elimina"', async () => {
    setup()
    await screen.findByRole('region', { name: 'Clienti' })
    expect(screen.queryByRole('button', { name: 'Elimina Cliente A' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Elimina Cliente B' })).toBeInTheDocument()
  })

  it('senza voci di entrata non permette di aggiungere e rimanda alle voci di budget', async () => {
    items = [item(12, 'Affitto', 'expense')]
    setup()
    expect(await screen.findByText(/serve almeno una voce di entrata/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nuovo cliente')).not.toBeInTheDocument()
  })
})
