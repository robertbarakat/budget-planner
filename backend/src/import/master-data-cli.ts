import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { parseMappingRules } from 'budget-planner-shared'
import { loadConfig } from '../config.ts'
import { readExportWorkbook, SHEET_NAMES } from './excel-parser.ts'
import { applyMasterDataPlan, describePlan, planIsEmpty, planMasterData } from './master-data.ts'
import { createSupabaseMasterData } from './master-data-supabase.ts'

// Uso: npm run import:setup -- <file.xlsx> <mappatura.json> [--write]
// Senza --write mostra solo cosa farebbe. Con --write chiede conferma prima di scrivere.
const args = process.argv.slice(2)
const write = args.includes('--write')
const [excelPath, mappingPath] = args.filter((a) => !a.startsWith('--'))
if (!excelPath || !mappingPath) {
  console.error('Uso: npm run import:setup -- <file.xlsx> <mappatura.json> [--write]')
  process.exit(1)
}

try {
  const rules = parseMappingRules(JSON.parse(await readFile(mappingPath, 'utf8')))
  const raw = await readExportWorkbook(excelPath)
  const accountNames = SHEET_NAMES.flatMap((name) => raw[name]).flatMap((row) => (typeof row.account === 'string' ? [row.account] : []))

  const config = loadConfig()
  const db = createSupabaseMasterData(config.supabaseUrl, config.supabaseServiceRoleKey)
  const existing = await db.load()
  const plan = planMasterData(rules, existing, accountNames)

  for (const line of describePlan(plan)) console.log(line)
  if (plan.errors.length > 0) {
    console.error('Ci sono errori bloccanti: correggi mappatura o anagrafiche e rilancia.')
    process.exit(1)
  }
  if (planIsEmpty(plan)) {
    console.log('Niente da creare: le anagrafiche ci sono già.')
  } else if (!write) {
    console.log('Modalità di prova: nessuna scrittura. Aggiungi --write per creare.')
  } else {
    const count = plan.macroAreas.length + plan.budgetItems.length + plan.categories.length
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const answer = await rl.question(`Scrivere ${count} elementi sul progetto ${db.host}? Digita "scrivi" per confermare: `)
    rl.close()
    if (answer.trim() !== 'scrivi') {
      console.log('Annullato: nessuna scrittura.')
      process.exit(0)
    }
    await applyMasterDataPlan(plan, existing, db.store)
    console.log(`Creati ${count} elementi.`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
