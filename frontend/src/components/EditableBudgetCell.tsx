import type { ReactNode } from 'react'
import BudgetCellDialog, { type BudgetCellDialogProps } from './BudgetCellDialog.tsx'

/** Cella del budget che si tocca per modificare l'importo manuale (apre la finestra di modifica). */
export default function EditableBudgetCell({
  title,
  ariaLabel,
  kind,
  entries,
  onSave,
  children,
}: {
  title: string
  ariaLabel: string
  kind: BudgetCellDialogProps['kind']
  entries: BudgetCellDialogProps['entries']
  onSave: (amount: number | null) => Promise<void>
  children: ReactNode
}) {
  return (
    <BudgetCellDialog
      title={title}
      kind={kind}
      entries={entries}
      onSave={onSave}
      trigger={
        <button type="button" className="budget-cell__button" aria-label={ariaLabel}>
          {children}
        </button>
      }
    />
  )
}
