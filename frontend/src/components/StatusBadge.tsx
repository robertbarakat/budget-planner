import type { ReactNode } from 'react'
import './StatusBadge.css'

export type BadgeTone = 'positive' | 'negative' | 'muted'

/** Etichetta di stato in pillola: testo + colore, uguale ovunque (Versata, Da versare, Archiviata…). */
export default function StatusBadge({ tone = 'muted', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>
}
