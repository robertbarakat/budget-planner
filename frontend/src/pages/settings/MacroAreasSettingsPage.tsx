import { Link } from 'react-router'
import {
  useBudgetItems,
  useCreateMacroArea,
  useDeleteMacroArea,
  useMacroAreas,
  useReorderMacroAreas,
  useSetArchivedMacroArea,
  useUpdateMacroArea,
} from '../../api/classification.queries.ts'
import EditableList, { type EditableListId } from '../../components/EditableList.tsx'
import { paths } from '../../paths.ts'
import './settings.css'

export default function MacroAreasSettingsPage() {
  const macroAreas = useMacroAreas({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const budgetItems = useBudgetItems()
  const create = useCreateMacroArea()
  const update = useUpdateMacroArea()
  const setArchived = useSetArchivedMacroArea()
  const reorder = useReorderMacroAreas()
  const remove = useDeleteMacroArea()

  const rows = macroAreas.data ?? []
  const linked = new Set((budgetItems.data ?? []).map((item) => item.macro_area_id))
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    archived: row.archived,
    // Con voci collegate (anche archiviate) si può solo archiviare.
    deletable: !linked.has(row.id),
  }))

  return (
    <main className="settings">
      <Link to={paths.settings} className="settings__back">
        ← Impostazioni
      </Link>
      <h1>Macro-aree</h1>
      {macroAreas.isPending || budgetItems.isPending ? (
        <p role="status" className="settings__status">
          Caricamento…
        </p>
      ) : macroAreas.isError || budgetItems.isError ? (
        <p role="alert" className="settings__status">
          Non riesco a leggere le macro-aree. Riprova più tardi.
        </p>
      ) : (
        <EditableList
          label="Macro-aree"
          addLabel="Nuova macro-area"
          items={items}
          onAdd={async (name) => {
            const nextOrder = rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1
            await create.mutateAsync({ name, sort_order: nextOrder })
          }}
          onRename={async (id: EditableListId, name) => {
            await update.mutateAsync({ id: Number(id), values: { name } })
          }}
          onReorder={async (orderedIds) => {
            const currentOrder = Object.fromEntries(rows.map((row) => [row.id, row.sort_order]))
            await reorder.mutateAsync({ orderedIds: orderedIds.map(Number), currentOrder })
          }}
          onArchive={async (id, archived) => {
            await setArchived.mutateAsync({ id: Number(id), archived })
          }}
          onDelete={async (id) => {
            await remove.mutateAsync(Number(id))
          }}
        />
      )}
    </main>
  )
}
