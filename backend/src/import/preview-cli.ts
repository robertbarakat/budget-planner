import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseMappingRules } from 'budget-planner-shared'
import { readExportWorkbook } from './excel-parser.ts'
import { buildImportPreview, renderPreviewReport, renderTerminalSummary } from './preview.ts'

// Uso: npm run import:preview -- <file.xlsx> <mappatura.json> [report.md]
// Non apre nessuna connessione al database: legge solo i due file e scrive solo il report.
const [excelPath, mappingPath, reportPath = '../docs/import-data/preview-report.md'] = process.argv.slice(2)
if (!excelPath || !mappingPath) {
  console.error('Uso: npm run import:preview -- <file.xlsx> <mappatura.json> [report.md]')
  process.exit(1)
}

try {
  const rules = parseMappingRules(JSON.parse(await readFile(mappingPath, 'utf8')))
  const preview = buildImportPreview(await readExportWorkbook(excelPath), rules)
  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, renderPreviewReport(preview), 'utf8')
  console.log(renderTerminalSummary(preview))
  console.log(`Report: ${reportPath}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
