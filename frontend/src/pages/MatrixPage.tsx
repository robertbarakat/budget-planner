import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useBudgetItems, useMacroAreas } from '../api/classification.queries.ts'
import { useYearData } from '../api/year-data.queries.ts'
import ChoiceChips from '../components/ChoiceChips.tsx'
import MatrixGrid from '../components/MatrixGrid.tsx'
import PeriodSelector, { usePeriod } from '../components/PeriodSelector.tsx'
import { buildMatrix, MATRIX_MODES, readMatrixMode, type MatrixMode } from '../lib/matrix.ts'
import './MatrixPage.css'

const MODE_LABEL: Record<MatrixMode, string> = { budgeted: 'Previsto', actual: 'Reale' }

export default function MatrixPage() {
  const [period, setPeriod] = usePeriod('none')
  const [params, setParams] = useSearchParams()
  const mode = readMatrixMode(params.get('mode'))
  const { year } = period
  const data = useYearData(year)
  const areas = useMacroAreas()
  const items = useBudgetItems()

  const matrix = useMemo(() => {
    if (!data.isReady || !areas.data || !items.data || !data.entries || !data.transactions || !data.closedMonths) return null
    return buildMatrix(
      year,
      areas.data.map((a) => ({ id: a.id, name: a.name, archived: a.archived, sortOrder: a.sort_order })),
      items.data.map((i) => ({
        id: i.id,
        macroAreaId: i.macro_area_id,
        name: i.name,
        kind: i.kind,
        archived: i.archived,
        sortOrder: i.sort_order,
      })),
      data.entries.map((e) => ({ budgetItemId: e.budget_item_id, year: e.year, month: e.month, amount: e.amount })),
      data.transactions.map((t) => ({
        type: t.type,
        budgetItemId: t.budget_item_id,
        categoryId: t.category_id,
        transactionDate: t.transaction_date,
        amount: t.amount,
      })),
      data.closedMonths,
    )
  }, [year, data.isReady, data.entries, data.transactions, data.closedMonths, areas.data, items.data])

  return (
    <main className="matrix-page">
      <h1>Matrice voci × mesi</h1>
      <div className="matrix-page__controls">
        <PeriodSelector period={period} onChange={setPeriod} monthMode="none" />
        <ChoiceChips
          label="Modalità"
          options={MATRIX_MODES.map((value) => ({ value, label: MODE_LABEL[value] }))}
          value={mode}
          onChange={(value) =>
            setParams(
              (current) => {
                const next = new URLSearchParams(current)
                next.set('mode', value)
                return next
              },
              { replace: true },
            )
          }
        />
      </div>
      {data.isError || areas.isError || items.isError ? (
        <p role="alert" className="matrix-page__note">
          Non riesco a leggere la matrice. Riprova più tardi.
        </p>
      ) : !matrix ? (
        <p role="status" className="matrix-page__note">
          Caricamento…
        </p>
      ) : matrix.groups.length === 0 ? (
        <p className="matrix-page__note">Nessuna voce di budget: creale in Impostazioni.</p>
      ) : (
        <MatrixGrid matrix={matrix} mode={mode} label={`${MODE_LABEL[mode]} ${year}, voci per mese`} />
      )}
      <p className="matrix-page__note">Entrate positive, spese negative. I trasferimenti non compaiono.</p>
    </main>
  )
}
