import { BaseService } from './base-service.ts'
import { getSupabase, type TypedSupabaseClient } from './supabase.ts'

/** Area "ricavi": previsioni per cliente (giorni x tariffa, mese di competenza e mese di incasso). */
export class RevenueService {
  readonly forecasts: BaseService<'revenue_forecasts'>

  constructor(getClient: () => TypedSupabaseClient = getSupabase) {
    this.forecasts = new BaseService('revenue_forecasts', getClient)
  }
}

export const revenueService = new RevenueService()
