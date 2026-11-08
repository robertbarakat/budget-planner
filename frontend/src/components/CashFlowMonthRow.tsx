import type { CashFlowMonth } from '../lib/cash-flow.ts'
import { monthName } from '../lib/months.ts'
import Amount from './Amount.tsx'
import MonthCloseDialog from './MonthCloseDialog.tsx'
import MonthStatusBadge from './MonthStatusBadge.tsx'
import './CashFlowMonthRow.css'

export interface CashFlowMonthRowProps {
  year: number
  data: CashFlowMonth
  transactionCount: number
}

/** Una riga della vista cronologica: stato, entrate, uscite, flusso e saldo a fine mese. */
export default function CashFlowMonthRow({ year, data, transactionCount }: CashFlowMonthRowProps) {
  return (
    <li className="cash-month">
      <div className="cash-month__head">
        <span className="cash-month__name">{monthName(data.month)}</span>
        <MonthStatusBadge closed={data.isClosed} />
        <span className="cash-month__basis">{data.isClosed ? 'Reale' : 'Previsto'}</span>
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
          <dt>Flusso</dt>
          <dd>
            <Amount value={data.flow} explicitPlus />
          </dd>
        </div>
        <div className="cash-month__balance">
          <dt>Saldo a fine mese</dt>
          <dd>
            <Amount value={data.endBalance} colored={false} />
          </dd>
        </div>
      </dl>
      <div className="cash-month__action">
        <MonthCloseDialog year={year} month={data.month} closed={data.isClosed} transactionCount={transactionCount} />
      </div>
    </li>
  )
}
