import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './routes.tsx'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

describe('rotte', () => {
  it.each([
    ['/', 'Home'],
    ['/transactions/new', 'Nuovo movimento'],
    ['/cash-flow', 'Flusso di cassa'],
    ['/macro-areas', 'Macro-aree'],
  ])('%s mostra il titolo "%s"', (path, title) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })

  it('un indirizzo inesistente mostra "Pagina non trovata"', () => {
    renderAt('/non-esiste')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Pagina non trovata' }),
    ).toBeInTheDocument()
  })
})
