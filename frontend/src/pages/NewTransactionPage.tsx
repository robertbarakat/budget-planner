import { Link, useNavigate, useSearchParams } from 'react-router'
import { useLinkDeadlineToTransaction } from '../api/tax.queries.ts'
import { useCreateTransaction } from '../api/transactions.queries.ts'
import { readDeadlineId, readDuePrefill } from '../lib/due-prefill.ts'
import { paths } from '../paths.ts'
import { toTransactionPayload } from '../lib/transaction-payload.ts'
import { useSnackbar } from '../components/Snackbar.tsx'
import TransactionForm from '../components/TransactionForm.tsx'
import { useTransactionFormOptions } from './use-transaction-form-options.ts'
import './NewTransactionPage.css'

const SAVED_MESSAGE = { expense: 'Spesa salvata.', income: 'Entrata salvata.', transfer: 'Trasferimento salvato.' } as const

export default function NewTransactionPage() {
  const options = useTransactionFormOptions()
  const create = useCreateTransaction()
  const link = useLinkDeadlineToTransaction()
  const { showSuccess } = useSnackbar()
  // Dopo un salvataggio il form riparte vuoto (nuova chiave = nuovo form), pronto per un altro inserimento.
  // Da "Registra pagamento" (scheda Prossime scadenze) il form parte precompilato; tutti i campi restano modificabili.
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // Dal calendario F24 (Registra versamento): al salvataggio il movimento si collega alla scadenza.
  const deadlineId = readDeadlineId(searchParams)
  const prefill = options.isPending || options.isError ? null : readDuePrefill(searchParams, options.groups, options.accounts.map((a) => a.id))

  return (
    <main className="new-transaction">
      <h1>Nuovo movimento</h1>
      {prefill && (
        <p className="new-transaction__status">
          Precompilato dalla scadenza: controlla i dati e salva.{' '}
          <Link to={deadlineId !== null ? paths.taxF24 : paths.home} className="new-transaction__back">
            Annulla
          </Link>
        </p>
      )}
      {options.isPending ? (
        <p role="status" className="new-transaction__status">
          Caricamento…
        </p>
      ) : options.isError ? (
        <p role="alert" className="new-transaction__status">
          Non riesco a leggere conti e categorie. Riprova più tardi.
        </p>
      ) : (
        <TransactionForm
          key={prefill ? 'due' : 'blank'}
          initial={prefill ?? undefined}
          busy={create.isPending}
          accounts={options.accounts}
          categoryGroups={options.groups}
          onSubmit={async (values) => {
            let created
            try {
              created = await create.mutateAsync(toTransactionPayload(values))
            } catch {
              // L'errore arriva dalla snackbar; il form non si svuota, così nulla va perso.
              return
            }
            showSuccess(SAVED_MESSAGE[values.type])
            if (deadlineId !== null) {
              try {
                await link.mutateAsync({ deadlineId, transactionId: created.id })
                showSuccess('Versamento collegato alla scadenza F24.')
              } catch {
                // Il movimento c'è già: l'errore (snackbar) dice cosa è andato storto, si può collegare dal calendario F24.
              }
            }
            navigate(deadlineId !== null ? paths.taxF24 : paths.transactions)
          }}
        />
      )}
    </main>
  )
}
