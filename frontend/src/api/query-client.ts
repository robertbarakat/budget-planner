import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { AppError, toAppError } from './api-error.ts'

type ErrorListener = (error: AppError) => void

let listener: ErrorListener | null = null

/**
 * Registra chi mostra gli errori all'utente (la snackbar). Restituisce la funzione per annullare.
 * Un solo ascoltatore alla volta: l'ultimo registrato vince.
 */
export function setErrorListener(next: ErrorListener | null): () => void {
  listener = next
  return () => {
    if (listener === next) listener = null
  }
}

function notify(error: unknown): void {
  listener?.(toAppError(error))
}

/** Solo i problemi di rete valgono un nuovo tentativo; gli altri errori non cambiano riprovando. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < 2 && toAppError(error).kind === 'network'
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: notify }),
    mutationCache: new MutationCache({ onError: notify }),
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  })
}

/** Client globale dell'app. */
export const queryClient = createQueryClient()
