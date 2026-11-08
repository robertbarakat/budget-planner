import { render, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '../routes.tsx'

describe('SideNav', () => {
  it('ha le stesse voci della barra mobile e segna quella attiva', () => {
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/macro-areas'] })} />)
    const side = within(document.querySelector<HTMLElement>('.side-nav')!)
    const nav = side.getByRole('navigation', { name: 'Navigazione principale' })
    const links = within(nav).getAllByRole('link').map((l) => l.textContent)
    expect(links).toEqual(['Home', 'Flusso di cassa', 'Macro-aree'])
    expect(within(nav).getByRole('link', { name: 'Macro-aree' })).toHaveAttribute('aria-current', 'page')
    expect(side.getByRole('link', { name: 'Nuovo movimento' })).toBeInTheDocument()
  })
})
