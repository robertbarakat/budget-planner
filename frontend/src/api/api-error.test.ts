import { describe, expect, it } from 'vitest'
import { AppError, toAppError } from './api-error.ts'

describe('toAppError', () => {
  it.each([
    ['23503', 'in_use', 'collegato'],
    ['23505', 'duplicate', 'Esiste già'],
    ['42501', 'forbidden', 'permessi'],
    ['PGRST116', 'not_found', 'non trovato'],
    ['P0002', 'not_found', 'non trovato'],
    ['22023', 'invalid', 'non sono validi'],
    ['23514', 'invalid', 'non sono validi'],
  ] as const)('codice %s -> %s con messaggio in italiano', (code, kind, fragment) => {
    const error = toAppError({ code, message: 'db message' })
    expect(error).toBeInstanceOf(AppError)
    expect(error.kind).toBe(kind)
    expect(error.code).toBe(code)
    expect(error.message).toContain(fragment)
  })

  it('un errore di rete diventa network', () => {
    expect(toAppError(new TypeError('Failed to fetch')).kind).toBe('network')
  })

  it('un errore sconosciuto diventa unknown e conserva la causa', () => {
    const cause = { code: 'XX000', message: 'boom' }
    const error = toAppError(cause)
    expect(error.kind).toBe('unknown')
    expect(error.cause).toBe(cause)
  })

  it('un AppError passa invariato', () => {
    const original = new AppError('invalid')
    expect(toAppError(original)).toBe(original)
  })
})
