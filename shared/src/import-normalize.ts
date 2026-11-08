import { eurosToCents } from './cents.ts'

// Normalizzazione delle righe grezze dell'export Excel (import storico, BP-120).
// Funzioni pure: nessun I/O. Ogni riga diventa un movimento o uno scarto con motivo.
//
// Fuso orario: l'export non contiene fuso. Data e ora si leggono come "ora locale scritta nel file"
// (Europe/Rome), senza alcuna conversione: il giorno è quello scritto. Le date lette da Excel
// arrivano come Date con l'ora locale nei componenti UTC, quindi si usano getUTC*.

export type ImportCell = string | number | Date | null

export interface ImportRawRow {
  sheet: 'Spese' | 'Entrate' | 'Bonifici'
  rowNumber: number
  dateTime: ImportCell
  category: ImportCell
  account: ImportCell
  defaultAmount: ImportCell
  defaultCurrency: ImportCell
  accountAmount: ImportCell
  accountCurrency: ImportCell
  transactionAmount: ImportCell
  transactionCurrency: ImportCell
  tag: ImportCell
  comment: ImportCell
}

export interface SourceRow {
  sheet: ImportRawRow['sheet']
  rowNumber: number
}

export interface NormalizedTransaction {
  type: 'expense' | 'income' | 'transfer'
  /** YYYY-MM-DD */
  transactionDate: string
  /** Sempre > 0: il segno deriva dal tipo. */
  amountCents: number
  account: string
  /** Solo per i trasferimenti. */
  destinationAccount: string | null
  category: string | null
  tag: string | null
  comment: string | null
  sourceRows: SourceRow[]
}

export interface RejectedRow extends SourceRow {
  reason: string
}

export interface NormalizeResult {
  transactions: NormalizedTransaction[]
  rejected: RejectedRow[]
}

export interface NormalizeOptions {
  /** Nomi dei conti esistenti: servono a riconoscere la destinazione scritta nel commento o nel tag. */
  accountNames?: readonly string[]
}

const text = (value: ImportCell): string | null => {
  if (value === null || value instanceof Date) return value === null ? null : value.toISOString()
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
}

const pad = (n: number): string => String(n).padStart(2, '0')

interface ParsedDate {
  date: string
  /** Data e ora al minuto, per abbinare le due righe di un trasferimento. */
  key: string
}

function parseDateTime(value: ImportCell): ParsedDate | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    const date = `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`
    return { date, key: `${date}T${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}` }
  }
  if (typeof value !== 'string') return null
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(value.trim()) ??
    /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:[ T,]+(\d{1,2}):(\d{2}))?/.exec(value.trim())
  if (!match) return null
  const isIso = match[1]!.length === 4
  const [year, month, day] = isIso
    ? [Number(match[1]), Number(match[2]), Number(match[3])]
    : [Number(match[3]), Number(match[2]), Number(match[1])]
  const check = new Date(Date.UTC(year, month - 1, day))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null
  const date = `${year}-${pad(month)}-${pad(day)}`
  return { date, key: `${date}T${pad(Number(match[4] ?? 0))}:${match[5] ?? '00'}` }
}

/** Cents with sign, or null if empty/not numeric. Accepts 12.5, "12,5", "1.234,56". */
function parseAmountCents(value: ImportCell): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? eurosToCents(value) : null
  if (typeof value !== 'string') return null
  let s = value.trim().replace(/\s/g, '')
  if (s === '') return null
  s = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null
  return eurosToCents(Number(s))
}

function currencyProblem(row: ImportRawRow): string | null {
  const currencies = [row.defaultCurrency, row.accountCurrency, row.transactionCurrency]
    .map(text)
    .filter((c): c is string => c !== null)
  if (currencies.length === 0) return 'Valuta mancante'
  const other = currencies.find((c) => c.toUpperCase() !== 'EUR')
  return other ? `Valuta diversa da EUR (${other})` : null
}

interface ParsedRow {
  row: ImportRawRow
  parsed: ParsedDate
  signedCents: number
  account: string
}

/** Valida i campi comuni. Restituisce la riga letta o il motivo dello scarto. */
function parseCommon(row: ImportRawRow): ParsedRow | string {
  const problem = currencyProblem(row)
  if (problem) return problem
  const parsed = parseDateTime(row.dateTime)
  if (!parsed) return 'Data non valida'
  const account = text(row.account)
  if (!account) return 'Conto mancante'
  const signedCents = parseAmountCents(row.defaultAmount)
  if (signedCents === null) return 'Importo vuoto o non numerico'
  if (signedCents === 0) return 'Importo uguale a zero'
  return { row, parsed, signedCents, account }
}

