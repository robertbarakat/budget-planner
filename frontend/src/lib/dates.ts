/** Data locale di oggi come `YYYY-MM-DD` (non UTC: a mezzanotte italiana UTC è ancora il giorno prima). */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Data `YYYY-MM-DD` nel formato italiano `gg/mm/aaaa`. */
export function formatDate(isoDate: string): string {
  return isoDate.split('-').reverse().join('/')
}

/** `true` se il testo è una data `YYYY-MM-DD` che esiste davvero (niente 2026-02-30). */
export function isValidIsoDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false
  const [year, month, day] = text.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}
