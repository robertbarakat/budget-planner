import { amountSign, formatAbsoluteAmount } from '../lib/format-amount.ts'
import './Amount.css'

export interface AmountProps {
  /** Importo in EUR con segno: le spese sono negative, le entrate positive. */
  value: number
  /** Mostra il "+" davanti agli importi positivi (entrate, scostamenti). */
  explicitPlus?: boolean
  /** Colora i negativi (e i positivi con il "+") con i token. Il segno resta sempre. */
  colored?: boolean
  className?: string
}

export default function Amount({ value, explicitPlus = false, colored = true, className }: AmountProps) {
  // Colorati = segno sempre esplicito: + e verde per i positivi, − e rosso per i negativi.
  const sign = amountSign(value, explicitPlus || colored)
  const tone = !colored || sign === '' ? '' : sign === '-' ? 'amount--negative' : 'amount--positive'
  const classes = ['amount', 'num', tone, className].filter(Boolean).join(' ')

  return (
    <span className={classes} data-sign={sign || undefined}>
      {sign === '-' && <span className="amount__sign">{'−'}</span>}
      {sign === '+' && <span className="amount__sign">+</span>}
      {formatAbsoluteAmount(value)}
    </span>
  )
}
