import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from './test-render.tsx'

describe('rotte', () => {
  it.each([
    ['/', 'Home'],
    ['/transactions/new', 'Nuovo movimento'],
    ['/cash-flow', 'Flusso di cassa'],
    ['/budget', 'Budget'],
  ])('%s mostra il titolo "%s"', async (path, title) => {
    renderApp(path)
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })

  it('un indirizzo inesistente mostra "Pagina non trovata"', async () => {
    renderApp('/non-esiste')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pagina non trovata' }),
    ).toBeInTheDocument()
  })
})
