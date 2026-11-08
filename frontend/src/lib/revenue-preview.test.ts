import { describe, expect, it } from 'vitest'
import { buildRevenuePreview, type PreviewClient, type PreviewDays, type PreviewRate } from './revenue-preview.ts'

const client = (id: number, name: string, delay: number, sortOrder = id, archived = false): PreviewClient => ({
  id, name, archived, sortOrder, budgetItemId: 10, collectionDelayMonths: delay,
})
const rate = (clientId: number, dailyRate: number, validFromYear = 2026, validFromMonth = 1): PreviewRate => ({
  clientId, dailyRate, validFromYear, validFromMonth,
})
const days = (clientId: number, year: number, month: number, value: number): PreviewDays => ({ clientId, year, month, days: value })

describe('buildRevenuePreview', () => {
  const clients = [client(1, 'A', 2), client(2, 'B', 1)]
  const rates = [rate(1, 250), rate(1, 280, 2026, 7), rate(2, 300)]

  it('sposta l\'incasso del ritardo del cliente e usa la tariffa del mese di lavoro', () => {
    const preview = buildRevenuePreview(2026, clients, rates, [
      days(1, 2026, 1, 10), // 2.500 a marzo
      days(1, 2026, 7, 10.5), // 10,5 × 280 = 2.940 a settembre
      days(2, 2026, 1, 4), // 1.200 a febbraio
    ])
    const [a, b] = preview.current.rows
    expect(a!.cells[2]).toEqual({ cents: 250000, fromPreviousYear: false })
    expect(a!.cells[8]).toEqual({ cents: 294000, fromPreviousYear: false })
    expect(b!.cells[1]).toEqual({ cents: 120000, fromPreviousYear: false })
    expect(a!.totalCents).toBe(544000)
    expect(preview.current.monthCents[1]).toBe(120000)
    expect(preview.current.totalCents).toBe(544000 + 120000)
  })

  it('un incasso di gennaio da lavoro di novembre dell\'anno prima è segnalato come anno precedente', () => {
    const preview = buildRevenuePreview(2026, clients, [rate(1, 250, 2025, 1), rate(2, 300, 2025, 1)], [
      days(1, 2025, 11, 20), // ritardo 2 → gennaio 2026
      days(1, 2026, 1, 10),
    ])
    const a = preview.current.rows[0]!
    expect(a.cells[0]).toEqual({ cents: 500000, fromPreviousYear: true })
    expect(a.cells[2]).toEqual({ cents: 250000, fromPreviousYear: false })
  })

  it('il lavoro dell\'anno scelto che incassa l\'anno dopo finisce nel riporto, non nell\'anno', () => {
    const preview = buildRevenuePreview(2026, clients, rates, [days(1, 2026, 11, 10), days(1, 2026, 12, 10), days(2, 2026, 12, 2)])
    expect(preview.current.totalCents).toBe(0)
    expect(preview.carryOver.year).toBe(2027)
    expect(preview.carryOver.rows[0]!.cells[0]).toMatchObject({ cents: 280000 + 0 })
    expect(preview.carryOver.rows[0]!.cells[0]!.cents).toBe(280000)
    expect(preview.carryOver.rows[0]!.cells[1]!.cents).toBe(280000)
    expect(preview.carryOver.rows[1]!.cells[0]!.cents).toBe(60000)
    expect(preview.carryOver.totalCents).toBe(280000 + 280000 + 60000)
  })

  it('segnala i giorni senza tariffa valida invece di contarli come zero', () => {
    const preview = buildRevenuePreview(2026, clients, [rate(1, 250, 2026, 6)], [days(1, 2026, 2, 5), days(2, 2026, 3, 5), days(1, 2026, 7, 1)])
    expect(preview.problems).toEqual([
      { clientId: 1, clientName: 'A', year: 2026, month: 2 },
      { clientId: 2, clientName: 'B', year: 2026, month: 3 },
    ])
    expect(preview.current.rows[0]!.cells[8]!.cents).toBe(25000)
    expect(preview.collections).toHaveLength(1)
  })

  it('zero giorni senza tariffa non è un problema', () => {
    const preview = buildRevenuePreview(2026, clients, [], [days(1, 2026, 2, 0)])
    expect(preview.problems).toEqual([])
  })

  it('i clienti archiviati compaiono solo se incassano nella tabella; l\'ordine è quello dei clienti', () => {
    const list = [client(1, 'A', 0, 1), client(2, 'Vecchio', 0, 0, true), client(3, 'Vecchio2', 0, 2, true)]
    const preview = buildRevenuePreview(2026, list, [rate(1, 100), rate(2, 100), rate(3, 100)], [days(2, 2026, 1, 1)])
    expect(preview.current.rows.map((r) => r.name)).toEqual(['Vecchio', 'A'])
  })

  it('un anno senza dati dà tabelle vuote ma complete', () => {
    const preview = buildRevenuePreview(2040, clients, rates, [])
    expect(preview.current.monthCents).toEqual(Array.from({ length: 12 }, () => 0))
    expect(preview.current.rows).toHaveLength(2)
  })
})
