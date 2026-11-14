
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "accounts": {
                  Row: {
                    "archived": boolean,"created_at": string,"id": number,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"created_at"?: string,"id"?: never,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "archived"?: boolean,"created_at"?: string,"id"?: never,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"budget_entries": {
                  Row: {
                    "amount": number,"budget_item_id": number,"created_at": string,"id": number,"month": number,"source": Database["public"]['Enums']["budget_entry_source"],"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"budget_item_id": number,"created_at"?: string,"id"?: never,"month": number,"source"?: Database["public"]['Enums']["budget_entry_source"],"year": number
                  }
                  Update: {
                    "amount"?: number,"budget_item_id"?: number,"created_at"?: string,"id"?: never,"month"?: number,"source"?: Database["public"]['Enums']["budget_entry_source"],"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_entries_budget_item_id_fkey"
      columns: ["budget_item_id"]
isOneToOne: false
      referencedRelation: "budget_items"
      referencedColumns: ["id"]
    }
                  ]
                },"budget_items": {
                  Row: {
                    "archived": boolean,"created_at": string,"id": number,"kind": Database["public"]['Enums']["budget_item_kind"],"macro_area_id": number,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"created_at"?: string,"id"?: never,"kind": Database["public"]['Enums']["budget_item_kind"],"macro_area_id": number,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "archived"?: boolean,"created_at"?: string,"id"?: never,"kind"?: Database["public"]['Enums']["budget_item_kind"],"macro_area_id"?: number,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_items_macro_area_id_fkey"
      columns: ["macro_area_id"]
isOneToOne: false
      referencedRelation: "macro_areas"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "archived": boolean,"budget_item_id": number,"created_at": string,"id": number,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"budget_item_id": number,"created_at"?: string,"id"?: never,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "archived"?: boolean,"budget_item_id"?: number,"created_at"?: string,"id"?: never,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_budget_item_id_fkey"
      columns: ["budget_item_id"]
isOneToOne: false
      referencedRelation: "budget_items"
      referencedColumns: ["id"]
    }
                  ]
                },"client_rates": {
                  Row: {
                    "client_id": number,"created_at": string,"daily_rate": number,"id": number,"valid_from_month": number,"valid_from_year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": number,"created_at"?: string,"daily_rate": number,"id"?: never,"valid_from_month": number,"valid_from_year": number
                  }
                  Update: {
                    "client_id"?: number,"created_at"?: string,"daily_rate"?: number,"id"?: never,"valid_from_month"?: number,"valid_from_year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_rates_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "archived": boolean,"budget_item_id": number,"collection_delay_months": number,"created_at": string,"id": number,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"budget_item_id": number,"collection_delay_months"?: number,"created_at"?: string,"id"?: never,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "archived"?: boolean,"budget_item_id"?: number,"collection_delay_months"?: number,"created_at"?: string,"id"?: never,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_budget_item_id_fkey"
      columns: ["budget_item_id"]
isOneToOne: false
      referencedRelation: "budget_items"
      referencedColumns: ["id"]
    }
                  ]
                },"closed_months": {
                  Row: {
                    "closed_at": string,"id": number,"month": number,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string,"id"?: never,"month": number,"year": number
                  }
                  Update: {
                    "closed_at"?: string,"id"?: never,"month"?: number,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"f24_deadlines": {
                  Row: {
                    "amount": number,"created_at": string,"due_date": string,"id": number,"installment_id": number | null,"is_amount_manual": boolean,"reference_year": number,"tax_type": Database["public"]['Enums']["tax_type"],"transaction_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"due_date": string,"id"?: never,"installment_id"?: number | null,"is_amount_manual"?: boolean,"reference_year": number,"tax_type": Database["public"]['Enums']["tax_type"],"transaction_id"?: number | null
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"due_date"?: string,"id"?: never,"installment_id"?: number | null,"is_amount_manual"?: boolean,"reference_year"?: number,"tax_type"?: Database["public"]['Enums']["tax_type"],"transaction_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "f24_deadlines_installment_id_fkey"
      columns: ["installment_id"]
isOneToOne: false
      referencedRelation: "installments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "f24_deadlines_transaction_id_fkey"
      columns: ["transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    }
                  ]
                },"installment_plans": {
                  Row: {
                    "archived": boolean,"created_at": string,"description": string,"id": number,"reference_year": number,"tax_type": Database["public"]['Enums']["tax_type"],"total_amount": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"created_at"?: string,"description": string,"id"?: never,"reference_year": number,"tax_type": Database["public"]['Enums']["tax_type"],"total_amount": number
                  }
                  Update: {
                    "archived"?: boolean,"created_at"?: string,"description"?: string,"id"?: never,"reference_year"?: number,"tax_type"?: Database["public"]['Enums']["tax_type"],"total_amount"?: number
                  }
                  Relationships: [
                    
                  ]
                },"installment_lines": {
                  Row: {
                    "created_at": string,"id": number,"last_number": number | null,"plan_id": number,"quota": number,"reference_year": number,"tax_type": Database["public"]['Enums']["tax_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"last_number"?: number | null,"plan_id": number,"quota": number,"reference_year": number,"tax_type": Database["public"]['Enums']["tax_type"]
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"last_number"?: number | null,"plan_id"?: number,"quota"?: number,"reference_year"?: number,"tax_type"?: Database["public"]['Enums']["tax_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "installment_lines_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "installment_plans"
      referencedColumns: ["id"]
    }
                  ]
                },"installments": {
                  Row: {
                    "amount": number,"created_at": string,"due_date": string,"id": number,"interest": number,"number": number,"plan_id": number,"principal": number,"reference_year": number,"tax_type": Database["public"]['Enums']["tax_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"due_date": string,"id"?: never,"interest"?: number,"number": number,"plan_id": number,"principal": number,"reference_year": number,"tax_type": Database["public"]['Enums']["tax_type"]
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"due_date"?: string,"id"?: never,"interest"?: number,"number"?: number,"plan_id"?: number,"principal"?: number,"reference_year"?: number,"tax_type"?: Database["public"]['Enums']["tax_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "installments_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "installment_plans"
      referencedColumns: ["id"]
    }
                  ]
                },"macro_areas": {
                  Row: {
                    "archived": boolean,"created_at": string,"id": number,"is_professional": boolean,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"created_at"?: string,"id"?: never,"is_professional"?: boolean,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "archived"?: boolean,"created_at"?: string,"id"?: never,"is_professional"?: boolean,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"opening_balances": {
                  Row: {
                    "account_id": number,"amount": number,"created_at": string,"id": number,"source": Database["public"]['Enums']["balance_source"],"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": number,"amount": number,"created_at"?: string,"id"?: never,"source"?: Database["public"]['Enums']["balance_source"],"year": number
                  }
                  Update: {
                    "account_id"?: number,"amount"?: number,"created_at"?: string,"id"?: never,"source"?: Database["public"]['Enums']["balance_source"],"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "opening_balances_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    }
                  ]
                },"recurrence_occurrences": {
                  Row: {
                    "amount": number,"budget_entry_id": number | null,"created_at": string,"due_date": string,"id": number,"is_manually_modified": boolean,"recurrence_id": number,"registered_at": string | null,"transaction_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"budget_entry_id"?: number | null,"created_at"?: string,"due_date": string,"id"?: never,"is_manually_modified"?: boolean,"recurrence_id": number,"registered_at"?: string | null,"transaction_id"?: number | null
                  }
                  Update: {
                    "amount"?: number,"budget_entry_id"?: number | null,"created_at"?: string,"due_date"?: string,"id"?: never,"is_manually_modified"?: boolean,"recurrence_id"?: number,"registered_at"?: string | null,"transaction_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recurrence_occurrences_budget_entry_id_fkey"
      columns: ["budget_entry_id"]
isOneToOne: false
      referencedRelation: "budget_entries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recurrence_occurrences_recurrence_id_fkey"
      columns: ["recurrence_id"]
isOneToOne: false
      referencedRelation: "recurrences"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recurrence_occurrences_transaction_id_fkey"
      columns: ["transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    }
                  ]
                },"recurrences": {
                  Row: {
                    "account_id": number,"archived": boolean,"base_amount": number,"budget_item_id": number,"created_at": string,"end_date": string | null,"frequency": Database["public"]['Enums']["recurrence_frequency"],"id": number,"name": string,"start_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": number,"archived"?: boolean,"base_amount": number,"budget_item_id": number,"created_at"?: string,"end_date"?: string | null,"frequency": Database["public"]['Enums']["recurrence_frequency"],"id"?: never,"name": string,"start_date": string
                  }
                  Update: {
                    "account_id"?: number,"archived"?: boolean,"base_amount"?: number,"budget_item_id"?: number,"created_at"?: string,"end_date"?: string | null,"frequency"?: Database["public"]['Enums']["recurrence_frequency"],"id"?: never,"name"?: string,"start_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recurrences_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recurrences_budget_item_id_fkey"
      columns: ["budget_item_id"]
isOneToOne: false
      referencedRelation: "budget_items"
      referencedColumns: ["id"]
    }
                  ]
                },"tax_parameters": {
                  Row: {
                    "activity_start_year": number,"created_at": string,"first_advance_due_date": string | null,"first_advance_method": Database["public"]['Enums']["advance_method"],"has_other_pension_coverage": boolean,"id": number,"inps_rate": number,"is_startup": boolean,"profitability_coefficient": number,"second_advance_due_date": string | null,"second_advance_method": Database["public"]['Enums']["advance_method"],"substitute_tax_rate": number,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_start_year": number,"created_at"?: string,"first_advance_due_date"?: string | null,"first_advance_method"?: Database["public"]['Enums']["advance_method"],"has_other_pension_coverage"?: boolean,"id"?: never,"inps_rate": number,"is_startup"?: boolean,"profitability_coefficient": number,"second_advance_due_date"?: string | null,"second_advance_method"?: Database["public"]['Enums']["advance_method"],"substitute_tax_rate": number,"year": number
                  }
                  Update: {
                    "activity_start_year"?: number,"created_at"?: string,"first_advance_due_date"?: string | null,"first_advance_method"?: Database["public"]['Enums']["advance_method"],"has_other_pension_coverage"?: boolean,"id"?: never,"inps_rate"?: number,"is_startup"?: boolean,"profitability_coefficient"?: number,"second_advance_due_date"?: string | null,"second_advance_method"?: Database["public"]['Enums']["advance_method"],"substitute_tax_rate"?: number,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"transactions": {
                  Row: {
                    "account_id": number,"amount": number,"budget_item_id": number | null,"category_id": number | null,"comment": string | null,"created_at": string,"destination_account_id": number | null,"id": number,"tag": string | null,"transaction_date": string,"type": Database["public"]['Enums']["transaction_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": number,"amount": number,"budget_item_id"?: number | null,"category_id"?: number | null,"comment"?: string | null,"created_at"?: string,"destination_account_id"?: number | null,"id"?: never,"tag"?: string | null,"transaction_date": string,"type": Database["public"]['Enums']["transaction_type"]
                  }
                  Update: {
                    "account_id"?: number,"amount"?: number,"budget_item_id"?: number | null,"category_id"?: number | null,"comment"?: string | null,"created_at"?: string,"destination_account_id"?: number | null,"id"?: never,"tag"?: string | null,"transaction_date"?: string,"type"?: Database["public"]['Enums']["transaction_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "transactions_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_budget_item_id_fkey"
      columns: ["budget_item_id"]
isOneToOne: false
      referencedRelation: "budget_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_destination_account_id_fkey"
      columns: ["destination_account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    }
                  ]
                },"worked_days": {
                  Row: {
                    "client_id": number,"created_at": string,"days": number,"id": number,"month": number,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": number,"created_at"?: string,"days": number,"id"?: never,"month": number,"year": number
                  }
                  Update: {
                    "client_id"?: number,"created_at"?: string,"days"?: number,"id"?: never,"month"?: number,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "worked_days_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_recurrence":
{ Args: { "p_due_dates": (string)[],"p_recurrence_id": number }; Returns: number
                           },
"archive_recurrence":
{ Args: { "p_recurrence_id": number,"p_today": string }; Returns: number
                           },
"import_transactions":
{ Args: { "p_transactions": Json }; Returns: {
              "expense_total": number,"income_total": number,"inserted_count": number,"transfer_total": number
            }[]
                           },
"reclassify_category_history":
{ Args: { "p_budget_item_id": number,"p_category_id": number,"p_from_date"?: string,"p_to_date"?: string }; Returns: number
                           },
"regenerate_recurrence_occurrences":
{ Args: { "p_due_dates": (string)[],"p_recurrence_id": number,"p_today": string }; Returns: {
              "created_count": number,"deleted_count": number,"updated_count": number
            }[]
                           },
"register_due_recurrence_transactions":
{ Args: { "p_today": string }; Returns: number
                           },
"replace_revenue_driver_entries":
{ Args: { "p_entries": Json,"p_from_month": number,"p_from_year": number,"p_to_month": number,"p_to_year": number }; Returns: {
              "deleted_count": number,"inserted_count": number
            }[]
                           },
"replace_tax_entries":
{ Args: { "p_entries": Json,"p_from_month": number,"p_from_year": number,"p_to_month": number,"p_to_year": number }; Returns: {
              "deleted_count": number,"inserted_count": number
            }[]
                           }
          }
          Enums: {
            "advance_method": "historic"|"forecast","balance_source": "manual"|"carried_over","budget_entry_source": "manual"|"revenue_driver"|"recurrence"|"tax","budget_item_kind": "income"|"expense","recurrence_frequency": "monthly"|"bimonthly"|"quarterly"|"semiannual"|"annual","tax_type": "substitute_tax"|"substitute_tax_advance"|"substitute_tax_balance"|"inps"|"inps_advance"|"inps_balance","transaction_type": "expense"|"income"|"transfer"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "advance_method": ["historic", "forecast"],"balance_source": ["manual", "carried_over"],"budget_entry_source": ["manual", "revenue_driver", "recurrence", "tax"],"budget_item_kind": ["income", "expense"],"recurrence_frequency": ["monthly", "bimonthly", "quarterly", "semiannual", "annual"],"tax_type": ["substitute_tax", "substitute_tax_advance", "substitute_tax_balance", "inps", "inps_advance", "inps_balance"],"transaction_type": ["expense", "income", "transfer"]
          }
        }
} as const
