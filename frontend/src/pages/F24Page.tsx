import TaxNav from '../components/TaxNav.tsx'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useBudgetEntries, useClosedMonths } from '../api/budget.queries.ts'
import { useBudgetItems } from '../api/classification.queries.ts'
import { useAllInstallments, useApplyTaxEntries, useF24Deadlines, useF24DeadlinesDueInYear, useLinkDeadlineToTransaction, useInstallmentPlans, useSyncF24Deadlines } from '../api/tax.queries.ts'
import { useYearTransactions } from '../api/transactions.queries.ts'
import ApplyDriverDialog from '../components/ApplyDriverDialog.tsx'
import Field from '../components/Field.tsx'
import Amount from '../components/Amount.tsx'
import Button from '../components/Button.tsx'
import F24AmountDialog from '../components/F24AmountDialog.tsx'
import F24LinkDialog from '../components/F24LinkDialog.tsx'
import { useSnackbar } from '../components/Snackbar.tsx'
import YearSelector from '../components/YearSelector.tsx'
import { newTransactionFromDeadlinePath } from '../lib/due-prefill.ts'
import { planTaxApply } from '../lib/tax-apply.ts'
import { deadlineStatus, planDeadlines, statusLabels, taxTypeLabels } from '../lib/f24-plan.ts'
import { paths } from '../paths.ts'
import { useTaxSummary } from './use-tax-summary.ts'
import './F24Page.css'

const italianDate = (date: string) => date.split('-').reverse().join('/')
const today = () => new Date().toISOString().slice(0, 10)
const ITEM_KEY = 'tax-budget-item'

// La voce scelta per le imposte si ricorda in questo browser (preferenza locale).
function readItem(): string {
  try {
    return localStorage.getItem(ITEM_KEY) ?? ''
  } catch {
    return ''
  }
}

