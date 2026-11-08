import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'destructive'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Operazione in corso: il pulsante non risponde ai click e mostra un indicatore. */
  loading?: boolean
}

export default function Button({
  variant = 'primary',
  loading = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = ['button', `button--${variant}`, loading ? 'button--loading' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      // `disabled` nativo: blocca click e tastiera.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="button__spinner" aria-hidden="true" />}
      <span className="button__label">{children}</span>
      {loading && <span className="visually-hidden"> Operazione in corso</span>}
    </button>
  )
}
