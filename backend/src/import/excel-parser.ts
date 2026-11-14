import ExcelJS from 'exceljs'

// Parser dell'export Excel di "Budget e finanze" (ru.innim.my_finance).
// Restituisce righe grezze tipizzate per foglio: nessuna normalizzazione, nessuna mappatura.
// Il file non viene mai copiato: il percorso arriva dall'argomento.

export const SHEET_NAMES = ['Spese', 'Entrate', 'Bonifici'] as const
export type SheetName = (typeof SHEET_NAMES)[number]

export type CellValue = string | number | Date | null

export interface RawRow {
  sheet: SheetName
  /** Numero di riga reale nel foglio (comprese eventuali righe titolo), per i report degli scarti. */
  rowNumber: number
  dateTime: CellValue
  category: CellValue
  account: CellValue
  defaultAmount: CellValue
  defaultCurrency: CellValue
  accountAmount: CellValue
  accountCurrency: CellValue
  transactionAmount: CellValue
  transactionCurrency: CellValue
  tag: CellValue
  comment: CellValue
}

export type RawExport = Record<SheetName, RawRow[]>

const COLUMNS: ReadonlyArray<{ header: string; field: Exclude<keyof RawRow, 'sheet' | 'rowNumber'> }> = [
  { header: 'Data e ora', field: 'dateTime' },
  { header: 'Categoria', field: 'category' },
  { header: 'Conto', field: 'account' },
  { header: 'Importo in valuta predefinita', field: 'defaultAmount' },
  { header: 'Valuta predefinita', field: 'defaultCurrency' },
  { header: 'Importo in valuta del conto', field: 'accountAmount' },
  { header: 'Valuta conto', field: 'accountCurrency' },
  { header: 'Importo in valuta della transazione', field: 'transactionAmount' },
  { header: 'Valuta transazione', field: 'transactionCurrency' },
  { header: 'Tag', field: 'tag' },
  { header: 'Commento', field: 'comment' },
]

export class ImportFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportFileError'
  }
}

const normalizeHeader = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase()

function toCellValue(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null
  if (value instanceof Date || typeof value === 'number') return value
  if (typeof value === 'string') return value.trim() === '' ? null : value
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    if ('richText' in value) return toCellValue(value.richText.map((part) => part.text).join(''))
    if ('result' in value) return toCellValue(value.result as ExcelJS.CellValue)
    if ('text' in value) return toCellValue(String(value.text))
  }
  return null
}

/** Colonne del foglio Bonifici nell'export reale (conto di uscita e di entrata nella stessa riga). */
const TRANSFER_HEADERS = {
  dateTime: 'Data e ora',
  from: 'In uscita',
  to: 'In entrata',
  fromAmount: 'Importo nella valuta in uscita',
  fromCurrency: 'Valuta in uscita',
  toAmount: 'Importo nella valuta in entrata',
  toCurrency: 'Valuta in entrata',
  comment: 'Commento',
} as const

// L'export reale ha una riga titolo prima delle intestazioni: si cerca la prima riga che contiene "Data e ora".
const HEADER_SEARCH_ROWS = 10

function findHeaderRowNumber(sheet: ExcelJS.Worksheet): number {
  const target = normalizeHeader('Data e ora')
  const last = Math.min(sheet.rowCount, HEADER_SEARCH_ROWS)
  for (let rowNumber = 1; rowNumber <= last; rowNumber++) {
    let found = false
    sheet.getRow(rowNumber).eachCell((cell) => {
      const text = toCellValue(cell.value)
      if (typeof text === 'string' && normalizeHeader(text) === target) found = true
    })
    if (found) return rowNumber
  }
  return 1
}

