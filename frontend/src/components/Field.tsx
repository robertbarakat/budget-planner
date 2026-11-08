import { useId, type ReactNode } from 'react'
import './Field.css'

/** Attributi da applicare al controllo (input, select, textarea) contenuto nel Field. */
export interface FieldControlProps {
  id: string
  className: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
  'aria-required': true | undefined
}

export interface FieldProps {
  label: string
  /** Testo d'aiuto sotto il campo. */
  help?: string
  /** Messaggio d'errore: se presente il campo risulta non valido. */
  error?: string
  required?: boolean
  /** Il controllo, ricevendo gli attributi di accessibilità: `{(p) => <input {...p} />}`. */
  children: (control: FieldControlProps) => ReactNode
}

export default function Field({ label, help, error, required, children }: FieldProps) {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = [error ? errorId : null, help ? helpId : null].filter(Boolean).join(' ')

  return (
    <div className={error ? 'field field--invalid' : 'field'}>
      <label htmlFor={id} className="field__label">
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        className: 'field__control',
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })}
      {help && (
        <p id={helpId} className="field__help">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          <span className="field__error-icon" aria-hidden="true">
            !
          </span>
          {error}
        </p>
      )}
    </div>
  )
}
