import TaxNav from '../components/TaxNav.tsx'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useBudgetEntries, useClosedMonths } from '../api/budget.queries.ts'
import { useBudgetItems, useCategories } from '../api/classification.queries.ts'
import { useAllInstallments, useApplyTaxEntries, useF24Deadlines, useF24DeadlinesDueInYear, useLinkDeadlineToTransaction, useInstallmentPlans, useSyncF24Deadlines } from '../api/tax.queries.ts'
import { useYearTransactions } from '../api/transactions.queries.ts'
import ApplyDriverDialog from '../components/ApplyDriverDialog.tsx'
import Amount from '../components/Amount.tsx'
import Button from '../components/Button.tsx'
import F24AmountDialog from '../components/F24AmountDialog.tsx'
import F24LinkDialog from '../components/F24LinkDialog.tsx'
import { useSnackbar } from '../components/Snackbar.tsx'
import YearSelector from '../components/YearSelector.tsx'
import PayF24Dialog from '../components/PayF24Dialog.tsx'
import { taxBudgetParts, type PayableDeadline, type TaxRole } from '../lib/f24-pay.ts'
import { planTaxApply } from '../lib/tax-apply.ts'
import { deadlineStatus, planDeadlines, statusLabels, taxTypeLabels } from '../lib/f24-plan.ts'
import { paths } from '../paths.ts'
import { useTaxSummary } from './use-tax-summary.ts'
import './F24Page.css'

const italianDate = (date: string) => date.split('-').reverse().join('/')
const today = () => new Date().toISOString().slice(0, 10)

