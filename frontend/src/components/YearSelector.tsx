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
            value={year}
            onChange={(event) => {
              const next = Number(event.target.value)
              if (Number.isInteger(next) && next >= MIN_YEAR && next <= MAX_YEAR) onChange(next)
            }}
          />
        )}
      </Field>
      <Button variant="secondary" aria-label="Anno successivo" disabled={year >= MAX_YEAR} onClick={() => onChange(year + 1)}>
        ›
      </Button>
    </div>
  )
}
