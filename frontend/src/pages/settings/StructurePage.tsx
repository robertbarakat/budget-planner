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
import { paths } from '../../paths.ts'
import './settings.css'
import './StructurePage.css'
import SectionTitle from '../../components/SectionTitle.tsx'
import StatusBadge from '../../components/StatusBadge.tsx'

type Kind = 'income' | 'expense'

/** Nome (opzionale) + azioni Rinomina / Archivia. La rinomina avviene nella stessa riga. */
function Editable({
  name,
  archived,
  onRename,
  onArchive,
  showName = true,
  className,
}: {
  name: string
  archived: boolean
  onRename: (name: string) => Promise<unknown>
  onArchive: (archived: boolean) => Promise<unknown>
  showName?: boolean
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  async function save(event: FormEvent) {
    event.preventDefault()
    const next = draft.trim()
    if (next && next !== name) await onRename(next).catch(() => undefined)
    setEditing(false)
  }

  if (editing) {
    return (
      <form className="structure__edit" onSubmit={save}>
        <input aria-label={`Nome di ${name}`} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
        <button type="submit" className="text-link">
          Salva
        </button>
        <button type="button" className="text-link text-link--quiet" onClick={() => setEditing(false)}>
          Annulla
        </button>
      </form>
    )
  }
  return (
    <div className={`structure__line ${className ?? ''}`}>
      {showName && (
        <span className="structure__name">
          {name}
          {archived && <StatusBadge>Archiviata</StatusBadge>}
        </span>
      )}
      <span className="structure__actions">
        <button
          type="button"
          className="text-link"
          aria-label={`Rinomina ${name}`}
          onClick={() => {
            setDraft(name)
            setEditing(true)
          }}
        >
          Rinomina
        </button>
        <button type="button" className="text-link text-link--quiet" aria-label={`${archived ? 'Ripristina' : 'Archivia'} ${name}`} onClick={() => void onArchive(!archived)}>
          {archived ? 'Ripristina' : 'Archivia'}
        </button>
      </span>
    </div>
  )
}

/** Pulsante «+ …» che si apre in un campo nome. */
function AddName({ label, onAdd }: { label: string; onAdd: (name: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  if (!open) {
    return (
      <button type="button" className="text-link structure__add" onClick={() => setOpen(true)}>
        + {label}
      </button>
    )
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const next = name.trim()
    if (!next) return
    const ok = await onAdd(next).then(() => true, () => false)
    if (ok) {
      setName('')
      setOpen(false)
    }
  }
  return (
    <form className="structure__edit" onSubmit={submit}>
      <input aria-label={label} placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <button type="submit" className="text-link">
        Aggiungi
      </button>
      <button type="button" className="text-link text-link--quiet" onClick={() => setOpen(false)}>
        Annulla
      </button>
    </form>
  )
}

const KINDS: { kind: Kind; label: string; hint: string }[] = [
  { kind: 'expense', label: 'Uscite', hint: 'I soldi che spendi, divisi per gruppo (es. Casa → Affitto).' },
  { kind: 'income', label: 'Entrate', hint: 'I soldi che incassi, divisi per gruppo.' },
]

// Una sola pagina per gruppi, voci e categorie: si sceglie Uscite o Entrate, ogni voce si apre per vedere le sue categorie.
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
  const [kind, setKind] = useState<Kind>('expense')
  const [showArchived, setShowArchived] = useState(false)

  const queries = [macroAreas, budgetItems, categories]
  const items = budgetItems.data ?? []
  const cats = categories.data ?? []
  const nextOrder = (rows: { sort_order: number }[]) => rows.reduce((max, r) => Math.max(max, r.sort_order), -1) + 1
  const visible = <T extends { archived: boolean }>(rows: T[]) => (showArchived ? rows : rows.filter((r) => !r.archived))
  const areas = visible(macroAreas.data ?? [])
  const current = KINDS.find((k) => k.kind === kind)!

  return (
    <main className="settings structure">
      <Link to={paths.settings} className="settings__back">
        ← Impostazioni
      </Link>
      <h1>Voci e categorie</h1>
      <div className="structure__tabs" role="group" aria-label="Tipo">
        {KINDS.map((k) => (
          <button key={k.kind} type="button" aria-pressed={kind === k.kind} onClick={() => setKind(k.kind)}>
            {k.label}
          </button>
        ))}
      </div>
      <p className="settings__status">{current.hint} Tocca una voce per vedere e cambiare le sue categorie.</p>
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
          <AddName label="Nuovo gruppo" onAdd={(name) => createArea.mutateAsync({ name, sort_order: nextOrder(macroAreas.data ?? []) })} />
          <div className="structure__groups">
          {areas.map((area) => {
            const areaItems = items.filter((i) => i.macro_area_id === area.id)
            const shown = visible(areaItems.filter((i) => i.kind === kind))
            // Gruppi senza voci di questo tipo: si mostrano solo se non hanno voci di nessun tipo (appena creati).
            if (shown.length === 0 && areaItems.length > 0) return null
            return (
              <section key={area.id} className="structure__group" aria-label={`Gruppo ${area.name}`}>
                <SectionTitle>{area.name}</SectionTitle>
                {shown.map((item) => {
                  const itemCats = cats.filter((c) => c.budget_item_id === item.id)
                  const active = itemCats.filter((c) => !c.archived)
                  return (
                    <details key={item.id} className="structure__item">
                      <summary>
                        <span className="structure__name">
                          {item.name}
                          {item.archived && <StatusBadge>Archiviata</StatusBadge>}
                        </span>
                        <span className="structure__count">{active.length === 1 ? '1 categoria' : `${active.length} categorie`}</span>
                      </summary>
                      <div className="structure__body">
                        <h3 className="structure__sub">Categorie</h3>
                        {visible(itemCats).map((cat) => (
                          <Editable
                            key={cat.id}
                            name={cat.name}
                            archived={cat.archived}
                            onRename={(name) => updateCategory.mutateAsync({ id: cat.id, values: { name } })}
                            onArchive={(archived) => archiveCategory.mutateAsync({ id: cat.id, archived })}
                          />
                        ))}
                        {!item.archived && (
                          <AddName
                            label="Nuova categoria"
                            onAdd={(name) => createCategory.mutateAsync({ name, budget_item_id: item.id, sort_order: nextOrder(itemCats) })}
                          />
                        )}
                        <h3 className="structure__sub">Questa voce</h3>
                        <Editable
                          name={item.name}
                          showName={false}
                          archived={item.archived}
                          onRename={(name) => updateItem.mutateAsync({ id: item.id, values: { name } })}
                          onArchive={(archived) => archiveItem.mutateAsync({ id: item.id, archived })}
                        />
                      </div>
                    </details>
                  )
                })}
                {!area.archived && (
                  <AddName
                    label={kind === 'income' ? 'Nuova voce di entrata' : 'Nuova voce di uscita'}
                    onAdd={(name) => createItem.mutateAsync({ name, kind, macro_area_id: area.id, sort_order: nextOrder(areaItems) })}
                  />
                )}
                <Editable
                  name={area.name}
                  showName={false}
                  archived={area.archived}
                  className="structure__group-actions"
                  onRename={(name) => updateArea.mutateAsync({ id: area.id, values: { name } })}
                  onArchive={(archived) => archiveArea.mutateAsync({ id: area.id, archived })}
                />
              </section>
            )
          })}
          </div>
          <label className="structure__toggle">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Mostra anche gli archiviati
          </label>
        </>
      )}
    </main>
  )
}
