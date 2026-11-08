import { useId } from 'react'
import { RadioGroup } from 'radix-ui'
import './ChoiceChips.css'

export interface ChoiceOption {
  value: string
  label: string
}

export interface ChoiceChipsProps {
  /** Etichetta del gruppo (letta dai lettori di schermo e mostrata sopra). */
  label: string
  options: ChoiceOption[]
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  /** `true` per un controllo segmentato a tutta larghezza (es. Spesa / Entrata). */
  segmented?: boolean
}

/** Scelta singola a pulsanti, con Radix RadioGroup: frecce da tastiera, selezione con segno ✓ oltre al colore. */
export default function ChoiceChips({ label, options, value, onChange, error, required, segmented }: ChoiceChipsProps) {
  const id = useId()
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  return (
    <div className={error ? 'choice choice--invalid' : 'choice'}>
      <span id={labelId} className="choice__label">
        {label}
        {required && (
          <span className="choice__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </span>
      <RadioGroup.Root
        className={segmented ? 'choice__group choice__group--segmented' : 'choice__group'}
        value={value}
        onValueChange={onChange}
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        aria-required={required ? true : undefined}
      >
        {options.map((option) => (
          <RadioGroup.Item key={option.value} value={option.value} className="choice__item">
            <RadioGroup.Indicator className="choice__check" aria-hidden="true">
              ✓
            </RadioGroup.Indicator>
            {option.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      {error && (
        <p id={errorId} className="choice__error">
          <span className="choice__error-icon" aria-hidden="true">
            !
          </span>
          {error}
        </p>
      )}
    </div>
  )
}
