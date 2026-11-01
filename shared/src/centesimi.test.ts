import { describe, expect, it } from 'vitest'
import { sommaCentesimi } from './centesimi.ts'

describe('sommaCentesimi', () => {
  it('somma importi in centesimi', () => {
    expect(sommaCentesimi([1250, 399, -50])).toBe(1599)
  })

  it('restituisce 0 senza importi', () => {
    expect(sommaCentesimi([])).toBe(0)
  })

  it('evita gli errori di virgola mobile: 10 + 20 centesimi = 30 esatti', () => {
    expect(sommaCentesimi([10, 20])).toBe(30)
  })

  it('rifiuta importi non interi', () => {
    expect(() => sommaCentesimi([10.5])).toThrow(RangeError)
  })
})
