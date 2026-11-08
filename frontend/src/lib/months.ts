const monthFormatter = new Intl.DateTimeFormat('it-IT', { month: 'long', timeZone: 'UTC' })
const shortDayFormatter = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const dayFormatter = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Nome del mese in italiano (1 = gennaio), es. "novembre". */
export function monthName(month: number): string {
  return monthFormatter.format(new Date(Date.UTC(2000, month - 1, 1)))
}

/** Mesi dell'anno con numero e nome, per una scelta. */
export function monthOptions(): { value: number; label: string }[] {
  return Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: capitalize(monthName(index + 1)) }))
}

/** Primo e ultimo giorno del mese come `YYYY-MM-DD` (estremi inclusi). */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const mm = String(month).padStart(2, '0')
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` }
}

/** Data `YYYY-MM-DD` in italiano esteso, es. "sabato 8 novembre 2026". */
export function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number]
  return dayFormatter.format(new Date(Date.UTC(year, month - 1, day)))
}

/** Data `YYYY-MM-DD` breve in italiano, es. "21 ott". */
export function formatShortDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number]
  return shortDayFormatter.format(new Date(Date.UTC(year, month - 1, day))).replace('.', '')
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
