import { useState, type KeyboardEvent } from 'react'
import { cellValue, type Matrix, type MatrixCell, type MatrixMode } from '../lib/matrix.ts'
import { monthOptions } from '../lib/months.ts'
import Amount from './Amount.tsx'
import './DataGrid.css'
import './MatrixGrid.css'

const MONTHS = monthOptions()
const COLUMNS = 13 // 12 mesi + totale annuo

export interface MatrixGridProps {
  matrix: Matrix
  mode: MatrixMode
  label: string
}

/**
 * Matrice voci × mesi con intestazioni fisse. Le celle si raggiungono con le frecce (Home/Fine
 * per i bordi della riga): un solo punto di tabulazione, come in una griglia.
 */
export default function MatrixGrid({ matrix, mode, label }: MatrixGridProps) {
  const [active, setActive] = useState({ row: 0, col: 0 })
  let rowIndex = -1

  function move(event: KeyboardEvent<HTMLTableElement>) {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-row]')
    if (!cell) return
    const row = Number(cell.dataset.row)
    const col = Number(cell.dataset.col)
    const rowCount = event.currentTarget.querySelectorAll('tr[data-has-cells]').length
    const next = { row, col }
    if (event.key === 'ArrowRight') next.col = Math.min(COLUMNS - 1, col + 1)
    else if (event.key === 'ArrowLeft') next.col = Math.max(0, col - 1)
    else if (event.key === 'ArrowDown') next.row = Math.min(rowCount - 1, row + 1)
    else if (event.key === 'ArrowUp') next.row = Math.max(0, row - 1)
    else if (event.key === 'Home') next.col = 0
    else if (event.key === 'End') next.col = COLUMNS - 1
    else return
    event.preventDefault()
    setActive(next)
    event.currentTarget.querySelector<HTMLElement>(`[data-row="${next.row}"][data-col="${next.col}"]`)?.focus()
  }

  const cells = (months: MatrixCell[], year: MatrixCell, row: number, total = false) =>
    [...months, year].map((cell, col) => (
      <td
        key={col}
        role="gridcell"
        data-row={row}
        data-col={col}
        tabIndex={active.row === row && active.col === col ? 0 : -1}
        onFocus={() => setActive({ row, col })}
        className={col === 12 ? 'data-grid__sum' : undefined}
      >
        <Amount
          value={cellValue(cell, mode)}
          colored={mode === 'variance'}
          explicitPlus={mode === 'variance'}
          className={total ? 'matrix-grid__strong' : undefined}
        />
      </td>
    ))

  return (
    <div className="data-grid matrix-grid" role="region" aria-label={label}>
      <table className="data-grid__table" role="grid" aria-label={label} onKeyDown={move}>
        <thead>
          <tr>
            <th scope="col" className="data-grid__label">
              Voce
            </th>
            {MONTHS.map((month) => (
              <th key={month.value} scope="col">
                {month.label.slice(0, 3)}
                {mode === 'mixed' && (
                  <span className="matrix-grid__state">
                    {matrix.closedMonths[month.value - 1] ? '✓ reale' : '○ previsto'}
                  </span>
                )}
              </th>
            ))}
            <th scope="col" className="data-grid__sum">
              Totale {matrix.year}
            </th>
          </tr>
        </thead>
        {matrix.groups.map((group) => {
          rowIndex += 1
          const groupRow = rowIndex
          return (
            <tbody key={group.macroAreaId}>
              <tr className="data-grid__group" data-has-cells>
                <th scope="rowgroup" className="data-grid__label">
                  {group.archived ? `${group.name} (archiviata)` : group.name}
                </th>
                {cells(group.months, group.year, groupRow)}
              </tr>
              {group.items.map((item) => {
                rowIndex += 1
                return (
                  <tr key={item.budgetItemId} data-has-cells>
                    <th scope="row" className="data-grid__label">
                      {item.archived ? `${item.name} (archiviata)` : item.name}
                    </th>
                    {cells(item.months, item.year, rowIndex)}
                  </tr>
                )
              })}
            </tbody>
          )
        })}
        <tfoot>
          <tr className="data-grid__total" data-has-cells>
            <th scope="row" className="data-grid__label">
              Totale
            </th>
            {cells(matrix.months, matrix.total, rowIndex + 1, true)}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
