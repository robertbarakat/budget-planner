import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAllInstallments, useF24Deadlines, useInstallmentPlans, useUpdateInstallmentPlan } from '../api/tax.queries.ts'
import Amount from '../components/Amount.tsx'
import Button from '../components/Button.tsx'
import InstallmentPlanFormDialog from '../components/InstallmentPlanFormDialog.tsx'
import { useSnackbar } from '../components/Snackbar.tsx'
import { taxTypeLabels } from '../lib/f24-plan.ts'
import { summarizePlan } from '../lib/installments.ts'
import { paths } from '../paths.ts'
import './InstallmentsPage.css'

const italianDate = (date: string) => date.split('-').reverse().join('/')

export default function InstallmentsPage() {
  const plans = useInstallmentPlans()
  const installments = useAllInstallments({ orderBy: [{ column: 'number' }] })
  const deadlines = useF24Deadlines()
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
      <Link to={paths.tax} className="installments__back">← Fiscale</Link>
      <h1>Rateizzazioni</h1>
      <InstallmentPlanFormDialog />
      <label className="installments__check">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Mostra archiviate
      </label>
      {plans.isError || installments.isError || deadlines.isError ? (
        <p role="alert" className="installments__note">Non riesco a leggere le rateizzazioni. Riprova più tardi.</p>
      ) : plans.isPending || installments.isPending || deadlines.isPending ? (
        <p role="status" className="installments__note">Caricamento…</p>
      ) : visible.length === 0 ? (
        <p className="installments__note">Nessuna rateizzazione.</p>
      ) : (
        <ul className="installments__list">
          {visible.map((plan) => {
            const rows = (installments.data ?? []).filter((i) => i.plan_id === plan.id)
            const summary = summarizePlan(Number(plan.total_amount), rows, paidIds)
            return (
              <li key={plan.id} className="installments__plan">
                <h2>
                  {plan.description}
                  {plan.archived ? ' (archiviata)' : ''}
                </h2>
                <p className="installments__meta">
                  {taxTypeLabels[plan.tax_type]} · anno {plan.reference_year} · rateizzato <Amount value={Number(plan.total_amount)} colored={false} />
                </p>
                {summary ? (
                  <dl className="installments__summary">
                    <div><dt>Interessi</dt><dd><Amount value={summary.interest} colored={false} /></dd></div>
                    <div><dt>Residuo</dt><dd><Amount value={summary.remaining} colored={false} /></dd></div>
                    <div>
                      <dt>Rata successiva</dt>
                      <dd>{summary.next ? <>n. {summary.next.number} · {italianDate(summary.next.dueDate)} · <Amount value={summary.next.amount} colored={false} /></> : 'Nessuna: tutte versate'}</dd>
                    </div>
                  </dl>
                ) : (
                  <p role="alert" className="installments__note">Le rate non tornano con l'importo rateizzato: controlla i dati.</p>
                )}
                <ul className="installments__rows">
                  {rows.map((row) => (
                    <li key={row.id}>
                      Rata {row.number} · {italianDate(row.due_date)} · <Amount value={Number(row.amount)} colored={false} /> ·{' '}
                      <strong>{paidIds.has(row.id) ? 'Versata' : 'Da versare'}</strong>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="secondary"
                  loading={update.isPending}
                  aria-label={`${plan.archived ? 'Ripristina' : 'Archivia'} ${plan.description}`}
                  onClick={() =>
                    update.mutate(
                      { id: plan.id, values: { archived: !plan.archived } },
                      { onSuccess: () => showSuccess(plan.archived ? 'Rateizzazione ripristinata.' : 'Rateizzazione archiviata.') },
                    )
                  }
                >
                  {plan.archived ? 'Ripristina' : 'Archivia'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
