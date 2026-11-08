import { useSearchParams } from 'react-router'
import { readPeriod, writePeriod, type Period } from '../lib/period.ts'
import { monthOptions } from '../lib/months.ts'
import Field from './Field.tsx'
import YearSelector from './YearSelector.tsx'
import './PeriodSelector.css'

export type MonthMode = 'none' | 'optional' | 'required'

const MONTHS = monthOptions()

/** Periodo della vista, letto e scritto nell'indirizzo (`?year=2026&month=3`): ricaricare o condividere lo mantiene. */
export function usePeriod(monthMode: MonthMode): [Period, (next: Period) => void] {
  const [params, setParams] = useSearchParams()
  const period = readPeriod(params, monthMode)
  const setPeriod = (next: Period) => setParams((current) => writePeriod(current, next), { replace: true })
  return [period, setPeriod]
}

export interface PeriodSelectorProps {
  period: Period
  onChange: (next: Period) => void
  /** 'none' solo anno; 'optional' aggiunge "Anno intero"; 'required' obbliga a scegliere un mese. */
  monthMode: MonthMode
}

/** Selettore di anno (precedente/successivo/digitato, qualsiasi anno) e, dove serve, di mese. */
export default function PeriodSelector({ period, onChange, monthMode }: PeriodSelectorProps) {
  return (
    <div className="period-selector">
      <YearSelector year={period.year} onChange={(year) => onChange({ ...period, year })} />
      {monthMode !== 'none' && (
        <Field label="Mese">
          {(control) => (
            <select
              {...control}
              value={period.month ?? ''}
              onChange={(event) => onChange({ ...period, month: event.target.value === '' ? null : Number(event.target.value) })}
            >
              {monthMode === 'optional' && <option value="">Anno intero</option>}
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
    </div>
  )
}
