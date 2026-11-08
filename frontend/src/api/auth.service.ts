import type { Session } from '@supabase/supabase-js'
import { AppError, toAppError } from './api-error.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'

/** Interfaccia usata dalla sessione dell'app (sostituibile nei test). */
export interface AuthApi {
  getSession(): Promise<Session | null>
  /** Si iscrive ai cambi di sessione; restituisce la funzione per annullare. */
  onChange(callback: (session: Session | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
}

/** Area "accesso": login email/password dell'utente unico (docs/auth.md). */
export class AuthService implements AuthApi {
  private readonly getClient: () => TypedSupabaseClient

  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    this.getClient = getClient
  }

  async getSession(): Promise<Session | null> {
    const { data, error } = await this.getClient().auth.getSession()
    if (error) throw toAppError(error)
    return data.session
  }

  onChange(callback: (session: Session | null) => void): () => void {
    const { data } = this.getClient().auth.onAuthStateChange((_event, session) => callback(session))
    return () => data.subscription.unsubscribe()
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.getClient().auth.signInWithPassword({ email, password })
    if (!error) return
    const code = (error as { code?: string }).code
    if (code === 'invalid_credentials') {
      throw new AppError('forbidden', code, error, 'Email o password non corretti.')
    }
    if (code === 'over_request_rate_limit') {
      throw new AppError('unknown', code, error, 'Troppi tentativi. Riprova tra qualche minuto.')
    }
    throw toAppError(error)
  }

  async signOut(): Promise<void> {
    const { error } = await this.getClient().auth.signOut()
    if (error) throw toAppError(error)
  }
}

export const authService = new AuthService()
