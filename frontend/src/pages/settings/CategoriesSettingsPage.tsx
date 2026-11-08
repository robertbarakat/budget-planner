import { Link } from 'react-router'
import {
  useBudgetItems,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useMacroAreas,
  useMoveCategoryToBudgetItem,
  useReorderCategories,
  useSetArchivedCategory,
  useUpdateCategory,
} from '../../api/classification.queries.ts'
import { useCategoryIdsInUse } from '../../api/transactions.queries.ts'
import EditableList from '../../components/EditableList.tsx'
import MoveDialog from '../../components/MoveDialog.tsx'
import { paths } from '../../paths.ts'
import './settings.css'

export default function CategoriesSettingsPage() {
  const macroAreas = useMacroAreas()
  const budgetItems = useBudgetItems({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const categories = useCategories({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const categoryIdsInUse = useCategoryIdsInUse()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const setArchived = useSetArchivedCategory()
  const reorder = useReorderCategories()
  const remove = useDeleteCategory()
  const move = useMoveCategoryToBudgetItem()

  const queries = [macroAreas, budgetItems, categories, categoryIdsInUse]
  const items = budgetItems.data ?? []
  const allCategories = categories.data ?? []
  const withTransactions = new Set(categoryIdsInUse.data ?? [])
  const areaName = new Map((macroAreas.data ?? []).map((area) => [area.id, area.name]))
  const label = (item: { name: string; macro_area_id: number }) =>
    `${item.name} (${areaName.get(item.macro_area_id) ?? ''})`
  // Le voci archiviate non sono tra le scelte; restano come gruppo solo se hanno ancora categorie.
  const groups = items.filter((item) => !item.archived || allCategories.some((c) => c.budget_item_id === item.id))
  const targets = items.filter((item) => !item.archived)

  return (
    <main className="settings">
      <Link to={paths.settings} className="settings__back">
        ← Impostazioni
      </Link>
      <h1>Categorie</h1>
      {queries.some((q) => q.isPending) ? (
        <p role="status" className="settings__status">
          Caricamento…
        </p>
      ) : queries.some((q) => q.isError) ? (
        <p role="alert" className="settings__status">
          Non riesco a leggere le categorie. Riprova più tardi.
        </p>
      ) : groups.length === 0 ? (
        <p className="settings__status">
          Prima crea almeno una voce di budget in <Link to={paths.settingsBudgetItems}>Voci di budget</Link>.
        </p>
      ) : (
        groups.map((group) => {
          const rows = allCategories.filter((category) => category.budget_item_id === group.id)
          const title = group.archived ? `${label(group)} (archiviata)` : label(group)
          return (
            <section key={group.id} className="settings__group" aria-labelledby={`group-${group.id}`}>
              <h2 id={`group-${group.id}`} className="settings__group-title">
                {title}
              </h2>
              <EditableList
                label={`Categorie di ${title}`}
                addLabel="Nuova categoria"
                canAdd={!group.archived}
                items={rows.map((row) => ({
                  id: row.id,
                  name: row.name,
                  archived: row.archived,
                  // Con movimenti collegati si può solo archiviare.
                  deletable: !withTransactions.has(row.id),
                }))}
                onAdd={async (name) => {
                  const nextOrder = rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1
                  await create.mutateAsync({ name, budget_item_id: group.id, sort_order: nextOrder })
                }}
                onRename={async (id, name) => {
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
                renderActions={(category) => {
                  const options = targets
                    .filter((target) => target.id !== group.id)
                    .map((target) => ({ id: target.id, name: label(target) }))
                  return options.length > 0 ? (
                    <MoveDialog
                      triggerLabel="Sposta"
                      triggerAriaLabel={`Sposta ${category.name}`}
                      title={`Sposta ${category.name}`}
                      description="Cambia solo la categoria: i movimenti già registrati restano alla voce di prima."
                      fieldLabel="Nuova voce di budget"
                      options={options}
                      onConfirm={async (budgetItemId) => {
                        await move.mutateAsync({ categoryId: Number(category.id), budgetItemId })
                      }}
                    />
                  ) : null
                }}
              />
            </section>
          )
        })
      )}
    </main>
  )
}
