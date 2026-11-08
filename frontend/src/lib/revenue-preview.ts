import { computeExpectedCollections, eurosToCents, type ExpectedCollection } from 'budget-planner-shared'

export interface PreviewClient {
  id: number
  name: string
  archived: boolean
  sortOrder: number
  budgetItemId: number
  collectionDelayMonths: number
}

export interface PreviewRate {
  clientId: number
  validFromYear: number
  validFromMonth: number
  /** Tariffa giornaliera in euro. */
  dailyRate: number
}

export interface PreviewDays {
  clientId: number
  year: number
  month: number
  days: number
}

/** Giorni previsti in un mese senza tariffa valida: non si calcolano e vanno segnalati, mai contati come zero. */
export interface PreviewProblem {
  clientId: number
  clientName: string
  year: number
  month: number
}

export interface PreviewCell {
  cents: number
  /** L'incasso viene da lavoro di un anno precedente a quello della tabella. */
  fromPreviousYear: boolean
}

export interface PreviewRow {
  clientId: number
  name: string
  archived: boolean
  /** Incasso per mese (indice 0 = gennaio); `null` se in quel mese non arriva nulla. */
  cells: (PreviewCell | null)[]
  totalCents: number
}

export interface PreviewTable {
  year: number
  rows: PreviewRow[]
  monthCents: number[]
  totalCents: number
}

export interface RevenuePreview {
  /** Incassi dei 12 mesi dell'anno scelto, anche da lavoro dell'anno prima. */
  current: PreviewTable
  /** Incassi dell'anno dopo che nascono da lavoro dell'anno scelto (il "riporto"). */
  carryOver: PreviewTable
  /** Tutti gli incassi calcolati (di ogni anno), per scrivere il budget. */
  collections: ExpectedCollection[]
  problems: PreviewProblem[]
}

/**
 * Anteprima degli incassi previsti del driver ricavi (docs/specifica.md, sezione 6). Il calcolo è di
 * `computeExpectedCollections` di `shared/`: qui si preparano i dati e si dispongono i risultati.
 * Giorni previsti in mesi senza tariffa valida vengono esclusi dal calcolo e restituiti in `problems`.
 */
export function buildRevenuePreview(
  year: number,
  clients: readonly PreviewClient[],
  rates: readonly PreviewRate[],
  workedDays: readonly PreviewDays[],
): RevenuePreview {
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const monthIndex = (y: number, m: number) => y * 12 + (m - 1)

  const earliestRate = new Map<number, number>()
  for (const rate of rates) {
    const start = monthIndex(rate.validFromYear, rate.validFromMonth)
    const known = earliestRate.get(rate.clientId)
    if (known === undefined || start < known) earliestRate.set(rate.clientId, start)
  }

  const problems: PreviewProblem[] = []
  const usable: PreviewDays[] = []
  for (const row of workedDays) {
    const client = clientById.get(row.clientId)
    if (!client) continue
    const start = earliestRate.get(row.clientId)
    if (row.days > 0 && (start === undefined || start > monthIndex(row.year, row.month))) {
      problems.push({ clientId: client.id, clientName: client.name, year: row.year, month: row.month })
    } else {
      usable.push(row)
    }
  }
  problems.sort((a, b) => a.clientId - b.clientId || monthIndex(a.year, a.month) - monthIndex(b.year, b.month))

  const collections = computeExpectedCollections(
    clients.map((client) => ({
      id: client.id,
      collectionDelayMonths: client.collectionDelayMonths,
      rates: rates
        .filter((rate) => rate.clientId === client.id)
        .map((rate) => ({
          validFromYear: rate.validFromYear,
          validFromMonth: rate.validFromMonth,
          dailyRateCents: eurosToCents(rate.dailyRate),
        })),
    })),
    usable,
  )

  const ordered = clients.toSorted((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
  return {
    current: buildTable(year, ordered, collections.filter((c) => c.year === year)),
    carryOver: buildTable(year + 1, ordered, collections.filter((c) => c.year === year + 1 && c.workYear === year)),
    collections,
    problems,
  }
}

function buildTable(year: number, clients: readonly PreviewClient[], collections: readonly ExpectedCollection[]): PreviewTable {
  const rows: PreviewRow[] = []
  for (const client of clients) {
    const cells: (PreviewCell | null)[] = Array.from({ length: 12 }, () => null)
    let total = 0
    for (const collection of collections) {
      if (collection.clientId !== client.id) continue
      const known = cells[collection.month - 1]
      cells[collection.month - 1] = {
        cents: (known?.cents ?? 0) + collection.amountCents,
        fromPreviousYear: (known?.fromPreviousYear ?? false) || collection.workYear < year,
      }
      total += collection.amountCents
    }
    const hasCollections = cells.some((cell) => cell !== null)
    // I clienti archiviati si vedono solo se in questa tabella arriva qualcosa da loro.
    if (client.archived && !hasCollections) continue
    rows.push({ clientId: client.id, name: client.name, archived: client.archived, cells, totalCents: total })
  }
  const monthCents = Array.from({ length: 12 }, (_, index) => rows.reduce((sum, row) => sum + (row.cells[index]?.cents ?? 0), 0))
  return { year, rows, monthCents, totalCents: monthCents.reduce((sum, cents) => sum + cents, 0) }
}
