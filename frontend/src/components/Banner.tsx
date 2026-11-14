import type { ReactNode } from 'react'
import './Banner.css'

/** Avviso a tutta larghezza (aggiornamento, offline): `info` verde, `warning` ambra. */
export default function Banner({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: ReactNode }) {
  return (
    <div className={`banner banner--${tone}`} role="status">
      {children}
    </div>
  )
}
