import { Link } from 'react-router'
import {
  useAccountIdsInUse,
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useReorderAccounts,
  useSetArchivedAccount,
  useUpdateAccount,
} from '../../api/accounts.queries.ts'
import EditableList from '../../components/EditableList.tsx'
import CurrentBalances from './CurrentBalances.tsx'
import OpeningBalances from './OpeningBalances.tsx'
import { paths } from '../../paths.ts'
import './settings.css'

export default function AccountsSettingsPage() {
  const accounts = useAccounts({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const idsInUse = useAccountIdsInUse()
  const create = useCreateAccount()
  const update = useUpdateAccount()
  const setArchived = useSetArchivedAccount()
  const reorder = useReorderAccounts()
  const remove = useDeleteAccount()

  const rows = accounts.data ?? []
  const inUse = new Set(idsInUse.data ?? [])
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    archived: row.archived,
    // Con movimenti o saldi iniziali collegati si può solo archiviare.
    deletable: !inUse.has(row.id),
  }))

  return (
    <main className="settings">
      <Link to={paths.settings} className="settings__back">
        ← Impostazioni
      </Link>
      <h1>Conti</h1>
      {accounts.isPending || idsInUse.isPending ? (
        <p role="status" className="settings__status">
          Caricamento…
        </p>
      ) : accounts.isError || idsInUse.isError ? (
        <p role="alert" className="settings__status">
          Non riesco a leggere i conti. Riprova più tardi.
        </p>
      ) : (
        <>
        <EditableList
          label="Conti"
          addLabel="Nuovo conto"
          items={items}
          onAdd={async (name) => {
            const nextOrder = rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1
            await create.mutateAsync({ name, sort_order: nextOrder })
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
        />
        <CurrentBalances accounts={rows} />
        <OpeningBalances accounts={rows} />
        </>
      )}
    </main>
  )
}
