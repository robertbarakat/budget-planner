import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { useUpdateF24Deadline } from '../api/tax.queries.ts'
import { parseAmount } from '../lib/parse-amount.ts'
import Button from './Button.tsx'
import Field from './Field.tsx'
import { useSnackbar } from './Snackbar.tsx'
import './MoveDialog.css'

export interface F24AmountDialogProps {
  id: number
  /** Descrizione della scadenza, per il nome accessibile. */
  label: string
  amount: number
}

/** Modifica a mano l'importo di una scadenza F24 non ancora versata. */
export default function F24AmountDialog({ id, label, amount }: F24AmountDialogProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | undefined>()
  const update = useUpdateF24Deadline()
  const { showSuccess } = useSnackbar()

  function confirm() {
    const value = parseAmount(text)
    if (value === null || value <= 0) {
      setError('Inserisci un importo maggiore di zero.')
      return
    }
    update.mutate(
      { id, values: { amount: value, is_amount_manual: true } },
      {
        onSuccess: () => {
          setOpen(false)
          showSuccess('Importo aggiornato.')
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
          setText(String(amount).replace('.', ','))
          setError(undefined)
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className="text-link text-link--quiet" aria-label={`Modifica importo ${label}`}>
          Modifica importo
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="move-dialog__overlay" />
        <Dialog.Content className="move-dialog">
          <Dialog.Title className="move-dialog__title">Importo della scadenza</Dialog.Title>
          <Dialog.Description className="move-dialog__text">{label}. Il nuovo importo vale al posto del calcolo e il ricalcolo non lo cambia.</Dialog.Description>
          <Field label="Importo (EUR)" error={error} required>
            {(p) => <input {...p} inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} />}
          </Field>
          <div className="move-dialog__actions">
            <Button onClick={confirm} loading={update.isPending}>Salva</Button>
            <Dialog.Close asChild>
              <Button variant="secondary">Annulla</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
