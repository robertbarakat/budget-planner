import { useState } from 'react'
import { formatDays, readDays } from '../lib/worked-days.ts'
import './WorkedDaysCell.css'

export interface WorkedDaysCellProps {
  /** Es. "Giorni di Cliente A, Marzo 2026". */
  label: string
  /** Valore salvato, o `null` se non c'è. */
  value: number | null
  /** Valore valido: salvare. `null` = svuotato (eliminare). Può lanciare: il testo digitato resta. */
  onCommit: (days: number | null) => void | Promise<void>
  /** Segnala un testo non valido (es. con la snackbar). */
  onInvalid: (message: string) => void
}

/** Cella modificabile in linea: si salva uscendo dal campo o con Invio, solo se il valore è cambiato e valido. */
export default function WorkedDaysCell({ label, value, onCommit, onInvalid }: WorkedDaysCellProps) {
  const saved = value === null ? '' : formatDays(value)
  const [text, setText] = useState(saved)
  const [invalid, setInvalid] = useState(false)

  async function commit() {
    if (text.trim() === saved) {
      setText(saved)
      setInvalid(false)
      return
    }
    const input = readDays(text)
    if (input.kind === 'error') {
      setInvalid(true)
      onInvalid(input.message)
      return
    }
    setInvalid(false)
    try {
      await onCommit(input.kind === 'empty' ? null : input.value)
    } catch {
      // L'errore arriva dalla snackbar; il testo resta per riprovare.
    }
  }

  return (
    <input
      className="worked-days-cell"
      type="text"
      inputMode="decimal"
      aria-label={label}
      aria-invalid={invalid || undefined}
      value={text}
      placeholder="–"
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}
