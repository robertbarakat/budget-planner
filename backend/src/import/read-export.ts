import { readExportWorkbook, SHEET_NAMES } from './excel-parser.ts'

// Uso: npm run import:read -- /percorso/del/file.xlsx
const filePath = process.argv[2]
if (!filePath) {
  console.error('Uso: npm run import:read -- /percorso/del/file.xlsx')
  process.exit(1)
}

try {
  const data = await readExportWorkbook(filePath)
  for (const name of SHEET_NAMES) console.log(`${name}: ${data[name].length} righe`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
