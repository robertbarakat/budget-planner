import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './ActionBar.css'

export const ACTION_BAR_SLOT_ID = 'action-bar-slot'

/** Fascia in basso con l'azione principale, sempre lo stesso sfondo e posto.
 *  Su mobile finisce nello slot della barra di navigazione (fuori dall'area che scorre); senza slot visibile resta dov'è. */
export default function ActionBar({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const el = document.getElementById(ACTION_BAR_SLOT_ID)
    setSlot(el && el.offsetParent !== null ? el : null)
  }, [])
  const bar = <div className="action-bar">{children}</div>
  return slot ? createPortal(bar, slot) : bar
}
