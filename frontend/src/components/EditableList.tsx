import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { AlertDialog, Switch } from 'radix-ui'
import Button from './Button.tsx'
import Field from './Field.tsx'
import { ArrowDownIcon, ArrowUpIcon } from './icons.tsx'
import './EditableList.css'

export type EditableListId = number | string

export interface EditableListItem {
  id: EditableListId
  name: string
  archived: boolean
  /** `true` solo se l'elemento non ha dati collegati: solo allora si offre "Elimina". */
  deletable: boolean
}

export interface EditableListProps {
  /** Nome accessibile dell'elenco, es. "Macro-aree". */
  label: string
  /** Etichetta del campo di aggiunta, con il genere giusto (es. "Nuova macro-area"). */
  addLabel: string
  /** Elementi nell'ordine di visualizzazione. */
  items: EditableListItem[]
  onAdd: (name: string) => void | Promise<void>
  onRename: (id: EditableListId, name: string) => void | Promise<void>
  /** Nuovo ordine di tutti gli id (anche degli archiviati, che restano al loro posto). */
  onReorder: (orderedIds: EditableListId[]) => void | Promise<void>
  onArchive: (id: EditableListId, archived: boolean) => void | Promise<void>
  onDelete?: (id: EditableListId) => void | Promise<void>
}

type MoveDirection = 'up' | 'down'

// Gli errori di rete e di server arrivano all'utente dalla snackbar: qui si evita solo di perdere il testo digitato.
async function attempt(action: () => void | Promise<void>): Promise<boolean> {
  try {
    await action()
    return true
  } catch {
    return false
  }
}

