import { useState, type FormEvent, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { readBudgetAmount } from '../lib/budget-cell.ts'
import { sourceLabel, type GridEntryInput } from '../lib/budget-grid.ts'
import { formatAmount } from '../lib/format-amount.ts'
import Button from './Button.tsx'
import Field from './Field.tsx'
import './BudgetCellDialog.css'

export interface BudgetCellDialogProps {
  /** Il pulsante che apre la finestra (la cella). */
  trigger: ReactNode
  /** Es. "Affitto, Marzo 2026". */
  title: string
  kind: 'income' | 'expense'
  /** Righe della cella, di qualsiasi origine. */
  entries: GridEntryInput[]
  /** Importo manuale da salvare, o `null` per eliminare la riga manuale. */
  onSave: (amount: number | null) => void | Promise<void>
}

function toInputText(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

/** Modifica della riga manuale di una cella del budget; le righe di altra origine si mostrano e non si toccano. */
export default function BudgetCellDialog({ trigger, title, kind, entries, onSave }: BudgetCellDialogProps) {
  const manual = entries.filter((entry) => entry.source === 'manual')
  const others = entries.filter((entry) => entry.source !== 'manual')
  const manualTotal = manual.reduce((sum, entry) => sum + Math.round(entry.amount * 100), 0) / 100

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setText(manual.length > 0 ? toInputText(manualTotal) : '')
      setError(undefined)
      setConfirming(false)
    }
  }

  async function save(amount: number | null) {
    setBusy(true)
    try {
      await onSave(amount)
      setOpen(false)
    } catch {
      // L'errore arriva dalla snackbar; la finestra resta aperta per riprovare.
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const input = readBudgetAmount(text)
    if (input.kind === 'error') {
      setError(input.message)
      return
    }
    setError(undefined)
    if (input.kind === 'empty') {
      if (manual.length === 0) setOpen(false)
      else await save(null)
      return
    }
    // Una riga di altra origine non si affianca senza conferma esplicita.
    if (others.length > 0 && manual.length === 0 && !confirming) {
      setConfirming(true)
      return
    }
    await save(input.value)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="budget-cell-dialog__overlay" />
        <Dialog.Content className="budget-cell-dialog">
          <Dialog.Title className="budget-cell-dialog__title">{title}</Dialog.Title>
          <Dialog.Description className="budget-cell-dialog__text">
            {kind === 'income' ? 'Entrata prevista.' : 'Spesa prevista.'} Scrivi l'importo senza segno; lascia vuoto per togliere la riga manuale.
          </Dialog.Description>
          {entries.length > 0 && (
            <ul className="budget-cell-dialog__entries" aria-label="Righe già presenti">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <span>{sourceLabel(entry.source)}</span>
                  <span className="num">{formatAmount(entry.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {manual.length > 1 && (
            <p className="budget-cell-dialog__text">Ci sono {manual.length} righe manuali: salvando diventano una sola.</p>
          )}
          <form className="budget-cell-dialog__form" onSubmit={submit} noValidate>
            <Field label="Importo previsto manuale (€)" error={error}>
              {(control) => (
                <input
                  {...control}
                  inputMode="decimal"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value)
                    setConfirming(false)
                  }}
                />
              )}
            </Field>
            {confirming && (
              <p role="alert" className="budget-cell-dialog__warning">
                <span aria-hidden="true">! </span>
                In questa cella c'è già una riga non manuale ({others.map((entry) => sourceLabel(entry.source)).join(', ')}). La riga manuale
                si aggiunge accanto e non la sostituisce.
              </p>
            )}
            <div className="budget-cell-dialog__actions">
              <Button type="submit" loading={busy}>
                {confirming ? 'Aggiungi accanto' : 'Salva'}
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
