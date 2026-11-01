export interface SupabaseEnv {
  url: string
  anonKey: string
}

export class EnvError extends Error {
  readonly missing: string[]

  constructor(missing: string[]) {
    super(
      `Configurazione mancante: ${missing.join(', ')}. ` +
        'Copia .env.example in frontend/.env.local e compila i valori.',
    )
    this.name = 'EnvError'
    this.missing = missing
  }
}

type RawEnv = Record<string, string | undefined>

// Segnala solo i nomi delle variabili mancanti, mai i valori.
export function readSupabaseEnv(env: RawEnv = import.meta.env): SupabaseEnv {
  const url = env.VITE_SUPABASE_URL?.trim()
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()

  const missing: string[] = []
  if (!url) missing.push('VITE_SUPABASE_URL')
  if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  if (!url || !anonKey) throw new EnvError(missing)

  if (!URL.canParse(url)) throw new EnvError(['VITE_SUPABASE_URL (non è un URL valido)'])

  return { url, anonKey }
}
