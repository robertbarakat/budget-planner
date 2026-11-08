import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../api/api-error.ts'
import { classificationService } from '../../api/classification.service.ts'
import MacroAreasSettingsPage from './MacroAreasSettingsPage.tsx'

type MacroAreaRow = Awaited<ReturnType<typeof classificationService.macroAreas.list>>[number]
type BudgetItemRow = Awaited<ReturnType<typeof classificationService.budgetItems.list>>[number]

const macro = (id: number, name: string, sort_order: number, archived = false): MacroAreaRow => ({
  id,
  name,
  sort_order,
  archived,
  is_professional: false,
  created_at: '2026-01-01',
})

let macroRows: MacroAreaRow[]
let itemRows: BudgetItemRow[]

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MacroAreasSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function names() {
  return screen.getAllByRole('listitem').map((li) => li.querySelector('.editable-list__name span')?.textContent)
}

beforeEach(() => {
  macroRows = [macro(1, 'Ricavi', 0), macro(2, 'Casa', 1), macro(3, 'Vecchia', 2, true)]
  itemRows = [{ id: 10, macro_area_id: 1, name: 'Stipendio', kind: 'income', sort_order: 0, archived: false, created_at: '' } as BudgetItemRow]
  vi.restoreAllMocks()
  // Servizio simulato in memoria: la pagina parla solo con gli hook di src/api.
  vi.spyOn(classificationService.macroAreas, 'list').mockImplementation(async () => [...macroRows].sort((a, b) => a.sort_order - b.sort_order))
  vi.spyOn(classificationService.budgetItems, 'list').mockImplementation(async () => itemRows)
  vi.spyOn(classificationService.macroAreas, 'create').mockImplementation(async (values) => {
    const row = macro(100 + macroRows.length, values.name, values.sort_order ?? 0)
    macroRows.push(row)
    return row
  })
  vi.spyOn(classificationService.macroAreas, 'update').mockImplementation(async (id, values) => {
    macroRows = macroRows.map((m) => (m.id === id ? { ...m, ...values } as MacroAreaRow : m))
    return macroRows.find((m) => m.id === id)!
  })
  vi.spyOn(classificationService.macroAreas, 'archive').mockImplementation(async (id) => {
    macroRows = macroRows.map((m) => (m.id === id ? { ...m, archived: true } : m))
    return macroRows.find((m) => m.id === id)!
  })
  vi.spyOn(classificationService.macroAreas, 'unarchive').mockImplementation(async (id) => {
    macroRows = macroRows.map((m) => (m.id === id ? { ...m, archived: false } : m))
    return macroRows.find((m) => m.id === id)!
  })
  vi.spyOn(classificationService.macroAreas, 'reorder').mockImplementation(async (id, order) => {
    macroRows = macroRows.map((m) => (m.id === id ? { ...m, sort_order: order } : m))
    return macroRows.find((m) => m.id === id)!
  })
  vi.spyOn(classificationService.macroAreas, 'remove').mockImplementation(async (id) => {
    macroRows = macroRows.filter((m) => m.id !== id)
  })
})

describe('MacroAreasSettingsPage', () => {
  it('mostra le macro-aree non archiviate nell\'ordine salvato', async () => {
    setup()
    await screen.findByRole('list')
    expect(names()).toEqual(['Ricavi', 'Casa'])
  })

  it('aggiunge in coda con sort_order successivo', async () => {
    setup()
    await userEvent.type(await screen.findByLabelText('Nuova macro-area'), 'Auto')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(await screen.findByText('Auto')).toBeInTheDocument()
    expect(classificationService.macroAreas.create).toHaveBeenCalledWith({ name: 'Auto', sort_order: 3 })
  })

  it('rinomina', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Rinomina Casa' }))
    const input = screen.getByLabelText('Nome di Casa')
    await userEvent.clear(input)
    await userEvent.type(input, 'Abitazione{Enter}')
    expect(await screen.findByText('Abitazione')).toBeInTheDocument()
    expect(classificationService.macroAreas.update).toHaveBeenCalledWith(2, { name: 'Abitazione' })
  })

  it('riordina aggiornando solo le righe che cambiano posizione', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Sposta su Casa' }))
    await vi.waitFor(() => expect(names()).toEqual(['Casa', 'Ricavi']))
    // Vecchia (archiviata, posizione 2) non si muove
    expect(classificationService.macroAreas.reorder).toHaveBeenCalledTimes(2)
    expect(classificationService.macroAreas.reorder).toHaveBeenCalledWith(2, 0)
    expect(classificationService.macroAreas.reorder).toHaveBeenCalledWith(1, 1)
  })

  it('archivia e ripristina', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Archivia Casa' }))
    await vi.waitFor(() => expect(names()).toEqual(['Ricavi']))
    await userEvent.click(screen.getByRole('switch', { name: /Mostra archiviati/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Ripristina Casa' }))
    await vi.waitFor(() => expect(classificationService.macroAreas.unarchive).toHaveBeenCalledWith(2))
  })

  it('con voci collegate non offre "Elimina"; senza voci sì', async () => {
    setup()
    await screen.findByRole('list')
    expect(screen.queryByRole('button', { name: 'Elimina Ricavi' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Elimina Casa' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Elimina' }))
    await vi.waitFor(() => expect(classificationService.macroAreas.remove).toHaveBeenCalledWith(2))
  })

  it('un nome uguale a una non archiviata mostra un errore; uguale a un\'archiviata è ammesso', async () => {
    setup()
    await userEvent.type(await screen.findByLabelText('Nuova macro-area'), 'casa')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(screen.getByText('Esiste già un elemento con questo nome.')).toBeInTheDocument()
    expect(classificationService.macroAreas.create).not.toHaveBeenCalled()
    await userEvent.clear(screen.getByLabelText('Nuova macro-area'))
    await userEvent.type(screen.getByLabelText('Nuova macro-area'), 'Vecchia')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    await vi.waitFor(() => expect(classificationService.macroAreas.create).toHaveBeenCalled())
  })

  it('un errore di lettura mostra un messaggio', async () => {
    vi.spyOn(classificationService.macroAreas, 'list').mockRejectedValue(new AppError('network'))
    setup()
    expect(await screen.findByRole('alert')).toHaveTextContent('Non riesco a leggere le macro-aree')
  })
})
