import { useMemo } from 'react'
import Amount from '../components/Amount.tsx'
import MonthStatusBadge from '../components/MonthStatusBadge.tsx'
import { buildCashFlow } from '../lib/cash-flow.ts'
import { summarizeMonthExpenses } from '../lib/home.ts'
import { buildMacroAreaReport } from '../lib/macro-areas.ts'
import { monthName } from '../lib/months.ts'
import { useYearInputs } from './use-year-inputs.ts'
import './HomePage.css'

export default function HomePage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const { inputs, isError } = useYearInputs(year)

  const summary = useMemo(() => {
    if (!inputs) return null
    const flow = buildCashFlow(
      year,
      inputs.openingBalance,
      inputs.budgetItems.map((i) => ({ id: i.id, name: i.name, kind: i.kind, archived: i.archived })),
      inputs.entries,
      inputs.transactions,
      inputs.closedMonths,
    )
    const report = buildMacroAreaReport(year, month, inputs.areas, inputs.budgetItems, inputs.entries, inputs.transactions, inputs.closedMonths)
    const current = flow.months[month - 1]!
    return { endBalance: current.endBalance, isClosed: current.isClosed, expenses: summarizeMonthExpenses(report) }
  }, [inputs, year, month])

  const monthLabel = `${monthName(month)} ${year}`

  return (
    <main className="home-page">
      <header className="home-page__header">
        <h1>Home</h1>
        <p className="home-page__month">
          <span className="home-page__month-name">{monthLabel}</span>
          {summary && <MonthStatusBadge closed={summary.isClosed} />}
        </p>
      </header>
      {isError ? (
        <p role="alert" className="home-page__note">
          Non riesco a leggere i dati. Riprova più tardi.
        </p>
      ) : !summary ? (
        <p role="status" className="home-page__note">
          Caricamento…
        </p>
      ) : (
        <>
          <section className="home-card" aria-labelledby="home-cash-title">
            <h2 id="home-cash-title" className="home-card__title">
              Cassa prevista a fine mese
            </h2>
            <p className="home-card__big">
              <Amount value={summary.endBalance} colored={false} />
            </p>
            <p className="home-card__hint">Saldo a fine {monthName(month)}: reale nei mesi chiusi, previsto negli altri.</p>
          </section>

          <section className="home-card" aria-labelledby="home-expenses-title">
            <h2 id="home-expenses-title" className="home-card__title">
              Spese del mese
            </h2>
            <dl className="home-card__figures">
              <div>
                <dt>Reale</dt>
                <dd>
                  <Amount value={summary.expenses.actual} colored={false} />
                </dd>
              </div>
              <div>
                <dt>Previsto</dt>
                <dd>
                  <Amount value={summary.expenses.budgeted} colored={false} />
                </dd>
              </div>
              <div>
                <dt>Scostamento</dt>
                <dd>
                  <Amount value={summary.expenses.variance} explicitPlus />
                </dd>
              </div>
            </dl>
            <p className="home-card__hint">
              {summary.expenses.variance < 0
                ? 'Spese oltre il previsto.'
                : summary.expenses.variance > 0
                  ? 'Spese sotto il previsto.'
                  : 'Spese in linea con il previsto.'}
            </p>
          </section>
        </>
      )}
    </main>
  )
}
