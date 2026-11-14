import { useState } from 'react'
import { useSaveTaxParameters, useTaxParameters, useTaxParametersList } from '../../api/tax.queries.ts'
import Button from '../../components/Button.tsx'
import TaxNav from '../../components/TaxNav.tsx'
import Field from '../../components/Field.tsx'
import { useSnackbar } from '../../components/Snackbar.tsx'
import YearSelector from '../../components/YearSelector.tsx'
import {
  defaultAdvanceDates,
  draftFromTaxParameters,
  emptyTaxParametersDraft,
  type AdvanceMethod,
  validateTaxParameters,
  type TaxParametersDraft,
  type TaxParametersErrors,
} from '../../lib/tax-parameters-form.ts'
import './TaxParametersPage.css'
import './settings.css'

export default function TaxParametersPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const parameters = useTaxParameters(year)
  const saved = useTaxParametersList()

  return (
    <main className="settings">
      <h1>Tasse e contributi</h1>
      <TaxNav />
      <h2>Parametri fiscali</h2>
      <p className="settings__status">Valori per anno: coefficiente, aliquote e dati dell'attività. I calcoli fiscali usano quelli dell'anno scelto.</p>
      <YearSelector year={year} onChange={setYear} />
      {parameters.isError || saved.isError ? (
        <p role="alert" className="settings__status">
          Non riesco a leggere i parametri fiscali. Riprova più tardi.
        </p>
      ) : parameters.isPending || saved.isPending ? (
        <p role="status" className="settings__status">
          Caricamento…
        </p>
      ) : (
        // La chiave rimonta il modulo quando cambia l'anno o i dati salvati, ripartendo dai valori letti.
        <TaxParametersForm
          key={`${year}-${parameters.data?.id ?? 'new'}`}
          year={year}
          initial={parameters.data ? draftFromTaxParameters(parameters.data) : { ...emptyTaxParametersDraft, ...defaultAdvanceDates(year, saved.data ?? []) }}
          exists={parameters.data !== null}
        />
      )}
    </main>
  )
}

function TaxParametersForm({ year, initial, exists }: { year: number; initial: TaxParametersDraft; exists: boolean }) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<TaxParametersErrors>({})
  const save = useSaveTaxParameters()
  const { showSuccess } = useSnackbar()
  const set = <K extends keyof TaxParametersDraft>(key: K, value: TaxParametersDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const result = validateTaxParameters(draft, year)
    if ('errors' in result) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    // Gli errori di salvataggio arrivano alla snackbar dal gestore globale.
    save.mutate({ year, values: result.values }, { onSuccess: () => showSuccess(`Parametri fiscali ${year} salvati.`) })
  }

  return (
    <form className="tax-parameters" onSubmit={submit} noValidate>
      {!exists && <p className="settings__status">Nessun parametro per il {year}: compila i campi e salva.</p>}
      <Field label="Coefficiente di redditività (%)" error={errors.profitabilityCoefficient} required>
        {(control) => (
          <input {...control} inputMode="decimal" value={draft.profitabilityCoefficient} onChange={(e) => set('profitabilityCoefficient', e.target.value)} />
        )}
      </Field>
      <Field label="Aliquota INPS (%)" error={errors.inpsRate} required>
        {(control) => <input {...control} inputMode="decimal" value={draft.inpsRate} onChange={(e) => set('inpsRate', e.target.value)} />}
      </Field>
      <Field label="Aliquota imposta sostitutiva (%)" error={errors.substituteTaxRate} required>
        {(control) => (
          <input {...control} inputMode="decimal" value={draft.substituteTaxRate} onChange={(e) => set('substituteTaxRate', e.target.value)} />
        )}
      </Field>
      <Field label="Anno di inizio attività" error={errors.activityStartYear} required>
        {(control) => <input {...control} inputMode="numeric" value={draft.activityStartYear} onChange={(e) => set('activityStartYear', e.target.value)} />}
      </Field>
      <Field label="Data primo acconto (vale anche per il saldo dell'anno prima)" error={errors.firstAdvanceDueDate} required>
        {(control) => <input {...control} type="date" value={draft.firstAdvanceDueDate} onChange={(e) => set('firstAdvanceDueDate', e.target.value)} />}
      </Field>
      <Field label="Metodo del primo acconto" help="Storico: come l'anno scorso. Previsionale: sugli incassi reali.">
        {(control) => (
          <select {...control} value={draft.firstAdvanceMethod} onChange={(e) => set('firstAdvanceMethod', e.target.value as AdvanceMethod)}>
            <option value="historic">Storico</option>
            <option value="forecast">Previsionale</option>
          </select>
        )}
      </Field>
      <Field label="Data secondo acconto" error={errors.secondAdvanceDueDate} required>
        {(control) => <input {...control} type="date" value={draft.secondAdvanceDueDate} onChange={(e) => set('secondAdvanceDueDate', e.target.value)} />}
      </Field>
      <Field label="Metodo del secondo acconto">
        {(control) => (
          <select {...control} value={draft.secondAdvanceMethod} onChange={(e) => set('secondAdvanceMethod', e.target.value as AdvanceMethod)}>
            <option value="historic">Storico</option>
            <option value="forecast">Previsionale</option>
          </select>
        )}
      </Field>
      <Field label="Percentuale del primo acconto (%)" error={errors.firstAdvancePercent} help="Quota del dovuto: 50 e 50 di norma, 40 e 40 se lo decidi tu.">
        {(control) => <input {...control} inputMode="decimal" value={draft.firstAdvancePercent} onChange={(e) => set('firstAdvancePercent', e.target.value)} />}
      </Field>
      <Field label="Percentuale del secondo acconto (%)" error={errors.secondAdvancePercent}>
        {(control) => <input {...control} inputMode="decimal" value={draft.secondAdvancePercent} onChange={(e) => set('secondAdvancePercent', e.target.value)} />}
      </Field>
      <label className="tax-parameters__check">
        <input type="checkbox" checked={draft.isStartup} onChange={(e) => set('isStartup', e.target.checked)} />
        Start-up
      </label>
      <label className="tax-parameters__check">
        <input type="checkbox" checked={draft.hasOtherPensionCoverage} onChange={(e) => set('hasOtherPensionCoverage', e.target.checked)} />
        Altra copertura previdenziale
      </label>
      <Button type="submit" loading={save.isPending}>
        Salva
      </Button>
    </form>
  )
}