/** Elenco modificabile: aggiunta, rinomina in linea, riordino con pulsanti, archivia/ripristina, elimina se possibile. */
export default function EditableList({ label, addLabel, items, onAdd, onRename, onReorder, onArchive, onDelete }: EditableListProps) {
  const [showArchived, setShowArchived] = useState(false)
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | undefined>()
  const [editingId, setEditingId] = useState<EditableListId | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState<string | undefined>()
  const [announcement, setAnnouncement] = useState('')
  const [pendingDelete, setPendingDelete] = useState<EditableListItem | null>(null)
  const switchId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const refocus = useRef<{ id: EditableListId; direction: MoveDirection } | null>(null)
  const [returnFocusTo, setReturnFocusTo] = useState<EditableListId | null>(null)

  const visible = showArchived ? items : items.filter((item) => !item.archived)
  const archivedCount = items.filter((item) => item.archived).length

  // Dopo un riordino il focus resta sul pulsante appena usato (o sull'altro, se il primo è a fine corsa).
  useEffect(() => {
    const target = refocus.current
    if (!target) return
    refocus.current = null
    const row = listRef.current?.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(String(target.id))}"]`)
    const same = row?.querySelector<HTMLButtonElement>(`[data-action="${target.direction}"]`)
    const other = row?.querySelector<HTMLButtonElement>(`[data-action="${target.direction === 'up' ? 'down' : 'up'}"]`)
    ;(same && !same.disabled ? same : other)?.focus()
  })

  // Chiusa la rinomina, il focus torna al pulsante "Rinomina" della riga.
  useEffect(() => {
    if (editingId === null && returnFocusTo !== null) {
      listRef.current?.querySelector<HTMLElement>(`[data-rename="${CSS.escape(String(returnFocusTo))}"]`)?.focus()
      setReturnFocusTo(null)
    }
  }, [editingId, returnFocusTo])

  function nameError(name: string, ignoreId?: EditableListId): string | undefined {
    if (!name.trim()) return 'Inserisci un nome.'
    const clash = items.some((item) => item.id !== ignoreId && item.name.trim().toLowerCase() === name.trim().toLowerCase())
    return clash ? 'Esiste già un elemento con questo nome.' : undefined
  }

  async function submitAdd(event: FormEvent) {
    event.preventDefault()
    const error = nameError(newName)
    setAddError(error)
    if (error) return
    if (await attempt(() => onAdd(newName.trim()))) {
      setNewName('')
      setAnnouncement(`Aggiunto: ${newName.trim()}.`)
    }
  }

  function startEdit(item: EditableListItem) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditError(undefined)
  }

  function cancelEdit() {
    setReturnFocusTo(editingId)
    setEditingId(null)
    setEditError(undefined)
  }

  async function submitEdit(event: FormEvent, item: EditableListItem) {
    event.preventDefault()
    const error = nameError(editName, item.id)
    setEditError(error)
    if (error) return
    if (editName.trim() === item.name || (await attempt(() => onRename(item.id, editName.trim())))) {
      setAnnouncement(`Rinominato: ${editName.trim()}.`)
      setReturnFocusTo(item.id)
      setEditingId(null)
    }
  }

  function onEditKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEdit()
    }
  }

  async function move(item: EditableListItem, direction: MoveDirection) {
    const index = visible.findIndex((entry) => entry.id === item.id)
    const neighbour = visible[direction === 'up' ? index - 1 : index + 1]
    if (!neighbour) return
    const ids = items.map((entry) => entry.id)
    const from = ids.indexOf(item.id)
    const to = ids.indexOf(neighbour.id)
    ids[from] = neighbour.id
    ids[to] = item.id
    refocus.current = { id: item.id, direction }
    if (await attempt(() => onReorder(ids))) {
      const position = visible.findIndex((entry) => entry.id === neighbour.id) + 1
      setAnnouncement(`${item.name} spostato in posizione ${position} di ${visible.length}.`)
    } else {
      refocus.current = null
    }
  }

  async function toggleArchive(item: EditableListItem) {
    const archived = !item.archived
    if (await attempt(() => onArchive(item.id, archived))) {
      setAnnouncement(`${item.name} ${archived ? 'archiviato' : 'ripristinato'}.`)
    }
  }

  async function confirmDelete() {
    const item = pendingDelete
    setPendingDelete(null)
    if (item && onDelete && (await attempt(() => onDelete(item.id)))) {
      setAnnouncement(`${item.name} eliminato.`)
    }
  }

  return (
    <section className="editable-list" aria-label={label}>
      <form className="editable-list__add" onSubmit={submitAdd} noValidate>
        <div className="editable-list__add-field">
          <Field label={addLabel} error={addError}>
            {(p) => (
              <input
                {...p}
                type="text"
                autoComplete="off"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            )}
          </Field>
        </div>
        <Button type="submit" className="editable-list__add-button">
          Aggiungi
        </Button>
      </form>

      <div className="editable-list__toggle">
        <Switch.Root
          id={switchId}
          className="editable-list__switch"
          checked={showArchived}
          onCheckedChange={setShowArchived}
        >
          <Switch.Thumb className="editable-list__switch-thumb" />
        </Switch.Root>
        <label htmlFor={switchId}>
          Mostra archiviati{archivedCount > 0 ? ` (${archivedCount})` : ''}
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="editable-list__empty">Nessun elemento.</p>
      ) : (
        <ul className="editable-list__items" ref={listRef}>
          {visible.map((item, index) => {
            const editing = editingId === item.id
            return (
              <li
                key={item.id}
                data-item-id={String(item.id)}
                className={item.archived ? 'editable-list__item editable-list__item--archived' : 'editable-list__item'}
              >
                {editing ? (
                  <form className="editable-list__edit" onSubmit={(e) => submitEdit(e, item)} onKeyDown={onEditKeyDown} noValidate>
                    <div className="editable-list__edit-field">
                      <Field label={`Nome di ${item.name}`} error={editError}>
                        {(p) => (
                          // Il focus va al campo appena compare: l'utente ha scelto "Rinomina".
                          <input
                            {...p}
                            autoFocus
                            type="text"
                            autoComplete="off"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        )}
                      </Field>
                    </div>
                    <div className="editable-list__actions">
                      <Button type="submit">Salva</Button>
                      <Button variant="secondary" onClick={cancelEdit}>
                        Annulla
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="editable-list__name">
                      <span>{item.name}</span>
                      {item.archived && <span className="editable-list__badge">Archiviato</span>}
                    </div>
                    <div className="editable-list__actions">
                      <Button
                        variant="secondary"
                        data-action="up"
                        aria-label={`Sposta su ${item.name}`}
                        disabled={index === 0}
                        onClick={() => move(item, 'up')}
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        variant="secondary"
                        data-action="down"
                        aria-label={`Sposta giù ${item.name}`}
                        disabled={index === visible.length - 1}
                        onClick={() => move(item, 'down')}
                      >
                        <ArrowDownIcon />
                      </Button>
                      <Button
                        variant="secondary"
                        aria-label={`Rinomina ${item.name}`}
                        onClick={() => startEdit(item)}
                        data-rename={String(item.id)}
                      >
                        Rinomina
                      </Button>
                      <Button variant="secondary" aria-label={`${item.archived ? 'Ripristina' : 'Archivia'} ${item.name}`} onClick={() => toggleArchive(item)}>
                        {item.archived ? 'Ripristina' : 'Archivia'}
                      </Button>
                      {item.deletable && onDelete && (
                        <Button variant="destructive" aria-label={`Elimina ${item.name}`} onClick={() => setPendingDelete(item)}>
                          Elimina
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p role="status" className="visually-hidden">
        {announcement}
      </p>

      <AlertDialog.Root open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="editable-list__overlay" />
          <AlertDialog.Content className="editable-list__dialog">
            <AlertDialog.Title className="editable-list__dialog-title">Eliminare {pendingDelete?.name}?</AlertDialog.Title>
            <AlertDialog.Description className="editable-list__dialog-text">
              L'elemento non ha dati collegati. L'eliminazione non si può annullare.
            </AlertDialog.Description>
            <div className="editable-list__actions">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">Annulla</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant="destructive" onClick={confirmDelete}>
                  Elimina
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  )
}
