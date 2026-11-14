import { useBudgetItems, useMacroAreas } from '../api/classification.queries.ts'
import { formatAbsoluteAmount } from '../lib/format-amount.ts'
import { buildShares, type ShareRow } from '../lib/shares.ts'
import { eurosToCents } from 'budget-planner-shared'
import './PeriodShares.css'

const percentFormat = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function Row({ row, level }: { row: ShareRow; level: 'area' | 'item' }) {
  return (
    <span className={`shares__row shares__row--${level}`}>
      <span className="shares__name">{row.name}</span>
      <span className="shares__value num">
        {formatAbsoluteAmount(row.cents / 100)} · <strong>{percentFormat.format(row.percent)}%</strong>
      </span>
      <span className="shares__bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, row.percent)}%` }} />
      </span>
    </span>
  )
}

/** Quanto pesa ogni gruppo e ogni voce sulle spese e sulle entrate del periodo mostrato. */
export default function PeriodShares({
  transactions,
  periodLabel,
}: {
  transactions: readonly { type: string; budget_item_id: number | null; amount: number }[]
  periodLabel: string
}) {
  const areas = useMacroAreas()
  const items = useBudgetItems()
  if (!areas.data || !items.data) return null
  const input = transactions.map((t) => ({ type: t.type, budgetItemId: t.budget_item_id, amountCents: eurosToCents(Number(t.amount)) }))
  const itemInput = items.data.map((i) => ({ id: i.id, name: i.name, macroAreaId: i.macro_area_id }))
  const areaInput = areas.data.map((a) => ({ id: a.id, name: a.name }))
  const kinds = [
    { kind: 'expense' as const, title: 'Come pesano le uscite' },
    { kind: 'income' as const, title: 'Come pesano le entrate' },
  ]
  return (
    <div className="shares">
      {kinds.map(({ kind, title }) => {
        const result = buildShares(kind, input, itemInput, areaInput)
        if (result.totalCents === 0) return null
        return (
          <details key={kind} className="shares__card">
            <summary>
              <span className="shares__title">{title}</span>
              <span className="shares__total num">
                {formatAbsoluteAmount(result.totalCents / 100)} <span className="shares__period">{periodLabel}</span>
              </span>
            </summary>
            <ul className="shares__list">
              {result.areas.map((area) => (
                <li key={area.id ?? 'none'}>
                  <details className="shares__area">
                    <summary>
                      <Row row={area} level="area" />
                    </summary>
                    <ul className="shares__items">
                      {area.items.map((item) => (
                        <li key={item.id ?? 'none'}>
                          <Row row={item} level="item" />
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </details>
        )
      })}
    </div>
  )
}
