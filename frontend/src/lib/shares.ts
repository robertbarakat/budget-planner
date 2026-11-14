export interface ShareRow {
  id: number | null
  name: string
  cents: number
  /** Quota sul totale, 0-100. */
  percent: number
}

export interface AreaShare extends ShareRow {
  items: ShareRow[]
}

export interface ShareResult {
  totalCents: number
  areas: AreaShare[]
}

/**
 * Quanto pesa ogni macro-area (e ogni voce sotto di essa) sul totale delle spese o delle entrate del periodo.
 * I trasferimenti non contano; i movimenti senza voce stanno in «Senza voce».
 */
export function buildShares(
  kind: 'expense' | 'income',
  transactions: readonly { type: string; budgetItemId: number | null; amountCents: number }[],
  items: readonly { id: number; name: string; macroAreaId: number }[],
  areas: readonly { id: number; name: string }[],
): ShareResult {
  const itemById = new Map(items.map((i) => [i.id, i]))
  const areaById = new Map(areas.map((a) => [a.id, a]))
  const perItem = new Map<number | null, number>()
  let total = 0
  for (const t of transactions) {
    if (t.type !== kind) continue
    const key = t.budgetItemId !== null && itemById.has(t.budgetItemId) ? t.budgetItemId : null
    perItem.set(key, (perItem.get(key) ?? 0) + t.amountCents)
    total += t.amountCents
  }
  const pct = (cents: number) => (total === 0 ? 0 : (cents / total) * 100)
  const perArea = new Map<number | null, AreaShare>()
  for (const [itemId, cents] of perItem) {
    const item = itemId === null ? undefined : itemById.get(itemId)
    const areaId = item ? item.macroAreaId : null
    const area = perArea.get(areaId) ?? { id: areaId, name: areaId === null ? 'Senza voce' : (areaById.get(areaId)?.name ?? 'Senza gruppo'), cents: 0, percent: 0, items: [] }
    area.cents += cents
    area.items.push({ id: itemId, name: item?.name ?? 'Senza voce', cents, percent: pct(cents) })
    perArea.set(areaId, area)
  }
  const result = [...perArea.values()]
  for (const a of result) {
    a.percent = pct(a.cents)
    a.items.sort((x, y) => y.cents - x.cents)
  }
  result.sort((x, y) => y.cents - x.cents)
  return { totalCents: total, areas: result }
}
