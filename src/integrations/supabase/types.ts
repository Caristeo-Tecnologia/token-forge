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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          brand_color: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          payment_method: string
          slug: string
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          payment_method?: string
          slug: string
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          payment_method?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          company_id: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          end_date: string | null
          id: string
          product_id: string
          return_rate_pct: number | null
          return_type: Database["public"]["Enums"]["return_type"]
          start_date: string | null
          terms: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          end_date?: string | null
          id?: string
          product_id: string
          return_rate_pct?: number | null
          return_type?: Database["public"]["Enums"]["return_type"]
          start_date?: string | null
          terms?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          end_date?: string | null
          id?: string
          product_id?: string
          return_rate_pct?: number | null
          return_type?: Database["public"]["Enums"]["return_type"]
          start_date?: string | null
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          company_id: string
          created_at: string
          file_url: string
          id: string
          is_public: boolean
          name: string
          product_id: string | null
          project_id: string | null
          uploaded_by: string | null
          version: number
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          file_url: string
          id?: string
          is_public?: boolean
          name: string
          product_id?: string | null
          project_id?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          file_url?: string
          id?: string
          is_public?: boolean
          name?: string
          product_id?: string | null
          project_id?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_updates: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          created_by: string | null
          execution_pct: number | null
          id: string
          is_public: boolean
          product_id: string
          title: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          execution_pct?: number | null
          id?: string
          is_public?: boolean
          product_id: string
          title: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          execution_pct?: number | null
          id?: string
          is_public?: boolean
          product_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_updates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_updates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          approved_at: string | null
          company_id: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          funding_target_usd: number
          id: string
          name: string
          project_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["product_status"]
          symbol: string
          token_price_usd: number
          token_unit_definition: string
          token_unit_type: Database["public"]["Enums"]["token_unit_type"]
          total_supply: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          company_id: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          funding_target_usd: number
          id?: string
          name: string
          project_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          symbol: string
          token_price_usd: number
          token_unit_definition: string
          token_unit_type: Database["public"]["Enums"]["token_unit_type"]
          total_supply: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          company_id?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          funding_target_usd?: number
          id?: string
          name?: string
          project_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          symbol?: string
          token_price_usd?: number
          token_unit_definition?: string
          token_unit_type?: Database["public"]["Enums"]["token_unit_type"]
          total_supply?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          company_id: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["project_status"]
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["project_status"]
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_contracts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          mock_address: string
          network: string
          product_id: string
          status: Database["public"]["Enums"]["smart_contract_status"]
          supply_issued: number
          tokens_sold: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          mock_address: string
          network?: string
          product_id: string
          status?: Database["public"]["Enums"]["smart_contract_status"]
          supply_issued?: number
          tokens_sold?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          mock_address?: string
          network?: string
          product_id?: string
          status?: Database["public"]["Enums"]["smart_contract_status"]
          supply_issued?: number
          tokens_sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "smart_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      token_holdings: {
        Row: {
          acquired_at: string
          amount: number
          bearer_code: string
          company_id: string
          id: string
          product_id: string
        }
        Insert: {
          acquired_at?: string
          amount: number
          bearer_code: string
          company_id: string
          id?: string
          product_id: string
        }
        Update: {
          acquired_at?: string
          amount?: number
          bearer_code?: string
          company_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_holdings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_holdings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      token_transactions: {
        Row: {
          amount: number
          bearer_code: string | null
          company_id: string
          created_at: string
          id: string
          mock_tx_hash: string
          product_id: string
          total_usd: number | null
          tx_type: Database["public"]["Enums"]["token_tx_type"]
          unit_price_usd: number | null
        }
        Insert: {
          amount: number
          bearer_code?: string | null
          company_id: string
          created_at?: string
          id?: string
          mock_tx_hash: string
          product_id: string
          total_usd?: number | null
          tx_type: Database["public"]["Enums"]["token_tx_type"]
          unit_price_usd?: number | null
        }
        Update: {
          amount?: number
          bearer_code?: string | null
          company_id?: string
          created_at?: string
          id?: string
          mock_tx_hash?: string
          product_id?: string
          total_usd?: number | null
          tx_type?: Database["public"]["Enums"]["token_tx_type"]
          unit_price_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_company_with_owner: {
        Args: { _name: string; _slug: string }
        Returns: string
      }
      get_user_companies: { Args: { _user_id: string }; Returns: string[] }
      has_company_role: {
        Args: {
          _company_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "manager" | "viewer"
      contract_type: "fixed_duration" | "event_based"
      product_status:
        | "draft"
        | "under_review"
        | "approved"
        | "published"
        | "archived"
      project_status: "planning" | "active" | "completed" | "paused"
      project_type:
        | "mining"
        | "real_estate"
        | "energy"
        | "agriculture"
        | "other"
      return_type: "fixed" | "variable"
      smart_contract_status: "pending" | "deployed" | "active" | "closed"
      token_tx_type: "mint" | "transfer" | "sale" | "burn"
      token_unit_type: "production" | "profit_share" | "asset_fraction"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["owner", "admin", "manager", "viewer"],
      contract_type: ["fixed_duration", "event_based"],
      product_status: [
        "draft",
        "under_review",
        "approved",
        "published",
        "archived",
      ],
      project_status: ["planning", "active", "completed", "paused"],
      project_type: ["mining", "real_estate", "energy", "agriculture", "other"],
      return_type: ["fixed", "variable"],
      smart_contract_status: ["pending", "deployed", "active", "closed"],
      token_tx_type: ["mint", "transfer", "sale", "burn"],
      token_unit_type: ["production", "profit_share", "asset_fraction"],
    },
  },
} as const
