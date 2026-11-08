import type { NormalizedTransaction, RejectedRow } from './import-normalize.ts'

// Mappatura dell'import storico (BP-121): categoria dell'export (+ commento) -> voce e categoria di destinazione.
// Funzione pura. Nessun nome di categoria, voce o cliente è scritto qui: tutto arriva dal file di regole.
//
// Corrispondenza: categoria e commento si confrontano dopo la normalizzazione del testo
// (minuscole, spazi multipli ridotti a uno, spazi ai lati rimossi, accenti lasciati com'erano).
// - `sourceCategory` deve essere uguale alla categoria del movimento.
// - `commentContains`, se presente, deve essere contenuto nel commento (corrispondenza parziale).
//   Una regola senza `commentContains` vale per qualsiasi commento, anche vuoto.
// Priorità: vince la regola con `priority` più BASSA (1 viene prima di 10); a parità, la prima nel file.
// I trasferimenti non hanno categoria e passano senza regole.

export interface MappingRule {
  sourceCategory: string
  commentContains?: string | null
  priority: number
  targetBudgetItem: string
  targetCategory: string
}

export interface MappedTransaction extends NormalizedTransaction {
  /** null solo per i trasferimenti. */
  targetBudgetItem: string | null
  targetCategory: string | null
}

export interface MappingResult {
  mapped: MappedTransaction[]
  /** Scarti "nessuna regola": il motivo contiene categoria e commento. */
  rejected: RejectedRow[]
}

export const normalizeMappingText = (value: string | null | undefined): string =>
  (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

/** Valida e legge il file di regole (JSON già interpretato). Errore leggibile se il formato non torna. */
export function parseMappingRules(input: unknown): MappingRule[] {
  const list = Array.isArray(input) ? input : (input as { rules?: unknown } | null)?.rules
  if (!Array.isArray(list)) throw new Error('Il file di mappatura deve contenere un elenco "rules".')
  return list.map((item: unknown, index): MappingRule => {
    const rule = item as Record<string, unknown>
    const where = `Regola ${index + 1}`
    const required = ['sourceCategory', 'targetBudgetItem', 'targetCategory'] as const
    for (const key of required) {
      if (typeof rule[key] !== 'string' || rule[key].trim() === '') throw new Error(`${where}: manca "${key}".`)
    }
    if (typeof rule.priority !== 'number' || !Number.isFinite(rule.priority)) throw new Error(`${where}: "priority" deve essere un numero.`)
    const comment = rule.commentContains
    if (comment !== undefined && comment !== null && (typeof comment !== 'string' || comment.trim() === '')) {
      throw new Error(`${where}: "commentContains" deve essere un testo non vuoto oppure assente.`)
    }
    return {
      sourceCategory: rule.sourceCategory as string,
      commentContains: (comment as string | null | undefined) ?? null,
      priority: rule.priority,
      targetBudgetItem: rule.targetBudgetItem as string,
      targetCategory: rule.targetCategory as string,
    }
  })
}

export function mapImportedTransactions(
  transactions: readonly NormalizedTransaction[],
  rules: readonly MappingRule[],
): MappingResult {
  const ordered = rules
    .map((rule, index) => ({ rule, index }))
    .sort((a, b) => a.rule.priority - b.rule.priority || a.index - b.index)
    .map(({ rule }) => ({
      rule,
      category: normalizeMappingText(rule.sourceCategory),
      comment: rule.commentContains ? normalizeMappingText(rule.commentContains) : null,
    }))

  const mapped: MappedTransaction[] = []
  const rejected: RejectedRow[] = []
  for (const transaction of transactions) {
    if (transaction.type === 'transfer') {
      mapped.push({ ...transaction, targetBudgetItem: null, targetCategory: null })
      continue
    }
    const category = normalizeMappingText(transaction.category)
    const comment = normalizeMappingText(transaction.comment)
    const match = ordered.find((r) => r.category === category && (r.comment === null || comment.includes(r.comment)))
    if (match) {
      mapped.push({
        ...transaction,
        targetBudgetItem: match.rule.targetBudgetItem,
        targetCategory: match.rule.targetCategory,
      })
    } else {
      const first = transaction.sourceRows[0]!
      rejected.push({
        ...first,
        reason: `Nessuna regola di mappatura (categoria: ${transaction.category ?? '(vuota)'}, commento: ${transaction.comment ?? '(vuoto)'})`,
      })
    }
  }
  return { mapped, rejected }
}
