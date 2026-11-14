import { useState } from 'react'
import { useSession } from '../api/auth.queries.tsx'
import { toAppError } from '../api/api-error.ts'
import Button from './Button.tsx'
import { LogoutIcon } from './icons.tsx'

// Pulsante di uscita. L'errore (raro) resta visibile accanto al pulsante.
export default function SignOutButton({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  const { signOut } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onClick() {
    setLoading(true)
    setError(null)
    try {
      await signOut()
    } catch (e) {
      setError(toAppError(e).message)
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="secondary" className={className} loading={loading} onClick={onClick} title="Esci" aria-label="Esci">
        {iconOnly ? <LogoutIcon /> : 'Esci'}
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  )
}
