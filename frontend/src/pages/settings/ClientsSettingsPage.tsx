import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useBudgetItems, useMacroAreas } from '../../api/classification.queries.ts'
import { useCreateRevenueForecast, useDeleteRevenueForecast, useRevenueForecasts } from '../../api/revenue.queries.ts'
import Amount from '../../components/Amount.tsx'
import Button from '../../components/Button.tsx'
import Field from '../../components/Field.tsx'
import { useSnackbar } from '../../components/Snackbar.tsx'
import { monthOptions } from '../../lib/months.ts'
import { parseNumber, proposeCollection } from '../../lib/revenue-forecast.ts'
import { paths } from '../../paths.ts'
import './ClientsSettingsPage.css'
import './settings.css'

const MONTHS = monthOptions()

export default function ClientsSettingsPage() {
  const macroAreas = useMacroAreas()
  const budgetItems = useBudgetItems()
  const forecasts = useRevenueForecasts({ orderBy: [{ column: 'collection_year' }, { column: 'collection_month' }, { column: 'id' }] })
  const create = useCreateRevenueForecast()
  const remove = useDeleteRevenueForecast()
  const { showError, showSuccess } = useSnackbar()

  const today = new Date()
  const [clientId, setClientId] = useState('')
  const [workYear, setWorkYear] = useState(today.getFullYear())
  const [workMonth, setWorkMonth] = useState(today.getMonth() + 1)
  const [collection, setCollection] = useState<{ year: number; month: number } | null>(null)
  const [daysText, setDaysText] = useState('')
  const [rateText, setRateText] = useState('')
  const [error, setError] = useState<string | null>(null)

  // I clienti sono le voci della macro-area professionale: una voce nuova compare qui da sola.
  const clients = useMemo(() => {
    const professional = new Set((macroAreas.data ?? []).filter((m) => m.is_professional).map((m) => m.id))
    return (budgetItems.data ?? []).filter((item) => professional.has(item.macro_area_id) && !item.archived)
  }, [macroAreas.data, budgetItems.data])
  const clientName = (id: number) => budgetItems.data?.find((item) => item.id === id)?.name ?? '—'
  const rows = forecasts.data ?? []

  const proposed = proposeCollection(
    workYear,
    workMonth,
    rows.filter((row) => String(row.budget_item_id) === clientId),
  )
  const collectionShown = collection ?? proposed

  async function submit(event: FormEvent) {
    event.preventDefault()
    const days = parseNumber(daysText)
    const rate = parseNumber(rateText)
    if (clientId === '') return setError('Scegli il cliente.')
    if (days === null || days <= 0 || days > 31) return setError('I giorni devono essere tra 0 e 31.')
    if (rate === null || rate < 0) return setError('Inserisci la tariffa giornaliera.')
    setError(null)
    try {
      await create.mutateAsync({
        budget_item_id: Number(clientId),
        work_year: workYear,
        work_month: workMonth,
        collection_year: collectionShown.year,
        collection_month: collectionShown.month,
        days,
        daily_rate: rate,
      })
      showSuccess('Previsione salvata: è nel Budget.')
      setDaysText('')
      setCollection(null)
    } catch {
      // Il messaggio arriva dalla snackbar; i valori restano nel form.
    }
  }

  async function removeRow(id: number) {
    try {
      await remove.mutateAsync(id)
    } catch {
      showError('Non sono riuscito a eliminare la previsione.')
    }
  }

  return (
    <main className="settings clients-settings">
      <Link to={paths.settings} className="settings__back">
        ← Impostazioni
      </Link>
      <h1>Clienti</h1>
      <p className="settings__status">
        I clienti sono le voci di «Ricavi professionali». Ogni riga è n giorni × tariffa: finisce come previsione nel mese di incasso.
      </p>
      {clients.length === 0 && <p className="settings__status">Nessun cliente: aggiungi una voce in «Ricavi professionali».</p>}

      <form className="clients-settings__form" onSubmit={submit} noValidate>
        <Field label="Cliente" required>
          {(p) => (
            <select {...p} value={clientId} onChange={(e) => { setClientId(e.target.value); setCollection(null) }}>
              <option value="">Scegli…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          )}
        </Field>
        <div className="clients-settings__pair">
          <Field label="Mese di competenza (giorni fatturati)" required>
            {(p) => (
              <select {...p} value={workMonth} onChange={(e) => { setWorkMonth(Number(e.target.value)); setCollection(null) }}>
                {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            )}
          </Field>
          <Field label="Anno" required>
            {(p) => <input {...p} type="number" value={workYear} onChange={(e) => { setWorkYear(Number(e.target.value)); setCollection(null) }} />}
          </Field>
        </div>
        <div className="clients-settings__pair">
          <Field label="Mese di incasso" required help="Proposto in base all'ultimo ritardo di questo cliente.">
            {(p) => (
              <select {...p} value={collectionShown.month} onChange={(e) => setCollection({ ...collectionShown, month: Number(e.target.value) })}>
                {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            )}
          </Field>
          <Field label="Anno" required>
            {(p) => <input {...p} type="number" value={collectionShown.year} onChange={(e) => setCollection({ ...collectionShown, year: Number(e.target.value) })} />}
          </Field>
        </div>
        <div className="clients-settings__pair">
          <Field label="Giorni" required>
            {(p) => <input {...p} type="text" inputMode="decimal" autoComplete="off" placeholder="15" value={daysText} onChange={(e) => setDaysText(e.target.value)} />}
          </Field>
          <Field label="Tariffa giornaliera (€)" required>
            {(p) => <input {...p} type="text" inputMode="decimal" autoComplete="off" placeholder="250,00" value={rateText} onChange={(e) => setRateText(e.target.value)} />}
          </Field>
        </div>
        {error && <p role="alert" className="clients-settings__error">{error}</p>}
        <Button type="submit" loading={create.isPending}>Aggiungi previsione</Button>
      </form>

      <h2>Previsioni inserite</h2>
      {rows.length === 0 ? (
        <p className="settings__status">Nessuna previsione.</p>
      ) : (
        <ul className="clients-settings__list">
          {rows.map((row) => (
            <li key={row.id} className="clients-settings__row">
              <span className="clients-settings__client">{clientName(row.budget_item_id)}</span>
              <span className="clients-settings__detail">
                {row.days} gg × {row.daily_rate} € · competenza {MONTHS[row.work_month - 1]?.label} {row.work_year} · incasso {MONTHS[row.collection_month - 1]?.label} {row.collection_year}
              </span>
              <Amount value={row.days * row.daily_rate} colored={false} />
              <button type="button" className="clients-settings__remove" onClick={() => removeRow(row.id)} aria-label={`Elimina previsione ${clientName(row.budget_item_id)}`}>
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
