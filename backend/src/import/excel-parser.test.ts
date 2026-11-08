import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ImportFileError, readExportWorkbook, SHEET_NAMES } from './excel-parser.ts'

const HEADERS = [
  'Data e ora',
  'Categoria',
  'Conto',
  'Importo in valuta predefinita',
  'Valuta predefinita',
  'Importo in valuta del conto',
  'Valuta conto',
  'Importo in valuta della transazione',
  'Valuta transazione',
  'Tag',
  'Commento',
]

let dir = ''
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'bp-import-'))
})
afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function writeFile(
  name: string,
  sheets: Record<string, { headers?: string[]; rows: unknown[][] }>,
): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  for (const [sheetName, { headers = HEADERS, rows }] of Object.entries(sheets)) {
    const sheet = workbook.addWorksheet(sheetName)
    sheet.addRow(headers)
    for (const row of rows) sheet.addRow(row)
  }
  const path = join(dir, name)
  await workbook.xlsx.writeFile(path)
  return path
}

const row = (date: string, category: string, account: string, amount: number, comment: string | null = null) => [
  new Date(date),
  category,
  account,
  amount,
  'EUR',
  amount,
  'EUR',
  amount,
  'EUR',
  null,
  comment,
]

describe('readExportWorkbook', () => {
  it('restituisce tutte le righe dei tre fogli', async () => {
    const path = await writeFile('ok.xlsx', {
      Spese: { rows: [row('2026-03-01T10:00:00Z', 'Pizza', 'Cash', -12.5), row('2026-03-02T10:00:00Z', 'Luce', 'Bancoposta', -80, 'bolletta')] },
      Entrate: { rows: [row('2026-03-05T10:00:00Z', 'Stipendio', 'Bancoposta', 1500, 'GDS')] },
      Bonifici: { rows: [row('2026-03-06T10:00:00Z', 'Bonifico', 'Bancoposta', -100), row('2026-03-06T10:00:00Z', 'Bonifico', 'Cash', 100)] },
    })
    const result = await readExportWorkbook(path)
    expect(result.Spese).toHaveLength(2)
    expect(result.Entrate).toHaveLength(1)
    expect(result.Bonifici).toHaveLength(2)
    expect(result.Spese[1]).toMatchObject({ sheet: 'Spese', rowNumber: 3, category: 'Luce', account: 'Bancoposta', defaultAmount: -80, comment: 'bolletta' })
    expect(result.Spese[0]?.dateTime).toBeInstanceOf(Date)
    expect(result.Entrate[0]?.tag).toBeNull()
  })

  it('salta le righe vuote', async () => {
    const path = await writeFile('empty-rows.xlsx', {
      Spese: { rows: [row('2026-03-01T10:00:00Z', 'Pizza', 'Cash', -5), [], [null, null]] },
      Entrate: { rows: [] },
      Bonifici: { rows: [] },
    })
    const result = await readExportWorkbook(path)
    expect(result.Spese).toHaveLength(1)
  })

  it('segnala un foglio mancante', async () => {
    const path = await writeFile('no-sheet.xlsx', { Spese: { rows: [] }, Entrate: { rows: [] } })
    await expect(readExportWorkbook(path)).rejects.toThrow('mancano i fogli: Bonifici')
  })

  it('segnala una colonna mancante', async () => {
    const path = await writeFile('no-column.xlsx', {
      Spese: { rows: [] },
      Entrate: { rows: [] },
      Bonifici: { headers: HEADERS.filter((h) => h !== 'Conto'), rows: [] },
    })
    const error = await readExportWorkbook(path).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ImportFileError)
    expect((error as Error).message).toBe('Nel foglio "Bonifici" mancano le colonne: Conto.')
  })

  it('segnala un file illeggibile', async () => {
    await expect(readExportWorkbook(join(dir, 'non-esiste.xlsx'))).rejects.toThrow(ImportFileError)
  })

  it('conosce i tre fogli attesi', () => {
    expect(SHEET_NAMES).toEqual(['Spese', 'Entrate', 'Bonifici'])
  })
})
