import { StrictMode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import '@fontsource/ibm-plex-mono/latin-600.css'
import './styles/tokens.css'
import './styles/base.css'
import { EnvError } from './api/env.ts'
import { queryClient } from './api/query-client.ts'
import { getSupabase } from './api/supabase.ts'
import { routes } from './routes.tsx'

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
const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {error ? (
      <p role="alert">{error}</p>
    ) : (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )}
  </StrictMode>,
)
