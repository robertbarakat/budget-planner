import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useClients, useDeleteWorkedDays, useSetWorkedDays, useWorkedDays } from '../../api/revenue.queries.ts'
import { useSnackbar } from '../../components/Snackbar.tsx'
import WorkedDaysCell from '../../components/WorkedDaysCell.tsx'
import YearSelector from '../../components/YearSelector.tsx'
import { monthOptions } from '../../lib/months.ts'
import { buildWorkedDaysGrid, formatDays } from '../../lib/worked-days.ts'
import { paths } from '../../paths.ts'
import '../../components/DataGrid.css'
import './settings.css'

const MONTHS = monthOptions()

export default function WorkedDaysPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const clients = useClients({ orderBy: [{ column: 'sort_order' }, { column: 'id' }] })
  const workedDays = useWorkedDays({ year })
  const setDays = useSetWorkedDays()
  const removeDays = useDeleteWorkedDays()
  const { showError } = useSnackbar()

  const grid = useMemo(() => {
    if (!clients.data || !workedDays.data) return null
    return buildWorkedDaysGrid(
      year,
      clients.data.map((c) => ({ id: c.id, name: c.name, archived: c.archived, sortOrder: c.sort_order })),
      workedDays.data.map((row) => ({ clientId: row.client_id, year: row.year, month: row.month, days: row.days })),
    )
  }, [year, clients.data, workedDays.data])
  const rowIds = useMemo(
    () => new Map((workedDays.data ?? []).map((row) => [`${row.client_id}-${row.month}`, row.id])),
    [workedDays.data],
  )

  return (
    <main className="settings settings--wide">
      <Link to={paths.settings} className="settings__back">
        ← Impostazioni
      </Link>
      <h1>Giorni lavorati</h1>
      <YearSelector year={year} onChange={setYear} />
      {clients.isError || workedDays.isError ? (
        <p role="alert" className="settings__status">
          Non riesco a leggere i giorni lavorati. Riprova più tardi.
        </p>
      ) : !grid ? (
        <p role="status" className="settings__status">
          Caricamento…
        </p>
      ) : grid.rows.length === 0 ? (
        <p className="settings__status">
          Nessuna voce di entrata con tariffa: impostala in <Link to={paths.settingsStructure}>Voci e categorie</Link>.
        </p>
      ) : (
        <div className="data-grid" tabIndex={0} role="region" aria-label={`Giorni lavorati previsti ${year}`}>
          <table className="data-grid__table">
            <thead>
              <tr>
                <th scope="col" className="data-grid__label">
                  Cliente
                </th>
                {MONTHS.map((month) => (
                  <th key={month.value} scope="col">
                    {month.label}
                  </th>
                ))}
                <th scope="col" className="data-grid__sum">
                  Totale
                </th>
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((row) => (
                <tr key={row.clientId}>
                  <th scope="row" className="data-grid__label">
                    {row.archived ? `${row.name} (archiviato)` : row.name}
                  </th>
                  {row.days.map((days, index) => (
                    <td key={`${index}-${days ?? 'x'}`}>
                      <WorkedDaysCell
                        label={`Giorni di ${row.name}, ${MONTHS[index]!.label} ${year}`}
                        value={days}
                        onInvalid={showError}
                        onCommit={async (value) => {
                          if (value === null) {
                            const id = rowIds.get(`${row.clientId}-${index + 1}`)
                            if (id !== undefined) await removeDays.mutateAsync(id)
                          } else {
                            await setDays.mutateAsync({ clientId: row.clientId, year, month: index + 1, days: value })
                          }
                        }}
                      />
                    </td>
                  ))}
                  <td className="data-grid__sum num">{formatDays(row.totalDays)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="data-grid__total">
                <th scope="row" className="data-grid__label">
                  Totale
                </th>
                {grid.monthTotals.map((total, index) => (
                  <td key={index} className="num">
                    {formatDays(total)}
                  </td>
                ))}
                <td className="data-grid__sum num">{formatDays(grid.totalDays)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </main>
  )
}
