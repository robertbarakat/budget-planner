import { useState, type FormEvent } from 'react'
import { Dialog } from 'radix-ui'
import {
  FREQUENCY_OPTIONS,
  validateRecurrenceForm,
  type RecurrenceFormErrors,
  type RecurrenceFormState,
  type RecurrenceFormValues,
} from '../lib/recurrence-form.ts'
import Button from './Button.tsx'
import Field from './Field.tsx'
import './MoveDialog.css'
import './RecurrenceFormDialog.css'

export interface RecurrenceChoice {
  id: number
  name: string
}

export interface RecurrenceFormDialogProps {
  title: string
  submitLabel: string
  /** Pulsante che apre la finestra. */
  trigger: React.ReactNode
  initial: RecurrenceFormState
  budgetItems: RecurrenceChoice[]
  accounts: RecurrenceChoice[]
  description?: string
  onSubmit: (values: RecurrenceFormValues) => void | Promise<void>
}

/** Finestra con il form di una ricorrenza (nuova o esistente). Gli errori di salvataggio arrivano dalla snackbar. */
export default function RecurrenceFormDialog({
  title,
  submitLabel,
  trigger,
  initial,
  budgetItems,
  accounts,
  description,
  onSubmit,
}: RecurrenceFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState(initial)
  const [errors, setErrors] = useState<RecurrenceFormErrors>({})
  const [busy, setBusy] = useState(false)

  function onOpenChange(next: boolean) {
    if (busy) return
    setOpen(next)
    if (next) {
      setState(initial)
      setErrors({})
    }
  }

  function update<K extends keyof RecurrenceFormState>(key: K, value: RecurrenceFormState[K]) {
    setState((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = validateRecurrenceForm(state)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setBusy(true)
    try {
      await onSubmit(result.values)
      setOpen(false)
    } catch {
      // L'errore è già alla snackbar; la finestra resta aperta per riprovare.
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="move-dialog__overlay" />
        <Dialog.Content className="move-dialog recurrence-dialog">
          <Dialog.Title className="move-dialog__title">{title}</Dialog.Title>
          <Dialog.Description className="move-dialog__text">
            {description ?? 'Le scadenze diventano righe di budget.'}
          </Dialog.Description>
          <form className="recurrence-dialog__form" onSubmit={submit} noValidate>
            <Field label="Nome" error={errors.name} required>
              {(p) => <input {...p} type="text" autoComplete="off" value={state.name} onChange={(e) => update('name', e.target.value)} />}
            </Field>
            <Field label="Voce di budget" error={errors.budgetItem} required>
              {(p) => (
                <select {...p} value={state.budgetItemId} onChange={(e) => update('budgetItemId', e.target.value)}>
                  <option value="">Scegli…</option>
                  {budgetItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Conto" error={errors.account} required>
              {(p) => (
                <select {...p} value={state.accountId} onChange={(e) => update('accountId', e.target.value)}>
                  <option value="">Scegli…</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Importo base (€)" error={errors.amount} required>
              {(p) => (
                <input {...p} type="text" inputMode="decimal" autoComplete="off" value={state.amountText} onChange={(e) => update('amountText', e.target.value)} />
              )}
            </Field>
            <Field label="Periodicità" required>
              {(p) => (
                <select {...p} value={state.frequency} onChange={(e) => update('frequency', e.target.value as RecurrenceFormState['frequency'])}>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Data di inizio" error={errors.startDate} required>
              {(p) => <input {...p} type="date" value={state.startDate} onChange={(e) => update('startDate', e.target.value)} />}
            </Field>
            <Field label="Data di fine" help="Facoltativa: senza fine si generano le scadenze dei prossimi 24 mesi." error={errors.endDate}>
              {(p) => <input {...p} type="date" value={state.endDate} onChange={(e) => update('endDate', e.target.value)} />}
            </Field>
            <div className="move-dialog__actions">
              <Button type="submit" loading={busy}>{submitLabel}</Button>
              <Dialog.Close asChild>
                <Button variant="secondary" disabled={busy}>Annulla</Button>
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
