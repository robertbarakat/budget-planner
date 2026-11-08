import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../test-render.tsx'

async function renderAt(path: string) {
  renderApp(path)
  await screen.findByRole('heading', { level: 1 })
}

// In jsdom il CSS non c'è: barra mobile e laterale sono entrambe nel DOM, quindi si limita la ricerca.
function mobileNav() {
  return within(document.querySelector<HTMLElement>('.mobile-nav')!)
}

describe('MobileNav', () => {
  it('mostra le voci e il pulsante nuovo movimento', async () => {
    await renderAt('/')
    const nav = mobileNav().getByRole('navigation', { name: 'Navigazione principale' })
    expect(nav).toHaveTextContent('Home')
    expect(nav).toHaveTextContent('Flusso di cassa')
    expect(nav).toHaveTextContent('Macro-aree')
    expect(nav).toHaveTextContent('Impostazioni')
    expect(mobileNav().getByRole('link', { name: 'Nuovo movimento' })).toHaveAttribute(
      'href',
      '/transactions/new',
    )
  })

  it('la voce attiva ha aria-current e segue la rotta', async () => {
    await renderAt('/')
    expect(mobileNav().getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(mobileNav().getByRole('link', { name: 'Flusso di cassa' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Flusso di cassa' })).toBeInTheDocument()
    expect(mobileNav().getByRole('link', { name: 'Flusso di cassa' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(mobileNav().getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('il pulsante porta a Nuovo movimento', async () => {
    await renderAt('/')
    await userEvent.click(mobileNav().getByRole('link', { name: 'Nuovo movimento' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Nuovo movimento' })).toBeInTheDocument()
  })
})

describe('MobileNav nella schermata Nuovo movimento', () => {
  it('nasconde il pulsante "nuovo movimento" per non coprire il salvataggio', async () => {
    await renderAt('/transactions/new')
    expect(mobileNav().queryByRole('link', { name: 'Nuovo movimento' })).not.toBeInTheDocument()
  })
})
