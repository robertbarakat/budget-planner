import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useTransaction, useUpdateTransaction } from '../api/transactions.queries.ts'
import { useSnackbar } from '../components/Snackbar.tsx'
import TransactionForm from '../components/TransactionForm.tsx'
import { toFormState, toTransactionPayload } from '../lib/transaction-payload.ts'
import { paths } from '../paths.ts'
import { useTransactionFormOptions } from './use-transaction-form-options.ts'
import './NewTransactionPage.css'

const UPDATED_MESSAGE = { expense: 'Spesa aggiornata.', income: 'Entrata aggiornata.', transfer: 'Trasferimento aggiornato.' } as const

/** Modifica di un movimento: riusa il form del nuovo movimento, con i valori attuali. */
export default function EditTransactionPage() {
  const { id } = useParams()
  const transactionId = Number(id)
  const validId = Number.isInteger(transactionId) && transactionId > 0
  const transaction = useTransaction(validId ? transactionId : null)
  const row = transaction.data
  const options = useTransactionFormOptions({
    accountIds: row ? [row.account_id, ...(row.destination_account_id === null ? [] : [row.destination_account_id])] : [],
    categoryId: row?.category_id ?? null,
  })
  const update = useUpdateTransaction()
  const navigate = useNavigate()
  const { showSuccess } = useSnackbar()

  if (!validId) return <Navigate to={paths.transactions} replace />

  return (
    <main className="new-transaction">
      <Link to={paths.transactions} className="new-transaction__back">
        ← Movimenti
      </Link>
      <h1>Modifica movimento</h1>
      {transaction.isPending || options.isPending ? (
        <p role="status" className="new-transaction__status">
          Caricamento…
        </p>
      ) : transaction.isError || options.isError || !row ? (
        <p role="alert" className="new-transaction__status">
          Non trovo il movimento. Forse è stato eliminato.
        </p>
      ) : (
        <TransactionForm
          accounts={options.accounts}
          categoryGroups={options.groups}
          initial={toFormState(row)}
          submitLabel="Salva modifiche"
          busy={update.isPending}
          onSubmit={async (values) => {
            try {
              await update.mutateAsync({ id: row.id, values: toTransactionPayload(values) })
            } catch {
              // L'errore arriva dalla snackbar; il form resta com'è.
              return
            }
            showSuccess(UPDATED_MESSAGE[values.type])
            await navigate(paths.transactions)
          }}
        />
      )}
    </main>
  )
}
