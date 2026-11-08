import type { PreviewTable } from '../lib/revenue-preview.ts'
import { monthOptions } from '../lib/months.ts'
import Amount from './Amount.tsx'
import './CollectionsTable.css'
import './DataGrid.css'

const MONTHS = monthOptions()

export interface CollectionsTableProps {
  table: PreviewTable
  /** Titolo accessibile, es. "Incassi previsti 2026". */
  label: string
  /** Segnala con un'etichetta gli incassi che arrivano da lavoro dell'anno prima. */
  showCarriedIn?: boolean
}

/** Tabella clienti × mesi degli incassi previsti, con totale per mese e per anno. */
export default function CollectionsTable({ table, label, showCarriedIn = false }: CollectionsTableProps) {
  return (
    <div className="data-grid" tabIndex={0} role="region" aria-label={label}>
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
              Totale {table.year}
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.clientId}>
              <th scope="row" className="data-grid__label">
                {row.archived ? `${row.name} (archiviato)` : row.name}
              </th>
              {row.cells.map((cell, index) => (
                <td key={index}>
                  {cell === null ? (
                    <span className="collections__empty" aria-label="nessun incasso">
                      –
                    </span>
                  ) : (
                    <span className="collections__cell">
                      <Amount value={cell.cents / 100} colored={false} />
                      {showCarriedIn && cell.fromPreviousYear && (
                        <span className="collections__carried" title="Da lavoro dell'anno precedente">
                          da anno precedente
                        </span>
                      )}
                    </span>
                  )}
                </td>
              ))}
              <td className="data-grid__sum">
                <Amount value={row.totalCents / 100} colored={false} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="data-grid__total">
            <th scope="row" className="data-grid__label">
              Totale
            </th>
            {table.monthCents.map((cents, index) => (
              <td key={index}>
                <Amount value={cents / 100} colored={false} />
              </td>
            ))}
            <td className="data-grid__sum">
              <Amount value={table.totalCents / 100} colored={false} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
