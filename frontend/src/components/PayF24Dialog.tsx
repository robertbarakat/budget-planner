import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { useAccounts } from '../api/accounts.queries.ts'
import { useLinkDeadlineToTransaction } from '../api/tax.queries.ts'
import { useCreateTransaction } from '../api/transactions.queries.ts'
import { planPayment, type PayableDeadline, type TaxRole } from '../lib/f24-pay.ts'
import { todayIso } from '../lib/dates.ts'
import Amount from './Amount.tsx'
import Button from './Button.tsx'
import Field from './Field.tsx'
import { useSnackbar } from './Snackbar.tsx'
import './MoveDialog.css'

const italianDate = (date: string) => date.split('-').reverse().join('/')

export interface PayF24DialogProps {
  /** Righe dell'F24 ancora da versare (stessa scadenza). */
  deadlines: readonly PayableDeadline[]
  installmentById: ReadonlyMap<number, { interest: number }>
  itemByRole: ReadonlyMap<TaxRole, number>
  categoryOfItem: ReadonlyMap<number, number>
  dueDate: string
}

/** "Pago": registra in un colpo i movimenti dell'F24 (capitale per riga, interessi per tributo) e li collega alle scadenze. */
export default function PayF24Dialog({ deadlines, installmentById, itemByRole, categoryOfItem, dueDate }: PayF24DialogProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(dueDate)
  const [accountId, setAccountId] = useState('')
  const [busy, setBusy] = useState(false)
  const accounts = useAccounts()
  const create = useCreateTransaction()
  const link = useLinkDeadlineToTransaction()
  const { showSuccess } = useSnackbar()
  const plan = planPayment(deadlines, installmentById, itemByRole, categoryOfItem)
  const total = 'movements' in plan ? plan.movements.reduce((sum, m) => sum + Math.round(m.amount * 100), 0) / 100 : 0

  async function confirm() {
    if (!('movements' in plan) || accountId === '') return
    setBusy(true)
    try {
      for (const movement of plan.movements) {
        const created = await create.mutateAsync({
          type: 'expense',
          transaction_date: date,
          amount: movement.amount,
          account_id: Number(accountId),
          category_id: movement.categoryId,
          budget_item_id: movement.budgetItemId,
          comment: `F24 ${italianDate(dueDate)}`,
        })
        if (movement.deadlineId !== null) await link.mutateAsync({ deadlineId: movement.deadlineId, transactionId: created.id })
      }
      setOpen(false)
      showSuccess(`F24 del ${italianDate(dueDate)} registrato: ${plan.movements.length} movimenti.`)
    } catch {
      // L'errore arriva dalla snackbar; i movimenti già creati restano e la scadenza si può ricollegare dal calendario.
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDate(dueDate <= todayIso() ? dueDate : todayIso())
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className="text-link text-link--strong" aria-label={`Pago l'F24 del ${italianDate(dueDate)}`}>
          Pago
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="move-dialog__overlay" />
        <Dialog.Content className="move-dialog">
          <Dialog.Title className="move-dialog__title">Pago l'F24 del {italianDate(dueDate)}</Dialog.Title>
          <Dialog.Description className="move-dialog__text">
            {'error' in plan ? (
              plan.error
            ) : (
              <>
                Registro {plan.movements.length} movimenti per <Amount value={total} colored={false} />: capitale di ogni riga e interessi, sulle voci imposta, INPS e interessi. Le righe risultano versate.
              </>
            )}
          </Dialog.Description>
          <Field label="Data del versamento" required>
            {(p) => <input {...p} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label="Conto" required>
            {(p) => (
              <select {...p} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Scegli…</option>
                {(accounts.data ?? []).filter((a) => !a.archived).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="move-dialog__actions">
            <Button onClick={() => void confirm()} loading={busy} disabled={'error' in plan || accountId === '' || date === ''}>
              Conferma
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
