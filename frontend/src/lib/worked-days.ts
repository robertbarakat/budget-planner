export const MAX_DAYS_PER_MONTH = 31

export type DaysInput = { kind: 'empty' } | { kind: 'days'; value: number } | { kind: 'error'; message: string }

/** Legge i giorni digitati in una cella: vuoto = nessun dato; accetta la virgola o il punto, fino a 2 decimali (0,5 = mezza giornata). */
export function readDays(text: string): DaysInput {
  const trimmed = text.trim()
  if (trimmed === '') return { kind: 'empty' }
  if (!/^-?\d+([.,]\d{1,2})?$/.test(trimmed)) {
    return { kind: 'error', message: 'Giorni non validi: scrivi un numero, per esempio 21 o 10,5.' }
  }
  const value = Number(trimmed.replace(',', '.'))
  if (value < 0) return { kind: 'error', message: 'I giorni non possono essere negativi.' }
  if (value > MAX_DAYS_PER_MONTH) return { kind: 'error', message: `Un mese ha al massimo ${MAX_DAYS_PER_MONTH} giorni.` }
  return { kind: 'days', value }
}

/** Giorni come testo all'italiana (21 → "21", 10.5 → "10,5"). */
export function formatDays(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',')
}

export interface WorkedDaysClientInput {
  id: number
  name: string
  archived: boolean
  sortOrder: number
}

export interface WorkedDaysRowInput {
  clientId: number
  year: number
  month: number
  days: number
}

export interface WorkedDaysGridRow {
  clientId: number
  name: string
  archived: boolean
  /** Giorni per mese (indice 0 = gennaio); `null` se non c'è un dato. */
  days: (number | null)[]
  totalDays: number
}

export interface WorkedDaysGrid {
  rows: WorkedDaysGridRow[]
  monthTotals: number[]
  totalDays: number
}

/**
 * Griglia clienti × 12 mesi dei giorni lavorati previsti di un anno, con totali per cliente, per mese e complessivo.
 * I clienti archiviati compaiono solo se hanno giorni in quell'anno. Somme in centesimi di giornata (niente errori di virgola mobile).
 */
export function buildWorkedDaysGrid(
  year: number,
  clients: readonly WorkedDaysClientInput[],
  rows: readonly WorkedDaysRowInput[],
): WorkedDaysGrid {
  const yearRows = rows.filter((row) => row.year === year && row.month >= 1 && row.month <= 12)
  const withDays = new Set(yearRows.map((row) => row.clientId))
  const visible = clients
    .filter((client) => !client.archived || withDays.has(client.id))
    .toSorted((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)

  const hundredths = (days: number) => Math.round(days * 100)
  const gridRows = visible.map((client): WorkedDaysGridRow => {
    const days: (number | null)[] = Array.from({ length: 12 }, () => null)
    let total = 0
    for (const row of yearRows) {
      if (row.clientId !== client.id) continue
      days[row.month - 1] = row.days
      total += hundredths(row.days)
    }
    return { clientId: client.id, name: client.name, archived: client.archived, days, totalDays: total / 100 }
  })

  const monthTotals = Array.from({ length: 12 }, (_, index) =>
    gridRows.reduce((sum, row) => sum + hundredths(row.days[index] ?? 0), 0) / 100,
  )
  const totalDays = gridRows.reduce((sum, row) => sum + hundredths(row.totalDays), 0) / 100
  return { rows: gridRows, monthTotals, totalDays }
}
