import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useCreateTransaction } from '../api/transactions.queries.ts'
import { readDuePrefill } from '../lib/due-prefill.ts'
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
  const { showSuccess } = useSnackbar()
  // Dopo un salvataggio il form riparte vuoto (nuova chiave = nuovo form), pronto per un altro inserimento.
  const [formKey, setFormKey] = useState(0)
  // Da "Registra pagamento" (scheda Prossime scadenze) il form parte precompilato; tutti i campi restano modificabili.
  const [searchParams, setSearchParams] = useSearchParams()
  const prefill = options.isPending || options.isError ? null : readDuePrefill(searchParams, options.groups, options.accounts.map((a) => a.id))

  return (
    <main className="new-transaction">
      <h1>Nuovo movimento</h1>
      {prefill && (
        <p className="new-transaction__status">
          Precompilato dalla scadenza: controlla i dati e salva.{' '}
          <Link to={paths.home} className="new-transaction__back">
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
          key={`${formKey}-${prefill ? "due" : "blank"}`}
          initial={prefill ?? undefined}
          busy={create.isPending}
          accounts={options.accounts}
          categoryGroups={options.groups}
          onSubmit={async (values) => {
            try {
              await create.mutateAsync(toTransactionPayload(values))
            } catch {
              // L'errore arriva dalla snackbar; il form non si svuota, così nulla va perso.
              return
            }
            showSuccess(SAVED_MESSAGE[values.type])
            // Il prossimo inserimento riparte vuoto: si tolgono i valori della scadenza dall'indirizzo.
            if (prefill) setSearchParams({}, { replace: true })
            setFormKey((key) => key + 1)
          }}
        />
      )}
    </main>
  )
}
