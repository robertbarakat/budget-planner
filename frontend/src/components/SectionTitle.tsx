import type { ComponentProps } from 'react'
import './SectionTitle.css'

/** Titolo di una scheda o di un gruppo: pillola verde chiara, uguale ovunque. */
export default function SectionTitle({ className, ...rest }: ComponentProps<'h2'>) {
  return <h2 className={['section-title', className].filter(Boolean).join(' ')} {...rest} />
}
