import { AlertDialog } from 'radix-ui'
import Button from './Button.tsx'
import './ReclassifyHistoryDialog.css'

export interface ReclassifyHistoryDialogProps {
  /** `null` = chiusa. */
  request: { categoryName: string; budgetItemName: string; count: number } | null
  busy?: boolean
  /** Scelta esplicita: riclassifica lo storico. */
  onYes: () => void
  /** Scelta esplicita, oppure chiusura (Esc): lo storico non cambia. */
  onNo: () => void
}

/**
 * "Riclassificare anche lo storico?" Dopo aver spostato una categoria. Nessuna risposta è preselezionata:
 * si risponde con uno dei due pulsanti; chiudere la finestra vale "no" (lo storico non si tocca mai di default).
 */
export default function ReclassifyHistoryDialog({ request, busy = false, onYes, onNo }: ReclassifyHistoryDialogProps) {
  const noun = request?.count === 1 ? 'movimento' : 'movimenti'
  return (
    <AlertDialog.Root open={request !== null} onOpenChange={(open) => !open && !busy && onNo()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="reclassify__overlay" />
        <AlertDialog.Content className="reclassify">
          <AlertDialog.Title className="reclassify__title">Riclassificare anche lo storico?</AlertDialog.Title>
          <AlertDialog.Description className="reclassify__text">
            «{request?.categoryName}» ora è nella voce «{request?.budgetItemName}», e così saranno i nuovi movimenti.{' '}
            {request?.count} {noun} già registrat{request?.count === 1 ? 'o' : 'i'} con questa categoria hanno ancora la voce di prima.
          </AlertDialog.Description>
          <div className="reclassify__actions">
            <Button variant="secondary" onClick={onNo} disabled={busy}>
              No, lascia lo storico
            </Button>
            <Button onClick={onYes} loading={busy}>
              Sì, riclassifica {request?.count} {noun}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
