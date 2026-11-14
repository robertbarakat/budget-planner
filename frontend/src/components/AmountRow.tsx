import type { ReactNode } from 'react'
import Amount, { type AmountProps } from './Amount.tsx'
import './AmountRow.css'

export interface AmountRowProps extends Pick<AmountProps, 'explicitPlus' | 'colored'> {
  title: ReactNode
  /** Riga secondaria sotto il titolo (data, tipo, conto). */
  meta?: ReactNode
  amount: number
  /** Azione sotto la riga (es. "Registra pagamento"). */
  action?: ReactNode
}

/**
 * Riga standard "descrizione a sinistra, importo a destra": l'importo sta sempre in una colonna di larghezza
 * fissa e allineato a destra, così le cifre si incolonnano in ogni elenco (Home, conti, scadenze...).
 */
export default function AmountRow({ title, meta, amount, explicitPlus, colored, action }: AmountRowProps) {
  return (
    <li className="amount-row">
      <div className="amount-row__main">
        <span className="amount-row__title">{title}</span>
        {meta && <span className="amount-row__meta">{meta}</span>}
      </div>
      <span className="amount-row__amount">
        <Amount value={amount} explicitPlus={explicitPlus} colored={colored} />
      </span>
      {action && <div className="amount-row__action">{action}</div>}
    </li>
  )
}
