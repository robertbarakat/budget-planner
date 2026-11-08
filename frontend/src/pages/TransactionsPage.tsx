import { useState } from 'react'
import { useAccounts } from '../api/accounts.queries.ts'
import { useCategories } from '../api/classification.queries.ts'
import { useTransactions } from '../api/transactions.queries.ts'
import Amount from '../components/Amount.tsx'
import Field from '../components/Field.tsx'
import { formatDay, monthName, monthOptions, monthRange } from '../lib/months.ts'
import './TransactionsPage.css'

const TYPE_LABEL = { expense: 'Spesa', income: 'Entrata', transfer: 'Trasferimento' } as const

export default function TransactionsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [yearText, setYearText] = useState(String(now.getFullYear()))

  const transactions = useTransactions(monthRange(year, month))
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
            <select {...p} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
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
          Nessun movimento a {monthName(month)} {year}.
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
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </main>
  )
}
