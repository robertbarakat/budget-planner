import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('mostra il titolo senza variabili d\'ambiente di Supabase', () => {
    render(<App />)
    expect(screen.getByText('Budget Planner')).toBeInTheDocument()
  })
})
