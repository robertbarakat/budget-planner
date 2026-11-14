import { useState, type FormEvent } from 'react'
import { Dialog } from 'radix-ui'
import type { Recurrence, RecurrenceOccurrence } from 'budget-planner-shared'
import {
  useChangeOccurrenceAmount,
  useOccurrences,
  useRestoreOccurrenceAmount,
} from '../api/recurrences.queries.ts'
import { isOccurrenceModified, validateOccurrenceAmount } from '../lib/occurrence-amount.ts'
import Amount from './Amount.tsx'
import Button from './Button.tsx'
import Field from './Field.tsx'
import { formatDate } from '../lib/dates.ts'
import { useSnackbar } from './Snackbar.tsx'
import './MoveDialog.css'
import './RecurrenceOccurrencesDialog.css'

export interface RecurrenceOccurrencesDialogProps {
  recurrence: Recurrence
  /** Entrata: importi positivi; spesa: negativi (il segno non si memorizza, lo dà la voce). */
  kind: 'income' | 'expense'
}

function toInputText(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

interface RowProps {
  occurrence: RecurrenceOccurrence
  recurrence: Recurrence
  kind: 'income' | 'expense'
}

function OccurrenceRow({ occurrence, recurrence, kind }: RowProps) {
  const change = useChangeOccurrenceAmount()
  const restore = useRestoreOccurrenceAmount()
  const { showSuccess } = useSnackbar()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | undefined>()
  const modified = isOccurrenceModified(occurrence.amount, recurrence.base_amount)
  const sign = kind === 'income' ? 1 : -1

  function startEditing() {
    setText(toInputText(occurrence.amount))
    setError(undefined)
    setEditing(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const result = validateOccurrenceAmount(text)
    if (!result.ok) {
      setError(result.error)
      return
    }
    try {
      await change.mutateAsync({ occurrenceId: occurrence.id, amount: result.amount })
      showSuccess(`Scadenza del ${formatDate(occurrence.due_date)} aggiornata.`)
      setEditing(false)
    } catch {
      // L'errore è già alla snackbar; il campo resta aperto per riprovare.
    }
  }

  async function restoreBase() {
    try {
      await restore.mutateAsync({ occurrenceId: occurrence.id, baseAmount: recurrence.base_amount })
      showSuccess(`Scadenza del ${formatDate(occurrence.due_date)} riportata all'importo base.`)
    } catch {
      // L'errore è già alla snackbar.
    }
  }

  return (
    <li className="occurrences__row">
      <div className="occurrences__summary">
        <span className="occurrences__date">{formatDate(occurrence.due_date)}</span>
        {modified && <span className="occurrences__badge">Modificata</span>}
        {occurrence.registered_at && <span className="occurrences__badge">Registrata</span>}
        <Amount value={sign * occurrence.amount} explicitPlus={kind === 'income'} />
      </div>
      {editing ? (
        <form className="occurrences__form" onSubmit={save} noValidate>
          <Field label={`Importo del ${formatDate(occurrence.due_date)} (€)`} error={error} required>
            {(p) => (
              <input {...p} type="text" inputMode="decimal" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
            )}
          </Field>
          <div className="move-dialog__actions">
            <Button type="submit" loading={change.isPending}>Salva</Button>
            <Button variant="secondary" disabled={change.isPending} onClick={() => setEditing(false)}>Annulla</Button>
          </div>
        </form>
      ) : (
        <div className="occurrences__actions">
          <Button variant="secondary" aria-label={`Modifica la scadenza del ${formatDate(occurrence.due_date)}`} onClick={startEditing}>
            Modifica
          </Button>
          {modified && (
            <Button
              variant="secondary"
              aria-label={`Ripristina l'importo base della scadenza del ${formatDate(occurrence.due_date)}`}
              loading={restore.isPending}
              onClick={restoreBase}
            >
              Ripristina base
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

/** Dettaglio di una ricorrenza: scadenze con data e importo; modifica di una sola scadenza e ripristino dell'importo base. */
export default function RecurrenceOccurrencesDialog({ recurrence, kind }: RecurrenceOccurrencesDialogProps) {
  const [open, setOpen] = useState(false)
  const occurrences = useOccurrences(open ? recurrence.id : null)
  const rows = occurrences.data ?? []

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="text-link" aria-label={`Scadenze di ${recurrence.name}`}>Scadenze</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="move-dialog__overlay" />
        <Dialog.Content className="move-dialog occurrences">
          <Dialog.Title className="move-dialog__title">Scadenze di {recurrence.name}</Dialog.Title>
          <Dialog.Description className="move-dialog__text">
            Cambi l'importo di una scadenza senza toccare le altre né l'importo base ({kind === 'income' ? 'entrata' : 'spesa'}).
          </Dialog.Description>
          {occurrences.isPending ? (
            <p role="status">Caricamento…</p>
          ) : occurrences.isError ? (
            <p role="alert">Non riesco a leggere le scadenze. Riprova più tardi.</p>
          ) : rows.length === 0 ? (
            <p>Nessuna scadenza.</p>
          ) : (
            <ul className="occurrences__list" aria-label="Scadenze">
              {rows.map((row) => (
                <OccurrenceRow key={row.id} occurrence={row} recurrence={recurrence} kind={kind} />
              ))}
            </ul>
          )}
          <div className="move-dialog__actions">
            <Dialog.Close asChild>
              <Button variant="secondary">Chiudi</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
