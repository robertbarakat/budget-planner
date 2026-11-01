import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig } from './config.ts'

describe('loadConfig', () => {
  it('legge le variabili obbligatorie', () => {
    const config = loadConfig({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
    expect(config).toEqual({ supabaseUrl: 'https://x.supabase.co', supabaseServiceRoleKey: 'k' })
  })

  it('elenca i nomi delle variabili mancanti senza stampare valori', () => {
    const secret = 'super-secret-value'
    try {
      loadConfig({ SUPABASE_SERVICE_ROLE_KEY: secret })
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError)
      expect((e as ConfigError).missing).toEqual(['SUPABASE_URL'])
      expect((e as Error).message).toContain('SUPABASE_URL')
      expect((e as Error).message).not.toContain(secret)
    }
  })

  it('considera mancante una variabile vuota', () => {
    expect(() => loadConfig({ SUPABASE_URL: ' ', SUPABASE_SERVICE_ROLE_KEY: 'k' })).toThrow(ConfigError)
  })
})
