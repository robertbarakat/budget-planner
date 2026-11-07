// Domain aliases over the types generated from the database (database.types.ts, never edit it by hand).
// Regenerate with `npm run gen:types` (see README).
import type { Enums, Tables, TablesInsert, TablesUpdate } from './database.types.ts'

export type MacroArea = Tables<'macro_areas'>
export type BudgetItem = Tables<'budget_items'>
export type Category = Tables<'categories'>
export type Account = Tables<'accounts'>
export type OpeningBalance = Tables<'opening_balances'>
export type Transaction = Tables<'transactions'>
export type BudgetEntry = Tables<'budget_entries'>
export type Recurrence = Tables<'recurrences'>
export type RecurrenceOccurrence = Tables<'recurrence_occurrences'>
export type ClosedMonth = Tables<'closed_months'>
export type Client = Tables<'clients'>
export type ClientRate = Tables<'client_rates'>

export type NewTransaction = TablesInsert<'transactions'>
export type TransactionUpdate = TablesUpdate<'transactions'>
export type NewBudgetEntry = TablesInsert<'budget_entries'>

export type TransactionType = Enums<'transaction_type'>
export type BudgetEntrySource = Enums<'budget_entry_source'>
export type BalanceSource = Enums<'balance_source'>
export type RecurrenceFrequency = Enums<'recurrence_frequency'>
