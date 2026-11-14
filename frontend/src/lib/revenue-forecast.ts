import type { RevenueForecast } from 'budget-planner-shared'

/** Mese di incasso proposto: competenza + ritardo dell'ultima previsione del cliente (0 se non ce ne sono). */
export function proposeCollection(
  workYear: number,
  workMonth: number,
  previous: Pick<RevenueForecast, 'work_year' | 'work_month' | 'collection_year' | 'collection_month' | 'id'>[],
): { year: number; month: number } {
  const last = [...previous].sort((a, b) => b.id - a.id)[0]
  const delay = last ? last.collection_year * 12 + last.collection_month - (last.work_year * 12 + last.work_month) : 0
  const total = workYear * 12 + (workMonth - 1) + Math.max(delay, 0)
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

/** Numero scritto all'italiana ("1,5" o "350,00"); null se non valido. */
export function parseNumber(text: string): number | null {
  const value = Number(text.trim().replace(/\./g, '').replace(',', '.'))
  return text.trim() !== '' && Number.isFinite(value) ? value : null
}
