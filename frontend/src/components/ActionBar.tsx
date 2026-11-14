import type { ReactNode } from 'react'
import './ActionBar.css'

/** Fascia in basso con l'azione principale: stesso sfondo e bordo ovunque. `sticky` la appiccica al fondo mentre il contenuto scorre. */
export default function ActionBar({ children, sticky = false }: { children: ReactNode; sticky?: boolean }) {
  return <div className={sticky ? 'action-bar action-bar--sticky' : 'action-bar'}>{children}</div>
}
