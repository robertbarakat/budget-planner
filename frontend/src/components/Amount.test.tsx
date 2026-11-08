import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Amount from './Amount.tsx'

const nbsp = ' '

describe('Amount', () => {
  it('una spesa mostra il segno meno e il colore negativo', () => {
    render(<Amount value={-42} />)
    const el = screen.getByText(/42,00/)
    expect(el.textContent).toBe(`−42,00${nbsp}€`)
    expect(el).toHaveClass('amount--negative')
    expect(el).toHaveClass('num')
  })

  it('una spesa si distingue da un\'entrata senza il colore (il segno c\'è)', () => {
    render(
      <>
        <Amount value={-199.49} />
        <Amount value={1500} explicitPlus />
      </>,
    )
    expect(screen.getByText(/199,49/)).toHaveTextContent('−')
    expect(screen.getByText(/1\.500,00/)).toHaveTextContent('+')
  })

  it('mostra 1.234,50 € per 1234.5', () => {
    render(<Amount value={1234.5} />)
    expect(screen.getByText(/1\.234,50/).textContent).toBe(`1.234,50${nbsp}€`)
  })

  it('lo zero non ha segno né colore', () => {
    render(<Amount value={0} explicitPlus />)
    const el = screen.getByText(/0,00/)
    expect(el.textContent).toBe(`0,00${nbsp}€`)
    expect(el).not.toHaveClass('amount--negative')
    expect(el).not.toHaveClass('amount--positive')
  })

  it('con colored=false non colora ma mantiene il segno', () => {
    render(<Amount value={-5} colored={false} />)
    const el = screen.getByText(/5,00/)
    expect(el).not.toHaveClass('amount--negative')
    expect(el).toHaveTextContent('−')
  })
})
