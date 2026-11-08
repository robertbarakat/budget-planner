import { mapImportedTransactions, normalizeImportedRows } from 'budget-planner-shared'
import type { MappingRule, RejectedRow } from 'budget-planner-shared'
import { SHEET_NAMES } from './excel-parser.ts'
import type { RawExport, SheetName } from './excel-parser.ts'

// Anteprima dell'import (BP-123): parser -> normalizzazione -> mappatura, senza alcun accesso al database.

export interface SheetSummary {
  read: number
  accepted: number
  rejected: number
}

export interface ImportPreview {
  sheets: Record<SheetName, SheetSummary>
  rejected: RejectedRow[]
  /** Importi con segno in centesimi (spese negative), per voce di destinazione e mese (YYYY-MM). */
  totalsByItemAndMonth: Map<string, number>
  /** Variazione netta per conto in centesimi (spese -, entrate +, trasferimenti -/+). */
  totalsByAccount: Map<string, number>
  acceptedTransactions: number
}

const add = (map: Map<string, number>, key: string, cents: number) => map.set(key, (map.get(key) ?? 0) + cents)

export function buildImportPreview(raw: RawExport, rules: readonly MappingRule[]): ImportPreview {
  const rows = SHEET_NAMES.flatMap((name) => raw[name])
  const accountNames = [
    ...new Set(
      [...raw.Spese, ...raw.Entrate]
        .map((row) => (typeof row.account === 'string' ? row.account.trim() : ''))
        .filter((name) => name !== ''),
    ),
  ]

  const normalized = normalizeImportedRows(rows, { accountNames })
  const mapping = mapImportedTransactions(normalized.transactions, rules)

  const sheets = Object.fromEntries(
    SHEET_NAMES.map((name) => [name, { read: raw[name].length, accepted: 0, rejected: 0 }]),
  ) as Record<SheetName, SheetSummary>

  const rejected = [...normalized.rejected, ...mapping.rejected]
  for (const item of rejected) sheets[item.sheet].rejected += 1
  for (const transaction of mapping.mapped) {
    for (const source of transaction.sourceRows) sheets[source.sheet].accepted += 1
  }

  const totalsByItemAndMonth = new Map<string, number>()
  const totalsByAccount = new Map<string, number>()
  for (const t of mapping.mapped) {
    if (t.type === 'transfer') {
      add(totalsByAccount, t.account, -t.amountCents)
      add(totalsByAccount, t.destinationAccount!, t.amountCents)
      continue
    }
    const signed = t.type === 'expense' ? -t.amountCents : t.amountCents
    add(totalsByAccount, t.account, signed)
    add(totalsByItemAndMonth, `${t.targetBudgetItem}|${t.transactionDate.slice(0, 7)}`, signed)
  }

  return { sheets, rejected, totalsByItemAndMonth, totalsByAccount, acceptedTransactions: mapping.mapped.length }
}

const euros = (cents: number): string => (cents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const cell = (text: string): string => text.replace(/\|/g, '\\|').replace(/\s+/g, ' ')

/** Report completo in Markdown. Può contenere dati personali (categorie, commenti): resta in docs/import-data/. */
export function renderPreviewReport(preview: ImportPreview): string {
  const lines: string[] = ['# Anteprima import', '', '## Righe per foglio', '', '| Foglio | Lette | Accettate | Scartate |', '|---|---:|---:|---:|']
  for (const name of SHEET_NAMES) {
    const s = preview.sheets[name]
    lines.push(`| ${name} | ${s.read} | ${s.accepted} | ${s.rejected} |`)
  }

  lines.push('', `## Scarti (${preview.rejected.length})`, '')
  if (preview.rejected.length === 0) lines.push('Nessuno scarto.')
  else {
    lines.push('| Foglio | Riga | Motivo |', '|---|---:|---|')
    for (const r of preview.rejected) lines.push(`| ${r.sheet} | ${r.rowNumber} | ${cell(r.reason)} |`)
  }

  lines.push('', '## Totali per voce e mese (spese negative)', '', '| Voce | Mese | Totale EUR |', '|---|---|---:|')
  for (const key of [...preview.totalsByItemAndMonth.keys()].sort()) {
    const [item, month] = key.split('|')
    lines.push(`| ${cell(item!)} | ${month} | ${euros(preview.totalsByItemAndMonth.get(key)!)} |`)
  }

  lines.push('', '## Variazione per conto', '', '| Conto | Totale EUR |', '|---|---:|')
  for (const account of [...preview.totalsByAccount.keys()].sort()) {
    lines.push(`| ${cell(account)} | ${euros(preview.totalsByAccount.get(account)!)} |`)
  }
  lines.push('')
  return lines.join('\n')
}

/** Riepilogo per il terminale: solo conteggi, mai commenti, categorie o altri dati personali. */
export function renderTerminalSummary(preview: ImportPreview): string {
  const lines = SHEET_NAMES.map((name) => {
    const s = preview.sheets[name]
    return `${name}: lette ${s.read}, accettate ${s.accepted}, scartate ${s.rejected}`
  })
  lines.push(`Movimenti da importare: ${preview.acceptedTransactions}`, `Scarti totali: ${preview.rejected.length}`)
  return lines.join('\n')
}
