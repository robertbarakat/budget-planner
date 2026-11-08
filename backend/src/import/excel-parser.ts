import ExcelJS from 'exceljs'

// Parser dell'export Excel di "Budget e finanze" (ru.innim.my_finance).
// Restituisce righe grezze tipizzate per foglio: nessuna normalizzazione, nessuna mappatura.
// Il file non viene mai copiato: il percorso arriva dall'argomento.

export const SHEET_NAMES = ['Spese', 'Entrate', 'Bonifici'] as const
export type SheetName = (typeof SHEET_NAMES)[number]

export type CellValue = string | number | Date | null

export interface RawRow {
  sheet: SheetName
  /** Numero di riga nel foglio (1 = intestazioni), per i report degli scarti. */
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

function parseSheet(sheet: ExcelJS.Worksheet, name: SheetName): RawRow[] {
  const headerRow = sheet.getRow(1)
  const columnByField = new Map<string, number>()
  headerRow.eachCell((cell, colNumber) => {
    const text = toCellValue(cell.value)
    if (typeof text === 'string') columnByField.set(normalizeHeader(text), colNumber)
  })

  const missing = COLUMNS.filter((c) => !columnByField.has(normalizeHeader(c.header))).map((c) => c.header)
  if (missing.length > 0) {
    throw new ImportFileError(`Nel foglio "${name}" mancano le colonne: ${missing.join(', ')}.`)
  }

  const rows: RawRow[] = []
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
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
