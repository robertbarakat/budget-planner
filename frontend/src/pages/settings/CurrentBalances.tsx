import { useCurrentBalances } from '../../api/accounts.queries.ts'
import Amount from '../../components/Amount.tsx'
import { todayIso } from '../../lib/dates.ts'
import './CurrentBalances.css'

interface AccountLike {
  id: number
  name: string
  archived: boolean
}

/** Saldo corrente di ogni conto e totale. Il calcolo sta nel servizio (funzione pura di `shared/`): qui si mostra. */
export default function CurrentBalances({ accounts }: { accounts: AccountLike[] }) {
  const today = todayIso()
  const year = Number(today.slice(0, 4))
  const balances = useCurrentBalances(year, today)

  const data = balances.data
  // Conti archiviati solo se hanno un saldo diverso da zero: così il totale coincide con le righe mostrate.
  const shown = accounts.filter((account) => !account.archived || (data?.balances[account.id] ?? 0) !== 0)

  return (
    <section className="current-balances" aria-labelledby="current-balances-title">
      <h2 id="current-balances-title" className="current-balances__title">
        Saldo corrente
      </h2>
      <p className="current-balances__note">
        Saldo iniziale {year} più i movimenti dell&apos;anno fino a oggi. Se un conto non ha il saldo iniziale, parte da zero.
      </p>
      {balances.isPending ? (
        <p role="status" className="settings__status">
          Caricamento…
        </p>
      ) : balances.isError || !data ? (
        <p role="alert" className="settings__status">
          Non riesco a calcolare i saldi. Riprova più tardi.
        </p>
      ) : shown.length === 0 ? (
        <p className="settings__status">Nessun conto.</p>
      ) : (
        <>
          <ul className="current-balances__list">
            {shown.map((account) => (
              <li key={account.id} className="current-balances__row">
                <span>{account.name}</span>
                <Amount value={data.balances[account.id] ?? 0} />
              </li>
            ))}
          </ul>
          <p className="current-balances__total">
            <span>Totale</span>
            <Amount value={data.total} colored={false} />
          </p>
        </>
      )}
    </section>
  )
}