function parseSheet(sheet: ExcelJS.Worksheet, name: SheetName): RawRow[] {
  const headerRowNumber = findHeaderRowNumber(sheet)
  const columnByField = new Map<string, number>()
  sheet.getRow(headerRowNumber).eachCell((cell, colNumber) => {
    const text = toCellValue(cell.value)
    if (typeof text === 'string') columnByField.set(normalizeHeader(text), colNumber)
  })

  if (name === 'Bonifici' && columnByField.has(normalizeHeader(TRANSFER_HEADERS.from))) {
    return parseTransferSheet(sheet, headerRowNumber, columnByField)
  }

  const missing = COLUMNS.filter((c) => !columnByField.has(normalizeHeader(c.header))).map((c) => c.header)
  if (missing.length > 0) {
    throw new ImportFileError(`Nel foglio "${name}" mancano le colonne: ${missing.join(', ')}.`)
  }

  const rows: RawRow[] = []
  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const values = {} as Record<(typeof COLUMNS)[number]['field'], CellValue>
    for (const column of COLUMNS) {
      const colNumber = columnByField.get(normalizeHeader(column.header))!
      values[column.field] = toCellValue(row.getCell(colNumber).value)
    }
    if (Object.values(values).every((v) => v === null)) continue // riga vuota
    rows.push({ sheet: name, rowNumber, ...values })
  }
  return rows
}

/**
 * Foglio Bonifici del formato reale: ogni riga ha conto di uscita e di entrata. Si restituiscono due righe grezze
 * (uscita con importo negativo, entrata con importo positivo, stessa data e ora): è la forma che la normalizzazione
 * già riconosce. Se manca l'importo in entrata si usa quello in uscita (stessa valuta).
 */
function parseTransferSheet(sheet: ExcelJS.Worksheet, headerRowNumber: number, columnByField: Map<string, number>): RawRow[] {
  const missing = Object.values(TRANSFER_HEADERS).filter((h) => !columnByField.has(normalizeHeader(h)))
  if (missing.length > 0) throw new ImportFileError(`Nel foglio "Bonifici" mancano le colonne: ${missing.join(', ')}.`)
  const col = (header: string) => columnByField.get(normalizeHeader(header))!

  const rows: RawRow[] = []
  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const get = (header: string) => toCellValue(row.getCell(col(header)).value)
    const dateTime = get(TRANSFER_HEADERS.dateTime)
    const from = get(TRANSFER_HEADERS.from)
    const to = get(TRANSFER_HEADERS.to)
    const fromAmount = get(TRANSFER_HEADERS.fromAmount)
    const toAmount = get(TRANSFER_HEADERS.toAmount) ?? fromAmount
    const fromCurrency = get(TRANSFER_HEADERS.fromCurrency)
    const toCurrency = get(TRANSFER_HEADERS.toCurrency) ?? fromCurrency
    const comment = get(TRANSFER_HEADERS.comment)
    if ([dateTime, from, to, fromAmount, comment].every((v) => v === null)) continue // riga vuota

    const side = (account: CellValue, amount: CellValue, currency: CellValue, sign: 1 | -1): RawRow => {
      const signed = typeof amount === 'number' ? sign * Math.abs(amount) : amount
      return {
        sheet: 'Bonifici',
        rowNumber,
        dateTime,
        category: null,
        account,
        defaultAmount: signed,
        defaultCurrency: currency,
        accountAmount: signed,
        accountCurrency: currency,
        transactionAmount: null,
        transactionCurrency: null,
        tag: null,
        comment,
      }
    }
    rows.push(side(from, fromAmount, fromCurrency, -1), side(to, toAmount, toCurrency, 1))
  }
  return rows
}

export async function readExportWorkbook(filePath: string): Promise<RawExport> {
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.readFile(filePath)
  } catch {
    throw new ImportFileError(`Impossibile leggere il file Excel "${filePath}".`)
  }

  const result = {} as RawExport
  const missingSheets = SHEET_NAMES.filter((name) => !workbook.getWorksheet(name))
  if (missingSheets.length > 0) {
    throw new ImportFileError(`Nel file mancano i fogli: ${missingSheets.join(', ')}.`)
  }
  for (const name of SHEET_NAMES) result[name] = parseSheet(workbook.getWorksheet(name)!, name)
  return result
}
