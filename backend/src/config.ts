export interface Config {
  supabaseUrl: string
  supabaseServiceRoleKey: string
}

export class ConfigError extends Error {
  readonly missing: string[]

  constructor(missing: string[]) {
    super(`Missing required environment variables: ${missing.join(', ')}`)
    this.name = 'ConfigError'
    this.missing = missing
  }
}

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const

// Reports only the names of missing variables, never their values.
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const missing = REQUIRED.filter((name) => !env[name]?.trim())
  if (missing.length > 0) throw new ConfigError(missing)

  return {
    supabaseUrl: env.SUPABASE_URL!.trim(),
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  }
}
