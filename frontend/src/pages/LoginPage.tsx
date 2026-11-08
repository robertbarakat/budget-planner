import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useSession } from '../api/auth.queries.tsx'
import { toAppError } from '../api/api-error.ts'
import Button from '../components/Button.tsx'
import Field from '../components/Field.tsx'
import { paths } from '../paths.ts'
import './LoginPage.css'

export default function LoginPage() {
  const { status, signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  if (status === 'signedIn') return <Navigate to={paths.home} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) errors.email = 'Inserisci l\'email.'
    if (!password) errors.password = 'Inserisci la password.'
    setFieldErrors(errors)
    setError(null)
    if (errors.email || errors.password) return

    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch (e) {
      setError(toAppError(e).message)
      setLoading(false)
    }
  }

  return (
    <main className="login">
      <form className="login__card" onSubmit={onSubmit} noValidate>
        <h1 className="login__title">Accedi</h1>
        <p className="login__intro">Budget e cassa</p>
        <Field label="Email" required error={fieldErrors.email}>
          {(p) => (
            <input
              {...p}
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Field label="Password" required error={fieldErrors.password}>
          {(p) => (
            <input
              {...p}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        {error && (
          <p role="alert" className="login__error">
            <span className="login__error-icon" aria-hidden="true">
              !
            </span>
            {error}
          </p>
        )}
        <Button type="submit" loading={loading}>
          Accedi
        </Button>
      </form>
    </main>
  )
}
