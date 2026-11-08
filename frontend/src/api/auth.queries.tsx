import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { queryClient } from './query-client.ts'
import { authService, type AuthApi } from './auth.service.ts'

export type SessionStatus = 'loading' | 'signedIn' | 'signedOut'

interface SessionValue {
  status: SessionStatus
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

/** Tiene la sessione di Supabase: la ripristina al caricamento e la segue nei cambi. */
export function SessionProvider({ service = authService, children }: { service?: AuthApi; children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')

  useEffect(() => {
    let active = true
    const apply = (session: unknown) => {
      if (!active) return
      setStatus(session ? 'signedIn' : 'signedOut')
      // Dopo l'uscita nessun dato dell'utente resta in cache.
      if (!session) queryClient.clear()
    }
    const unsubscribe = service.onChange(apply)
    service.getSession().then(apply, () => apply(null))
    return () => {
      active = false
      unsubscribe()
    }
  }, [service])

  const signIn = useCallback((email: string, password: string) => service.signIn(email, password), [service])
  const signOut = useCallback(() => service.signOut(), [service])
  const value = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession va usato dentro SessionProvider')
  return value
}
