import { useState } from 'react'
import { Link } from 'react-router'
import { useBudgetItems } from '../../api/classification.queries.ts'
import {
  useClientIdsInUse,
  useClients,
  useCreateClient,
  useDeleteClient,
  useReorderClients,
  useSetArchivedClient,
  useUpdateClient,
} from '../../api/revenue.queries.ts'
import '../../components/Button.css'
import EditableList from '../../components/EditableList.tsx'
import Field from '../../components/Field.tsx'
import MoveDialog from '../../components/MoveDialog.tsx'
import { paths } from '../../paths.ts'
import './settings.css'

export default function ClientsSettingsPage() {
  const clients = useClients({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const budgetItems = useBudgetItems({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const idsInUse = useClientIdsInUse()
  const create = useCreateClient()
  const update = useUpdateClient()
  const setArchived = useSetArchivedClient()
  const reorder = useReorderClients()
  const remove = useDeleteClient()
  const [chosenItemId, setChosenItemId] = useState('')

  const queries = [clients, budgetItems, idsInUse]
  const rows = clients.data ?? []
  const allItems = budgetItems.data ?? []
  const incomeItems = allItems.filter((item) => item.kind === 'income' && !item.archived)
  const itemName = new Map(allItems.map((item) => [item.id, item.name]))
  const inUse = new Set(idsInUse.data ?? [])
  // Se non ne ha scelta una, il nuovo cliente usa la prima voce di entrata.
  const newItemId = incomeItems.some((item) => String(item.id) === chosenItemId) ? chosenItemId : String(incomeItems[0]?.id ?? '')

  return (
    <main className="settings">
      <Link to={paths.settings} className="settings__back">
        ← Impostazioni
      </Link>
      <h1>Clienti</h1>
      {queries.some((q) => q.isPending) ? (
        <p role="status" className="settings__status">
          Caricamento…
        </p>
      ) : queries.some((q) => q.isError) ? (
        <p role="alert" className="settings__status">
          Non riesco a leggere i clienti. Riprova più tardi.
        </p>
      ) : (
        <>
          {incomeItems.length === 0 && (
            <p className="settings__status">
              Per aggiungere un cliente serve almeno una voce di entrata: creala in{' '}
              <Link to={paths.settingsBudgetItems}>Voci di budget</Link>.
            </p>
          )}
          <EditableList
            label="Clienti"
            addLabel="Nuovo cliente"
            canAdd={incomeItems.length > 0}
            addExtra={
              <Field label="Voce di entrata" required>
                {(p) => (
                  <select {...p} value={newItemId} onChange={(e) => setChosenItemId(e.target.value)}>
                    {incomeItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            }
            items={rows.map((row) => ({
              id: row.id,
              name: row.name,
              archived: row.archived,
              // Con tariffe o giorni lavorati collegati si può solo archiviare.
              deletable: !inUse.has(row.id),
              detail: `Voce: ${itemName.get(row.budget_item_id) ?? '—'}`,
            }))}
            onAdd={async (name) => {
              const nextOrder = rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1
              await create.mutateAsync({ name, budget_item_id: Number(newItemId), sort_order: nextOrder })
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
            renderActions={(item) => {
              const current = rows.find((row) => row.id === item.id)?.budget_item_id
              const options = incomeItems.filter((option) => option.id !== current)
              return (
                <>
                  <Link to={paths.settingsClient(item.id)} className="button button--secondary" aria-label={`Tariffe e ritardo di ${item.name}`}>
                    Tariffe e ritardo
                  </Link>
                  {options.length > 0 && (
                <MoveDialog
                  triggerLabel="Cambia voce"
                  triggerAriaLabel={`Cambia voce di ${item.name}`}
                  title={`Cambia voce di ${item.name}`}
                  fieldLabel="Nuova voce di entrata"
                  description="Gli incassi previsti dei prossimi calcoli useranno la nuova voce; le righe già scritte nel budget non cambiano."
                  options={options}
                  onConfirm={async (budgetItemId) => {
                    await update.mutateAsync({ id: Number(item.id), values: { budget_item_id: budgetItemId } })
                  }}
                />
                  )}
                </>
              )
            }}
          />
        </>
      )}
    </main>
  )
}
