/** Categorie di errore che l'interfaccia sa spiegare all'utente. */
export type AppErrorKind =
  | 'not_found'
  | 'duplicate'
  | 'in_use'
  | 'forbidden'
  | 'invalid'
  | 'network'
  | 'unknown'

const MESSAGES: Record<AppErrorKind, string> = {
  not_found: 'Elemento non trovato.',
  duplicate: 'Esiste già un elemento con gli stessi dati.',
  in_use: 'Operazione non possibile: l\'elemento è collegato ad altri dati. Archivialo invece di eliminarlo.',
  forbidden: 'Non hai i permessi per questa operazione. Prova ad accedere di nuovo.',
  invalid: 'I dati inseriti non sono validi.',
  network: 'Connessione assente o server non raggiungibile. Riprova tra poco.',
  unknown: 'Qualcosa è andato storto. Riprova.',
}

/** Errore applicativo: messaggio in italiano per l'utente, causa originale per i log (in inglese). */
export class AppError extends Error {
  readonly kind: AppErrorKind
  readonly code: string | null
  override readonly cause: unknown

  constructor(kind: AppErrorKind, code: string | null = null, cause: unknown = undefined) {
    super(MESSAGES[kind])
    this.name = 'AppError'
    this.kind = kind
    this.code = code
    this.cause = cause
  }
}

/** Forma minima dell'errore restituito da Supabase (PostgrestError) che ci serve. */
export interface SupabaseErrorLike {
  code?: string
  message?: string
}

function kindFromCode(code: string | undefined, message: string | undefined): AppErrorKind {
  switch (code) {
    case '23503':
      return 'in_use'
    case '23505':
      return 'duplicate'
    case '42501':
      return 'forbidden'
    case 'PGRST116':
    case 'P0002':
      return 'not_found'
    case '22023':
    case '23502':
    case '23514':
    case '22P02':
      return 'invalid'
    case 'PGRST301':
      return 'forbidden'
    default:
      break
  }
  if (!code && message && /fetch|network|failed to/i.test(message)) return 'network'
  return 'unknown'
}

/** Converte un errore di Supabase (o un'eccezione di rete) in AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (typeof error === 'object' && error !== null) {
    const { code, message } = error as SupabaseErrorLike
    return new AppError(kindFromCode(code, message), code ?? null, error)
  }
  return new AppError('unknown', null, error)
}
