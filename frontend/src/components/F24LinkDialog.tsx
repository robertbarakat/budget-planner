import { useState } from 'react'
import { Dialog } from 'radix-ui'
import FormDialog from './FormDialog.tsx'
import { useLinkDeadlineToTransaction } from '../api/tax.queries.ts'
import Button from './Button.tsx'
import Field from './Field.tsx'
import { formatAbsoluteAmount } from '../lib/format-amount.ts'
import { useSnackbar } from './Snackbar.tsx'
import { formatDate } from '../lib/dates.ts'

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
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setChoice('')
          setError(undefined)
        }
      }}
      trigger={<button type="button" className="text-link" aria-label={`Collega un movimento a ${label}`}>
          Collega movimento
        </button>}
      title={<>Collega un movimento</>}
      description={<>
            {label}. Il movimento scelto risulta come versamento della scadenza; non se ne crea uno nuovo.
          </>}
    >
      <Field label="Movimento (spese non ancora collegate)" error={error} required>
            {(p) => (
              <select {...p} value={choice} onChange={(e) => setChoice(e.target.value)}>
                <option value="">Scegli…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatDate(c.date)} · {formatAbsoluteAmount(c.amount)} · {c.comment || 'senza commento'}
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
    </FormDialog>
  )
}
