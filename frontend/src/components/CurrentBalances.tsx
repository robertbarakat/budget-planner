import { useCurrentBalances } from '../api/accounts.queries.ts'
import Amount from './Amount.tsx'
import AmountRow from './AmountRow.tsx'
import { todayIso } from '../lib/dates.ts'
import './CurrentBalances.css'

interface AccountLike {
  id: number
  name: string
  archived: boolean
}

/** Saldo corrente di ogni conto e totale. Il calcolo sta nel servizio (funzione pura di `shared/`): qui si mostra. */
export interface CurrentBalancesProps {
  accounts: AccountLike[]
  /** Titolo della scheda (predefinito "Saldo corrente"). */
  title?: string
  /** Nasconde la nota esplicativa (es. nella Home). */
  hideNote?: boolean
}

export default function CurrentBalances({ accounts, title = 'Saldo corrente', hideNote = false }: CurrentBalancesProps) {
  const today = todayIso()
  const year = Number(today.slice(0, 4))
  const balances = useCurrentBalances(year, today)

  const data = balances.data
  // Conti archiviati solo se hanno un saldo diverso da zero: così il totale coincide con le righe mostrate.
  const shown = accounts.filter((account) => !account.archived || (data?.balances[account.id] ?? 0) !== 0)
    .sort((x, y) => (data?.balances[y.id] ?? 0) - (data?.balances[x.id] ?? 0))

  return (
    <section className="current-balances" aria-labelledby="current-balances-title">
      <h2 id="current-balances-title" className="current-balances__title">
        {title}
      </h2>
      {!hideNote && (
        <p className="current-balances__note">
          Saldo iniziale {year} più i movimenti dell&apos;anno fino a oggi. Se un conto non ha il saldo iniziale, parte da zero.
        </p>
      )}
      {balances.isPending ? (
        <p role="status" className="current-balances__status">
          Caricamento…
        </p>
      ) : balances.isError || !data ? (
        <p role="alert" className="current-balances__status">
          Non riesco a calcolare i saldi. Riprova più tardi.
        </p>
      ) : shown.length === 0 ? (
        <p className="current-balances__status">Nessun conto.</p>
      ) : (
        <>
          <ul className="current-balances__list">
            {shown.map((account) => (
              <AmountRow key={account.id} title={account.name} amount={data.balances[account.id] ?? 0} />
            ))}
          </ul>
          <p className="current-balances__total">
            <span>Totale</span>
            <Amount value={data.total} />
          </p>
        </>
      )}
    </section>
  )
}
