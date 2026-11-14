import { createCrudHooks } from './crud-hooks.ts'
import { queryKeys } from './query-keys.ts'
import { revenueService } from './revenue.service.ts'

// Le previsioni generano righe di budget (lo fa il DB): ogni scrittura invalida ricavi e budget.
const forecasts = createCrudHooks({
  service: revenueService.forecasts,
  key: queryKeys.revenue.forecasts,
  invalidate: [queryKeys.revenue.all, queryKeys.budget.all],
})
export const useRevenueForecasts = forecasts.useList
export const useCreateRevenueForecast = forecasts.useCreate
export const useDeleteRevenueForecast = forecasts.useRemove
