export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categorie: {
        Row: {
          archiviata: boolean
          created_at: string
          id: number
          nome: string
          ordine: number
          voce_budget_id: number
        }
        Insert: {
          archiviata?: boolean
          created_at?: string
          id?: never
          nome: string
          ordine?: number
          voce_budget_id: number
        }
        Update: {
          archiviata?: boolean
          created_at?: string
          id?: never
          nome?: string
          ordine?: number
          voce_budget_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "categorie_voce_budget_id_fkey"
            columns: ["voce_budget_id"]
            isOneToOne: false
            referencedRelation: "voci_budget"
            referencedColumns: ["id"]
          },
        ]
      }
      conti: {
        Row: {
          archiviato: boolean
          created_at: string
          id: number
          nome: string
          ordine: number
        }
        Insert: {
          archiviato?: boolean
          created_at?: string
          id?: never
          nome: string
          ordine?: number
        }
        Update: {
          archiviato?: boolean
          created_at?: string
          id?: never
          nome?: string
          ordine?: number
        }
        Relationships: []
      }
      macro_aree: {
        Row: {
          archiviata: boolean
          created_at: string
          id: number
          nome: string
          ordine: number
        }
        Insert: {
          archiviata?: boolean
          created_at?: string
          id?: never
          nome: string
          ordine?: number
        }
        Update: {
          archiviata?: boolean
          created_at?: string
          id?: never
          nome?: string
          ordine?: number
        }
        Relationships: []
      }
      mesi_chiusi: {
        Row: {
          anno: number
          chiuso_il: string
          id: number
          mese: number
        }
        Insert: {
          anno: number
          chiuso_il?: string
          id?: never
          mese: number
        }
        Update: {
          anno?: number
          chiuso_il?: string
          id?: never
          mese?: number
        }
        Relationships: []
      }
      movimenti: {
        Row: {
          categoria_id: number | null
          commento: string | null
          conto_destinazione_id: number | null
          conto_id: number
          created_at: string
          data: string
          id: number
          importo: number
          tag: string | null
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          voce_budget_id: number | null
        }
        Insert: {
          categoria_id?: number | null
          commento?: string | null
          conto_destinazione_id?: number | null
          conto_id: number
          created_at?: string
          data: string
          id?: never
          importo: number
          tag?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          voce_budget_id?: number | null
        }
        Update: {
          categoria_id?: number | null
          commento?: string | null
          conto_destinazione_id?: number | null
          conto_id?: number
          created_at?: string
          data?: string
          id?: never
          importo?: number
          tag?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimento"]
          voce_budget_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimenti_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_conto_destinazione_id_fkey"
            columns: ["conto_destinazione_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_voce_budget_id_fkey"
            columns: ["voce_budget_id"]
            isOneToOne: false
            referencedRelation: "voci_budget"
            referencedColumns: ["id"]
          },
        ]
      }
      ricorrenze: {
        Row: {
          archiviata: boolean
          conto_id: number
          created_at: string
          data_fine: string | null
          data_inizio: string
          id: number
          importo_base: number
          nome: string
          periodicita: Database["public"]["Enums"]["periodicita"]
          voce_budget_id: number
        }
        Insert: {
          archiviata?: boolean
          conto_id: number
          created_at?: string
          data_fine?: string | null
          data_inizio: string
          id?: never
          importo_base: number
          nome: string
          periodicita: Database["public"]["Enums"]["periodicita"]
          voce_budget_id: number
        }
        Update: {
          archiviata?: boolean
          conto_id?: number
          created_at?: string
          data_fine?: string | null
          data_inizio?: string
          id?: never
          importo_base?: number
          nome?: string
          periodicita?: Database["public"]["Enums"]["periodicita"]
          voce_budget_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ricorrenze_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ricorrenze_voce_budget_id_fkey"
            columns: ["voce_budget_id"]
            isOneToOne: false
            referencedRelation: "voci_budget"
            referencedColumns: ["id"]
          },
        ]
      }
      righe_budget: {
        Row: {
          anno: number
          created_at: string
          id: number
          importo: number
          mese: number
          origine: Database["public"]["Enums"]["origine_riga_budget"]
          voce_budget_id: number
        }
        Insert: {
          anno: number
          created_at?: string
          id?: never
          importo: number
          mese: number
          origine?: Database["public"]["Enums"]["origine_riga_budget"]
          voce_budget_id: number
        }
        Update: {
          anno?: number
          created_at?: string
          id?: never
          importo?: number
          mese?: number
          origine?: Database["public"]["Enums"]["origine_riga_budget"]
          voce_budget_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "righe_budget_voce_budget_id_fkey"
            columns: ["voce_budget_id"]
            isOneToOne: false
            referencedRelation: "voci_budget"
            referencedColumns: ["id"]
          },
        ]
      }
      saldi_iniziali: {
        Row: {
          anno: number
          conto_id: number
          created_at: string
          id: number
          importo: number
          origine: Database["public"]["Enums"]["origine_saldo"]
        }
        Insert: {
          anno: number
          conto_id: number
          created_at?: string
          id?: never
          importo: number
          origine?: Database["public"]["Enums"]["origine_saldo"]
        }
        Update: {
          anno?: number
          conto_id?: number
          created_at?: string
          id?: never
          importo?: number
          origine?: Database["public"]["Enums"]["origine_saldo"]
        }
        Relationships: [
          {
            foreignKeyName: "saldi_iniziali_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
        ]
      }
      scadenze_ricorrenza: {
        Row: {
          created_at: string
          data: string
          id: number
          importo: number
          ricorrenza_id: number
          riga_budget_id: number | null
        }
        Insert: {
          created_at?: string
          data: string
          id?: never
          importo: number
          ricorrenza_id: number
          riga_budget_id?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          id?: never
          importo?: number
          ricorrenza_id?: number
          riga_budget_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scadenze_ricorrenza_ricorrenza_id_fkey"
            columns: ["ricorrenza_id"]
            isOneToOne: false
            referencedRelation: "ricorrenze"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenze_ricorrenza_riga_budget_id_fkey"
            columns: ["riga_budget_id"]
            isOneToOne: false
            referencedRelation: "righe_budget"
            referencedColumns: ["id"]
          },
        ]
      }
      voci_budget: {
        Row: {
          archiviata: boolean
          created_at: string
          id: number
          macro_area_id: number
          nome: string
          ordine: number
        }
        Insert: {
          archiviata?: boolean
          created_at?: string
          id?: never
          macro_area_id: number
          nome: string
          ordine?: number
        }
        Update: {
          archiviata?: boolean
          created_at?: string
          id?: never
          macro_area_id?: number
          nome?: string
          ordine?: number
        }
        Relationships: [
          {
            foreignKeyName: "voci_budget_macro_area_id_fkey"
            columns: ["macro_area_id"]
            isOneToOne: false
            referencedRelation: "macro_aree"
            referencedColumns: ["id"]
          },
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
      origine_riga_budget:
        | "manuale"
        | "driver_ricavi"
        | "ricorrenza"
        | "fiscale"
      origine_saldo: "manuale" | "riportato"
      periodicita:
        | "mensile"
        | "bimestrale"
        | "trimestrale"
        | "semestrale"
        | "annuale"
      tipo_movimento: "spesa" | "entrata" | "trasferimento"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      origine_riga_budget: [
        "manuale",
        "driver_ricavi",
        "ricorrenza",
        "fiscale",
      ],
      origine_saldo: ["manuale", "riportato"],
      periodicita: [
        "mensile",
        "bimestrale",
        "trimestrale",
        "semestrale",
        "annuale",
      ],
      tipo_movimento: ["spesa", "entrata", "trasferimento"],
    },
  },
} as const
