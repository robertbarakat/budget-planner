/** Periodo scelto in una vista: un anno e, se serve, un mese (null = anno intero). */
export interface Period {
  year: number
  month: number | null
}

export const MIN_YEAR = 2000
export const MAX_YEAR = 2100

function parseInteger(text: string | null, min: number, max: number): number | null {
  if (text === null || !/^\d+$/.test(text)) return null
  const value = Number(text)
  return value >= min && value <= max ? value : null
}

/**
 * Legge il periodo dai parametri di ricerca (`year`, `month`). Un valore mancante o non valido
 * diventa il periodo corrente (anno) o `null`/corrente (mese, secondo `monthMode`).
 * `monthMode`: 'none' ignora il mese; 'optional' lo lascia a null se manca; 'required' usa il mese corrente.
 */
export function readPeriod(
  params: URLSearchParams,
  monthMode: 'none' | 'optional' | 'required',
  now: Date = new Date(),
): Period {
  const year = parseInteger(params.get('year'), MIN_YEAR, MAX_YEAR) ?? now.getFullYear()
  if (monthMode === 'none') return { year, month: null }
  const month = parseInteger(params.get('month'), 1, 12)
  if (month !== null) return { year, month }
  return { year, month: monthMode === 'required' ? now.getMonth() + 1 : null }
}

/** Scrive il periodo nei parametri, lasciando intatti gli altri (es. la modalità della matrice). */
export function writePeriod(params: URLSearchParams, period: Period): URLSearchParams {
  const next = new URLSearchParams(params)
  next.set('year', String(period.year))
  if (period.month === null) next.delete('month')
  else next.set('month', String(period.month))
  return next
}
