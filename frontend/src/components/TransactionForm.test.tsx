import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TransactionForm, { type CategoryGroup } from './TransactionForm.tsx'

const accounts = [
  { id: 1, name: 'Conto A' },
  { id: 2, name: 'Conto B' },
]
const groups: CategoryGroup[] = [
  { budgetItemId: 10, budgetItemName: 'Food', macroAreaName: 'Svago', kind: 'expense', categories: [{ id: 100, name: 'Pizza' }, { id: 101, name: 'Bar' }] },
  { budgetItemId: 11, budgetItemName: 'Utenze', macroAreaName: 'Casa', kind: 'expense', categories: [{ id: 110, name: 'Luce' }] },
  { budgetItemId: 20, budgetItemName: 'Stipendio', macroAreaName: 'Ricavi', kind: 'income', categories: [{ id: 200, name: 'Cliente X' }] },
]

async function pick(name: string) {
  await userEvent.click(screen.getByLabelText(/Categoria/))
  await userEvent.click(screen.getByRole('option', { name: new RegExp(`^${name}`) }))
}
const optionNames = () => screen.getAllByRole('option').map((o) => o.firstChild?.textContent ?? '')

function setup(onSubmit = vi.fn()) {
  render(<TransactionForm accounts={accounts} categoryGroups={groups} onSubmit={onSubmit} />)
  return onSubmit
}

