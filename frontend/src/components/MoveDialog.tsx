import { useState, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import Button from './Button.tsx'
import Field from './Field.tsx'
import './MoveDialog.css'

export interface MoveOption {
  id: number
  name: string
}

export interface MoveDialogProps {
  /** Testo del pulsante che apre la finestra, es. "Sposta". */
  triggerLabel: string
  /** Nome accessibile del pulsante, es. "Sposta Spesa casa". */
  triggerAriaLabel: string
  title: string
  /** Etichetta della scelta, es. "Nuova macro-area". */
  fieldLabel: string
  options: MoveOption[]
  onConfirm: (id: number) => void | Promise<void>
  /** Testo aggiuntivo sotto il titolo (es. cosa cambia e cosa no). */
  description?: ReactNode
}

/** Finestra per spostare un elemento in un altro gruppo: scelta tra `options` e conferma. */
export default function MoveDialog({
  triggerLabel,
  triggerAriaLabel,
  title,
  fieldLabel,
  options,
  onConfirm,
  description,
}: MoveDialogProps) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setTarget('')
      setError(undefined)
    }
  }

  async function confirm() {
    if (!target) {
      setError('Scegli una destinazione.')
      return
    }
    setBusy(true)
    try {
      await onConfirm(Number(target))
      setOpen(false)
    } catch {
      // L'errore arriva dalla snackbar; la finestra resta aperta per riprovare.
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="secondary" aria-label={triggerAriaLabel}>
          {triggerLabel}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="move-dialog__overlay" />
        <Dialog.Content className="move-dialog">
          <Dialog.Title className="move-dialog__title">{title}</Dialog.Title>
          <Dialog.Description className="move-dialog__text">{description ?? 'Scegli dove spostarlo.'}</Dialog.Description>
          <Field label={fieldLabel} error={error} required>
            {(p) => (
              <select {...p} value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Scegli…</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="move-dialog__actions">
            <Button onClick={confirm} loading={busy}>
              Sposta
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