export default function F24Page() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const current = useTaxSummary(year)
  const previous = useTaxSummary(year - 1)
  const saved = useF24DeadlinesDueInYear(year)
  const sync = useSyncF24Deadlines()
  const { showSuccess } = useSnackbar()
  const items = useBudgetItems()
  const taxEntries = useBudgetEntries({ source: 'tax' })
  const closedMonths = useClosedMonths()
  const applyTax = useApplyTaxEntries()
  const navigate = useNavigate()
  const allDeadlines = useF24Deadlines()
  const yearTransactions = useYearTransactions(year)
  const plans = useInstallmentPlans()
  const allInstallments = useAllInstallments()
  const unlink = useLinkDeadlineToTransaction()
  const [itemId, setItemId] = useState(readItem)
  const expenseItems = (items.data ?? []).filter((i) => i.kind === 'expense' && !i.archived)
  const validItemId = expenseItems.some((i) => String(i.id) === itemId) ? Number(itemId) : null

  const plan = useMemo(() => {
    if (!current.summary || !current.parameters) return null
    // Rate delle rateizzazioni non archiviate: compaiono nel calendario alle loro scadenze.
    const active = new Map((plans.data ?? []).filter((p) => !p.archived).map((p) => [p.id, p]))
    const rates = (allInstallments.data ?? []).flatMap((i) => {
      const plan = active.get(i.plan_id)
      return plan ? [{ id: i.id, referenceYear: i.reference_year, taxType: i.tax_type, number: i.number, dueDate: i.due_date, amount: Number(i.amount) }] : []
    })
    return planDeadlines(year, { summary: current.summary, firstAdvanceDueDate: current.parameters.firstAdvanceDueDate }, previous.summary ? { summary: previous.summary } : null, rates)
  }, [year, current.summary, current.parameters, previous.summary, plans.data, allInstallments.data])

  function generate() {
    if (!plan) return
    const planned = plan.deadlines.map((d) => ({ installmentId: d.installmentId, referenceYear: d.referenceYear, taxType: d.taxType, dueDate: d.dueDate, amount: d.amountCents / 100 }))
    sync.mutate(
      { year, planned },
      { onSuccess: (r) => showSuccess(`Calendario ${year} aggiornato: ${r.created} create, ${r.updated} aggiornate, ${r.kept} invariate.`) },
    )
  }

  const rows = saved.data ?? []
  // Spese dell'anno non ancora collegate a nessuna scadenza: un movimento non chiude due scadenze.
  const linkedIds = new Set((allDeadlines.data ?? []).flatMap((d) => (d.transaction_id === null ? [] : [d.transaction_id])))
  const candidates = (yearTransactions.data ?? [])
    .filter((t) => t.type === 'expense' && !linkedIds.has(t.id))
    .map((t) => ({ id: t.id, date: t.transaction_date, amount: Number(t.amount), comment: t.comment }))
  const applyPlan = useMemo(() => {
    if (validItemId === null || !taxEntries.data || !closedMonths.data) return null
    return planTaxApply(
      year,
      (saved.data ?? []).map((d) => ({ due_date: d.due_date, amount: Number(d.amount) })),
      validItemId,
      taxEntries.data.map((e) => ({ year: e.year, month: e.month })),
      closedMonths.data.map((m) => ({ year: m.year, month: m.month })),
    )
  }, [year, validItemId, saved.data, taxEntries.data, closedMonths.data])

  const total = rows.reduce((sum, d) => sum + Number(d.amount), 0)
  const loading = current.isPending || saved.isPending
  return (
    <main className="f24-page">
      <h1>Tasse e contributi</h1>
      <TaxNav />
      <h2>Calendario F24</h2>
      <YearSelector year={year} onChange={setYear} />
      {current.isError || saved.isError ? (
        <p role="alert" className="f24-page__note">Non riesco a leggere il calendario. Riprova più tardi.</p>
      ) : loading ? (
        <p role="status" className="f24-page__note">Caricamento…</p>
      ) : (
        <>
          {!plan ? (
            <p className="f24-page__note">
              Mancano i parametri fiscali del {year}: inseriscili in <Link to={paths.taxParameters}>Parametri fiscali</Link>.
            </p>
          ) : (
            <p className="f24-page__note">
              Dal calcolo: {plan.deadlines.length} scadenze, totale <Amount value={plan.totalCents / 100} colored={false} />. Rigenerare aggiorna gli importi non versati e non modificati a mano, e non cancella nulla.
            </p>
          )}
          <Button onClick={generate} loading={sync.isPending} disabled={!plan}>
            Genera dal calcolo
          </Button>
          {rows.length === 0 ? (
            <p className="f24-page__note">Nessuna scadenza salvata per il {year}.</p>
          ) : (
            <>
              <ul className="f24-page__list">
                {rows.map((d) => {
                  const status = deadlineStatus(d, today())
                  return (
                    <li key={d.id} className="f24-page__row">
                      <div>
                        <strong>{taxTypeLabels[d.tax_type]}</strong> · anno {d.reference_year}{d.installment_id !== null ? ' · rata' : ''}
                        <div className="f24-page__meta">{italianDate(d.due_date)}{d.is_amount_manual ? ' · importo modificato a mano' : ''}</div>
                      </div>
                      <Amount value={Number(d.amount)} colored={false} />
                      <span className={`f24-page__status f24-page__status--${status}`}>{statusLabels[status]}</span>
                      <div className="f24-page__actions">
                        {d.transaction_id === null ? (
                          <>
                            <Button
                              disabled={validItemId === null}
                              aria-label={`Registra versamento ${taxTypeLabels[d.tax_type]} ${italianDate(d.due_date)}`}
                              onClick={() => {
                                if (validItemId !== null) {
                                  void navigate(newTransactionFromDeadlinePath(paths.newTransaction, { amount: Number(d.amount), budgetItemId: validItemId, deadlineId: d.id }))
                                }
                              }}
                            >
                              Registra versamento
                            </Button>
                            <F24LinkDialog deadlineId={d.id} label={`${taxTypeLabels[d.tax_type]} ${italianDate(d.due_date)}`} candidates={candidates} />
                            <F24AmountDialog id={d.id} label={`${taxTypeLabels[d.tax_type]} ${italianDate(d.due_date)}`} amount={Number(d.amount)} />
                          </>
                        ) : (
                          <>
                            <Link to={paths.editTransaction(d.transaction_id)} className="f24-page__back">
                              Vedi movimento
                            </Link>
                            <Button
                              variant="secondary"
                              loading={unlink.isPending}
                              aria-label={`Scollega il movimento da ${taxTypeLabels[d.tax_type]} ${italianDate(d.due_date)}`}
                              onClick={() =>
                                unlink.mutate({ deadlineId: d.id, transactionId: null }, { onSuccess: () => showSuccess('Movimento scollegato: la scadenza torna da versare.') })
                              }
                            >
                              Scollega
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {validItemId === null && <p className="f24-page__note">Per registrare un versamento scegli prima la voce del budget per le imposte (sezione Budget).</p>}
              <p className="f24-page__total">
                Totale calendario: <Amount value={total} colored={false} />
              </p>
              <section className="f24-page__apply">
                <h2>Budget</h2>
                <Field label="Voce del budget per le imposte">
                  {(control) => (
                    <select
                      {...control}
                      value={itemId}
                      onChange={(e) => {
                        setItemId(e.target.value)
                        try {
                          localStorage.setItem(ITEM_KEY, e.target.value)
                        } catch {
                          // Preferenza locale non disponibile: si sceglie di nuovo la prossima volta.
                        }
                      }}
                    >
                      <option value="">Scegli…</option>
                      {expenseItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <ApplyDriverDialog
                  plan={applyPlan ?? { from: { year, month: 1 }, to: { year, month: 12 }, segments: [], replacedCount: 0, createdCount: 0, skippedClosedMonths: [] }}
                  disabledReason={applyPlan === null ? 'Scegli la voce del budget per le imposte.' : undefined}
                  title="Applicare le imposte al budget?"
                  description={`Da gennaio a dicembre ${year} le righe delle imposte vengono sostituite con una riga per mese di scadenza, sulla voce scelta (importi in spesa). Le righe di altra origine, comprese quelle manuali, non si toccano.`}
                  nothingToDoText="Non c'è nulla da applicare: nessuna scadenza salvata e nessuna riga delle imposte nel budget."
                  onConfirm={async () => {
                    if (!applyPlan) return
                    const result = await applyTax.mutateAsync(applyPlan.segments)
                    showSuccess(`Budget aggiornato: ${result.deletedCount} righe sostituite, ${result.insertedCount} create.`)
                  }}
                />
              </section>
            </>
          )}
        </>
      )}
    </main>
  )
}
