import { useAccounts } from '../api/accounts.queries.ts'
import { useBudgetItems, useCategories, useMacroAreas } from '../api/classification.queries.ts'
import TransactionForm, { type CategoryGroup } from '../components/TransactionForm.tsx'
import './NewTransactionPage.css'

export default function NewTransactionPage() {
  // Solo elementi non archiviati: un elemento archiviato sparisce dalle scelte di inserimento.
  const accounts = useAccounts({ where: { archived: false }, orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const macroAreas = useMacroAreas()
  const budgetItems = useBudgetItems({ where: { archived: false }, orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const categories = useCategories({ where: { archived: false }, orderBy: [{ column: 'sort_order' }, { column: 'id' }] })

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
          accounts={(accounts.data ?? []).map((account) => ({ id: account.id, name: account.name }))}
          categoryGroups={groups}
          // Il salvataggio arriva con il ticket successivo: qui il form si ferma alla validazione.
          onSubmit={() => undefined}
        />
      )}
    </main>
  )
}
