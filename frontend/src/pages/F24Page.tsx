import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useF24DeadlinesDueInYear, useSyncF24Deadlines } from '../api/tax.queries.ts'
import Amount from '../components/Amount.tsx'
import Button from '../components/Button.tsx'
import F24AmountDialog from '../components/F24AmountDialog.tsx'
import { useSnackbar } from '../components/Snackbar.tsx'
import YearSelector from '../components/YearSelector.tsx'
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

  const plan = useMemo(() => {
    if (!current.summary || !current.parameters) return null
    return planDeadlines(year, { summary: current.summary, firstAdvanceDueDate: current.parameters.firstAdvanceDueDate }, previous.summary ? { summary: previous.summary } : null)
  }, [year, current.summary, current.parameters, previous.summary])

  function generate() {
    if (!plan) return
    const planned = plan.deadlines.map((d) => ({ referenceYear: d.referenceYear, taxType: d.taxType, dueDate: d.dueDate, amount: d.amountCents / 100 }))
    sync.mutate(
      { year, planned },
      { onSuccess: (r) => showSuccess(`Calendario ${year} aggiornato: ${r.created} create, ${r.updated} aggiornate, ${r.kept} invariate.`) },
    )
  }

  const rows = saved.data ?? []
  const total = rows.reduce((sum, d) => sum + Number(d.amount), 0)
  const loading = current.isPending || saved.isPending
  return (
    <main className="f24-page">
      <Link to={paths.tax} className="f24-page__back">← Fiscale</Link>
      <h1>Calendario F24</h1>
      <YearSelector year={year} onChange={setYear} />
      {current.isError || saved.isError ? (
        <p role="alert" className="f24-page__note">Non riesco a leggere il calendario. Riprova più tardi.</p>
      ) : loading ? (
        <p role="status" className="f24-page__note">Caricamento…</p>
      ) : (
        <>
          {!plan ? (
            <p className="f24-page__note">
              Mancano i parametri fiscali del {year}: inseriscili in <Link to={paths.settingsTaxParameters}>Parametri fiscali</Link>.
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
                        <strong>{taxTypeLabels[d.tax_type]}</strong> · anno {d.reference_year}
                        <div className="f24-page__meta">{italianDate(d.due_date)}{d.is_amount_manual ? ' · importo modificato a mano' : ''}</div>
                      </div>
                      <Amount value={Number(d.amount)} colored={false} />
                      <span className={`f24-page__status f24-page__status--${status}`}>{statusLabels[status]}</span>
                      {d.transaction_id === null && <F24AmountDialog id={d.id} label={`${taxTypeLabels[d.tax_type]} ${italianDate(d.due_date)}`} amount={Number(d.amount)} />}
                    </li>
                  )
                })}
              </ul>
              <p className="f24-page__total">
                Totale calendario: <Amount value={total} colored={false} />
              </p>
            </>
          )}
        </>
      )}
    </main>
  )
}
