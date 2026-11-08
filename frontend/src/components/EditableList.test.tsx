import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import EditableList, { type EditableListId, type EditableListItem } from './EditableList.tsx'

const initial: EditableListItem[] = [
  { id: 1, name: 'Casa', archived: false, deletable: false },
  { id: 2, name: 'Svago', archived: false, deletable: true },
  { id: 3, name: 'Vecchia', archived: true, deletable: true },
]

// Host con stato, come lo useranno le schermate (qui senza server).
function Host({ onDelete }: { onDelete?: (id: EditableListId) => void }) {
  const [items, setItems] = useState(initial)
  return (
    <EditableList
      label="Macro-aree"
      addLabel="Nuova macro-area"
      items={items}
      onAdd={(name) => setItems((cur) => [...cur, { id: Date.now(), name, archived: false, deletable: true }])}
      onRename={(id, name) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, name } : i)))}
      onReorder={(ids) => setItems((cur) => ids.map((id) => cur.find((i) => i.id === id)!))}
      onArchive={(id, archived) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, archived } : i)))}
      onDelete={(id) => {
        onDelete?.(id)
        setItems((cur) => cur.filter((i) => i.id !== id))
      }}
    />
  )
}

function names() {
  return screen.getAllByRole('listitem').map((li) => li.querySelector('.editable-list__name span')?.textContent)
}

describe('EditableList', () => {
  it('mostra solo gli elementi non archiviati, in ordine', () => {
    render(<Host />)
    expect(names()).toEqual(['Casa', 'Svago'])
  })

  it('aggiunge un elemento e svuota il campo', async () => {
    render(<Host />)
    await userEvent.type(screen.getByLabelText('Nuova macro-area'), 'Auto')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(names()).toEqual(['Casa', 'Svago', 'Auto'])
    expect(screen.getByLabelText('Nuova macro-area')).toHaveValue('')
  })

  it('rifiuta nome vuoto e nome già presente', async () => {
    render(<Host />)
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(screen.getByLabelText('Nuova macro-area')).toBeInvalid()
    expect(screen.getByText('Inserisci un nome.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nuova macro-area'), ' casa ')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(screen.getByText('Esiste già un elemento con questo nome.')).toBeInTheDocument()
    expect(names()).toEqual(['Casa', 'Svago'])
  })

  it('rinomina in linea con Invio e annulla con Esc', async () => {
    render(<Host />)
    await userEvent.click(screen.getByRole('button', { name: 'Rinomina Svago' }))
    const input = screen.getByLabelText('Nome di Svago')
    expect(input).toHaveFocus()
    await userEvent.clear(input)
    await userEvent.type(input, 'Tempo libero{Enter}')
    expect(names()).toEqual(['Casa', 'Tempo libero'])
    expect(screen.getByRole('button', { name: 'Rinomina Tempo libero' })).toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: 'Rinomina Casa' }))
    await userEvent.type(screen.getByLabelText('Nome di Casa'), 'XYZ{Escape}')
    expect(names()).toEqual(['Casa', 'Tempo libero'])
    expect(screen.getByRole('button', { name: 'Rinomina Casa' })).toHaveFocus()
  })

  it('riordina con i pulsanti; primo e ultimo hanno il pulsante a fine corsa disattivato', async () => {
    render(<Host />)
    expect(screen.getByRole('button', { name: 'Sposta su Casa' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sposta giù Svago' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Sposta giù Casa' }))
    expect(names()).toEqual(['Svago', 'Casa'])
    expect(screen.getByRole('status')).toHaveTextContent('Casa spostato in posizione 2 di 2.')
  })

  it('il riordino funziona da tastiera e il focus segue il pulsante', async () => {
    render(<Host />)
    screen.getByRole('button', { name: 'Sposta giù Casa' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(names()).toEqual(['Svago', 'Casa'])
    // Casa è ora ultima: il focus passa a "Sposta su", l'unico attivo
    expect(screen.getByRole('button', { name: 'Sposta su Casa' })).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(names()).toEqual(['Casa', 'Svago'])
  })

  it('archivia e ripristina; gli archiviati si vedono con l\'interruttore e sono marcati', async () => {
    render(<Host />)
    await userEvent.click(screen.getByRole('button', { name: 'Archivia Svago' }))
    expect(names()).toEqual(['Casa'])
    await userEvent.click(screen.getByRole('switch', { name: /Mostra archiviati \(2\)/ }))
    expect(names()).toEqual(['Casa', 'Svago', 'Vecchia'])
    const archived = screen.getByText('Svago').closest('li')!
    expect(within(archived).getByText('Archiviato')).toBeInTheDocument()
    await userEvent.click(within(archived).getByRole('button', { name: 'Ripristina Svago' }))
    expect(within(screen.getByText('Svago').closest('li')!).queryByText('Archiviato')).not.toBeInTheDocument()
  })

  it('il riordino con archiviati nascosti li lascia al loro posto', async () => {
    const onReorder = vi.fn()
    render(
      <EditableList
        label="x"
        addLabel="Nuovo"
        items={[
          { id: 1, name: 'A', archived: false, deletable: false },
          { id: 2, name: 'B', archived: true, deletable: false },
          { id: 3, name: 'C', archived: false, deletable: false },
        ]}
        onAdd={vi.fn()}
        onRename={vi.fn()}
        onReorder={onReorder}
        onArchive={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sposta giù A' }))
    expect(onReorder).toHaveBeenCalledWith([3, 2, 1])
  })

  it('"Elimina" c\'è solo per gli elementi senza dati collegati e chiede conferma', async () => {
    const onDelete = vi.fn()
    render(<Host onDelete={onDelete} />)
    expect(screen.queryByRole('button', { name: 'Elimina Casa' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Elimina Svago' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Eliminare Svago?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Annulla' }))
    expect(onDelete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Elimina Svago' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Elimina' }))
    expect(onDelete).toHaveBeenCalledWith(2)
    expect(names()).toEqual(['Casa'])
  })

  it('senza onDelete non offre mai "Elimina"', () => {
    render(
      <EditableList
        label="x"
        addLabel="Nuovo"
        items={[{ id: 1, name: 'A', archived: false, deletable: true }]}
        onAdd={vi.fn()}
        onRename={vi.fn()}
        onReorder={vi.fn()}
        onArchive={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /Elimina/ })).not.toBeInTheDocument()
  })

  it('se onAdd fallisce il testo digitato resta', async () => {
    render(
      <EditableList
        label="x"
        addLabel="Nuovo"
        items={[]}
        onAdd={() => Promise.reject(new Error('rete'))}
        onRename={vi.fn()}
        onReorder={vi.fn()}
        onArchive={vi.fn()}
      />,
    )
    await userEvent.type(screen.getByLabelText('Nuovo'), 'Prova')
    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(screen.getByLabelText('Nuovo')).toHaveValue('Prova')
  })
})

describe('EditableList doppio invio', () => {
  it('un secondo invio durante l\'aggiunta non crea un doppione', async () => {
    let release: () => void = () => undefined
    const onAdd = vi.fn(() => new Promise<void>((resolve) => { release = resolve }))
    render(
      <EditableList label="x" addLabel="Nuovo" items={[]} onAdd={onAdd} onRename={vi.fn()} onReorder={vi.fn()} onArchive={vi.fn()} />,
    )
    await userEvent.type(screen.getByLabelText('Nuovo'), 'Auto{Enter}{Enter}')
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Aggiungi/ })).toBeDisabled()
    release()
  })
})
