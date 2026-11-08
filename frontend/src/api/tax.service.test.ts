import { describe, expect, it } from 'vitest'
import { AppError } from './api-error.ts'
import { fakeSupabase, type RecordedCall } from './test-utils.ts'
import { TaxService } from './tax.service.ts'

function filters(queryCalls: RecordedCall[]): Record<string, unknown> {
  return (queryCalls.find((c) => c.method === 'match')?.args[0] as Record<string, unknown> | undefined) ?? {}
}

const values = {
  profitability_coefficient: 67,
  inps_rate: 26.07,
  substitute_tax_rate: 15,
  activity_start_year: 2025,
}

describe('TaxService.replaceTaxEntries', () => {
  it('chiama la funzione SQL con intervallo e righe attesi', async () => {
    const { client, calls } = fakeSupabase({
      replace_tax_entries: { data: [{ deleted_count: 1, inserted_count: 2 }], error: null },
    })
    const result = await new TaxService(() => client).replaceTaxEntries(
      { fromYear: 2026, fromMonth: 6, toYear: 2027, toMonth: 6 },
      [
        { budgetItemId: 4, year: 2026, month: 6, amount: 800 },
        { budgetItemId: 4, year: 2026, month: 11, amount: 1200.25 },
      ],
    )
    expect(result).toEqual({ deletedCount: 1, insertedCount: 2 })
    expect(calls.find((c) => c.method === 'rpc')?.args).toEqual([
      'replace_tax_entries',
      {
        p_from_year: 2026,
        p_from_month: 6,
        p_to_year: 2027,
        p_to_month: 6,
        p_entries: [
          { budget_item_id: 4, year: 2026, month: 6, amount: 800 },
          { budget_item_id: 4, year: 2026, month: 11, amount: 1200.25 },
        ],
      },
    ])
  })

  it('un errore della funzione diventa AppError', async () => {
    const { client } = fakeSupabase({ replace_tax_entries: { data: null, error: { code: '42501', message: 'denied' } } })
    await expect(
      new TaxService(() => client).replaceTaxEntries({ fromYear: 2026, fromMonth: 1, toYear: 2026, toMonth: 12 }, []),
    ).rejects.toMatchObject({ kind: 'forbidden' })
  })
})

describe('TaxService parametri e scadenze', () => {
  it('getParametersForYear restituisce null se l\'anno non ha parametri', async () => {
    const { client } = fakeSupabase({ tax_parameters: { data: [], error: null } })
    await expect(new TaxService(() => client).getParametersForYear(2027)).resolves.toBeNull()
  })

  it('saveParametersForYear crea l\'anno se manca e lo aggiorna se esiste', async () => {
    const empty = fakeSupabase({ tax_parameters: { data: [], error: null } })
    await new TaxService(() => empty.client).saveParametersForYear(2026, values)
    expect(empty.calls.find((c) => c.method === 'insert')?.args[0]).toEqual({ ...values, year: 2026 })

    const present = fakeSupabase({
      tax_parameters: (q) => ({
        data: 'year' in filters(q) ? [{ id: 2, year: 2026, ...values }] : [],
        error: null,
      }),
    })
    await new TaxService(() => present.client).saveParametersForYear(2026, values)
    expect(present.calls.find((c) => c.method === 'update')?.args[0]).toEqual(values)
  })

  it('listDeadlinesDueInYear usa l\'intervallo dell\'anno solare ordinato per data', async () => {
    const { client, calls } = fakeSupabase({ data: [], error: null })
    await new TaxService(() => client).listDeadlinesDueInYear(2026)
    expect(calls.find((c) => c.method === 'gte')?.args).toEqual(['due_date', '2026-01-01'])
    expect(calls.find((c) => c.method === 'lte')?.args).toEqual(['due_date', '2026-12-31'])
    expect(calls.filter((c) => c.method === 'order').map((c) => c.args[0])).toEqual(['due_date', 'id'])
  })

  it('listInstallments ordina le rate per numero; linkDeadlineToTransaction scrive transaction_id', async () => {
    const { client, calls } = fakeSupabase({ data: [], error: null })
    const service = new TaxService(() => client)
    await service.listInstallments(5)
    expect(calls.find((c) => c.method === 'match')?.args[0]).toEqual({ plan_id: 5 })
    expect(calls.find((c) => c.method === 'order')?.args[0]).toBe('number')

    const linked = fakeSupabase({ data: { id: 1 }, error: null })
    await new TaxService(() => linked.client).linkDeadlineToTransaction(1, 77)
    expect(linked.calls.find((c) => c.method === 'update')?.args[0]).toEqual({ transaction_id: 77 })
  })
})

