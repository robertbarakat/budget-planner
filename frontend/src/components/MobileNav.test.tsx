import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '../routes.tsx'

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

describe('MobileNav', () => {
  it('mostra le voci e il pulsante nuovo movimento', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Navigazione principale' })
    expect(nav).toHaveTextContent('Home')
    expect(nav).toHaveTextContent('Flusso di cassa')
    expect(nav).toHaveTextContent('Macro-aree')
    expect(screen.getByRole('link', { name: 'Nuovo movimento' })).toHaveAttribute(
      'href',
      '/transactions/new',
    )
  })

  it('la voce attiva ha aria-current e segue la rotta', async () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('link', { name: 'Flusso di cassa' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Flusso di cassa' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Flusso di cassa' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('il pulsante porta a Nuovo movimento', async () => {
    renderAt('/')
    await userEvent.click(screen.getByRole('link', { name: 'Nuovo movimento' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Nuovo movimento' })).toBeInTheDocument()
  })
})
