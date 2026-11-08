import { useState } from 'react'
import { useAccounts } from '../api/accounts.queries.ts'
import { useBudgetItems, useCategories, useMacroAreas } from '../api/classification.queries.ts'
import { useCreateTransaction } from '../api/transactions.queries.ts'
import { useSnackbar } from '../components/Snackbar.tsx'
import TransactionForm, { type CategoryGroup } from '../components/TransactionForm.tsx'
import './NewTransactionPage.css'

const SAVED_MESSAGE = { expense: 'Spesa salvata.', income: 'Entrata salvata.', transfer: 'Trasferimento salvato.' } as const

export default function NewTransactionPage() {
  // Solo elementi non archiviati: un elemento archiviato sparisce dalle scelte di inserimento.
  const accounts = useAccounts({ where: { archived: false }, orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const macroAreas = useMacroAreas()
  const budgetItems = useBudgetItems({ where: { archived: false }, orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const categories = useCategories({ where: { archived: false }, orderBy: [{ column: 'sort_order' }, { column: 'id' }] })

  const create = useCreateTransaction()
  const { showSuccess } = useSnackbar()
  // Dopo un salvataggio il form riparte vuoto (nuova chiave = nuovo form), pronto per un altro inserimento.
  const [formKey, setFormKey] = useState(0)

  const queries = [accounts, macroAreas, budgetItems, categories]
  const areaName = new Map((macroAreas.data ?? []).map((area) => [area.id, area.name]))
  const groups: CategoryGroup[] = (budgetItems.data ?? []).flatMap((item) => {
    const own = (categories.data ?? []).filter((category) => category.budget_item_id === item.id)
    return own.length === 0
      ? []
      : [
          {
            budgetItemId: item.id,
            budgetItemName: item.name,
            macroAreaName: areaName.get(item.macro_area_id) ?? '',
            kind: item.kind,
            categories: own.map((category) => ({ id: category.id, name: category.name })),
          },
        ]
  })

  return (
    <main className="new-transaction">
      <h1>Nuovo movimento</h1>
      {queries.some((q) => q.isPending) ? (
        <p role="status" className="new-transaction__status">
          Caricamento…
        </p>
      ) : queries.some((q) => q.isError) ? (
        <p role="alert" className="new-transaction__status">
          Non riesco a leggere conti e categorie. Riprova più tardi.
        </p>
      ) : (
        <TransactionForm
          key={formKey}
          busy={create.isPending}
          accounts={(accounts.data ?? []).map((account) => ({ id: account.id, name: account.name }))}
          categoryGroups={groups}
          onSubmit={async (values) => {
            try {
              const common = {
                amount: values.amount,
                transaction_date: values.date,
                account_id: values.accountId,
                comment: values.comment,
                tag: values.tag,
              }
              await create.mutateAsync(
                values.type === 'transfer'
                  ? { ...common, type: 'transfer', destination_account_id: values.destinationAccountId }
                  : { ...common, type: values.type, category_id: values.categoryId, budget_item_id: values.budgetItemId },
              )
            } catch {
              // L'errore arriva dalla snackbar; il form non si svuota, così nulla va perso.
              return
            }
            showSuccess(SAVED_MESSAGE[values.type])
            setFormKey((key) => key + 1)
          }}
        />
      )}
    </main>
  )
}
