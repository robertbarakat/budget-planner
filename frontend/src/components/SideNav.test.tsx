import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../test-render.tsx'

describe('SideNav', () => {
  it('ha le voci della barra mobile più Fiscale (solo web) e segna quella attiva', async () => {
    renderApp('/budget')
    await screen.findByRole('heading', { level: 1 })
    const side = within(document.querySelector<HTMLElement>('.side-nav')!)
    const nav = side.getByRole('navigation', { name: 'Navigazione principale' })
    const links = within(nav).getAllByRole('link').map((l) => l.textContent)
    expect(links).toEqual(['Home', 'Movimenti', 'Flusso di cassa', 'Budget', 'Fiscale', 'Impostazioni'])
    const mobile = within(document.querySelector<HTMLElement>('.mobile-nav')!).getAllByRole('link', { name: /^(?!Nuovo)/ }).map((l) => l.textContent)
    expect(mobile).not.toContain('Fiscale')
    expect(within(nav).getByRole('link', { name: 'Budget' })).toHaveAttribute('aria-current', 'page')
    expect(side.getByRole('link', { name: 'Nuovo movimento' })).toBeInTheDocument()
  })
})
