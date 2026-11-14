import { useState, type FormEvent } from 'react'
import { eurosToCents, sumCents } from 'budget-planner-shared'
import { useOpeningBalances, useSetOpeningBalance } from '../../api/accounts.queries.ts'
import Amount from '../../components/Amount.tsx'
import Field from '../../components/Field.tsx'
import { useSnackbar } from '../../components/Snackbar.tsx'
import { parseAmount } from '../../lib/parse-amount.ts'
import './OpeningBalances.css'

interface AccountLike {
  id: number
  name: string
  archived: boolean
}

type BalanceRow = NonNullable<ReturnType<typeof useOpeningBalances>['data']>[number]

const SOURCE_LABEL: Record<BalanceRow['source'], string> = { manual: 'Manuale', carried_over: 'Riportato' }

/** Saldi iniziali dell'anno per conto, con la somma. Inserimento a mano (il riporto automatico è un altro ticket). */
export default function OpeningBalances({ accounts }: { accounts: AccountLike[] }) {
  const [yearText, setYearText] = useState(() => String(new Date().getFullYear()))
  const [year, setYear] = useState(() => new Date().getFullYear())
  const balances = useOpeningBalances({ where: { year } })

  const rows = balances.data ?? []
  const byAccount = new Map(rows.map((row) => [row.account_id, row]))
  // Conti archiviati solo se hanno un saldo in quell'anno: la somma resta quella dei saldi mostrati.
  const shown = accounts.filter((account) => !account.archived || byAccount.has(account.id))
  const total = sumCents(shown.flatMap((account) => byAccount.get(account.id) ?? []).map((row) => eurosToCents(row.amount))) / 100

  return (
    <details className="opening-balances">
      <summary className="opening-balances__title">Saldi iniziali</summary>
      <p className="settings__status">Quanto avevi su ogni conto a inizio anno: da qui parte il saldo di Home e Flusso di cassa.</p>
      <div className="opening-balances__year">
        <Field label="Anno">
          {(p) => (
            <input
              {...p}
              type="number"
              inputMode="numeric"
              min={2000}
              max={2100}
              value={yearText}
              onChange={(e) => {
                // Il testo si può cancellare e riscrivere; l'anno cambia solo quando è valido.
                setYearText(e.target.value)
                const next = Number(e.target.value)
                if (e.target.value !== '' && Number.isInteger(next) && next >= 2000 && next <= 2100) setYear(next)
              }}
            />
          )}
        </Field>
      </div>

      {balances.isPending ? (
        <p role="status" className="settings__status">
          Caricamento…
        </p>
      ) : balances.isError ? (
        <p role="alert" className="settings__status">
          Non riesco a leggere i saldi iniziali. Riprova più tardi.
        </p>
      ) : shown.length === 0 ? (
        <p className="settings__status">Nessun conto: aggiungine uno qui sopra.</p>
      ) : (
        <>
          <ul className="opening-balances__list">
            {shown.map((account) => {
              const balance = byAccount.get(account.id)
              return (
                <li key={`${account.id}-${year}-${balance?.amount ?? 'x'}-${balance?.source ?? 'x'}`}>
                  <BalanceForm account={account} year={year} balance={balance} />
                </li>
              )
            })}
          </ul>
          <p className="opening-balances__total">
            <span>Somma dei saldi iniziali {year}</span>
            <Amount value={total} className="opening-balances__total-value" />
          </p>
        </>
      )}
    </details>
  )
}

function BalanceForm({ account, year, balance }: { account: AccountLike; year: number; balance: BalanceRow | undefined }) {
  const save = useSetOpeningBalance()
  const { showSuccess } = useSnackbar()
  const [text, setText] = useState(balance ? String(balance.amount).replace('.', ',') : '')
  const [error, setError] = useState<string | undefined>()

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const amount = parseAmount(text)
    if (amount === null) {
      setError('Scrivi un importo valido, per esempio 1.234,50.')
      return
    }
    setError(undefined)
    try {
      await save.mutateAsync({ accountId: account.id, year, amount })
      showSuccess(`Saldo iniziale di ${account.name} salvato.`)
    } catch {
      // L'errore di rete o di server arriva dalla snackbar; qui si tiene il valore digitato.
    }
  }

  return (
    <form className="opening-balances__row" onSubmit={onSubmit} noValidate>
      <div className="opening-balances__field">
        <Field label={`Saldo iniziale ${account.name}`} error={error}>
          {(p) => (
            <input {...p} type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" value={text} onChange={(e) => setText(e.target.value)} />
          )}
        </Field>
      </div>
      <span className="opening-balances__source">{balance ? SOURCE_LABEL[balance.source] : 'Non impostato'}</span>
      <button type="submit" className="text-link" disabled={save.isPending} aria-label={`Salva saldo iniziale ${account.name}`}>
        Salva
      </button>
    </form>
  )
}
