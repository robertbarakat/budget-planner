import { eurosToCents, type F24TaxType } from 'budget-planner-shared'

export type TaxRole = 'substitute_tax' | 'inps' | 'substitute_tax_interest' | 'inps_interest'

export interface PayableDeadline {
  id: number
  tax_type: F24TaxType
  due_date: string
  amount: number
  installment_id: number | null
}

/** Capitale e interessi di una scadenza: le rate hanno gli interessi nella riga, le altre scadenze sono solo capitale. */
export function splitDeadline(deadline: PayableDeadline, installment: { interest: number } | undefined): { principal: number; interest: number } {
  const interestCents = installment ? eurosToCents(Number(installment.interest)) : 0
  return { principal: (eurosToCents(Number(deadline.amount)) - interestCents) / 100, interest: interestCents / 100 }
}

export const capitalRole = (taxType: string): 'substitute_tax' | 'inps' => (taxType.startsWith('inps') ? 'inps' : 'substitute_tax')
const interestRole = (taxType: string): TaxRole => (taxType.startsWith('inps') ? 'inps_interest' : 'substitute_tax_interest')

export interface PayMovement {
  budgetItemId: number
  categoryId: number
  amount: number
  /** Scadenza da collegare al movimento (solo il capitale); null per gli interessi. */
  deadlineId: number | null
}

/**
 * Movimenti di un versamento F24 (le scadenze della stessa data): un movimento di capitale per riga, sulla voce del tributo,
 * più un movimento di interessi per tributo. Le voci si riconoscono dal ruolo fiscale (`tax_role`).
 */
export function planPayment(
  deadlines: readonly PayableDeadline[],
  installmentById: ReadonlyMap<number, { interest: number }>,
  itemByRole: ReadonlyMap<TaxRole, number>,
  categoryOfItem: ReadonlyMap<number, number>,
): { movements: PayMovement[] } | { error: string } {
  const movements: PayMovement[] = []
  const interest = new Map<TaxRole, number>()
  const resolve = (role: TaxRole): { itemId: number; categoryId: number } | null => {
    const itemId = itemByRole.get(role)
    const categoryId = itemId === undefined ? undefined : categoryOfItem.get(itemId)
    return itemId === undefined || categoryId === undefined ? null : { itemId, categoryId }
  }
  for (const deadline of deadlines) {
    const parts = splitDeadline(deadline, deadline.installment_id === null ? undefined : installmentById.get(deadline.installment_id))
    const capital = resolve(capitalRole(deadline.tax_type))
    if (!capital) return { error: 'Manca la voce del budget per imposta sostitutiva o INPS (con almeno una categoria).' }
    if (parts.principal > 0) movements.push({ budgetItemId: capital.itemId, categoryId: capital.categoryId, amount: parts.principal, deadlineId: deadline.id })
    if (parts.interest > 0) {
      const role = interestRole(deadline.tax_type)
      interest.set(role, (interest.get(role) ?? 0) + eurosToCents(parts.interest))
    }
  }
  for (const [role, cents] of interest) {
    const target = resolve(role)
    if (!target) return { error: 'Manca la voce del budget per gli interessi (con almeno una categoria).' }
    movements.push({ budgetItemId: target.itemId, categoryId: target.categoryId, amount: cents / 100, deadlineId: null })
  }
  return { movements }
}

/** Parti di budget di un anno dalle scadenze: capitale e interessi sulle voci giuste (ruolo fiscale). Vuoto se manca una voce. */
export function taxBudgetParts(
  deadlines: readonly PayableDeadline[],
  installmentById: ReadonlyMap<number, { interest: number }>,
  itemByRole: ReadonlyMap<TaxRole, number>,
): { due_date: string; budgetItemId: number; amount: number }[] {
  return deadlines.flatMap((d) => {
    const parts = splitDeadline(d, d.installment_id === null ? undefined : installmentById.get(d.installment_id))
    const out: { due_date: string; budgetItemId: number; amount: number }[] = []
    const capital = itemByRole.get(capitalRole(d.tax_type))
    const interest = itemByRole.get(interestRole(d.tax_type))
    if (capital !== undefined && parts.principal > 0) out.push({ due_date: d.due_date, budgetItemId: capital, amount: parts.principal })
    if (interest !== undefined && parts.interest > 0) out.push({ due_date: d.due_date, budgetItemId: interest, amount: parts.interest })
    return out
  })
}
