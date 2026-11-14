import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppError } from './api/api-error.ts'
import { AuthService } from './api/auth.service.ts'
import { fakeAuth, renderApp } from './test-render.tsx'
import type { TypedSupabaseClient } from './api/supabase.ts'

describe('rotte protette', () => {
  it.each(['/', '/cash-flow', '/budget', '/transactions/new', '/non-esiste'])(
    'senza sessione %s porta al login',
    async (path) => {
      const { router } = renderApp(path, { signedIn: false })
      expect(await screen.findByRole('heading', { level: 1, name: 'Accedi' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/login')
    },
  )

  it('con sessione il login rimanda alla Home', async () => {
    const { router } = renderApp('/login', { signedIn: true })
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('login', () => {
  it('credenziali corrette: si arriva alla Home', async () => {
    const auth = fakeAuth(false)
    const signIn = vi.spyOn(auth, 'signIn')
    const { router } = renderApp('/login', { auth })
    await userEvent.type(await screen.findByLabelText(/Email/), 'io@example.test')
    await userEvent.type(screen.getByLabelText(/Password/), 'segreta-di-prova')
    await userEvent.click(screen.getByRole('button', { name: 'Accedi' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    expect(signIn).toHaveBeenCalledWith('io@example.test', 'segreta-di-prova')
    expect(router.state.location.pathname).toBe('/')
  })

  it('credenziali errate: errore leggibile e si resta sul login', async () => {
    const auth = fakeAuth(false, {
      signIn: async () => {
        throw new AppError('forbidden', 'invalid_credentials', undefined, 'Email o password non corretti.')
      },
    })
    renderApp('/login', { auth })
    await userEvent.type(await screen.findByLabelText(/Email/), 'io@example.test')
    await userEvent.type(screen.getByLabelText(/Password/), 'sbagliata')
    await userEvent.click(screen.getByRole('button', { name: 'Accedi' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o password non corretti.')
    expect(screen.getByRole('heading', { level: 1, name: 'Accedi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accedi' })).toBeEnabled()
  })

  it('campi vuoti: errori accanto ai campi, nessuna chiamata', async () => {
    const auth = fakeAuth(false)
    const signIn = vi.spyOn(auth, 'signIn')
    renderApp('/login', { auth })
    await userEvent.click(await screen.findByRole('button', { name: 'Accedi' }))
    expect(screen.getByLabelText(/Email/)).toBeInvalid()
    expect(screen.getByLabelText(/Password/)).toBeInvalid()
    expect(signIn).not.toHaveBeenCalled()
  })
})

describe('uscita', () => {
  it('dopo "Esci" le rotte sono di nuovo protette', async () => {
    const { router } = renderApp('/cash-flow', { signedIn: true })
    await screen.findByRole('heading', { level: 1, name: 'Flusso di cassa' })
    await userEvent.click(screen.getAllByRole('button', { name: 'Esci' })[0]!)
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(screen.getByRole('heading', { level: 1, name: 'Accedi' })).toBeInTheDocument()
  })
})

describe('AuthService', () => {
  function clientWith(auth: Record<string, unknown>): TypedSupabaseClient {
    return { auth } as unknown as TypedSupabaseClient
  }

  it('traduce invalid_credentials in italiano', async () => {
    const service = new AuthService(() =>
      clientWith({ signInWithPassword: async () => ({ error: { code: 'invalid_credentials', message: 'Invalid login credentials' } }) }),
    )
    await expect(service.signIn('a@b.test', 'x')).rejects.toMatchObject({ message: 'Email o password non corretti.' })
  })

  it('traduce il limite di tentativi', async () => {
    const service = new AuthService(() =>
      clientWith({ signInWithPassword: async () => ({ error: { code: 'over_request_rate_limit', message: 'x' } }) }),
    )
    await expect(service.signIn('a@b.test', 'x')).rejects.toMatchObject({
      message: 'Troppi tentativi. Riprova tra qualche minuto.',
    })
  })

  it('errore di rete: messaggio di connessione', async () => {
    const service = new AuthService(() =>
      clientWith({ signInWithPassword: async () => ({ error: { message: 'Failed to fetch' } }) }),
    )
    await expect(service.signIn('a@b.test', 'x')).rejects.toMatchObject({ kind: 'network' })
  })

  it('getSession restituisce la sessione salvata', async () => {
    const session = { access_token: 't' }
    const service = new AuthService(() => clientWith({ getSession: async () => ({ data: { session }, error: null }) }))
    await expect(service.getSession()).resolves.toBe(session)
  })

  it('signOut e onChange passano da Supabase', async () => {
    const signOut = vi.fn(async () => ({ error: null }))
    const unsubscribe = vi.fn()
    const onAuthStateChange = vi.fn((cb: (e: string, s: unknown) => void) => {
      cb('SIGNED_OUT', null)
      return { data: { subscription: { unsubscribe } } }
    })
    const service = new AuthService(() => clientWith({ signOut, onAuthStateChange }))
    await service.signOut()
    expect(signOut).toHaveBeenCalled()
    const seen = vi.fn()
    service.onChange(seen)()
    expect(seen).toHaveBeenCalledWith(null)
    expect(unsubscribe).toHaveBeenCalled()
  })
})
