import { useState } from 'react'
import { Link } from 'react-router'
import { AlertDialog } from 'radix-ui'
import type { Recurrence } from 'budget-planner-shared'
import { useAccounts } from '../../api/accounts.queries.ts'
import { useBudgetItems, useCategories } from '../../api/classification.queries.ts'
import {
  useArchiveRecurrence,
  useCreateRecurrenceWithOccurrences,
  useRecurrences,
  useUpdateRecurrenceWithOccurrences,
} from '../../api/recurrences.queries.ts'
import Amount from '../../components/Amount.tsx'
import Button from '../../components/Button.tsx'
import '../../components/MonthCloseDialog.css'
import RecurrenceOccurrencesDialog from '../../components/RecurrenceOccurrencesDialog.tsx'
import RecurrenceFormDialog from '../../components/RecurrenceFormDialog.tsx'
import { useSnackbar } from '../../components/Snackbar.tsx'
import { formatDate, todayIso } from '../../lib/dates.ts'
import { emptyRecurrenceForm, frequencyLabel, type RecurrenceFormState } from '../../lib/recurrence-form.ts'
import { paths } from '../../paths.ts'
import './RecurrencesSettingsPage.css'
import './settings.css'

const ORDER = [{ column: 'sort_order' as const }, { column: 'id' as const }]

function formFor(recurrence: Recurrence): RecurrenceFormState {
  return {
    name: recurrence.name,
    budgetItemId: String(recurrence.budget_item_id),
    accountId: String(recurrence.account_id),
    amountText: String(recurrence.base_amount).replace('.', ','),
    frequency: recurrence.frequency,
    startDate: recurrence.start_date,
    endDate: recurrence.end_date ?? '',
  }
}

