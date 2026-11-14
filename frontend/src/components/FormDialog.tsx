import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import './MoveDialog.css'

/** Finestra di dialogo con titolo, descrizione e contenuto: l'impalcatura comune a tutte le finestre di modifica. */
export default function FormDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  className,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger: ReactNode
  title: ReactNode
  description?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="move-dialog__overlay" />
        <Dialog.Content className={['move-dialog', className].filter(Boolean).join(' ')}>
          <Dialog.Title className="move-dialog__title">{title}</Dialog.Title>
          {description && <Dialog.Description className="move-dialog__text">{description}</Dialog.Description>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
