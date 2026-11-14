import { useState } from 'react'
import { AlertDialog } from 'radix-ui'
import { Link, useSearchParams } from 'react-router'
import { useAccounts } from '../api/accounts.queries.ts'
import { useCategories } from '../api/classification.queries.ts'
import { useDeleteTransaction, useTransactions } from '../api/transactions.queries.ts'
import Amount from '../components/Amount.tsx'
import Button from '../components/Button.tsx'
import Field from '../components/Field.tsx'
import { useSnackbar } from '../components/Snackbar.tsx'
import { readPeriod } from '../lib/period.ts'
import { formatAmount } from '../lib/format-amount.ts'
import { formatDay, monthName, monthOptions, monthRange } from '../lib/months.ts'
import { paths } from '../paths.ts'
import './TransactionsPage.css'

const TYPE_LABEL = { expense: 'Spesa', income: 'Entrata', transfer: 'Trasferimento' } as const

export default function TransactionsPage() {
  // Il periodo di partenza può arrivare dall'indirizzo (es. dal dettaglio del flusso di cassa): ?year=2026&month=3.
  const [searchParams] = useSearchParams()
  const [initial] = useState(() => readPeriod(searchParams, 'required'))
  const [month, setMonth] = useState<number | null>(initial.month ?? new Date().getMonth() + 1)
  const [year, setYear] = useState(initial.year)
  const [yearText, setYearText] = useState(String(initial.year))

  const transactions = useTransactions(month === null ? { from: `${year}-01-01`, to: `${year}-12-31` } : monthRange(year, month))
  const remove = useDeleteTransaction()
  const { showSuccess } = useSnackbar()
  const [pendingDelete, setPendingDelete] = useState<{ id: number; summary: string } | null>(null)
  // Tutti i conti e le categorie, anche archiviati: lo storico li mostra comunque.
  const accounts = useAccounts()
  const categories = useCategories()

  const accountName = new Map((accounts.data ?? []).map((account) => [account.id, account.name]))
  const categoryName = new Map((categories.data ?? []).map((category) => [category.id, category.name]))

  const rows = transactions.data ?? []
  // Già in ordine di data decrescente: si raggruppano i giorni consecutivi.
  const days: { date: string; rows: typeof rows }[] = []
  for (const row of rows) {
    const last = days.at(-1)
    if (last && last.date === row.transaction_date) last.rows.push(row)
    else days.push({ date: row.transaction_date, rows: [row] })
  }

  const loading = transactions.isPending || accounts.isPending || categories.isPending
  const failed = transactions.isError || accounts.isError || categories.isError

  return (
    <main className="transactions">
      <h1>Movimenti</h1>

      <div className="transactions__filter">
        <Field label="Mese">
          {(p) => (
            <select {...p} value={month ?? ''} onChange={(e) => setMonth(e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">Anno intero</option>
              {monthOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>
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

      {loading ? (
        <p role="status" className="transactions__status">
          Caricamento…
        </p>
      ) : failed ? (
        <p role="alert" className="transactions__status">
          Non riesco a leggere i movimenti. Riprova più tardi.
        </p>
      ) : days.length === 0 ? (
        <p className="transactions__status">
          {month === null ? `Nessun movimento nel ${year}.` : `Nessun movimento a ${monthName(month)} ${year}.`}
        </p>
      ) : (
        days.map((day) => (
          <section key={day.date} className="transactions__day" aria-labelledby={`day-${day.date}`}>
            <h2 id={`day-${day.date}`} className="transactions__day-title">
              {formatDay(day.date)}
            </h2>
            <ul className="transactions__list">
              {day.rows.map((row) => {
                const isTransfer = row.type === 'transfer'
                const origin = accountName.get(row.account_id) ?? ''
                const title = isTransfer
                  ? `${origin} → ${accountName.get(row.destination_account_id ?? -1) ?? ''}`
                  : (categoryName.get(row.category_id ?? -1) ?? 'Senza categoria')
                const amount = Number(row.amount)
                return (
                  <li key={row.id} className={`transactions__item transactions__item--${row.type}`}>
                    <div className="transactions__main">
                      <span className="transactions__title">{title}</span>
                      <span className="transactions__meta">
                        <span className="transactions__type">{TYPE_LABEL[row.type]}</span>
                        {!isTransfer && <span>{origin}</span>}
                        {row.comment && <span className="transactions__comment">{row.comment}</span>}
                      </span>
                    </div>
                    {/* Spesa col segno meno, entrata col più; il trasferimento non cambia il totale: nessun segno né colore. */}
                    <Amount
                      value={row.type === 'expense' ? -amount : amount}
                      explicitPlus={row.type === 'income'}
                      colored={!isTransfer}
                    />
                    <div className="transactions__actions">
                      <Link to={paths.editTransaction(row.id)} className="button button--secondary" aria-label={`Modifica ${title}`}>
                        Modifica
                      </Link>
                      <Button
                        variant="secondary"
                        aria-label={`Elimina ${title}`}
                        onClick={() =>
                          setPendingDelete({
                            id: row.id,
                            summary: `${formatDay(row.transaction_date)}, ${formatAmount(amount)}, ${title}`,
                          })
                        }
                      >
                        Elimina
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}

      <AlertDialog.Root open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="transactions__overlay" />
          <AlertDialog.Content className="transactions__dialog">
            <AlertDialog.Title className="transactions__dialog-title">Eliminare questo movimento?</AlertDialog.Title>
            <AlertDialog.Description className="transactions__dialog-text">
              {pendingDelete?.summary}. L'eliminazione non si può annullare.
            </AlertDialog.Description>
            <div className="transactions__dialog-actions">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">Annulla</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    const target = pendingDelete
                    setPendingDelete(null)
                    if (!target) return
                    try {
                      await remove.mutateAsync(target.id)
                      showSuccess('Movimento eliminato.')
                    } catch {
                      // L'errore arriva dalla snackbar: il movimento resta nell'elenco.
                    }
                  }}
                >
                  Elimina
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </main>
  )
}
