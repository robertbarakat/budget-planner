import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { SessionProvider } from './api/auth.queries.tsx'
import type { AuthApi } from './api/auth.service.ts'
import { SnackbarProvider } from './components/Snackbar.tsx'
import { routes } from './routes.tsx'

/** Servizio di accesso simulato per i test; `signedIn` imposta la sessione di partenza. */
export function fakeAuth(signedIn: boolean, overrides: Partial<AuthApi> = {}): AuthApi {
  let current: Session | null = signedIn ? ({ access_token: 'test' } as Session) : null
  const listeners = new Set<(s: Session | null) => void>()
  const emit = () => listeners.forEach((l) => l(current))
  return {
    getSession: async () => current,
    onChange: (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    signIn: async () => {
      current = { access_token: 'test' } as Session
      emit()
    },
    signOut: async () => {
      current = null
      emit()
    },
    ...overrides,
  }
}

/** Mostra l'app alla rotta indicata, con o senza sessione. */
export function renderApp(path: string, options: { signedIn?: boolean; auth?: AuthApi } = {}) {
  const auth = options.auth ?? fakeAuth(options.signedIn ?? true)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  // Le pagine che leggono dati falliscono senza Supabase (configurazione assente nei test): i titoli restano.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        <SessionProvider service={auth}>
          <RouterProvider router={router} />
        </SessionProvider>
      </SnackbarProvider>
    </QueryClientProvider>,
  )
  return { ...utils, router, auth }
}
