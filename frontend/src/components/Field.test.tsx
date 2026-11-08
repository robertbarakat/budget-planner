import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Field from './Field.tsx'

describe('Field', () => {
  it('collega l\'etichetta al campo: cliccando l\'etichetta il campo prende il focus', async () => {
    render(<Field label="Importo">{(p) => <input {...p} />}</Field>)
    const input = screen.getByLabelText('Importo')
    await userEvent.click(screen.getByText('Importo'))
    expect(input).toHaveFocus()
  })

  it('con un errore mostra il testo, aria-invalid e aria-describedby', () => {
    render(
      <Field label="Importo" error="Inserisci un importo maggiore di zero">
        {(p) => <input {...p} />}
      </Field>,
    )
    const input = screen.getByLabelText('Importo')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const message = screen.getByText('Inserisci un importo maggiore di zero')
    expect(message).toBeInTheDocument()
    expect(input.getAttribute('aria-describedby')).toContain(message.id)
    expect(input).toHaveAccessibleDescription('Inserisci un importo maggiore di zero')
  })

  it('senza errore non è non valido e mostra l\'aiuto', () => {
    render(
      <Field label="Commento" help="Facoltativo">
        {(p) => <textarea {...p} />}
      </Field>,
    )
    const field = screen.getByLabelText('Commento')
    expect(field).not.toHaveAttribute('aria-invalid')
    expect(field).toHaveAccessibleDescription('Facoltativo')
  })

  it('funziona con select e segna i campi obbligatori', () => {
    render(
      <Field label="Conto" required>
        {(p) => (
          <select {...p}>
            <option>Bancoposta</option>
          </select>
        )}
      </Field>,
    )
    expect(screen.getByRole('combobox', { name: /Conto/ })).toBeRequired()
  })
})
