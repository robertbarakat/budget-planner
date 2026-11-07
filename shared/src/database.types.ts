
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
                    "archived": boolean,"created_at": string,"id": number,"macro_area_id": number,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"created_at"?: string,"id"?: never,"macro_area_id": number,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "archived"?: boolean,"created_at"?: string,"id"?: never,"macro_area_id"?: number,"name"?: string,"sort_order"?: number
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
                },"macro_areas": {
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
                    "amount": number,"budget_entry_id": number | null,"created_at": string,"due_date": string,"id": number,"recurrence_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"budget_entry_id"?: number | null,"created_at"?: string,"due_date": string,"id"?: never,"recurrence_id": number
                  }
                  Update: {
                    "amount"?: number,"budget_entry_id"?: number | null,"created_at"?: string,"due_date"?: string,"id"?: never,"recurrence_id"?: number
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
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "balance_source": "manual"|"carried_over","budget_entry_source": "manual"|"revenue_driver"|"recurrence"|"tax","recurrence_frequency": "monthly"|"bimonthly"|"quarterly"|"semiannual"|"annual","transaction_type": "expense"|"income"|"transfer"
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
            "balance_source": ["manual", "carried_over"],"budget_entry_source": ["manual", "revenue_driver", "recurrence", "tax"],"recurrence_frequency": ["monthly", "bimonthly", "quarterly", "semiannual", "annual"],"transaction_type": ["expense", "income", "transfer"]
          }
        }
} as const
