import { useState } from 'react'
import { Link } from 'react-router'
import { useBudgetItemIdsInUse } from '../../api/budget.queries.ts'
import {
  useBudgetItems,
  useCategories,
  useCreateBudgetItem,
  useDeleteBudgetItem,
  useMacroAreas,
  useReorderBudgetItems,
  useSetArchivedBudgetItem,
  useUpdateBudgetItem,
} from '../../api/classification.queries.ts'
import EditableList from '../../components/EditableList.tsx'
import Field from '../../components/Field.tsx'
import MoveDialog from '../../components/MoveDialog.tsx'
import { paths } from '../../paths.ts'
import './settings.css'

type BudgetItemKind = 'income' | 'expense'
const KIND_LABEL: Record<BudgetItemKind, string> = { expense: 'Spesa', income: 'Entrata' }

export default function BudgetItemsSettingsPage() {
  const macroAreas = useMacroAreas({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const budgetItems = useBudgetItems({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const categories = useCategories()
  const itemIdsInUse = useBudgetItemIdsInUse()
  const create = useCreateBudgetItem()
  const update = useUpdateBudgetItem()
  const setArchived = useSetArchivedBudgetItem()
  const reorder = useReorderBudgetItems()
  const remove = useDeleteBudgetItem()

  const queries = [macroAreas, budgetItems, categories, itemIdsInUse]
  const areas = macroAreas.data ?? []
  const allItems = budgetItems.data ?? []
  const withCategories = new Set((categories.data ?? []).map((category) => category.budget_item_id))
  const withEntries = new Set(itemIdsInUse.data ?? [])
  // Le macro-aree archiviate non sono tra le scelte; restano come gruppo solo se hanno ancora voci.
  const groups = areas.filter((area) => !area.archived || allItems.some((item) => item.macro_area_id === area.id))
  const targets = areas.filter((area) => !area.archived)

  return (
    <main className="settings">
      <Link to={paths.settings} className="settings__back">
        ← Impostazioni
      </Link>
      <h1>Voci di budget</h1>
      {queries.some((q) => q.isPending) ? (
        <p role="status" className="settings__status">
          Caricamento…
        </p>
      ) : queries.some((q) => q.isError) ? (
        <p role="alert" className="settings__status">
          Non riesco a leggere le voci di budget. Riprova più tardi.
        </p>
      ) : groups.length === 0 ? (
        <p className="settings__status">
          Prima crea almeno una macro-area in <Link to={paths.settingsMacroAreas}>Macro-aree</Link>.
        </p>
      ) : (
        groups.map((area) => {
          const rows = allItems.filter((item) => item.macro_area_id === area.id)
          return (
            <BudgetItemsGroup
              key={area.id}
              areaId={area.id}
              areaName={area.archived ? `${area.name} (archiviata)` : area.name}
              canAdd={!area.archived}
              rows={rows}
              items={rows.map((row) => ({
                id: row.id,
                name: row.name,
                archived: row.archived,
                // Con categorie o righe di budget collegate si può solo archiviare.
                deletable: !withCategories.has(row.id) && !withEntries.has(row.id),
                detail: KIND_LABEL[row.kind],
              }))}
              moveTargets={targets.filter((target) => target.id !== area.id)}
              onAdd={async (name, kind) => {
                const nextOrder = rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1
                await create.mutateAsync({ name, kind, macro_area_id: area.id, sort_order: nextOrder })
              }}
              onRename={async (id, name) => {
                await update.mutateAsync({ id, values: { name } })
              }}
              onReorder={async (orderedIds) => {
                const currentOrder = Object.fromEntries(rows.map((row) => [row.id, row.sort_order]))
                await reorder.mutateAsync({ orderedIds, currentOrder })
              }}
              onArchive={async (id, archived) => {
                await setArchived.mutateAsync({ id, archived })
              }}
              onDelete={async (id) => {
                await remove.mutateAsync(id)
              }}
              onMove={async (id, macroAreaId) => {
                const last = allItems
                  .filter((item) => item.macro_area_id === macroAreaId)
                  .reduce((max, item) => Math.max(max, item.sort_order), -1)
                await update.mutateAsync({ id, values: { macro_area_id: macroAreaId, sort_order: last + 1 } })
              }}
            />
          )
        })
      )}
    </main>
  )
}

interface GroupProps {
  areaId: number
  areaName: string
  canAdd: boolean
  rows: { id: number; name: string }[]
  items: React.ComponentProps<typeof EditableList>['items']
  moveTargets: { id: number; name: string }[]
  onAdd: (name: string, kind: BudgetItemKind) => Promise<void>
  onRename: (id: number, name: string) => Promise<void>
  onReorder: (orderedIds: number[]) => Promise<void>
  onArchive: (id: number, archived: boolean) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onMove: (id: number, macroAreaId: number) => Promise<void>
}

function BudgetItemsGroup({
  areaId,
  areaName,
  canAdd,
  items,
  moveTargets,
  onAdd,
  onRename,
  onReorder,
  onArchive,
  onDelete,
  onMove,
}: GroupProps) {
  const [kind, setKind] = useState<BudgetItemKind>('expense')
  return (
    <section className="settings__group" aria-labelledby={`group-${areaId}`}>
      <h2 id={`group-${areaId}`} className="settings__group-title">
        {areaName}
      </h2>
      <EditableList
        label={`Voci di ${areaName}`}
        addLabel="Nuova voce"
        canAdd={canAdd}
        addExtra={
          <Field label="Tipo" required>
            {(p) => (
              <select {...p} value={kind} onChange={(e) => setKind(e.target.value as BudgetItemKind)}>
                <option value="expense">{KIND_LABEL.expense}</option>
                <option value="income">{KIND_LABEL.income}</option>
              </select>
            )}
          </Field>
        }
        items={items}
        onAdd={(name) => onAdd(name, kind)}
        onRename={(id, name) => onRename(Number(id), name)}
        onReorder={(ids) => onReorder(ids.map(Number))}
        onArchive={(id, archived) => onArchive(Number(id), archived)}
        onDelete={(id) => onDelete(Number(id))}
        renderActions={(item) =>
          moveTargets.length > 0 ? (
            <MoveDialog
              triggerLabel="Sposta"
              triggerAriaLabel={`Sposta ${item.name}`}
              title={`Sposta ${item.name}`}
              fieldLabel="Nuova macro-area"
              options={moveTargets}
              onConfirm={(macroAreaId) => onMove(Number(item.id), macroAreaId)}
            />
          ) : null
        }
      />
    </section>
  )
}
