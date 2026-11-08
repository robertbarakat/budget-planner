import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Toast } from 'radix-ui'
import { setErrorListener } from '../api/query-client.ts'
import './Snackbar.css'

type SnackbarKind = 'error' | 'success'

interface SnackbarMessage {
  id: number
  kind: SnackbarKind
  message: string
}

interface SnackbarApi {
  showError: (message: string) => void
  showSuccess: (message: string) => void
}

const SnackbarContext = createContext<SnackbarApi | null>(null)

const DURATION_MS: Record<SnackbarKind, number> = { error: 8000, success: 4000 }
// Il segno (icona + parola) accompagna il colore: il significato non è solo cromatico.
const ICON: Record<SnackbarKind, string> = { error: '!', success: '✓' }
const PREFIX: Record<SnackbarKind, string> = { error: 'Errore', success: 'Fatto' }

let nextId = 0

/** Mostra errori e conferme; collega gli errori di query e mutazioni (`setErrorListener`). */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<SnackbarMessage[]>([])

  const show = useCallback((kind: SnackbarKind, message: string) => {
    setMessages((current) => [...current, { id: nextId++, kind, message }])
  }, [])
  const api = useMemo<SnackbarApi>(
    () => ({ showError: (m) => show('error', m), showSuccess: (m) => show('success', m) }),
    [show],
  )

  useEffect(() => setErrorListener((error) => show('error', error.message)), [show])

  const remove = (id: number) => setMessages((current) => current.filter((m) => m.id !== id))

  return (
    <SnackbarContext.Provider value={api}>
      <Toast.Provider label="Notifica" swipeDirection="up">
        {children}
        {messages.map((m) => (
          <Toast.Root
            key={m.id}
            // Gli errori interrompono la lettura (alert); le conferme aspettano (status).
            type={m.kind === 'error' ? 'foreground' : 'background'}
            duration={DURATION_MS[m.kind]}
            onOpenChange={(open) => {
              if (!open) remove(m.id)
            }}
            className={`snackbar snackbar--${m.kind}`}
          >
            <span className="snackbar__icon" aria-hidden="true">
              {ICON[m.kind]}
            </span>
            <Toast.Description className="snackbar__message">
              <span className="visually-hidden">{PREFIX[m.kind]}: </span>
              {m.message}
            </Toast.Description>
            <Toast.Close className="snackbar__close" aria-label="Chiudi notifica">
              <span aria-hidden="true">×</span>
            </Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className="snackbar__viewport" label="Notifiche ({hotkey})" />
      </Toast.Provider>
    </SnackbarContext.Provider>
  )
}

export function useSnackbar(): SnackbarApi {
  const value = useContext(SnackbarContext)
  if (!value) throw new Error('useSnackbar va usato dentro SnackbarProvider')
  return value
}
