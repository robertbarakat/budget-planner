import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { parseMappingRules } from 'budget-planner-shared'
import { loadConfig } from '../config.ts'
import { readExportWorkbook } from './excel-parser.ts'
import { buildImportPreview } from './preview.ts'
import { runImport } from './run-import.ts'
import { createSupabaseImportStore, isLocalUrl } from './run-import-supabase.ts'

// Uso: npm run import:run -- <file.xlsx> <mappatura.json> --max-rejected <N> [--allow-remote]
// Controlla che il database sia vuoto, mostra l'anteprima, chiede la conferma digitata e solo allora scrive.
// Per default scrive solo su un database locale: un progetto remoto richiede --allow-remote.
const args = process.argv.slice(2)
const flagValue = (name: string): string | undefined => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const maxRejected = Number(flagValue('--max-rejected'))
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--max-rejected'))
const [excelPath, mappingPath] = positional
if (!excelPath || !mappingPath || !Number.isInteger(maxRejected) || maxRejected < 0) {
  console.error('Uso: npm run import:run -- <file.xlsx> <mappatura.json> --max-rejected <N> [--allow-remote]')
  process.exit(1)
}

try {
  const config = loadConfig()
  if (!isLocalUrl(config.supabaseUrl) && !args.includes('--allow-remote')) {
    console.error('Il database di destinazione non è locale: per scrivere su un progetto remoto aggiungi --allow-remote.')
    process.exit(1)
  }

  const rules = parseMappingRules(JSON.parse(await readFile(mappingPath, 'utf8')))
  const preview = buildImportPreview(await readExportWorkbook(excelPath), rules)
  const { store, host } = createSupabaseImportStore(config.supabaseUrl, config.supabaseServiceRoleKey)

  // L'interfaccia di lettura nasce solo al momento della domanda; se l'input è chiuso la risposta è vuota (= nessuna scrittura).
  const ask = async (question: string): Promise<string> => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    try {
      return await rl.question(question)
    } catch {
      return ''
    } finally {
      rl.close()
    }
  }
  const result = await runImport({
    preview,
    store,
    maxRejected,
    targetLabel: host,
    ask,
    log: (message) => console.log(message),
  })
  if (result.status === 'stopped') process.exitCode = 1
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
