import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useClientRatesList, useClients, useWorkedDays } from '../../api/revenue.queries.ts'
import CollectionsTable from '../../components/CollectionsTable.tsx'
import YearSelector from '../../components/YearSelector.tsx'
import { monthName } from '../../lib/months.ts'
import { buildRevenuePreview } from '../../lib/revenue-preview.ts'
import { paths } from '../../paths.ts'
import './RevenueDriverPage.css'
import './settings.css'

export default function RevenueDriverPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const clients = useClients({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const rates = useClientRatesList()
  const workedDays = useWorkedDays()

  const preview = useMemo(() => {
    if (!clients.data || !rates.data || !workedDays.data) return null
    return buildRevenuePreview(
      year,
      clients.data.map((c) => ({
        id: c.id,
        name: c.name,
        archived: c.archived,
        sortOrder: c.sort_order,
        budgetItemId: c.budget_item_id,
        collectionDelayMonths: c.collection_delay_months,
      })),
      rates.data.map((r) => ({
        clientId: r.client_id,
        validFromYear: r.valid_from_year,
        validFromMonth: r.valid_from_month,
        dailyRate: r.daily_rate,
      })),
      workedDays.data.map((d) => ({ clientId: d.client_id, year: d.year, month: d.month, days: d.days })),
    )
  }, [year, clients.data, rates.data, workedDays.data])

  return (
    <main className="settings settings--wide">
      <Link to={paths.settings} className="settings__back">
        ← Impostazioni
      </Link>
      <h1>Previsione ricavi</h1>
      <p className="settings__status">
        Incassi previsti = giorni lavorati × tariffa del mese, spostati in avanti del ritardo d'incasso del cliente. Anteprima: non scrive nel budget.
      </p>
      <YearSelector year={year} onChange={setYear} />
      {clients.isError || rates.isError || workedDays.isError ? (
        <p role="alert" className="settings__status">
          Non riesco a leggere i dati dei ricavi. Riprova più tardi.
        </p>
      ) : !preview ? (
        <p role="status" className="settings__status">
          Caricamento…
        </p>
      ) : preview.current.rows.length === 0 && (clients.data ?? []).length === 0 ? (
        <p className="settings__status">
          Nessun cliente: aggiungine uno in <Link to={paths.settingsClients}>Clienti</Link>.
        </p>
      ) : (
        <>
          {preview.problems.length > 0 && (
            <div role="alert" className="revenue-driver__problems">
              <p>
                <span aria-hidden="true">! </span>
                Per questi mesi ci sono giorni previsti ma nessuna tariffa valida: non entrano nel calcolo. Aggiungi la tariffa nel dettaglio del cliente.
              </p>
              <ul>
                {preview.problems.map((problem) => (
                  <li key={`${problem.clientId}-${problem.year}-${problem.month}`}>
                    {problem.clientName}: {monthName(problem.month)} {problem.year}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <section className="revenue-driver__section" aria-labelledby="current-title">
            <h2 id="current-title" className="settings__group-title">
              Incassi {year}
            </h2>
            <CollectionsTable table={preview.current} label={`Incassi previsti ${year}`} showCarriedIn />
          </section>
          <section className="revenue-driver__section" aria-labelledby="carry-title">
            <h2 id="carry-title" className="settings__group-title">
              Riporto su {year + 1}
            </h2>
            <p className="settings__status">Incassi del {year + 1} che nascono da lavoro del {year}.</p>
            <CollectionsTable table={preview.carryOver} label={`Incassi riportati su ${year + 1}`} />
          </section>
        </>
      )}
    </main>
  )
}
