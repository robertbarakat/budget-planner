import TaxNav from '../components/TaxNav.tsx'
import { useMemo, useState } from 'react'
import { useAllInstallments, useF24Deadlines, useInstallmentLines, useInstallmentPlans, useUpdateInstallmentPlan } from '../api/tax.queries.ts'
import Amount from '../components/Amount.tsx'
import { formatDate } from '../lib/dates.ts'
import InstallmentPlanFormDialog from '../components/InstallmentPlanFormDialog.tsx'
import { useSnackbar } from '../components/Snackbar.tsx'
import { taxTypeLabels } from '../lib/f24-plan.ts'
import { summarizePlan } from '../lib/installments.ts'
import './InstallmentsPage.css'

export default function InstallmentsPage() {
  const plans = useInstallmentPlans()
  const installments = useAllInstallments({ orderBy: [{ column: 'number' }] })
  const deadlines = useF24Deadlines()
  const planLines = useInstallmentLines()
  const update = useUpdateInstallmentPlan()
  const { showSuccess } = useSnackbar()
  const [showArchived, setShowArchived] = useState(false)

  // Una rata è versata se la sua scadenza F24 ha un movimento collegato.
  const paidIds = useMemo(
    () => new Set((deadlines.data ?? []).flatMap((d) => (d.installment_id !== null && d.transaction_id !== null ? [d.installment_id] : []))),
    [deadlines.data],
  )
  const visible = (plans.data ?? []).filter((p) => showArchived || !p.archived)

  return (
    <main className="installments">
      <h1>Tasse e contributi</h1>
      <TaxNav />
      <h2>Rateizzazioni</h2>
      <InstallmentPlanFormDialog />
      <label className="installments__check">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Mostra archiviate
      </label>
      {plans.isError || installments.isError || deadlines.isError || planLines.isError ? (
        <p role="alert" className="installments__note">Non riesco a leggere le rateizzazioni. Riprova più tardi.</p>
      ) : plans.isPending || installments.isPending || deadlines.isPending || planLines.isPending ? (
        <p role="status" className="installments__note">Caricamento…</p>
      ) : visible.length === 0 ? (
        <p className="installments__note">Nessuna rateizzazione.</p>
      ) : (
        <ul className="installments__list">
          {visible.map((plan) => {
            const rows = (installments.data ?? []).filter((i) => i.plan_id === plan.id)
            const lines = (planLines.data ?? []).filter((l) => l.plan_id === plan.id)
            const summary = summarizePlan(rows, paidIds)
            const byNumber = [...new Map(rows.map((r) => [r.number, r.due_date])).entries()].map(([number, dueDate]) => {
              const group = rows.filter((r) => r.number === number)
              return {
                number,
                dueDate,
                principal: group.reduce((t, r) => t + Number(r.principal), 0),
                interest: group.reduce((t, r) => t + Number(r.interest), 0),
                paid: group.every((r) => paidIds.has(r.id)),
              }
            })
            return (
              <li key={plan.id} className="installments__plan">
                <h2>
                  {plan.description}
                  {plan.archived ? ' (archiviata)' : ''}
                </h2>
                <ul className="installments__lines" aria-label="Cosa è rateizzato">
                  {lines.map((l) => (
                    <li key={l.id}>
                      {taxTypeLabels[l.tax_type]} {l.reference_year} · quota <Amount value={Number(l.quota)} colored={false} />
                      {l.last_number !== null ? ` · fino alla rata ${l.last_number}` : ''}
                    </li>
                  ))}
                </ul>
                {summary ? (
                  <dl className="installments__summary">
                    <div><dt>Interessi</dt><dd><Amount value={summary.interest} colored={false} /></dd></div>
                    <div><dt>Residuo</dt><dd><Amount value={summary.remaining} colored={false} /></dd></div>
                    <div>
                      <dt>Rata successiva</dt>
                      <dd>{summary.next ? <>n. {summary.next.number} · {formatDate(summary.next.dueDate)} · <Amount value={summary.next.amount} colored={false} /></> : 'Nessuna: tutte versate'}</dd>
                    </div>
                  </dl>
                ) : (
                  <p role="alert" className="installments__note">Le rate non tornano con l'importo rateizzato: controlla i dati.</p>
                )}
                <ul className="installments__rows">
                  {byNumber.map((r) => (
                    <li key={r.number}>
                      Rata {r.number} · {formatDate(r.dueDate)} · <Amount value={r.principal + r.interest} colored={false} />
                      {r.interest > 0 && <span className="installments__interest"> (di cui interessi <Amount value={r.interest} colored={false} />)</span>}
                      {' · '}
                      <strong>{r.paid ? 'Versata' : 'Da versare'}</strong>
                    </li>
                  ))}
                </ul>
                <div className="installments__actions">
                {lines.length > 0 && (
                  <InstallmentPlanFormDialog
                    edit={{
                      planId: plan.id,
                      description: plan.description,
                      lines: lines.map((l) => ({ tax_type: l.tax_type, reference_year: l.reference_year, quota: Number(l.quota), last_number: l.last_number })),
                      installments: rows.map((r) => ({ id: r.id, number: r.number, due_date: r.due_date })),
                      frozenIds: new Set(rows.filter((r) => paidIds.has(r.id)).map((r) => r.id)),
                    }}
                  />
                )}
                <button
                  type="button"
                  className="installments__link"
                  disabled={update.isPending}
                  aria-label={`${plan.archived ? 'Ripristina' : 'Archivia'} ${plan.description}`}
                  onClick={() =>
                    update.mutate(
                      { id: plan.id, values: { archived: !plan.archived } },
                      { onSuccess: () => showSuccess(plan.archived ? 'Rateizzazione ripristinata.' : 'Rateizzazione archiviata.') },
                    )
                  }
                >
                  {plan.archived ? 'Ripristina' : 'Archivia'}
                </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