export default function F24Page() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const current = useTaxSummary(year)
  const previous = useTaxSummary(year - 1)
  const saved = useF24DeadlinesDueInYear(year)
  const sync = useSyncF24Deadlines()
  const { showSuccess } = useSnackbar()
  const items = useBudgetItems()
  const categories = useCategories()
  const taxEntries = useBudgetEntries({ source: 'tax' })
  const closedMonths = useClosedMonths()
  const applyTax = useApplyTaxEntries()
  const allDeadlines = useF24Deadlines()
  const yearTransactions = useYearTransactions(year)
  const plans = useInstallmentPlans()
  const allInstallments = useAllInstallments()
  const unlink = useLinkDeadlineToTransaction()

  // Voci fiscali (ruolo `tax_role`) e prima categoria di ciascuna: servono a "Pago" e a "Applica al budget".
  const itemByRole = useMemo(() => new Map<TaxRole, number>((items.data ?? []).flatMap((i) => (i.tax_role ? [[i.tax_role, i.id] as [TaxRole, number]] : []))), [items.data])
  const categoryOfItem = useMemo(() => {
    const map = new Map<number, number>()
    for (const c of categories.data ?? []) if (!c.archived && !map.has(c.budget_item_id)) map.set(c.budget_item_id, c.id)
    return map
  }, [categories.data])
  const installmentById = useMemo(
    () => new Map((allInstallments.data ?? []).map((i) => [i.id, { number: i.number, interest: Number(i.interest) }])),
    [allInstallments.data],
  )

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
  // Righe raggruppate per data: un F24 è l'insieme delle righe con la stessa scadenza.
  const groups = useMemo(() => {
    const byDate = new Map<string, typeof rows>()
    for (const d of rows) byDate.set(d.due_date, [...(byDate.get(d.due_date) ?? []), d])
    return [...byDate.entries()]
  }, [rows])
  // Spese dell'anno non ancora collegate a nessuna scadenza: un movimento non chiude due scadenze.
  const linkedIds = new Set((allDeadlines.data ?? []).flatMap((d) => (d.transaction_id === null ? [] : [d.transaction_id])))
  const candidates = (yearTransactions.data ?? [])
    .filter((t) => t.type === 'expense' && !linkedIds.has(t.id))
    .map((t) => ({ id: t.id, date: t.transaction_date, amount: Number(t.amount), comment: t.comment }))
  const rolesComplete = (['substitute_tax', 'inps', 'substitute_tax_interest', 'inps_interest'] as const).every((r) => itemByRole.has(r))
  const applyPlan = useMemo(() => {
    if (!rolesComplete || !taxEntries.data || !closedMonths.data) return null
    return planTaxApply(
      year,
      taxBudgetParts(saved.data ?? [], installmentById, itemByRole),
      taxEntries.data.map((e) => ({ year: e.year, month: e.month })),
      closedMonths.data.map((m) => ({ year: m.year, month: m.month })),
    )
  }, [year, rolesComplete, saved.data, installmentById, itemByRole, taxEntries.data, closedMonths.data])

  const total = rows.reduce((sum, d) => sum + Number(d.amount), 0)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
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
              {groups.map(([dueDate, group]) => {
                const unpaid = group.filter((d) => d.transaction_id === null)
                const groupTotal = group.reduce((sum, d) => sum + Number(d.amount), 0)
                const isOpen = openGroups[dueDate] ?? unpaid.length > 0
                const groupStatus = unpaid.length === 0 ? 'paid' : group.some((d) => deadlineStatus(d, today()) === 'overdue') ? 'overdue' : 'due'
                return (
                  <section key={dueDate} className="f24-page__group" aria-label={`F24 del ${italianDate(dueDate)}`}>
                    <div className="f24-page__group-head">
                      <button
                        type="button"
                        className="f24-page__group-toggle"
                        aria-expanded={isOpen}
                        onClick={() => setOpenGroups((current) => ({ ...current, [dueDate]: !isOpen }))}
                      >
                        <span className="f24-page__group-title">
                          <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span> F24 del {italianDate(dueDate)}
                        </span>
                        <span className={`f24-page__status f24-page__status--${groupStatus}`}>{statusLabels[groupStatus]}</span>
                        <Amount value={groupTotal} colored={false} />
                      </button>
                    </div>
                    {isOpen && (
                    <>
                      {unpaid.length > 0 && (
                      <div className="f24-page__pay">
                      <PayF24Dialog
                        deadlines={unpaid.map<PayableDeadline>((d) => ({ id: d.id, tax_type: d.tax_type, due_date: d.due_date, amount: Number(d.amount), installment_id: d.installment_id }))}
                        installmentById={installmentById}
                        itemByRole={itemByRole}
                        categoryOfItem={categoryOfItem}
                        dueDate={dueDate}
                      />
                      </div>
                      )}
                    <ul className="f24-page__list">
                      {group.map((d) => {
                        const status = deadlineStatus(d, today())
                        const rate = d.installment_id === null ? undefined : installmentById.get(d.installment_id)
                        const label = `${taxTypeLabels[d.tax_type]} ${italianDate(d.due_date)}`
                        return (
                          <li key={d.id} className="f24-page__row">
                            <div className="f24-page__row-main">
                              <strong>{taxTypeLabels[d.tax_type]}</strong>
                              <span className="f24-page__meta">
                                Anno {d.reference_year}
                                {rate ? ` · Rata ${rate.number}` : ''}
                                {d.is_amount_manual ? ' · importo modificato a mano' : ''}
                              </span>
                            </div>
                            <div className="f24-page__row-side">
                              <Amount value={Number(d.amount)} colored={false} />
                              <span className={`f24-page__status f24-page__status--${status}`}>{statusLabels[status]}</span>
                            </div>
                            <div className="f24-page__actions">
                              {d.transaction_id === null ? (
                                <>
                                  <F24LinkDialog deadlineId={d.id} label={label} candidates={candidates} />
                                  <F24AmountDialog id={d.id} label={label} amount={Number(d.amount)} />
                                </>
                              ) : (
                                <>
                                  <Link to={paths.editTransaction(d.transaction_id)} className="text-link">
                                    Vedi movimento
                                  </Link>
                                  <button
                                    type="button"
                                    className="text-link text-link--quiet"
                                    disabled={unlink.isPending}
                                    aria-label={`Scollega il movimento da ${label}`}
                                    onClick={() => unlink.mutate({ deadlineId: d.id, transactionId: null }, { onSuccess: () => showSuccess('Movimento scollegato: la scadenza torna da versare.') })}
                                  >
                                    Scollega
                                  </button>
                                </>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                    </>
                    )}
                  </section>
                )
              })}
              <p className="f24-page__total">
                Totale calendario: <Amount value={total} colored={false} />
              </p>
              <section className="f24-page__apply">
                <h2>Budget</h2>
                <ApplyDriverDialog
                  plan={applyPlan ?? { from: { year, month: 1 }, to: { year, month: 12 }, segments: [], replacedCount: 0, createdCount: 0, skippedClosedMonths: [] }}
                  disabledReason={applyPlan === null ? 'Mancano le voci fiscali del budget (imposta, INPS, interessi).' : undefined}
                  title="Applicare le imposte al budget?"
                  description={`Da gennaio a dicembre ${year} le righe delle imposte vengono sostituite con una riga per voce (imposta sostitutiva, INPS, interessi) e per mese di scadenza. Le righe di altra origine, comprese quelle dei mesi chiusi, non si toccano.`}
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
