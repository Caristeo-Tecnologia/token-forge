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
      product_reviews: {
        Row: {
          id: string
          pool_id: string
          customer_id: string
          customer_name: string
          rating: number
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pool_id: string
          customer_id: string
          customer_name: string
          rating: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pool_id?: string
          customer_id?: string
          customer_name?: string
          rating?: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "asset_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_reviews: {
        Row: {
          id: string
          supplier_id: string
          reviewer_id: string
          reviewer_display_name: string
          rating: number
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          reviewer_id: string
          reviewer_display_name: string
          rating: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          reviewer_id?: string
          reviewer_display_name?: string
          rating?: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          approved_at: string | null
          asset_pool_id: string | null
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
          asset_pool_id?: string | null
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
          asset_pool_id?: string | null
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
            foreignKeyName: "products_asset_pool_id_fkey"
            columns: ["asset_pool_id"]
            isOneToOne: false
            referencedRelation: "asset_pools"
            referencedColumns: ["id"]
          },
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
          approved_at: string | null
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
          approved_at?: string | null
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
          approved_at?: string | null
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
      asset_pools: {
        Row: {
          asset_class_name: string | null
          available_supply: number
          blockchain_status: Database["public"]["Enums"]["pool_blockchain_status"]
          company_id: string | null
          created_at: string
          created_by_admin_id: string | null
          description: string | null
          display_unit_label: string | null
          id: string
          listing_body: string | null
          listing_title: string | null
          listed_at: string | null
          marketplace_listed: boolean
          metadata_uri: string | null
          mint_address: string | null
          name: string
          pda_address: string | null
          performance_mock_pct: number | null
          physical_available: number | null
          physical_total: number | null
          physical_unit: string | null
          product_id: string | null
          slug: string
          status: Database["public"]["Enums"]["pool_status"]
          supplier_id: string | null
          thumbnail_url: string | null
          token_name: string
          token_symbol: string
          tokens_per_physical_unit: number | null
          total_supply: number
          unit_price: number
          updated_at: string
          volume_mock_usd: number | null
        }
        Insert: {
          asset_class_name?: string | null
          available_supply?: number
          blockchain_status?: Database["public"]["Enums"]["pool_blockchain_status"]
          company_id?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          description?: string | null
          display_unit_label?: string | null
          id?: string
          listing_body?: string | null
          listing_title?: string | null
          listed_at?: string | null
          marketplace_listed?: boolean
          metadata_uri?: string | null
          mint_address?: string | null
          name: string
          pda_address?: string | null
          performance_mock_pct?: number | null
          physical_available?: number | null
          physical_total?: number | null
          physical_unit?: string | null
          product_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["pool_status"]
          supplier_id?: string | null
          thumbnail_url?: string | null
          token_name: string
          token_symbol: string
          tokens_per_physical_unit?: number | null
          total_supply: number
          unit_price: number
          updated_at?: string
          volume_mock_usd?: number | null
        }
        Update: {
          asset_class_name?: string | null
          available_supply?: number
          blockchain_status?: Database["public"]["Enums"]["pool_blockchain_status"]
          company_id?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          description?: string | null
          display_unit_label?: string | null
          id?: string
          listing_body?: string | null
          listing_title?: string | null
          listed_at?: string | null
          marketplace_listed?: boolean
          metadata_uri?: string | null
          mint_address?: string | null
          name?: string
          pda_address?: string | null
          performance_mock_pct?: number | null
          physical_available?: number | null
          physical_total?: number | null
          physical_unit?: string | null
          product_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["pool_status"]
          supplier_id?: string | null
          thumbnail_url?: string | null
          token_name?: string
          token_symbol?: string
          tokens_per_physical_unit?: number | null
          total_supply?: number
          unit_price?: number
          updated_at?: string
          volume_mock_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_pools_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_pools_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_pools_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_positions: {
        Row: {
          average_price: number | null
          customer_id: string
          id: string
          pool_id: string
          token_balance: number
          total_invested: number
          updated_at: string
        }
        Insert: {
          average_price?: number | null
          customer_id: string
          id?: string
          pool_id: string
          token_balance?: number
          total_invested?: number
          updated_at?: string
        }
        Update: {
          average_price?: number | null
          customer_id?: string
          id?: string
          pool_id?: string
          token_balance?: number
          total_invested?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_positions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_positions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "asset_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_status: Database["public"]["Enums"]["customer_account_status"]
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
          wallet_linked: boolean
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["customer_account_status"]
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
          wallet_linked?: boolean
        }
        Update: {
          account_status?: Database["public"]["Enums"]["customer_account_status"]
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
          wallet_linked?: boolean
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          active: boolean
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      pool_items: {
        Row: {
          batch_code: string | null
          created_at: string
          estimated_value: number | null
          extraction_date: string | null
          id: string
          metadata_json: Json | null
          origin: string | null
          pool_id: string
          purity: number | null
          serial_number: string | null
          status: Database["public"]["Enums"]["pool_item_status"]
          weight: number | null
        }
        Insert: {
          batch_code?: string | null
          created_at?: string
          estimated_value?: number | null
          extraction_date?: string | null
          id?: string
          metadata_json?: Json | null
          origin?: string | null
          pool_id: string
          purity?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["pool_item_status"]
          weight?: number | null
        }
        Update: {
          batch_code?: string | null
          created_at?: string
          estimated_value?: number | null
          extraction_date?: string | null
          id?: string
          metadata_json?: Json | null
          origin?: string | null
          pool_id?: string
          purity?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["pool_item_status"]
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pool_items_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "asset_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          customer_id: string
          fee_amount: number
          id: string
          metadata_json: Json | null
          pool_id: string
          quantity: number
          status: Database["public"]["Enums"]["rwa_order_status"]
          total_amount: number
          tx_signature: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          fee_amount?: number
          id?: string
          metadata_json?: Json | null
          pool_id: string
          quantity: number
          status?: Database["public"]["Enums"]["rwa_order_status"]
          total_amount: number
          tx_signature?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          fee_amount?: number
          id?: string
          metadata_json?: Json | null
          pool_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["rwa_order_status"]
          total_amount?: number
          tx_signature?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "asset_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      rwa_ledger_entries: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_id: string | null
          entry_kind: string
          id: string
          metadata_json: Json | null
          pool_id: string | null
          reference_id: string | null
          reference_table: string | null
          supplier_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          entry_kind: string
          id?: string
          metadata_json?: Json | null
          pool_id?: string | null
          reference_id?: string | null
          reference_table?: string | null
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          entry_kind?: string
          id?: string
          metadata_json?: Json | null
          pool_id?: string | null
          reference_id?: string | null
          reference_table?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rwa_ledger_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rwa_ledger_entries_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "asset_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rwa_ledger_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rwa_token_transactions: {
        Row: {
          amount: number | null
          blockchain_status: Database["public"]["Enums"]["rwa_chain_status"]
          created_at: string
          customer_id: string | null
          id: string
          metadata_json: Json | null
          pool_id: string
          token_quantity: number
          tx_signature: string | null
          type: Database["public"]["Enums"]["rwa_tx_type"]
        }
        Insert: {
          amount?: number | null
          blockchain_status?: Database["public"]["Enums"]["rwa_chain_status"]
          created_at?: string
          customer_id?: string | null
          id?: string
          metadata_json?: Json | null
          pool_id: string
          token_quantity: number
          tx_signature?: string | null
          type: Database["public"]["Enums"]["rwa_tx_type"]
        }
        Update: {
          amount?: number | null
          blockchain_status?: Database["public"]["Enums"]["rwa_chain_status"]
          created_at?: string
          customer_id?: string | null
          id?: string
          metadata_json?: Json | null
          pool_id?: string
          token_quantity?: number
          tx_signature?: string | null
          type?: Database["public"]["Enums"]["rwa_tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "rwa_token_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rwa_token_transactions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "asset_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      sell_orders: {
        Row: {
          created_at: string
          customer_id: string
          fee_amount: number
          id: string
          metadata_json: Json | null
          pool_id: string
          quantity: number
          status: Database["public"]["Enums"]["rwa_order_status"]
          total_amount: number
          tx_signature: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          fee_amount?: number
          id?: string
          metadata_json?: Json | null
          pool_id: string
          quantity: number
          status?: Database["public"]["Enums"]["rwa_order_status"]
          total_amount: number
          tx_signature?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          fee_amount?: number
          id?: string
          metadata_json?: Json | null
          pool_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["rwa_order_status"]
          total_amount?: number
          tx_signature?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sell_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sell_orders_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "asset_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          cnpj: string | null
          company_name: string
          created_at: string
          description: string | null
          email: string | null
          fantasy_name: string | null
          id: string
          logo_url: string | null
          phone: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          updated_at: string
          user_id: string
          wallet_address: string | null
          wallet_linked: boolean
        }
        Insert: {
          cnpj?: string | null
          company_name: string
          created_at?: string
          description?: string | null
          email?: string | null
          fantasy_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
          user_id: string
          wallet_address?: string | null
          wallet_linked?: boolean
        }
        Update: {
          cnpj?: string | null
          company_name?: string
          created_at?: string
          description?: string | null
          email?: string | null
          fantasy_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
          wallet_linked?: boolean
        }
        Relationships: []
      }
      token_sale_listings: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          pool_id: string
          quantity: number
          status: Database["public"]["Enums"]["token_sale_listing_status"]
          unit_price_ask: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          pool_id: string
          quantity: number
          status?: Database["public"]["Enums"]["token_sale_listing_status"]
          unit_price_ask: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          pool_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["token_sale_listing_status"]
          unit_price_ask?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_sale_listings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_sale_listings_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "asset_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_approvals: {
        Row: {
          approval_flags: string | null
          approved: boolean
          approved_at: string | null
          created_at: string
          customer_id: string
          id: string
          pool_id: string
          wallet: string
        }
        Insert: {
          approval_flags?: string | null
          approved?: boolean
          approved_at?: string | null
          created_at?: string
          customer_id: string
          id?: string
          pool_id: string
          wallet: string
        }
        Update: {
          approval_flags?: string | null
          approved?: boolean
          approved_at?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          pool_id?: string
          wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_approvals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_approvals_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "asset_pools"
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
      record_token_sale: {
        Args: {
          _amount: number
          _bearer_code: string
          _product_id: string
          _tx_hash: string
        }
        Returns: Json
      }
      create_product_with_asset_pool: {
        Args: {
          _company_id: string
          _project_id: string
          _name: string
          _symbol: string
          _description: string
          _token_unit_type: Database["public"]["Enums"]["token_unit_type"]
          _token_unit_definition: string
          _token_price_usd: number
          _funding_target_usd: number
          _physical_unit: string
          _physical_total: number
          _tokens_per_physical_unit: number
          _display_unit_label?: string | null
          _metadata_uri?: string | null
          _thumbnail_url?: string | null
          _asset_class_name?: string | null
          _listing_title?: string | null
          _listing_body?: string | null
        }
        Returns: Json
      }
      get_customer_id_for_user: { Args: { _uid: string }; Returns: string | null }
      get_supplier_id_for_user: { Args: { _uid: string }; Returns: string | null }
      is_platform_admin: { Args: { _uid: string }; Returns: boolean }
      rwa_mock_tx_signature: { Args: { _prefix?: string }; Returns: string }
      rwa_record_purchase: {
        Args: { _fee_bps?: number; _pool_id: string; _quantity: number }
        Returns: Json
      }
      rwa_record_sell: {
        Args: { _fee_bps?: number; _pool_id: string; _quantity: number }
        Returns: Json
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "manager" | "viewer"
      contract_type: "fixed_duration" | "event_based"
      customer_account_status: "pending" | "active" | "blocked"
      kyc_status: "pending" | "approved" | "rejected"
      pool_blockchain_status: "not_started" | "mint_pending" | "minted" | "failed"
      pool_item_status: "available" | "tokenized" | "sold" | "redeemed"
      pool_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "tokenized"
        | "paused"
        | "sold_out"
        | "archived"
      product_status:
        | "draft"
        | "under_review"
        | "approved"
        | "published"
        | "archived"
      project_status:
        | "planning"
        | "active"
        | "completed"
        | "paused"
        | "under_review"
        | "approved"
      project_type:
        | "mining"
        | "real_estate"
        | "energy"
        | "agriculture"
        | "other"
      return_type: "fixed" | "variable"
      rwa_chain_status: "pending" | "confirmed" | "failed"
      rwa_order_status: "pending" | "processing" | "completed" | "failed" | "cancelled"
      rwa_tx_type: "buy" | "sell" | "mint" | "redeem" | "transfer"
      smart_contract_status: "pending" | "deployed" | "active" | "closed"
      supplier_status: "pending" | "approved" | "rejected" | "suspended"
      token_sale_listing_status: "draft" | "active" | "paused" | "filled" | "cancelled"
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
      customer_account_status: ["pending", "active", "blocked"],
      kyc_status: ["pending", "approved", "rejected"],
      pool_blockchain_status: ["not_started", "mint_pending", "minted", "failed"],
      pool_item_status: ["available", "tokenized", "sold", "redeemed"],
      pool_status: [
        "draft",
        "pending_approval",
        "approved",
        "tokenized",
        "paused",
        "sold_out",
        "archived",
      ],
      product_status: [
        "draft",
        "under_review",
        "approved",
        "published",
        "archived",
      ],
      project_status: [
        "planning",
        "active",
        "completed",
        "paused",
        "under_review",
        "approved",
      ],
      project_type: ["mining", "real_estate", "energy", "agriculture", "other"],
      return_type: ["fixed", "variable"],
      rwa_chain_status: ["pending", "confirmed", "failed"],
      rwa_order_status: ["pending", "processing", "completed", "failed", "cancelled"],
      rwa_tx_type: ["buy", "sell", "mint", "redeem", "transfer"],
      smart_contract_status: ["pending", "deployed", "active", "closed"],
      supplier_status: ["pending", "approved", "rejected", "suspended"],
      token_sale_listing_status: ["draft", "active", "paused", "filled", "cancelled"],
      token_tx_type: ["mint", "transfer", "sale", "burn"],
      token_unit_type: ["production", "profit_share", "asset_fraction"],
    },
  },
} as const
