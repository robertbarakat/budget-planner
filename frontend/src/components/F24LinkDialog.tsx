import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { useLinkDeadlineToTransaction } from '../api/tax.queries.ts'
import Button from './Button.tsx'
import Field from './Field.tsx'
import { formatAbsoluteAmount } from '../lib/format-amount.ts'
import { useSnackbar } from './Snackbar.tsx'
import './MoveDialog.css'

export interface LinkCandidate {
  id: number
  date: string
  amount: number
  comment: string | null
}

export interface F24LinkDialogProps {
  deadlineId: number
  /** Descrizione della scadenza, per il nome accessibile. */
  label: string
  /** Spese non ancora collegate a nessuna scadenza. */
  candidates: readonly LinkCandidate[]
}

const italianDate = (date: string) => date.split('-').reverse().join('/')

/** Collega alla scadenza un movimento già registrato (nessun movimento nuovo). */
export default function F24LinkDialog({ deadlineId, label, candidates }: F24LinkDialogProps) {
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState('')
  const [error, setError] = useState<string | undefined>()
  const link = useLinkDeadlineToTransaction()
  const { showSuccess } = useSnackbar()

  function confirm() {
    if (!choice) {
      setError('Scegli un movimento.')
      return
    }
    link.mutate(
      { deadlineId, transactionId: Number(choice) },
      {
        onSuccess: () => {
          setOpen(false)
          showSuccess('Movimento collegato alla scadenza.')
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
          setChoice('')
          setError(undefined)
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant="secondary" aria-label={`Collega un movimento a ${label}`}>
          Collega movimento
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="move-dialog__overlay" />
        <Dialog.Content className="move-dialog">
          <Dialog.Title className="move-dialog__title">Collega un movimento</Dialog.Title>
          <Dialog.Description className="move-dialog__text">
            {label}. Il movimento scelto risulta come versamento della scadenza; non se ne crea uno nuovo.
          </Dialog.Description>
          <Field label="Movimento (spese non ancora collegate)" error={error} required>
            {(p) => (
              <select {...p} value={choice} onChange={(e) => setChoice(e.target.value)}>
                <option value="">Scegli…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {italianDate(c.date)} · {formatAbsoluteAmount(c.amount)} · {c.comment || 'senza commento'}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="move-dialog__actions">
            <Button onClick={confirm} loading={link.isPending}>
              Collega
            </Button>
            <Dialog.Close asChild>
              <Button variant="secondary">Annulla</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
