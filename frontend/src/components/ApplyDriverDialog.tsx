import { useState } from 'react'
import { AlertDialog } from 'radix-ui'
import { monthName } from '../lib/months.ts'
import type { DriverApplyPlan } from '../lib/driver-apply.ts'
import Button from './Button.tsx'
import './ApplyDriverDialog.css'

export interface ApplyDriverDialogProps {
  plan: DriverApplyPlan
  /** Motivo per cui non si può applicare (es. mancano tariffe); il pulsante resta visibile ma disabilitato. */
  disabledReason?: string
  onConfirm: () => void | Promise<void>
}

const label = (value: { year: number; month: number }) => `${monthName(value.month)} ${value.year}`

/** Pulsante "Applica al budget" con finestra di conferma: mostra quante righe si sostituiscono e quante si creano. */
export default function ApplyDriverDialog({ plan, disabledReason, onConfirm }: ApplyDriverDialogProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const nothingToDo = plan.replacedCount === 0 && plan.createdCount === 0
  const blocked = disabledReason ?? (nothingToDo ? 'Non c\'è nulla da applicare: nessun incasso previsto e nessuna riga del driver nel budget.' : undefined)

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch {
      // L'errore arriva dalla snackbar; la finestra resta aperta per riprovare.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="apply-driver">
      <AlertDialog.Root open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <AlertDialog.Trigger asChild>
          <Button disabled={blocked !== undefined} loading={busy} aria-describedby={blocked ? 'apply-driver-blocked' : undefined}>
            Applica al budget
          </Button>
        </AlertDialog.Trigger>
        {blocked && (
          <p id="apply-driver-blocked" className="apply-driver__note">
            {blocked}
          </p>
        )}
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="apply-driver__overlay" />
          <AlertDialog.Content className="apply-driver__dialog">
            <AlertDialog.Title className="apply-driver__title">Applicare il driver al budget?</AlertDialog.Title>
            <AlertDialog.Description className="apply-driver__text">
              Da {label(plan.from)} a {label(plan.to)} le righe del driver ricavi vengono ricalcolate dai giorni previsti, di ogni anno. Le righe di altra
              origine, comprese quelle manuali, non si toccano.
            </AlertDialog.Description>
            <dl className="apply-driver__counts">
              <div>
                <dt>Righe sostituite</dt>
                <dd className="num">{plan.replacedCount}</dd>
              </div>
              <div>
                <dt>Righe create</dt>
                <dd className="num">{plan.createdCount}</dd>
              </div>
            </dl>
            {plan.skippedClosedMonths.length > 0 && (
              <p className="apply-driver__text">
                Mesi chiusi, non toccati: {plan.skippedClosedMonths.map(label).join(', ')}.
              </p>
            )}
            <div className="apply-driver__actions">
              <Button onClick={confirm} loading={busy}>
                Applica
              </Button>
              <AlertDialog.Cancel asChild>
                <Button variant="secondary" disabled={busy}>
                  Annulla
                </Button>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
