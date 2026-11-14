import { useId, useState } from 'react'
import { Link } from 'react-router'
import type { CashFlowMonth } from '../lib/cash-flow.ts'
import { monthName } from '../lib/months.ts'
import { paths } from '../paths.ts'
import Amount from './Amount.tsx'
import MonthCloseDialog from './MonthCloseDialog.tsx'
import MonthStatusBadge from './MonthStatusBadge.tsx'
import './CashFlowMonthRow.css'

/** Cosa c'è dentro una voce in un mese: gruppo e categorie con i movimenti registrati (importi in euro con segno). */
export interface ItemInfo {
  areaName: string
  categories: { name: string; amount: number; count: number }[]
}

export interface CashFlowMonthRowProps {
  year: number
  data: CashFlowMonth
  transactionCount: number
  /** Dettaglio di una voce per il suggerimento accanto al nome. */
  itemInfo?: (budgetItemId: number, month: number) => ItemInfo
}

function Categories({ info, className }: { info: ItemInfo; className: string }) {
  if (info.categories.length === 0) return null
  return (
    <ul className={`cash-month__cats ${className}`} aria-label="Categorie">
      {info.categories.map((c) => (
        <li key={c.name} className="cash-month__chip" title={`${c.count} ${c.count === 1 ? 'movimento' : 'movimenti'}`}>
          <span>{c.name}</span>
          <Amount value={c.amount} />
        </li>
      ))}
    </ul>
  )
}

/** Una riga della vista cronologica: stato, entrate, uscite, flusso e saldo a fine mese. */
export default function CashFlowMonthRow({ year, data, transactionCount, itemInfo }: CashFlowMonthRowProps) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const label = `${monthName(data.month)} ${year}`
  return (
    <li className="cash-month">
      <div className="cash-month__head">
        <span className="cash-month__name">{monthName(data.month)}</span>
        <span className="cash-month__state">
          <MonthStatusBadge closed={data.isClosed} />
          <span className="cash-month__basis">{data.isClosed ? 'Reale' : 'Previsto'}</span>
        </span>
      </div>
      <dl className="cash-month__figures">
        <div>
          <dt>Entrate</dt>
          <dd>
            <Amount value={data.income} explicitPlus />
          </dd>
        </div>
        <div>
          <dt>Uscite</dt>
          <dd>
            <Amount value={data.expenses} />
          </dd>
        </div>
        <div>
          <dt>Saldo</dt>
          <dd>
            <Amount value={data.flow} explicitPlus />
          </dd>
        </div>
        <div className="cash-month__balance">
          <dt>Saldo a fine mese</dt>
          <dd>
            <Amount value={data.endBalance} />
          </dd>
        </div>
      </dl>
      <div className="cash-month__action">
        <button
          type="button"
          className="cash-month__toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={`Dettaglio di ${label}`}
          onClick={() => setExpanded((value) => !value)}
        >
          <span aria-hidden="true">{expanded ? '▾' : '▸'}</span> Dettaglio
        </button>
        <MonthCloseDialog year={year} month={data.month} closed={data.isClosed} transactionCount={transactionCount} />
      </div>
      <div id={panelId} className="cash-month__detail" hidden={!expanded}>
        {data.details.length === 0 ? (
          <p className="cash-month__empty">Nessuna voce con importi in questo mese.</p>
        ) : (
          <table className="cash-month__table">
            <caption className="visually-hidden">Voci di {label}</caption>
            <thead>
              <tr>
                <th scope="col">Voce</th>
                {itemInfo && <th scope="col" className="cash-month__col-cats">Categorie</th>}
                <th scope="col">Previsto</th>
                <th scope="col">{data.isClosed ? 'Reale' : 'Reale parziale'}</th>
                <th scope="col">Scostamento</th>
              </tr>
            </thead>
            <tbody>
              {data.details.map((detail) => {
                const info = itemInfo?.(detail.budgetItemId, data.month)
                return (
                <tr key={detail.budgetItemId}>
                  <th scope="row">
                    {detail.name}
                    {info && <span className="cash-month__group">{info.areaName}</span>}
                    {info && <Categories info={info} className="cash-month__cats--inline" />}
                  </th>
                  {info && (
                    <td className="cash-month__col-cats">
                      <Categories info={info} className="cash-month__cats--col" />
                    </td>
                  )}
                  <td>
                    <Amount value={detail.budgeted} />
                  </td>
                  <td>
                    <Amount value={detail.actual} />
                  </td>
                  <td>
                    <Amount value={detail.variance} explicitPlus />
                  </td>
                </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Totale del mese ({data.isClosed ? 'reale' : 'previsto'})</th>
                <td colSpan={4}>
                  <Amount value={data.flow} explicitPlus />
                </td>
              </tr>
            </tfoot>
          </table>
        )}
        <Link className="cash-month__link" to={`${paths.transactions}?year=${year}&month=${data.month}`}>
          Movimenti di {label}
        </Link>
      </div>
    </li>
  )
}
