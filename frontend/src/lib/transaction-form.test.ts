import { describe, expect, it } from 'vitest'
import { validateTransactionForm, type TransactionFormState } from './transaction-form.ts'

const valid: TransactionFormState = {
  type: 'expense',
  amountText: '14,90',
  accountId: '1',
  destinationAccountId: '',
  categoryId: '5',
  date: '2026-11-08',
  comment: '  pizza  ',
  tag: '',
}

describe('validateTransactionForm', () => {
  it('accetta un form completo e normalizza i valori', () => {
    expect(validateTransactionForm(valid)).toEqual({
      ok: true,
      values: { type: 'expense', amount: 14.9, accountId: 1, categoryId: 5, date: '2026-11-08', comment: 'pizza', tag: null },
    })
  })

  it('importo vuoto: errore e nessun salvataggio', () => {
    const result = validateTransactionForm({ ...valid, amountText: '  ' })
    expect(result).toEqual({ ok: false, errors: { amount: "Inserisci l'importo." } })
  })

  it.each(['0', '0,00', '-5', '-0,01'])('importo %s (≤ 0): errore', (amountText) => {
    const result = validateTransactionForm({ ...valid, amountText })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.amount).toBe("L'importo deve essere maggiore di zero.")
  })

  it('importo non numerico: errore leggibile', () => {
    const result = validateTransactionForm({ ...valid, amountText: 'abc' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.amount).toMatch(/importo valido/)
  })

  it('conto e categoria obbligatori, con errori separati', () => {
    const result = validateTransactionForm({ ...valid, accountId: '', categoryId: '' })
    expect(result).toEqual({ ok: false, errors: { account: 'Scegli il conto.', category: 'Scegli la categoria.' } })
  })

  it('data inesistente: errore', () => {
    const result = validateTransactionForm({ ...valid, date: '2026-02-30' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.date).toBe('Scegli una data valida.')
  })

  it('segnala tutti gli errori insieme', () => {
    const result = validateTransactionForm({ ...valid, amountText: '', accountId: '', categoryId: '', date: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).toSorted()).toEqual(['account', 'amount', 'category', 'date'])
  })
})

describe('validateTransactionForm: trasferimento', () => {
  const transfer: TransactionFormState = { ...valid, type: 'transfer', categoryId: '', destinationAccountId: '2' }

  it('accetta origine e destinazione diverse, senza categoria', () => {
    expect(validateTransactionForm(transfer)).toEqual({
      ok: true,
      values: { type: 'transfer', amount: 14.9, accountId: 1, destinationAccountId: 2, date: '2026-11-08', comment: 'pizza', tag: null },
    })
  })

  it('origine uguale alla destinazione: errore sulla destinazione', () => {
    const result = validateTransactionForm({ ...transfer, destinationAccountId: '1' })
    expect(result).toEqual({
      ok: false,
      errors: { destination: 'Il conto di destinazione deve essere diverso da quello di origine.' },
    })
  })

  it('destinazione mancante: errore; la categoria non serve', () => {
    const result = validateTransactionForm({ ...transfer, destinationAccountId: '' })
    expect(result).toEqual({ ok: false, errors: { destination: 'Scegli il conto di destinazione.' } })
  })

  it('importo ≤ 0 anche per il trasferimento', () => {
    const result = validateTransactionForm({ ...transfer, amountText: '0' })
    expect(result.ok).toBe(false)
  })

  it('origine mancante: messaggio specifico', () => {
    const result = validateTransactionForm({ ...transfer, accountId: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.account).toBe('Scegli il conto di origine.')
  })

  it('spesa ed entrata non chiedono la destinazione', () => {
    expect(validateTransactionForm({ ...valid, type: 'income' }).ok).toBe(true)
  })
})
