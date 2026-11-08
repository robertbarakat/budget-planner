import { Navigate, Outlet } from 'react-router'
import { useSession } from '../api/auth.queries.tsx'
import { paths } from '../paths.ts'

// Rotte protette: senza sessione si va al login.
export default function RequireAuth() {
  const { status } = useSession()
  if (status === 'loading') {
    return (
      <p role="status" className="auth-loading">
        Caricamento…
      </p>
    )
  }
  if (status === 'signedOut') return <Navigate to={paths.login} replace />
  return <Outlet />
}
