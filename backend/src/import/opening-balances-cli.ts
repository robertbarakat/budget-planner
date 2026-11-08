import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { parseAmountCents } from 'budget-planner-shared'
import { loadConfig } from '../config.ts'
import { createSnapshotReader } from './database-snapshot.ts'
import { activeAccounts, planOpeningBalances } from './opening-balances.ts'
import { isLocalUrl } from './run-import-supabase.ts'

// Uso: npm run import:opening-balances -- --year 2026 [--balances saldi.json] [--expected-total 42929,33] [--allow-remote]
// Da lanciare DOPO l'import dei movimenti. Chiede il saldo attuale di ogni conto attivo (o lo legge da saldi.json,
// { "Nome conto": euro }), calcola il saldo iniziale dell'anno = saldo attuale - movimenti dal 1 gennaio, mostra lo scarto
// dal totale atteso e, solo dopo la conferma digitata, scrive in opening_balances (origine "manual").
// Il totale atteso di default è quello del foglio "Budget 2026" (specifica, sezione 8).
const DEFAULT_EXPECTED_TOTAL = '42929,33'

const args = process.argv.slice(2)
const flag = (name: string): string | undefined => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const euros = (cents: number): string => (cents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const year = Number(flag('--year'))
const expectedTotalCents = parseAmountCents(flag('--expected-total') ?? DEFAULT_EXPECTED_TOTAL)
if (!Number.isInteger(year) || expectedTotalCents === null) {
  console.error('Uso: npm run import:opening-balances -- --year 2026 [--balances saldi.json] [--expected-total 42929,33] [--allow-remote]')
  process.exit(1)
}

// Una sola interfaccia di lettura per tutte le domande: le righe digitate (o in ingresso da pipe) restano in coda.
// Se l'input finisce, la risposta è vuota (= nessuna scrittura).
const rl = createInterface({ input: process.stdin, output: process.stdout })
const lines = rl[Symbol.asyncIterator]()
const ask = async (question: string): Promise<string> => {
  process.stdout.write(question)
  const next = await lines.next()
  return next.done ? '' : next.value
}

try {
  const config = loadConfig()
  if (!isLocalUrl(config.supabaseUrl) && !args.includes('--allow-remote')) {
    console.error('Il database di destinazione non è locale: per scrivere su un progetto remoto aggiungi --allow-remote.')
    process.exit(1)
  }
  const reader = createSnapshotReader(config.supabaseUrl, config.supabaseServiceRoleKey)
  const db = await reader.read(year)
  if (db.openingBalances.length > 0) {
    console.error(`Esistono già saldi iniziali per il ${year}: nessuna scrittura.`)
    process.exit(1)
  }

  const currentCentsByName: Record<string, number> = {}
  const balancesPath = flag('--balances')
  if (balancesPath) {
    const parsed = JSON.parse(await readFile(balancesPath, 'utf8')) as Record<string, number | string>
    for (const [name, value] of Object.entries(parsed)) {
      const cents = parseAmountCents(value)
      if (cents === null) throw new Error(`Saldo non valido per il conto "${name}".`)
      currentCentsByName[name] = cents
    }
  } else {
    for (const account of activeAccounts(db)) {
      const cents = parseAmountCents(await ask(`Saldo attuale di ${account.name} (EUR): `))
      if (cents === null) throw new Error(`Saldo non valido per il conto "${account.name}": nessuna scrittura.`)
      currentCentsByName[account.name] = cents
    }
  }

  const plan = planOpeningBalances({ db, year, currentCentsByName, expectedTotalCents })
  for (const b of plan.balances) {
    console.log(`${b.name}: saldo attuale ${euros(b.currentCents)}, movimenti dal 1/1/${year} ${euros(b.movementsCents)}, saldo iniziale ${euros(b.openingCents)}`)
  }
  console.log(`Totale saldi iniziali ${year}: ${euros(plan.totalCents)} (atteso ${euros(plan.expectedTotalCents)}), scarto ${euros(plan.differenceCents)}`)

  const answer = await ask(`Salvare ${plan.balances.length} saldi iniziali ${year} su ${reader.host}? Digita "salva" per confermare: `)
  if (answer.trim() !== 'salva') {
    console.log('Annullato: nessuna scrittura.')
    process.exit(0)
  }
  const { error } = await reader.client.from('opening_balances').insert(
    plan.balances.map((b) => ({ account_id: b.accountId, year, amount: b.openingCents / 100, source: 'manual' as const })),
  )
  if (error) throw new Error(`Salvataggio non riuscito (nessun saldo scritto): ${error.message}`)
  console.log(`Salvati ${plan.balances.length} saldi iniziali.`)
  if (plan.differenceCents !== 0) process.exitCode = 2
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
} finally {
  rl.close()
}
