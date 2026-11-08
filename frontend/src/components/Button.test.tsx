import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button.tsx'

describe('Button', () => {
  it('scatta al click e con la tastiera', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Salva</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Salva' }))
    screen.getByRole('button').focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('disabilitato non scatta né al click né da tastiera', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Salva
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Salva' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    button.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('in caricamento non scatta ed è annunciato come occupato', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Salva
      </Button>,
    )
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveTextContent('Operazione in corso')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('ha le tre varianti e type="button" di default', () => {
    render(
      <>
        <Button>Primaria</Button>
        <Button variant="secondary">Secondaria</Button>
        <Button variant="destructive">Elimina</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Primaria' })).toHaveClass('button--primary')
    expect(screen.getByRole('button', { name: 'Secondaria' })).toHaveClass('button--secondary')
    expect(screen.getByRole('button', { name: 'Elimina' })).toHaveClass('button--destructive')
    expect(screen.getByRole('button', { name: 'Primaria' })).toHaveAttribute('type', 'button')
  })
})
