import type { MappedTransaction } from 'budget-planner-shared'
import type { ImportPreview } from './preview.ts'
import { renderTerminalSummary } from './preview.ts'

// Import storico completo (BP-125): controlli, anteprima, conferma digitata, scrittura con la funzione SQL.
// Lo store è iniettato: nei test è finto, nel comando reale è Supabase. Niente deduplica: l'import si fa una volta sola.

export interface ImportPayloadRow {
  type: 'expense' | 'income' | 'transfer'
  transaction_date: string
  /** Euro con due decimali. */
  amount: number
  account: string
  destination_account: string | null
  category: string | null
  budget_item: string | null
  comment: string | null
  tag: string | null
}

export interface ImportTotals {
  inserted_count: number
  expense_total: number
  income_total: number
  transfer_total: number
}

export interface ImportStore {
  countTransactions(): Promise<number>
  importTransactions(rows: ImportPayloadRow[]): Promise<ImportTotals>
}

export const CONFIRMATION_WORD = 'importa'

export function toPayload(transactions: readonly MappedTransaction[]): ImportPayloadRow[] {
  return transactions.map((t) => ({
    type: t.type,
    transaction_date: t.transactionDate,
    amount: t.amountCents / 100,
    account: t.account,
    destination_account: t.destinationAccount,
    category: t.targetCategory,
    budget_item: t.targetBudgetItem,
    comment: t.comment,
    tag: t.tag,
  }))
}

export interface RunImportOptions {
  preview: ImportPreview
  store: ImportStore
  /** Scarti ammessi: oltre questa soglia l'import si ferma. */
  maxRejected: number
  /** Destinazione mostrata nella domanda di conferma (solo host, mai chiavi). */
  targetLabel: string
  /** Fa la domanda e restituisce ciò che l'utente ha digitato. */
  ask(question: string): Promise<string>
  log(message: string): void
}

export type RunImportResult =
  | { status: 'imported'; totals: ImportTotals }
  | { status: 'stopped'; reason: string }

export async function runImport(options: RunImportOptions): Promise<RunImportResult> {
  const { preview, store, maxRejected, targetLabel, ask, log } = options
  const stop = (reason: string): RunImportResult => {
    log(reason)
    return { status: 'stopped', reason }
  }

  const existing = await store.countTransactions()
  if (existing > 0) {
    return stop(`Import annullato: il database contiene già ${existing} movimenti. L'import richiede il database vuoto.`)
  }

  log(renderTerminalSummary(preview))
  if (preview.rejected.length > maxRejected) {
    return stop(`Import annullato: ${preview.rejected.length} scarti, oltre la soglia di ${maxRejected}. Guarda il report dell'anteprima.`)
  }
  if (preview.transactions.length === 0) return stop('Import annullato: nessun movimento da importare.')

  const answer = await ask(
    `Scrivere ${preview.transactions.length} movimenti su ${targetLabel}? Digita "${CONFIRMATION_WORD}" per confermare: `,
  )
  if (answer.trim() !== CONFIRMATION_WORD) return stop('Annullato: nessuna scrittura.')

  const totals = await store.importTransactions(toPayload(preview.transactions))
  if (totals.inserted_count !== preview.transactions.length) {
    throw new Error(`Inseriti ${totals.inserted_count} movimenti invece di ${preview.transactions.length}: controlla il database.`)
  }
  log(`Importati ${totals.inserted_count} movimenti.`)
  return { status: 'imported', totals }
}
