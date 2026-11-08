import { StrictMode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'
import { EnvError } from './api/env.ts'
import { queryClient } from './api/query-client.ts'
import { getSupabase } from './api/supabase.ts'

function startupError(): string | null {
  try {
    getSupabase()
    return null
  } catch (e) {
    if (e instanceof EnvError) return e.message
    throw e
  }
}

const error = startupError()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {error ? (
      <p role="alert">{error}</p>
    ) : (
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )}
  </StrictMode>,
)