describe('TaxService.syncDeadlines', () => {
  const existing = [
    { id: 1, reference_year: 2026, tax_type: 'inps_advance', due_date: '2026-06-30', amount: 80, transaction_id: null, installment_id: null, is_amount_manual: false },
    { id: 2, reference_year: 2026, tax_type: 'inps_advance', due_date: '2026-11-30', amount: 90, transaction_id: 55, installment_id: null, is_amount_manual: false },
    { id: 3, reference_year: 2026, tax_type: 'inps_balance', due_date: '2026-06-30', amount: 70, transaction_id: null, installment_id: null, is_amount_manual: true },
  ]
  it('crea le mancanti, aggiorna le non collegate, non tocca le collegate né quelle modificate a mano, né cancella', async () => {
    const { client, calls } = fakeSupabase({ f24_deadlines: (q) => ({ data: q.some((c) => c.method === 'gte') ? existing : { id: 9 }, error: null }) })
    const result = await new TaxService(() => client).syncDeadlines(2026, [
      { referenceYear: 2026, taxType: 'inps_advance', dueDate: '2026-06-30', amount: 100 },
      { referenceYear: 2026, taxType: 'inps_advance', dueDate: '2026-11-30', amount: 999 },
      { referenceYear: 2026, taxType: 'substitute_tax_advance', dueDate: '2026-06-30', amount: 50 },
      { referenceYear: 2026, taxType: 'inps_balance', dueDate: '2026-06-30', amount: 5 },
    ])
    expect(result).toEqual({ created: 1, updated: 1, kept: 2 })
    expect(calls.filter((c) => c.method === 'update').map((c) => c.args[0])).toEqual([{ amount: 100 }])
    expect(calls.filter((c) => c.method === 'delete')).toHaveLength(0)
  })
})

describe('TaxService.applyTaxEntries', () => {
  it('chiama la funzione SQL una volta per tratto', async () => {
    const { client, calls } = fakeSupabase({ data: [{ deleted_count: 1, inserted_count: 2 }], error: null })
    const range = { fromYear: 2026, fromMonth: 1, toYear: 2026, toMonth: 12 }
    const result = await new TaxService(() => client).applyTaxEntries([
      { range, entries: [{ budgetItemId: 1, year: 2026, month: 6, amount: -10 }] },
      { range, entries: [] },
    ])
    expect(calls.filter((c) => c.method === 'rpc')).toHaveLength(2)
    expect(result).toEqual({ deletedCount: 2, insertedCount: 4 })
  })
})

describe('TaxService.linkDeadlineToTransaction', () => {
  it('un movimento già collegato a un\'altra scadenza dà un errore chiaro', async () => {
    const { client } = fakeSupabase({ data: null, error: { code: '23505', message: 'duplicate key value' } })
    const failure = await new TaxService(() => client).linkDeadlineToTransaction(1, 5).catch((e: unknown) => e)
    expect(failure).toBeInstanceOf(AppError)
    expect((failure as AppError).message).toBe('Questo movimento è già collegato a un\'altra scadenza.')
  })
})

describe('TaxService.createPlanWithInstallments', () => {
  const plan = { description: 'Saldo 2024', total_amount: 1000, tax_type: 'substitute_tax' as const, reference_year: 2024 }
  const rows = [{ number: 1, dueDate: '2026-03-31', amount: 550 }, { number: 2, dueDate: '2026-06-30', amount: 550 }]
  it('crea la rateizzazione e poi le rate con il suo id', async () => {
    const { client, calls } = fakeSupabase({ data: { id: 4 }, error: null })
    await new TaxService(() => client).createPlanWithInstallments(plan, rows)
    const inserts = calls.filter((c) => c.method === 'insert').map((c) => c.args[0])
    expect(inserts).toEqual([plan, { plan_id: 4, number: 1, due_date: '2026-03-31', amount: 550 }, { plan_id: 4, number: 2, due_date: '2026-06-30', amount: 550 }])
  })
  it('se una rata fallisce toglie la rateizzazione e le rate già scritte', async () => {
    let inserts = 0
    const { client, calls } = fakeSupabase({
      installment_plans: { data: { id: 4 }, error: null },
      installments: (q) => {
        if (q.some((c) => c.method === 'insert')) {
          inserts += 1
          if (inserts === 2) return { data: null, error: { code: '23505', message: 'duplicate' } }
        }
        return { data: { id: 100 + inserts }, error: null }
      },
    })
    await expect(new TaxService(() => client).createPlanWithInstallments(plan, rows)).rejects.toBeInstanceOf(AppError)
    expect(calls.filter((c) => c.method === 'delete')).toHaveLength(2)
  })
})