export default function RecurrencesSettingsPage() {
  const recurrences = useRecurrences({ orderBy: [{ column: 'name' }] })
  const budgetItems = useBudgetItems({ orderBy: ORDER })
  const accounts = useAccounts({ orderBy: ORDER })
  const categories = useCategories()
  const create = useCreateRecurrenceWithOccurrences()
  const update = useUpdateRecurrenceWithOccurrences()
  const archive = useArchiveRecurrence()
  const { showSuccess } = useSnackbar()
  const [showArchived, setShowArchived] = useState(false)
  const [toArchive, setToArchive] = useState<Recurrence | null>(null)

  const queries = [recurrences, budgetItems, accounts, categories]
  const itemName = new Map((budgetItems.data ?? []).map((item) => [item.id, item.name]))
  const itemKind = new Map((budgetItems.data ?? []).map((item) => [item.id, item.kind]))
  const accountName = new Map((accounts.data ?? []).map((account) => [account.id, account.name]))
  const all = recurrences.data ?? []
  const visible = all.filter((row) => showArchived || !row.archived)
  const hasArchived = all.some((row) => row.archived)

  // Voci e conti archiviati non si scelgono; in modifica restano quelli già usati dalla ricorrenza.
  // Il movimento automatico ha bisogno di una categoria: si scelgono solo voci con almeno una categoria attiva.
  const itemsWithCategory = new Set((categories.data ?? []).filter((c) => !c.archived).map((c) => c.budget_item_id))
  const choicesFor = (keepItem?: number, keepAccount?: number) => ({
    budgetItems: (budgetItems.data ?? []).filter(
      (item) => item.id === keepItem || (!item.archived && itemsWithCategory.has(item.id)),
    ),
    accounts: (accounts.data ?? []).filter((account) => !account.archived || account.id === keepAccount),
  })

  async function confirmArchive() {
    if (!toArchive) return
    try {
      await archive.mutateAsync({ recurrenceId: toArchive.id, today: todayIso() })
      showSuccess(`${toArchive.name} archiviata: le scadenze passate restano.`)
      setToArchive(null)
    } catch {
      // L'errore è già alla snackbar.
    }
  }

  const newChoices = choicesFor()

  return (
    <main className="settings">
      <Link to={paths.settings} className="settings__back">
        ← Impostazioni
      </Link>
      <h1>Ricorrenze</h1>
      {queries.some((q) => q.isPending) ? (
        <p role="status" className="settings__status">Caricamento…</p>
      ) : queries.some((q) => q.isError) ? (
        <p role="alert" className="settings__status">Non riesco a leggere le ricorrenze. Riprova più tardi.</p>
      ) : (
        <>
          {(newChoices.budgetItems.length === 0 || newChoices.accounts.length === 0) && (
            <p className="settings__status">
              Per creare una ricorrenza servono un conto e una voce di budget con almeno una categoria.
            </p>
          )}
          <RecurrenceFormDialog
            title="Nuova ricorrenza"
            submitLabel="Crea"
            trigger={<Button className="recurrences__new" disabled={newChoices.budgetItems.length === 0 || newChoices.accounts.length === 0}>Nuova ricorrenza</Button>}
            initial={emptyRecurrenceForm(todayIso())}
            budgetItems={newChoices.budgetItems}
            accounts={newChoices.accounts}
            onSubmit={async (values) => {
              const { recurrence, createdCount } = await create.mutateAsync({ values, referenceDate: todayIso() })
              showSuccess(`${recurrence.name} creata: ${createdCount} scadenze nel budget.`)
            }}
          />
          {hasArchived && (
            <label className="recurrences__toggle">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Mostra archiviate
            </label>
          )}
          {visible.length === 0 ? (
            <p className="settings__status">Nessuna ricorrenza.</p>
          ) : (
            <ul className="recurrences" aria-label="Ricorrenze">
              {visible.map((row) => {
                const choices = choicesFor(row.budget_item_id, row.account_id)
                return (
                  <li key={row.id} className={row.archived ? 'recurrence recurrence--archived' : 'recurrence'}>
                    <div className="recurrence__head">
                      <span className="recurrence__name">{row.name}</span>
                      {row.archived && <span className="recurrence__badge">Archiviata</span>}
                      <Amount value={itemKind.get(row.budget_item_id) === 'income' ? row.base_amount : -row.base_amount} explicitPlus />
                    </div>
                    <p className="recurrence__detail">
                      {itemName.get(row.budget_item_id) ?? '—'} · {accountName.get(row.account_id) ?? '—'}
                    </p>
                    <p className="recurrence__detail">
                      {frequencyLabel(row.frequency)} · dal {formatDate(row.start_date)}
                      {row.end_date ? ` al ${formatDate(row.end_date)}` : ', senza fine'}
                    </p>
                    <div className="recurrence__actions">
                      <RecurrenceOccurrencesDialog recurrence={row} kind={itemKind.get(row.budget_item_id) === 'income' ? 'income' : 'expense'} />
                      {!row.archived && (
                        <>
                          <RecurrenceFormDialog
                            title={`Modifica ${row.name}`}
                            submitLabel="Salva"
                            description="Cambiano solo le scadenze future non modificate a mano; le passate restano."
                            trigger={<button type="button" className="text-link" aria-label={`Modifica ${row.name}`}>Modifica</button>}
                            initial={formFor(row)}
                            budgetItems={choices.budgetItems}
                            accounts={choices.accounts}
                            onSubmit={async (values) => {
                              await update.mutateAsync({ recurrenceId: row.id, values, today: todayIso() })
                              showSuccess(`${values.name} aggiornata.`)
                            }}
                          />
                          <button type="button" className="text-link text-link--quiet" aria-label={`Archivia ${row.name}`} onClick={() => setToArchive(row)}>
                            Archivia
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
      <AlertDialog.Root open={toArchive !== null} onOpenChange={(next) => !next && !archive.isPending && setToArchive(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="month-close__overlay" />
          <AlertDialog.Content className="month-close__dialog">
            <AlertDialog.Title className="month-close__title">Archiviare {toArchive?.name}?</AlertDialog.Title>
            <AlertDialog.Description className="month-close__text">
              Le scadenze future non modificate a mano vengono eliminate dal budget; quelle passate e quelle modificate restano.
            </AlertDialog.Description>
            <div className="month-close__actions">
              <Button onClick={confirmArchive} loading={archive.isPending}>Archivia</Button>
              <AlertDialog.Cancel asChild>
                <Button variant="secondary" disabled={archive.isPending}>Annulla</Button>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </main>
  )
}
