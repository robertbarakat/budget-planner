import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { eurosToCents, parseMappingRules } from 'budget-planner-shared'
import { loadConfig } from '../config.ts'
import { createSnapshotReader } from './database-snapshot.ts'
import { readExportWorkbook } from './excel-parser.ts'
import { buildImportPreview } from './preview.ts'
import { reconcileImport, renderReconciliationReport, renderReconciliationSummary } from './reconcile.ts'

// Uso: npm run import:reconcile -- <file.xlsx> <mappatura.json> [--balances saldi.json --year 2026] [--out report.md]
// Solo lettura: non scrive nel database. saldi.json = { "Nome conto": saldo attuale in euro, ... }.
const args = process.argv.slice(2)
const flag = (name: string): string | undefined => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const valueFlags = new Set(['--balances', '--year', '--out'])
const [excelPath, mappingPath] = args.filter((a, i) => !a.startsWith('--') && !valueFlags.has(args[i - 1] ?? ''))
if (!excelPath || !mappingPath) {
  console.error('Uso: npm run import:reconcile -- <file.xlsx> <mappatura.json> [--balances saldi.json --year 2026] [--out report.md]')
  process.exit(1)
}

try {
  const balancesPath = flag('--balances')
  const year = Number(flag('--year') ?? new Date().getFullYear())
  const outPath = flag('--out') ?? '../docs/import-data/reconcile-report.md'

  const rules = parseMappingRules(JSON.parse(await readFile(mappingPath, 'utf8')))
  const raw = await readExportWorkbook(excelPath)
  const preview = buildImportPreview(raw, rules)

  const config = loadConfig()
  const reader = createSnapshotReader(config.supabaseUrl, config.supabaseServiceRoleKey)
  const db = await reader.read(balancesPath ? year : null)

  let balances: { year: number; expectedCents: Record<string, number> } | undefined
  if (balancesPath) {
    const parsed = JSON.parse(await readFile(balancesPath, 'utf8')) as Record<string, number>
    balances = { year, expectedCents: Object.fromEntries(Object.entries(parsed).map(([name, euros]) => [name, eurosToCents(euros)])) }
  }

  const result = reconcileImport({ preview, raw, db, balances })
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, renderReconciliationReport(result), 'utf8')
  console.log(renderReconciliationSummary(result))
  console.log(`Report: ${outPath}`)
  if (result.totalsDifferences.length > 0 || (result.balanceDifferences?.length ?? 0) > 0) process.exitCode = 2
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
