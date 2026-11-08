import { describe, expect, it } from 'vitest'
import { readBudgetAmount } from './budget-cell.ts'

describe('readBudgetAmount', () => {
  it('vuoto o solo spazi significa nessuna riga manuale', () => {
    expect(readBudgetAmount('')).toEqual({ kind: 'empty' })
    expect(readBudgetAmount('   ')).toEqual({ kind: 'empty' })
  })

  it('legge importi all\'italiana, zero compreso', () => {
    expect(readBudgetAmount('1.250,50')).toEqual({ kind: 'amount', value: 1250.5 })
    expect(readBudgetAmount('0')).toEqual({ kind: 'amount', value: 0 })
  })

  it('rifiuta testo e negativi con un messaggio leggibile', () => {
    expect(readBudgetAmount('abc')).toMatchObject({ kind: 'error' })
    expect(readBudgetAmount('-5')).toMatchObject({ kind: 'error' })
    expect(readBudgetAmount('1,234')).toMatchObject({ kind: 'error' })
  })
})
