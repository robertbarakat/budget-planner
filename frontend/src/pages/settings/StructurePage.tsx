import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import {
  useBudgetItems,
  useCategories,
  useCreateBudgetItem,
  useCreateCategory,
  useCreateMacroArea,
  useMacroAreas,
  useSetArchivedBudgetItem,
  useSetArchivedCategory,
  useSetArchivedMacroArea,
  useUpdateBudgetItem,
  useUpdateCategory,
  useUpdateMacroArea,
} from '../../api/classification.queries.ts'
import { useClients, useCreateClient, useSetArchivedClient, useUpdateClient } from '../../api/revenue.queries.ts'
import Button from '../../components/Button.tsx'
import IncomePricing from '../../components/IncomePricing.tsx'
import { paths } from '../../paths.ts'
import './settings.css'
import './StructurePage.css'

type Kind = 'income' | 'expense'

/** Riga con nome, rinomina in linea e archivia/ripristina. */
function Row({
  name,
  archived,
  tag,
  level,
  onRename,
  onArchive,
}: {
  name: string
  archived: boolean
  tag?: string
  level: 'group' | 'item' | 'category'
  onRename: (name: string) => Promise<unknown>
  onArchive: (archived: boolean) => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  async function save(event: FormEvent) {
    event.preventDefault()
    const next = draft.trim()
    if (next && next !== name) await onRename(next).catch(() => undefined)
    setEditing(false)
  }

  return (
    <div className={`structure-row structure-row--${level}${archived ? ' structure-row--archived' : ''}`}>
      {editing ? (
        <form className="structure-row__edit" onSubmit={save}>
          <input aria-label={`Nome di ${name}`} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <Button type="submit">Salva</Button>
          <Button variant="secondary" onClick={() => setEditing(false)}>
            Annulla
          </Button>
        </form>
      ) : (
        <>
          <span className="structure-row__name">
            {name}
            {tag && <span className="structure-row__tag">{tag}</span>}
            {archived && <span className="structure-row__tag">Archiviata</span>}
          </span>
          <span className="structure-row__actions">
            <Button
              variant="secondary"
              aria-label={`Rinomina ${name}`}
              onClick={() => {
                setDraft(name)
                setEditing(true)
              }}
            >
              Rinomina
            </Button>
            <Button variant="secondary" aria-label={`${archived ? 'Ripristina' : 'Archivia'} ${name}`} onClick={() => void onArchive(!archived)}>
              {archived ? 'Ripristina' : 'Archivia'}
            </Button>
          </span>
        </>
      )}
    </div>
  )
}

/** Modulo di aggiunta: un nome (e, per le voci, se è un'entrata o un'uscita). */
function AddForm({ label, withKind, onAdd }: { label: string; withKind?: boolean; onAdd: (name: string, kind: Kind) => Promise<unknown> }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Kind>('expense')

  if (!open) {
    return (
      <div className="structure-add">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          + {label}
        </Button>
      </div>
    )
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const next = name.trim()
    if (!next) return
    const ok = await onAdd(next, kind).then(() => true, () => false)
    if (ok) {
      setName('')
      setOpen(false)
    }
  }
  return (
    <form className="structure-add structure-add--open" onSubmit={submit}>
      <input aria-label={label} placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      {withKind && (
        <select aria-label="Tipo" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          <option value="expense">Uscita (spesa)</option>
          <option value="income">Entrata</option>
        </select>
      )}
      <Button type="submit">Aggiungi</Button>
      <Button variant="secondary" onClick={() => setOpen(false)}>
        Annulla
      </Button>
    </form>
  )
}

const KIND_TAG: Record<Kind, string> = { expense: 'Uscita', income: 'Entrata' }

// Un'unica pagina al posto di Macro-aree, Voci di budget e Categorie: gruppo → voce → categoria.
export default function StructurePage() {
  const macroAreas = useMacroAreas({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const budgetItems = useBudgetItems({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const categories = useCategories({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const createArea = useCreateMacroArea()
  const updateArea = useUpdateMacroArea()
  const archiveArea = useSetArchivedMacroArea()
  const createItem = useCreateBudgetItem()
  const updateItem = useUpdateBudgetItem()
  const archiveItem = useSetArchivedBudgetItem()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const archiveCategory = useSetArchivedCategory()
  const clients = useClients({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const archiveClient = useSetArchivedClient()
  const [showArchived, setShowArchived] = useState(false)

  const queries = [macroAreas, budgetItems, categories, clients]
  // Dietro ogni voce di entrata con tariffa c'è un «cliente» (tariffe, ritardo, giorni lavorati): qui non si vede, resta allineato alla voce.
  const clientsOf = (itemId: number) => (clients.data ?? []).filter((c) => c.budget_item_id === itemId)
  const areas = macroAreas.data ?? []
  const items = budgetItems.data ?? []
  const cats = categories.data ?? []
  const nextOrder = (rows: { sort_order: number }[]) => rows.reduce((max, r) => Math.max(max, r.sort_order), -1) + 1
  const visible = <T extends { archived: boolean }>(rows: T[]) => (showArchived ? rows : rows.filter((r) => !r.archived))

  return (
    <main className="settings structure">
      <Link to={paths.settings} className="settings__back">
        ← Impostazioni
      </Link>
      <h1>Voci e categorie</h1>
      <p className="settings__status">
        Qui decidi come sono organizzati i tuoi soldi. Ci sono tre livelli: il <strong>gruppo</strong> (es. Casa), la <strong>voce</strong> che pianifichi nel budget
        (es. Affitto, uscita) e la <strong>categoria</strong> che scegli quando registri un movimento (es. Affitto mensile).
      </p>
      {queries.some((q) => q.isPending) ? (
        <p role="status" className="settings__status">
          Caricamento…
        </p>
      ) : queries.some((q) => q.isError) ? (
        <p role="alert" className="settings__status">
          Non riesco a leggere i dati. Riprova più tardi.
        </p>
      ) : (
        <>
          <label className="structure__toggle">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Mostra anche gli archiviati
          </label>
          {visible(areas).map((area) => {
            const areaItems = items.filter((i) => i.macro_area_id === area.id)
            return (
              <section key={area.id} className="structure__group" aria-label={`Gruppo ${area.name}`}>
                <Row
                  level="group"
                  name={area.name}
                  archived={area.archived}
                  onRename={(name) => updateArea.mutateAsync({ id: area.id, values: { name } })}
                  onArchive={(archived) => archiveArea.mutateAsync({ id: area.id, archived })}
                />
                {visible(areaItems).map((item) => {
                  const itemCats = cats.filter((c) => c.budget_item_id === item.id)
                  return (
                    <div key={item.id} className="structure__item">
                      <Row
                        level="item"
                        name={item.name}
                        tag={KIND_TAG[item.kind]}
                        archived={item.archived}
                        onRename={async (name) => {
                          await updateItem.mutateAsync({ id: item.id, values: { name } })
                          await Promise.all(clientsOf(item.id).map((c) => updateClient.mutateAsync({ id: c.id, values: { name } })))
                        }}
                        onArchive={async (archived) => {
                          await archiveItem.mutateAsync({ id: item.id, archived })
                          await Promise.all(clientsOf(item.id).map((c) => archiveClient.mutateAsync({ id: c.id, archived })))
                        }}
                      />
                      {item.kind === 'income' && !item.archived && (
                        <details className="structure__pricing">
                          <summary>Tariffa e incasso</summary>
                          {(() => {
                            const client = clientsOf(item.id).find((c) => !c.archived)
                            return client ? (
                              <IncomePricing clientId={client.id} />
                            ) : (
                              <div>
                                <p className="settings__status">
                                  Per prevedere gli incassi da tariffa e giorni lavorati, attiva il calcolo su questa voce.
                                </p>
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    void createClient
                                      .mutateAsync({ name: item.name, budget_item_id: item.id, sort_order: nextOrder(clients.data ?? []) })
                                      .catch(() => undefined)
                                  }
                                >
                                  Imposta tariffa
                                </Button>
                              </div>
                            )
                          })()}
                        </details>
                      )}
                      {visible(itemCats).map((cat) => (
                        <Row
                          key={cat.id}
                          level="category"
                          name={cat.name}
                          archived={cat.archived}
                          onRename={(name) => updateCategory.mutateAsync({ id: cat.id, values: { name } })}
                          onArchive={(archived) => archiveCategory.mutateAsync({ id: cat.id, archived })}
                        />
                      ))}
                      {!item.archived && (
                        <AddForm
                          label="Nuova categoria"
                          onAdd={(name) => createCategory.mutateAsync({ name, budget_item_id: item.id, sort_order: nextOrder(itemCats) })}
                        />
                      )}
                    </div>
                  )
                })}
                {!area.archived && (
                  <AddForm
                    label="Nuova voce"
                    withKind
                    onAdd={(name, kind) => createItem.mutateAsync({ name, kind, macro_area_id: area.id, sort_order: nextOrder(areaItems) })}
                  />
                )}
              </section>
            )
          })}
          <AddForm label="Nuovo gruppo" onAdd={(name) => createArea.mutateAsync({ name, sort_order: nextOrder(areas) })} />
        </>
      )}
    </main>
  )
}
