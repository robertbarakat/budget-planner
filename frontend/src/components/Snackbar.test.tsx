import { QueryClient } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AppError } from '../api/api-error.ts'
import { createQueryClient } from '../api/query-client.ts'
import { SnackbarProvider, useSnackbar } from './Snackbar.tsx'

function Trigger() {
  const { showError, showSuccess } = useSnackbar()
  return (
    <>
      <button onClick={() => showError('Qualcosa non va.')}>errore</button>
      <button onClick={() => showSuccess('Movimento salvato.')}>conferma</button>
    </>
  )
}

describe('Snackbar', () => {
  it('showError mostra il messaggio con prefisso e icona, non solo il colore', async () => {
    render(<SnackbarProvider><Trigger /></SnackbarProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'errore' }))
    const toast = await screen.findByText(/Qualcosa non va\./)
    expect(toast).toHaveTextContent('Errore: Qualcosa non va.')
    expect(toast.closest('.snackbar')).toHaveClass('snackbar--error')
    expect(toast.closest('.snackbar')!.querySelector('.snackbar__icon')).toHaveTextContent('!')
  })

  it('showSuccess mostra una conferma con segno di spunta', async () => {
    render(<SnackbarProvider><Trigger /></SnackbarProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'conferma' }))
    const toast = await screen.findByText(/Movimento salvato\./)
    expect(toast).toHaveTextContent('Fatto: Movimento salvato.')
    expect(toast.closest('.snackbar')!.querySelector('.snackbar__icon')).toHaveTextContent('✓')
  })

  it('si chiude con il pulsante "Chiudi notifica"', async () => {
    render(<SnackbarProvider><Trigger /></SnackbarProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'errore' }))
    await screen.findByText(/Qualcosa non va\./)
    await userEvent.click(screen.getByRole('button', { name: 'Chiudi notifica' }))
    await new Promise((r) => setTimeout(r, 150))
    expect(screen.queryByText(/Qualcosa non va\./)).not.toBeInTheDocument()
  })

  it('un errore di mutazione arriva in snackbar con il messaggio di AppError', async () => {
    const client: QueryClient = createQueryClient()
    render(<SnackbarProvider><Trigger /></SnackbarProvider>)
    await act(async () => {
      await client
        .getMutationCache()
        .build(client, {
          mutationFn: async () => {
            throw new AppError('duplicate')
          },
        })
        .execute(undefined)
        .catch(() => undefined)
    })
    expect(await screen.findByText(/Esiste già un elemento con gli stessi dati\./)).toBeInTheDocument()
  })

  it('un errore di query arriva in snackbar', async () => {
    const client = createQueryClient()
    render(<SnackbarProvider><Trigger /></SnackbarProvider>)
    await act(async () => {
      await client
        .fetchQuery({
          queryKey: ['x'],
          retry: false,
          queryFn: async () => {
            throw new AppError('forbidden')
          },
        })
        .catch(() => undefined)
    })
    expect(await screen.findByText(/Non hai i permessi/)).toBeInTheDocument()
  })

  it('useSnackbar fuori dal provider lancia un errore chiaro', () => {
    const spy = () => render(<Trigger />)
    expect(spy).toThrow('SnackbarProvider')
  })
})
