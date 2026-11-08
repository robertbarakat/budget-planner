import { useState } from 'react'
import { AlertDialog } from 'radix-ui'
import { useCloseMonth, useReopenMonth } from '../api/budget.queries.ts'
import { monthName } from '../lib/months.ts'
import { transactionCountLabel } from '../lib/month-status.ts'
import Button from './Button.tsx'
import { useSnackbar } from './Snackbar.tsx'
import './MonthCloseDialog.css'

export interface MonthCloseDialogProps {
  year: number
  month: number
  closed: boolean
  transactionCount: number
}

/** Pulsante "Chiudi mese" / "Riapri mese" con conferma. Gli errori arrivano dalla snackbar. */
export default function MonthCloseDialog({ year, month, closed, transactionCount }: MonthCloseDialogProps) {
  const [open, setOpen] = useState(false)
  const closeMonth = useCloseMonth()
  const reopenMonth = useReopenMonth()
  const { showSuccess } = useSnackbar()
  const busy = closeMonth.isPending || reopenMonth.isPending
  const label = `${monthName(month)} ${year}`

  async function confirm() {
    try {
      if (closed) {
        await reopenMonth.mutateAsync({ year, month })
        showSuccess(`${label} riaperto: le viste tornano al previsto.`)
      } else {
        await closeMonth.mutateAsync({ year, month })
        showSuccess(`${label} chiuso: le viste mostrano il reale.`)
      }
      setOpen(false)
    } catch {
      // L'errore è già alla snackbar; la finestra resta aperta per riprovare.
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <AlertDialog.Trigger asChild>
        <Button variant="secondary" aria-label={`${closed ? 'Riapri' : 'Chiudi'} ${label}`}>
          {closed ? 'Riapri mese' : 'Chiudi mese'}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="month-close__overlay" />
        <AlertDialog.Content className="month-close__dialog">
          <AlertDialog.Title className="month-close__title">
            {closed ? `Riaprire ${label}?` : `Chiudere ${label}?`}
          </AlertDialog.Title>
          <AlertDialog.Description className="month-close__text">
            {closed
              ? `Le viste torneranno a mostrare il previsto di ${label}. I movimenti restano registrati (${transactionCountLabel(transactionCount)}).`
              : `Da qui le viste mostrano il reale di ${label}: ${transactionCountLabel(transactionCount)} registrati. Puoi riaprire il mese in qualsiasi momento.`}
          </AlertDialog.Description>
          <div className="month-close__actions">
            <Button onClick={confirm} loading={busy}>
              {closed ? 'Riapri' : 'Chiudi'}
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
  )
}
