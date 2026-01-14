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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          company_id: string
          created_at: string | null
          currency: string | null
          current_balance: number | null
          id: string
          is_active: boolean | null
          name: string
          opening_balance: number | null
          type: Database["public"]["Enums"]["account_type"]
        }
        Insert: {
          company_id: string
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          opening_balance?: number | null
          type?: Database["public"]["Enums"]["account_type"]
        }
        Update: {
          company_id?: string
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          opening_balance?: number | null
          type?: Database["public"]["Enums"]["account_type"]
        }
        Relationships: [
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: Database["public"]["Enums"]["category_type"]
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: Database["public"]["Enums"]["category_type"]
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["category_type"]
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          bin_iin: string | null
          created_at: string | null
          default_currency: string | null
          email: string | null
          id: string
          invoice_next_number: number | null
          invoice_prefix: string | null
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          bin_iin?: string | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          bin_iin?: string | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
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
      counterparties: {
        Row: {
          address: string | null
          bin_iin: string | null
          company_id: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_client: boolean | null
          is_supplier: boolean | null
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          bin_iin?: string | null
          company_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_client?: boolean | null
          is_supplier?: boolean | null
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          bin_iin?: string | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_client?: boolean | null
          is_supplier?: boolean | null
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counterparties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_id: string
          created_at: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          name: string
          position: string | null
          salary: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          position?: string | null
          salary?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          position?: string | null
          salary?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          description: string | null
          id: string
          invoice_id: string
          item_id: string | null
          item_name: string
          line_total: number | null
          price: number | null
          quantity: number | null
        }
        Insert: {
          description?: string | null
          id?: string
          invoice_id: string
          item_id?: string | null
          item_name: string
          line_total?: number | null
          price?: number | null
          quantity?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          invoice_id?: string
          item_id?: string | null
          item_name?: string
          line_total?: number | null
          price?: number | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string
          counterparty_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          date: string
          due_date: string | null
          id: string
          notes: string | null
          number: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number | null
          tax_amount: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          counterparty_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          counterparty_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price_default: number | null
          unit: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_default?: number | null
          unit?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_default?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_id: string | null
          amount: number
          company_id: string
          created_at: string | null
          date: string
          id: string
          invoice_id: string | null
          method: string | null
          note: string | null
          transaction_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          company_id: string
          created_at?: string | null
          date?: string
          id?: string
          invoice_id?: string | null
          method?: string | null
          note?: string | null
          transaction_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          company_id?: string
          created_at?: string | null
          date?: string
          id?: string
          invoice_id?: string | null
          method?: string | null
          note?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          accrued: number | null
          company_id: string
          created_at: string | null
          date_paid: string | null
          employee_id: string
          id: string
          note: string | null
          paid: number | null
          period: string
        }
        Insert: {
          accrued?: number | null
          company_id: string
          created_at?: string | null
          date_paid?: string | null
          employee_id: string
          id?: string
          note?: string | null
          paid?: number | null
          period: string
        }
        Update: {
          accrued?: number | null
          company_id?: string
          created_at?: string | null
          date_paid?: string | null
          employee_id?: string
          id?: string
          note?: string | null
          paid?: number | null
          period?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_company_id: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_company_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_company_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_company_id_fkey"
            columns: ["current_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          company_id: string
          counterparty_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          company_id: string
          counterparty_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          to_account_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          company_id?: string
          counterparty_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          to_account_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_company_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
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
      account_type: "bank" | "cash"
      app_role: "owner" | "accountant" | "viewer"
      category_type: "income" | "expense"
      invoice_status: "draft" | "sent" | "paid" | "cancelled"
      transaction_type: "income" | "expense" | "transfer"
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
      account_type: ["bank", "cash"],
      app_role: ["owner", "accountant", "viewer"],
      category_type: ["income", "expense"],
      invoice_status: ["draft", "sent", "paid", "cancelled"],
      transaction_type: ["income", "expense", "transfer"],
    },
  },
} as const
