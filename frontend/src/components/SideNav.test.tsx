import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../test-render.tsx'

describe('SideNav', () => {
  it('ha le stesse voci della barra mobile e segna quella attiva', async () => {
    renderApp('/macro-areas')
    await screen.findByRole('heading', { level: 1 })
    const side = within(document.querySelector<HTMLElement>('.side-nav')!)
    const nav = side.getByRole('navigation', { name: 'Navigazione principale' })
    const links = within(nav).getAllByRole('link').map((l) => l.textContent)
    expect(links).toEqual(['Home', 'Flusso di cassa', 'Macro-aree', 'Impostazioni'])
    expect(within(nav).getByRole('link', { name: 'Macro-aree' })).toHaveAttribute('aria-current', 'page')
    expect(side.getByRole('link', { name: 'Nuovo movimento' })).toBeInTheDocument()
  })
})
