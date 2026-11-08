import { useState } from 'react'
import Button from './Button.tsx'
import Field from './Field.tsx'
import './YearSelector.css'

export interface YearSelectorProps {
  year: number
  onChange: (year: number) => void
}

const MIN_YEAR = 2000
const MAX_YEAR = 2100

/** Selettore anno: precedente, successivo o digitazione libera (il budget è libero su qualsiasi anno). */
export default function YearSelector({ year, onChange }: YearSelectorProps) {
  // Bozza di testo: permette di digitare un anno cifra per cifra senza scartare i valori intermedi.
  const [draft, setDraft] = useState<{ forYear: number; text: string } | null>(null)
  const text = draft && draft.forYear === year ? draft.text : String(year)
  return (
    <div className="year-selector">
      <Button variant="secondary" aria-label="Anno precedente" disabled={year <= MIN_YEAR} onClick={() => onChange(year - 1)}>
        ‹
      </Button>
      <Field label="Anno">
        {(control) => (
          <input
            {...control}
            type="number"
            inputMode="numeric"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={text}
            onChange={(event) => {
              const typed = event.target.value
              const next = Number(typed)
              setDraft({ forYear: year, text: typed })
              if (typed !== '' && Number.isInteger(next) && next >= MIN_YEAR && next <= MAX_YEAR) onChange(next)
            }}
            onBlur={() => setDraft(null)}
          />
        )}
      </Field>
      <Button variant="secondary" aria-label="Anno successivo" disabled={year >= MAX_YEAR} onClick={() => onChange(year + 1)}>
        ›
      </Button>
    </div>
  )
}
