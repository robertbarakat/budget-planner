import { useState, type FormEvent } from 'react'
import {
  useClient,
  useClientRates,
  useCreateClientRate,
  useDeleteClientRate,
  useUpdateClient,
  useUpdateClientRate,
} from '../api/revenue.queries.ts'
import Amount from './Amount.tsx'
import Button from './Button.tsx'
import Field from './Field.tsx'
import { useSnackbar } from './Snackbar.tsx'
import { validateDelay, validateRate, type RateFormErrors } from '../lib/client-rates.ts'
import { monthName, monthOptions } from '../lib/months.ts'
import './IncomePricing.css'
import '../pages/settings/settings.css'

const MONTH_OPTIONS = monthOptions()

/** Tariffe giornaliere e ritardo d'incasso di una voce di entrata (il «cliente» che sta dietro la voce). */
export default function IncomePricing({ clientId }: { clientId: number }) {
  const client = useClient(clientId)
  const rates = useClientRates(clientId)

  if (client.isPending || rates.isPending) {
    return (
      <p role="status" className="settings__status">
        Caricamento…
      </p>
    )
  }
  if (client.isError || rates.isError) {
    return (
      <p role="alert" className="settings__status">
        Non riesco a leggere tariffe e ritardo. Riprova più tardi.
      </p>
    )
  }
  return (
    <>
      <DelaySection clientId={clientId} delay={client.data.collection_delay_months} />
      <RatesSection clientId={clientId} rates={rates.data} />
    </>
  )
}

function DelaySection({ clientId, delay }: { clientId: number; delay: number }) {
  const [text, setText] = useState(String(delay))
  const [error, setError] = useState<string | undefined>()
  const update = useUpdateClient()
  const { showSuccess } = useSnackbar()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = validateDelay(text)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setError(undefined)
    try {
      await update.mutateAsync({ id: clientId, values: { collection_delay_months: result.value } })
      showSuccess('Ritardo d\'incasso salvato.')
    } catch {
      // L'errore arriva dalla snackbar.
    }
  }

  return (
    <section className="client-detail__section" aria-labelledby="delay-title">
      <h2 id="delay-title" className="settings__group-title">
        Ritardo d'incasso
      </h2>
      <form className="client-detail__form" onSubmit={submit} noValidate>
        <Field label="Mesi di ritardo" help="Un incasso di lavoro di gennaio con ritardo 2 arriva a marzo." error={error} required>
          {(p) => <input {...p} type="text" inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)} />}
        </Field>
        <Button type="submit" loading={update.isPending}>
          Salva ritardo
        </Button>
      </form>
    </section>
  )
}

type RateRow = NonNullable<ReturnType<typeof useClientRates>['data']>[number]

function RatesSection({ clientId, rates }: { clientId: number; rates: RateRow[] }) {
  const now = new Date()
  const [editing, setEditing] = useState<RateRow | null>(null)
  const [rateText, setRateText] = useState('')
  const [year, setYear] = useState(String(now.getFullYear()))
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [errors, setErrors] = useState<RateFormErrors>({})
  const create = useCreateClientRate()
  const update = useUpdateClientRate()
  const remove = useDeleteClientRate()
  const { showSuccess } = useSnackbar()

  function reset() {
    setEditing(null)
    setRateText('')
    setErrors({})
  }

  function startEdit(rate: RateRow) {
    setEditing(rate)
    setRateText(rate.daily_rate.toFixed(2).replace('.', ','))
    setYear(String(rate.valid_from_year))
    setMonth(String(rate.valid_from_month))
    setErrors({})
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = validateRate(
      { dailyRateText: rateText, year: Number(year), month: Number(month) },
      rates.map((rate) => ({ id: rate.id, validFromYear: rate.valid_from_year, validFromMonth: rate.valid_from_month })),
      editing?.id,
    )
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    const values = { daily_rate: result.dailyRate, valid_from_year: Number(year), valid_from_month: Number(month) }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, values })
      else await create.mutateAsync({ client_id: clientId, ...values })
      showSuccess(editing ? 'Tariffa aggiornata.' : 'Tariffa aggiunta.')
      reset()
    } catch {
      // L'errore arriva dalla snackbar; il modulo resta com'è per riprovare.
    }
  }

  async function removeRate(rate: RateRow) {
    try {
      await remove.mutateAsync(rate.id)
      showSuccess('Tariffa eliminata.')
      if (editing?.id === rate.id) reset()
    } catch {
      // L'errore arriva dalla snackbar.
    }
  }

  return (
    <section className="client-detail__section" aria-labelledby="rates-title">
      <h2 id="rates-title" className="settings__group-title">
        Tariffe giornaliere
      </h2>
      {rates.length === 0 ? (
        <p className="settings__status">Nessuna tariffa: aggiungine una per poter calcolare gli incassi.</p>
      ) : (
        <ul className="client-detail__rates" aria-label="Storico delle tariffe">
          {rates.map((rate) => (
            <li key={rate.id} className="client-detail__rate">
              <span className="client-detail__rate-text">
                <span>
                  Dal {monthName(rate.valid_from_month)} {rate.valid_from_year}
                </span>
                <span>
                  <Amount value={rate.daily_rate} colored={false} /> al giorno
                </span>
              </span>
              <span className="client-detail__rate-actions">
                <Button variant="secondary" onClick={() => startEdit(rate)} aria-label={`Modifica tariffa dal ${monthName(rate.valid_from_month)} ${rate.valid_from_year}`}>
                  Modifica
                </Button>
                <Button variant="destructive" onClick={() => removeRate(rate)} aria-label={`Elimina tariffa dal ${monthName(rate.valid_from_month)} ${rate.valid_from_year}`}>
                  Elimina
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form className="client-detail__form" onSubmit={submit} noValidate aria-label={editing ? 'Modifica tariffa' : 'Nuova tariffa'}>
        <h3 className="client-detail__form-title">{editing ? 'Modifica tariffa' : 'Nuova tariffa'}</h3>
        <Field label="Tariffa giornaliera (€)" error={errors.dailyRate} required>
          {(p) => <input {...p} type="text" inputMode="decimal" value={rateText} onChange={(e) => setRateText(e.target.value)} />}
        </Field>
        <div className="client-detail__period">
          <Field label="Valida dal mese" required>
            {(p) => (
              <select {...p} value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Anno" error={errors.validFrom} required>
            {(p) => <input {...p} type="number" inputMode="numeric" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />}
          </Field>
        </div>
        <div className="client-detail__actions">
          <Button type="submit" loading={create.isPending || update.isPending}>
            {editing ? 'Salva modifiche' : 'Aggiungi tariffa'}
          </Button>
          {editing && (
            <Button variant="secondary" onClick={reset}>
              Annulla modifica
            </Button>
          )}
        </div>
      </form>
    </section>
  )
}
