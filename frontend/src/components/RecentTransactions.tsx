import { Link } from 'react-router'
import { useAccounts } from '../api/accounts.queries.ts'
import { useCategories } from '../api/classification.queries.ts'
import { useTransactions } from '../api/transactions.queries.ts'
import { formatShortDay } from '../lib/months.ts'
import { paths } from '../paths.ts'
import AmountRow from './AmountRow.tsx'
import './RecentTransactions.css'
import SectionTitle from './SectionTitle.tsx'

const COUNT = 5
const TYPE_LABEL = { expense: 'Spesa', income: 'Entrata', transfer: 'Trasferimento' } as const

/** Ultime registrazioni (le più recenti) con il link a tutti i movimenti. */
export default function RecentTransactions() {
  const transactions = useTransactions({ limit: COUNT })
  // Tutti i conti e le categorie, anche archiviati: lo storico li mostra comunque.
  const accounts = useAccounts()
  const categories = useCategories()

  const accountName = new Map((accounts.data ?? []).map((a) => [a.id, a.name]))
  const categoryName = new Map((categories.data ?? []).map((c) => [c.id, c.name]))
  const loading = transactions.isPending || accounts.isPending || categories.isPending
  const failed = transactions.isError || accounts.isError || categories.isError

  return (
    <section className="recent" aria-labelledby="recent-title">
      <SectionTitle id="recent-title" >
        Ultime registrazioni
      </SectionTitle>
      {loading ? (
        <p role="status" className="recent__note">
          Caricamento…
        </p>
      ) : failed ? (
        <p role="alert" className="recent__note">
          Non riesco a leggere i movimenti. Riprova più tardi.
        </p>
      ) : (transactions.data ?? []).length === 0 ? (
        <p className="recent__note">Nessun movimento registrato.</p>
      ) : (
        <ul className="recent__list">
          {(transactions.data ?? []).map((row) => {
            const isTransfer = row.type === 'transfer'
            const origin = accountName.get(row.account_id) ?? ''
            const title = isTransfer
              ? `${origin} → ${accountName.get(row.destination_account_id ?? -1) ?? ''}`
              : (categoryName.get(row.category_id ?? -1) ?? 'Senza categoria')
            const amount = Number(row.amount)
            return (
              <AmountRow
                key={row.id}
                title={title}
                meta={`${formatShortDay(row.transaction_date)} · ${TYPE_LABEL[row.type]}${!isTransfer ? ` · ${origin}` : ''}`}
                // Spesa col segno meno, entrata col più; il trasferimento non ha segno né colore.
                amount={row.type === 'expense' ? -amount : amount}
                explicitPlus={row.type === 'income'}
                colored={!isTransfer}
              />
            )
          })}
        </ul>
      )}
      <Link to={paths.transactions} className="recent__all">
        Tutti i movimenti
      </Link>
    </section>
  )
}
