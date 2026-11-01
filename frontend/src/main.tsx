import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EnvError } from './api/env.ts'
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
    {error ? <p role="alert">{error}</p> : <App />}
  </StrictMode>,
)