describe('TransactionForm', () => {
  it('parte da spesa, con la data di oggi e senza scelte fatte', () => {
    setup()
    expect(screen.getByRole('radio', { name: /Spesa/ })).toBeChecked()
    expect(screen.getByLabelText(/Data/)).toHaveValue(new Date().toLocaleDateString('sv-SE'))
    expect(screen.getByText('Si sceglie con la categoria')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salva spesa' })).toBeInTheDocument()
  })

  it('con importo vuoto mostra l\'errore sotto il campo e non salva', async () => {
    const onSubmit = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Salva spesa' }))
    expect(screen.getByLabelText(/Importo/)).toBeInvalid()
    expect(screen.getByText("Inserisci l'importo.")).toBeInTheDocument()
    expect(screen.getByText('Scegli il conto.')).toBeInTheDocument()
    expect(screen.getByText('Scegli la categoria.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it.each(['0', '-3'])('con importo %s (≤ 0) mostra l\'errore e non salva', async (amount) => {
    const onSubmit = setup()
    await userEvent.type(screen.getByLabelText(/Importo/), amount)
    await userEvent.click(screen.getByRole('radio', { name: /Conto A/ }))
    await pick('Pizza')
    await userEvent.click(screen.getByRole('button', { name: 'Salva spesa' }))
    expect(screen.getByText("L'importo deve essere maggiore di zero.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('l\'errore sparisce quando si corregge il campo', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Salva spesa' }))
    await userEvent.type(screen.getByLabelText(/Importo/), '5')
    expect(screen.queryByText("Inserisci l'importo.")).not.toBeInTheDocument()
  })

  it('cambiando categoria cambia la voce di budget mostrata', async () => {
    setup()
    await pick('Pizza')
    expect(screen.getByText('Food · Svago')).toBeInTheDocument()
    await pick('Luce')
    expect(screen.getByText('Utenze · Casa')).toBeInTheDocument()
    expect(screen.queryByText('Food · Svago')).not.toBeInTheDocument()
  })

  it('le categorie sono raggruppate per voce e filtrate per tipo: spesa e entrata non si mescolano', async () => {
    setup()
    await userEvent.click(screen.getByLabelText(/Categoria/))
    expect(optionNames()).toEqual(expect.arrayContaining(['Pizza', 'Bar', 'Luce']))
    expect(optionNames()).not.toContain('Cliente X')
    await userEvent.type(screen.getByLabelText('Cerca categoria'), 'luc')
    expect(optionNames()).toEqual(['Luce'])
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('radio', { name: /Entrata/ }))
    await userEvent.click(screen.getByLabelText(/Categoria/))
    expect(optionNames()).toEqual(['Cliente X'])
    expect(screen.getByRole('button', { name: 'Salva entrata' })).toBeInTheDocument()
  })

  it('cambiando tipo la categoria non più valida si azzera', async () => {
    setup()
    await pick('Pizza')
    await userEvent.click(screen.getByRole('radio', { name: /Entrata/ }))
    expect(screen.getByLabelText(/Categoria/)).toHaveTextContent('Scegli…')
    expect(screen.getByText('Si sceglie con la categoria')).toBeInTheDocument()
  })

  it('con tutti i campi validi consegna i valori con la voce di budget della categoria', async () => {
    const onSubmit = setup()
    await userEvent.type(screen.getByLabelText(/Importo/), '14,90')
    await userEvent.click(screen.getByRole('radio', { name: /Conto B/ }))
    await pick('Bar')
    await userEvent.type(screen.getByLabelText('Commento'), 'caffè')
    await userEvent.click(screen.getByRole('button', { name: 'Salva spesa' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      type: 'expense',
      amount: 14.9,
      accountId: 2,
      categoryId: 101,
      budgetItemId: 10,
      date: new Date().toLocaleDateString('sv-SE'),
      comment: 'caffè',
      tag: null,
    })
  })

  it('i conti si scelgono con i pulsanti, anche da tastiera, e la selezione ha il segno ✓', async () => {
    setup()
    const chip = screen.getByRole('radio', { name: /Conto A/ })
    await userEvent.click(chip)
    expect(chip).toBeChecked()
    expect(chip).toHaveTextContent('✓')
    await userEvent.keyboard('{ArrowRight}')
    await vi.waitFor(() => expect(screen.getByRole('radio', { name: /Conto B/ })).toHaveFocus())
    // Da tastiera si sceglie con la barra spaziatrice
    await userEvent.keyboard(' ')
    expect(screen.getByRole('radio', { name: /Conto B/ })).toBeChecked()
  })

  it('senza conti suggerisce di aggiungerne uno', () => {
    render(<TransactionForm accounts={[]} categoryGroups={groups} onSubmit={vi.fn()} />)
    expect(screen.getByText(/Nessun conto/)).toBeInTheDocument()
  })

  it('con busy il pulsante è disattivato e non invia', async () => {
    const onSubmit = vi.fn()
    render(<TransactionForm accounts={accounts} categoryGroups={groups} onSubmit={onSubmit} busy />)
    expect(screen.getByRole('button', { name: /Salva spesa/ })).toBeDisabled()
  })
})

describe('TransactionForm: trasferimento', () => {
  it('mostra origine e destinazione, nasconde categoria e voce di budget', async () => {
    setup()
    await userEvent.click(screen.getByRole('radio', { name: /Trasferimento/ }))
    expect(screen.getByRole('radiogroup', { name: /Conto di origine/ })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: /Conto di destinazione/ })).toBeInTheDocument()
    expect(screen.queryByLabelText(/Categoria/)).not.toBeInTheDocument()
    expect(screen.queryByText('Voce di budget')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salva trasferimento' })).toBeInTheDocument()
  })

  it('con origine uguale alla destinazione mostra l\'errore e non salva', async () => {
    const onSubmit = setup()
    await userEvent.click(screen.getByRole('radio', { name: /Trasferimento/ }))
    await userEvent.type(screen.getByLabelText(/Importo/), '50')
    const origin = within(screen.getByRole('radiogroup', { name: /Conto di origine/ }))
    const destination = within(screen.getByRole('radiogroup', { name: /Conto di destinazione/ }))
    await userEvent.click(origin.getByRole('radio', { name: /Conto A/ }))
    await userEvent.click(destination.getByRole('radio', { name: /Conto A/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva trasferimento' }))
    expect(screen.getByText('Il conto di destinazione deve essere diverso da quello di origine.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('con conti diversi consegna un trasferimento senza categoria né voce', async () => {
    const onSubmit = setup()
    await userEvent.click(screen.getByRole('radio', { name: /Trasferimento/ }))
    await userEvent.type(screen.getByLabelText(/Importo/), '50')
    await userEvent.click(within(screen.getByRole('radiogroup', { name: /Conto di origine/ })).getByRole('radio', { name: /Conto A/ }))
    await userEvent.click(within(screen.getByRole('radiogroup', { name: /Conto di destinazione/ })).getByRole('radio', { name: /Conto B/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Salva trasferimento' }))
    expect(onSubmit).toHaveBeenCalledWith({
      type: 'transfer',
      amount: 50,
      accountId: 1,
      destinationAccountId: 2,
      date: new Date().toLocaleDateString('sv-SE'),
      comment: null,
      tag: null,
    })
  })

  it('passando da trasferimento a spesa riappare la categoria e sparisce la destinazione', async () => {
    setup()
    await userEvent.click(screen.getByRole('radio', { name: /Trasferimento/ }))
    await userEvent.click(screen.getByRole('radio', { name: /Spesa/ }))
    expect(screen.getByLabelText(/Categoria/)).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: /Conto di destinazione/ })).not.toBeInTheDocument()
  })
})
