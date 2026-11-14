import type { ReactNode } from 'react'

/** Pulsante che apre e chiude una sezione: freccia ▾/▸ + testo, con `aria-expanded`. */
export default function DisclosureButton({
  expanded,
  onToggle,
  className,
  children,
}: {
  expanded: boolean
  onToggle: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button type="button" className={className} aria-expanded={expanded} onClick={onToggle}>
      <span aria-hidden="true">{expanded ? '▾' : '▸'}</span> {children}
    </button>
  )
}
