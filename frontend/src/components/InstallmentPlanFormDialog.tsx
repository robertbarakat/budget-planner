import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { useCreateInstallmentPlanWithInstallments } from '../api/tax.queries.ts'
import {
  emptyInstallmentPlanDraft,
  validateInstallmentPlan,
  type InstallmentPlanDraft,
  type InstallmentPlanErrors,
} from '../lib/installments.ts'
import { taxTypeLabels } from '../lib/f24-plan.ts'
import Button from './Button.tsx'
import Field from './Field.tsx'
import { useSnackbar } from './Snackbar.tsx'
import './InstallmentPlanFormDialog.css'
import './MoveDialog.css'

const TAX_TYPES = Object.keys(taxTypeLabels) as (keyof typeof taxTypeLabels)[]

/** Nuova rateizzazione con le sue rate (numero = posizione, scadenza, importo). Gli interessi si ricavano dalla differenza. */
export default function InstallmentPlanFormDialog() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<InstallmentPlanDraft>(emptyInstallmentPlanDraft)
  const [errors, setErrors] = useState<InstallmentPlanErrors>({})
  const create = useCreateInstallmentPlanWithInstallments()
  const { showSuccess } = useSnackbar()

  const setRow = (index: number, key: 'dueDate' | 'amountText', value: string) =>
    setDraft((d) => ({ ...d, rows: d.rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)) }))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const result = validateInstallmentPlan(draft)
    if ('errors' in result) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    const v = result.values
    create.mutate(
      [{ description: v.description, total_amount: v.totalAmount, tax_type: v.taxType, reference_year: v.referenceYear }, v.installments],
      {
        onSuccess: () => {
          setOpen(false)
          showSuccess('Rateizzazione creata.')
        },
      },
    )
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setDraft({ ...emptyInstallmentPlanDraft, referenceYearText: String(new Date().getFullYear() - 1), rows: [{ dueDate: '', amountText: '' }] })
          setErrors({})
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button>Nuova rateizzazione</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="move-dialog__overlay" />
        <Dialog.Content className="move-dialog installment-form">
          <Dialog.Title className="move-dialog__title">Nuova rateizzazione</Dialog.Title>
          <Dialog.Description className="move-dialog__text">Gli interessi sono la somma delle rate meno l'importo rateizzato.</Dialog.Description>
          <form className="installment-form__fields" onSubmit={submit} noValidate>
            <Field label="Descrizione" error={errors.description} required>
              {(p) => <input {...p} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />}
            </Field>
            <Field label="Importo rateizzato (EUR)" error={errors.total} required>
              {(p) => <input {...p} inputMode="decimal" value={draft.totalText} onChange={(e) => setDraft({ ...draft, totalText: e.target.value })} />}
            </Field>
            <Field label="Tributo">
              {(p) => (
                <select {...p} value={draft.taxType} onChange={(e) => setDraft({ ...draft, taxType: e.target.value as InstallmentPlanDraft['taxType'] })}>
                  {TAX_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {taxTypeLabels[type]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Anno di riferimento" error={errors.referenceYear} required>
              {(p) => <input {...p} inputMode="numeric" value={draft.referenceYearText} onChange={(e) => setDraft({ ...draft, referenceYearText: e.target.value })} />}
            </Field>
            <fieldset className="installment-form__rows">
              <legend>Rate</legend>
              {draft.rows.map((row, index) => (
                <div key={index} className="installment-form__row">
                  <Field label={`Scadenza rata ${index + 1}`}>
                    {(p) => <input {...p} type="date" value={row.dueDate} onChange={(e) => setRow(index, 'dueDate', e.target.value)} />}
                  </Field>
                  <Field label={`Importo rata ${index + 1} (EUR)`}>
                    {(p) => <input {...p} inputMode="decimal" value={row.amountText} onChange={(e) => setRow(index, 'amountText', e.target.value)} />}
                  </Field>
                  {draft.rows.length > 1 && (
                    <Button variant="secondary" aria-label={`Togli la rata ${index + 1}`} onClick={() => setDraft((d) => ({ ...d, rows: d.rows.filter((_, i) => i !== index) }))}>
                      Togli
                    </Button>
                  )}
                </div>
              ))}
              {errors.rows && <p role="alert" className="installment-form__error">{errors.rows}</p>}
              <Button variant="secondary" onClick={() => setDraft((d) => ({ ...d, rows: [...d.rows, { dueDate: '', amountText: '' }] }))}>
                Aggiungi rata
              </Button>
            </fieldset>
            <div className="move-dialog__actions">
              <Button type="submit" loading={create.isPending}>
                Crea
              </Button>
              <Dialog.Close asChild>
                <Button variant="secondary">Annulla</Button>
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