const source = (row: ImportRawRow): SourceRow => ({ sheet: row.sheet, rowNumber: row.rowNumber })

function findDestination(row: ImportRawRow, accountNames: readonly string[], origin: string): string | null | 'ambiguous' {
  const haystack = `${text(row.comment) ?? ''} ${text(row.tag) ?? ''}`.toLowerCase()
  const found = accountNames.filter((name) => name.toLowerCase() !== origin.toLowerCase() && haystack.includes(name.toLowerCase()))
  if (found.length === 0) return null
  return found.length === 1 ? found[0]! : 'ambiguous'
}

export function normalizeImportedRows(rows: readonly ImportRawRow[], options: NormalizeOptions = {}): NormalizeResult {
  const transactions: NormalizedTransaction[] = []
  const rejected: RejectedRow[] = []
  const reject = (row: ImportRawRow, reason: string) => rejected.push({ ...source(row), reason })
  const accountNames = options.accountNames ?? []

  const transferRows: ParsedRow[] = []
  for (const row of rows) {
    const result = parseCommon(row)
    if (typeof result === 'string') {
      reject(row, result)
    } else if (row.sheet === 'Bonifici') {
      transferRows.push(result)
    } else if (result.signedCents < 0) {
      reject(row, 'Importo negativo')
    } else {
      transactions.push({
        type: row.sheet === 'Spese' ? 'expense' : 'income',
        transactionDate: result.parsed.date,
        amountCents: result.signedCents,
        account: result.account,
        destinationAccount: null,
        category: text(row.category),
        tag: text(row.tag),
        comment: text(row.comment),
        sourceRows: [source(row)],
      })
    }
  }

  // Trasferimenti, forma 1: due righe con stessa data e ora, importo opposto (negativa = origine).
  const groups = new Map<string, { out: ParsedRow[]; in: ParsedRow[] }>()
  for (const item of transferRows) {
    const key = `${item.parsed.key}|${Math.abs(item.signedCents)}`
    const group = groups.get(key) ?? { out: [], in: [] }
    ;(item.signedCents < 0 ? group.out : group.in).push(item)
    groups.set(key, group)
  }
  const leftovers: ParsedRow[] = []
  for (const group of groups.values()) {
    const pairs = Math.min(group.out.length, group.in.length)
    for (let i = 0; i < pairs; i++) {
      const from = group.out[i]!
      const to = group.in[i]!
      if (from.account.toLowerCase() === to.account.toLowerCase()) {
        for (const r of [from, to]) reject(r.row, 'Trasferimento con origine uguale alla destinazione')
        continue
      }
      transactions.push({
        type: 'transfer',
        transactionDate: from.parsed.date,
        amountCents: Math.abs(from.signedCents),
        account: from.account,
        destinationAccount: to.account,
        category: null,
        tag: text(from.row.tag) ?? text(to.row.tag),
        comment: text(from.row.comment) ?? text(to.row.comment),
        sourceRows: [source(from.row), source(to.row)],
      })
    }
    leftovers.push(...group.out.slice(pairs), ...group.in.slice(pairs))
  }

  // Forma 2: riga singola positiva, destinazione scritta nel commento o nel tag.
  for (const item of leftovers) {
    if (item.signedCents < 0) {
      reject(item.row, 'Trasferimento senza riga di destinazione corrispondente')
      continue
    }
    const destination = findDestination(item.row, accountNames, item.account)
    if (destination === null) {
      reject(item.row, 'Trasferimento senza conto di destinazione riconoscibile')
    } else if (destination === 'ambiguous') {
      reject(item.row, 'Trasferimento con più conti di destinazione possibili')
    } else {
      transactions.push({
        type: 'transfer',
        transactionDate: item.parsed.date,
        amountCents: item.signedCents,
        account: item.account,
        destinationAccount: destination,
        category: null,
        tag: text(item.row.tag),
        comment: text(item.row.comment),
        sourceRows: [source(item.row)],
      })
    }
  }

  const order = (s: SourceRow) => `${s.sheet}|${String(s.rowNumber).padStart(9, '0')}`
  transactions.sort((a, b) => order(a.sourceRows[0]!).localeCompare(order(b.sourceRows[0]!)))
  rejected.sort((a, b) => order(a).localeCompare(order(b)))
  return { transactions, rejected }
}
