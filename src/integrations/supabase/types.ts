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
      account_balances: {
        Row: {
          account_id: string
          closing_credit: number | null
          closing_debit: number | null
          company_id: string
          created_at: string | null
          id: string
          opening_credit: number | null
          opening_debit: number | null
          period_id: string
          turnover_credit: number | null
          turnover_debit: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          closing_credit?: number | null
          closing_debit?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          opening_credit?: number | null
          opening_debit?: number | null
          period_id: string
          turnover_credit?: number | null
          turnover_debit?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          closing_credit?: number | null
          closing_debit?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          opening_credit?: number | null
          opening_debit?: number | null
          period_id?: string
          turnover_credit?: number | null
          turnover_debit?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          company_id: string
          created_at: string | null
          end_date: string
          id: string
          name: string
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["period_status"] | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          company_id: string
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["period_status"] | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["period_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
      audit_logs: {
        Row: {
          action: string
          changed_fields: string[] | null
          company_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          company_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          company_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
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
      chart_of_accounts: {
        Row: {
          account_class: Database["public"]["Enums"]["account_type_class"]
          allow_manual_entry: boolean | null
          balance_sheet_group: string | null
          code: string
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_current: boolean | null
          is_system: boolean | null
          name: string
          name_kz: string | null
          parent_id: string | null
          pl_group: string | null
          updated_at: string | null
        }
        Insert: {
          account_class: Database["public"]["Enums"]["account_type_class"]
          allow_manual_entry?: boolean | null
          balance_sheet_group?: string | null
          code: string
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_current?: boolean | null
          is_system?: boolean | null
          name: string
          name_kz?: string | null
          parent_id?: string | null
          pl_group?: string | null
          updated_at?: string | null
        }
        Update: {
          account_class?: Database["public"]["Enums"]["account_type_class"]
          allow_manual_entry?: boolean | null
          balance_sheet_group?: string | null
          code?: string
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_current?: boolean | null
          is_system?: boolean | null
          name?: string
          name_kz?: string | null
          parent_id?: string | null
          pl_group?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          bin_iin: string | null
          coa_standard: Database["public"]["Enums"]["coa_standard"] | null
          created_at: string | null
          default_currency: string | null
          email: string | null
          fiscal_year_start: number | null
          id: string
          invoice_next_number: number | null
          invoice_prefix: string | null
          is_vat_payer: boolean | null
          kbe: string | null
          name: string
          phone: string | null
          tax_regime: Database["public"]["Enums"]["tax_regime"] | null
        }
        Insert: {
          address?: string | null
          bin_iin?: string | null
          coa_standard?: Database["public"]["Enums"]["coa_standard"] | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          fiscal_year_start?: number | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          is_vat_payer?: boolean | null
          kbe?: string | null
          name: string
          phone?: string | null
          tax_regime?: Database["public"]["Enums"]["tax_regime"] | null
        }
        Update: {
          address?: string | null
          bin_iin?: string | null
          coa_standard?: Database["public"]["Enums"]["coa_standard"] | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          fiscal_year_start?: number | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          is_vat_payer?: boolean | null
          kbe?: string | null
          name?: string
          phone?: string | null
          tax_regime?: Database["public"]["Enums"]["tax_regime"] | null
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
      dimensions: {
        Row: {
          code: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          type: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          type: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimensions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dimensions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          code: string
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          name_kz: string | null
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          name_kz?: string | null
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          name_kz?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          apply_opv: boolean
          apply_social_contributions: boolean
          apply_social_tax: boolean
          apply_standard_deduction: boolean
          apply_vosms_employee: boolean
          apply_vosms_employer: boolean
          company_id: string
          created_at: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          iin: string | null
          is_active: boolean | null
          is_tax_resident: boolean | null
          name: string
          position: string | null
          salary: number | null
          salary_type: Database["public"]["Enums"]["salary_type"] | null
          termination_date: string | null
        }
        Insert: {
          apply_opv?: boolean
          apply_social_contributions?: boolean
          apply_social_tax?: boolean
          apply_standard_deduction?: boolean
          apply_vosms_employee?: boolean
          apply_vosms_employer?: boolean
          company_id: string
          created_at?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          iin?: string | null
          is_active?: boolean | null
          is_tax_resident?: boolean | null
          name: string
          position?: string | null
          salary?: number | null
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
          termination_date?: string | null
        }
        Update: {
          apply_opv?: boolean
          apply_social_contributions?: boolean
          apply_social_tax?: boolean
          apply_standard_deduction?: boolean
          apply_vosms_employee?: boolean
          apply_vosms_employer?: boolean
          company_id?: string
          created_at?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          iin?: string | null
          is_active?: boolean | null
          is_tax_resident?: boolean | null
          name?: string
          position?: string | null
          salary?: number | null
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
          termination_date?: string | null
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
      invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          base_amount: number | null
          description: string | null
          id: string
          invoice_id: string
          item_id: string | null
          item_name: string
          line_total: number | null
          price: number | null
          quantity: number | null
          vat_amount: number | null
          vat_rate: Database["public"]["Enums"]["vat_rate"] | null
        }
        Insert: {
          base_amount?: number | null
          description?: string | null
          id?: string
          invoice_id: string
          item_id?: string | null
          item_name: string
          line_total?: number | null
          price?: number | null
          quantity?: number | null
          vat_amount?: number | null
          vat_rate?: Database["public"]["Enums"]["vat_rate"] | null
        }
        Update: {
          base_amount?: number | null
          description?: string | null
          id?: string
          invoice_id?: string
          item_id?: string | null
          item_name?: string
          line_total?: number | null
          price?: number | null
          quantity?: number | null
          vat_amount?: number | null
          vat_rate?: Database["public"]["Enums"]["vat_rate"] | null
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
          amount_due: number | null
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
          paid_amount: number | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number | null
          tax_amount: number | null
          total: number | null
          updated_at: string | null
          vat_rate: Database["public"]["Enums"]["vat_rate"] | null
        }
        Insert: {
          amount_due?: number | null
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
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
          vat_rate?: Database["public"]["Enums"]["vat_rate"] | null
        }
        Update: {
          amount_due?: number | null
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
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
          vat_rate?: Database["public"]["Enums"]["vat_rate"] | null
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
      journal_entries: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          document_id: string | null
          document_type_id: string | null
          entry_number: string
          id: string
          period_id: string
          posted_at: string | null
          posted_by: string | null
          reversal_entry_id: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: Database["public"]["Enums"]["journal_status"] | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          document_id?: string | null
          document_type_id?: string | null
          entry_number: string
          id?: string
          period_id: string
          posted_at?: string | null
          posted_by?: string | null
          reversal_entry_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["journal_status"] | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          document_id?: string | null
          document_type_id?: string | null
          entry_number?: string
          id?: string
          period_id?: string
          posted_at?: string | null
          posted_by?: string | null
          reversal_entry_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["journal_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          amount_currency: number | null
          created_at: string | null
          credit: number | null
          currency: string | null
          debit: number | null
          description: string | null
          dimensions: Json | null
          entry_id: string
          exchange_rate: number | null
          id: string
          line_number: number
        }
        Insert: {
          account_id: string
          amount_currency?: number | null
          created_at?: string | null
          credit?: number | null
          currency?: string | null
          debit?: number | null
          description?: string | null
          dimensions?: Json | null
          entry_id: string
          exchange_rate?: number | null
          id?: string
          line_number: number
        }
        Update: {
          account_id?: string
          amount_currency?: number | null
          created_at?: string | null
          credit?: number | null
          currency?: string | null
          debit?: number | null
          description?: string | null
          dimensions?: Json | null
          entry_id?: string
          exchange_rate?: number | null
          id?: string
          line_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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
      payroll_account_mappings: {
        Row: {
          account_id: string
          company_id: string
          created_at: string | null
          id: string
          mapping_type: string
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string | null
          id?: string
          mapping_type: string
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          mapping_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_account_mappings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_account_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_audit_log: {
        Row: {
          action: string
          after_value: Json | null
          before_value: Json | null
          changed_fields: string[] | null
          company_id: string
          created_at: string
          id: string
          ip_address: unknown
          payroll_entry_id: string
          reason: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_value?: Json | null
          before_value?: Json | null
          changed_fields?: string[] | null
          company_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          payroll_entry_id: string
          reason?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_value?: Json | null
          before_value?: Json | null
          changed_fields?: string[] | null
          company_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          payroll_entry_id?: string
          reason?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          accrued: number | null
          change_reason: string | null
          company_id: string
          created_at: string | null
          date_paid: string | null
          employee_id: string
          gross_salary: number | null
          id: string
          ipn: number | null
          journal_entry_id: string | null
          net_salary: number | null
          note: string | null
          opv: number | null
          opv_base: number | null
          paid: number | null
          period: string
          period_id: string | null
          social_contrib_base: number | null
          social_contributions: number | null
          social_tax: number | null
          social_tax_base: number | null
          standard_deduction: number | null
          tax_settings_id: string | null
          taxable_income: number | null
          total_employee_deductions: number | null
          total_employer_cost: number | null
          vosms_employee: number | null
          vosms_employer: number | null
          worked_days: number | null
          worked_hours: number | null
        }
        Insert: {
          accrued?: number | null
          change_reason?: string | null
          company_id: string
          created_at?: string | null
          date_paid?: string | null
          employee_id: string
          gross_salary?: number | null
          id?: string
          ipn?: number | null
          journal_entry_id?: string | null
          net_salary?: number | null
          note?: string | null
          opv?: number | null
          opv_base?: number | null
          paid?: number | null
          period: string
          period_id?: string | null
          social_contrib_base?: number | null
          social_contributions?: number | null
          social_tax?: number | null
          social_tax_base?: number | null
          standard_deduction?: number | null
          tax_settings_id?: string | null
          taxable_income?: number | null
          total_employee_deductions?: number | null
          total_employer_cost?: number | null
          vosms_employee?: number | null
          vosms_employer?: number | null
          worked_days?: number | null
          worked_hours?: number | null
        }
        Update: {
          accrued?: number | null
          change_reason?: string | null
          company_id?: string
          created_at?: string | null
          date_paid?: string | null
          employee_id?: string
          gross_salary?: number | null
          id?: string
          ipn?: number | null
          journal_entry_id?: string | null
          net_salary?: number | null
          note?: string | null
          opv?: number | null
          opv_base?: number | null
          paid?: number | null
          period?: string
          period_id?: string | null
          social_contrib_base?: number | null
          social_contributions?: number | null
          social_tax?: number | null
          social_tax_base?: number | null
          standard_deduction?: number | null
          tax_settings_id?: string | null
          taxable_income?: number | null
          total_employee_deductions?: number | null
          total_employer_cost?: number | null
          vosms_employee?: number | null
          vosms_employer?: number | null
          worked_days?: number | null
          worked_hours?: number | null
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
          {
            foreignKeyName: "payroll_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_tax_settings_id_fkey"
            columns: ["tax_settings_id"]
            isOneToOne: false
            referencedRelation: "tax_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_company_id: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_company_id?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_company_id?: string | null
          display_name?: string | null
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
      tax_settings: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          ipn_nonresident_rate: number
          ipn_resident_rate: number
          mrp: number
          mzp: number
          opv_cap_mzp: number
          opv_rate: number
          social_contrib_max_mzp: number
          social_contrib_min_mzp: number
          social_contrib_rate: number
          social_tax_rate: number
          standard_deduction_mrp: number
          updated_at: string | null
          vosms_employee_rate: number
          vosms_employer_rate: number
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          ipn_nonresident_rate?: number
          ipn_resident_rate?: number
          mrp?: number
          mzp?: number
          opv_cap_mzp?: number
          opv_rate?: number
          social_contrib_max_mzp?: number
          social_contrib_min_mzp?: number
          social_contrib_rate?: number
          social_tax_rate?: number
          standard_deduction_mrp?: number
          updated_at?: string | null
          vosms_employee_rate?: number
          vosms_employer_rate?: number
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          ipn_nonresident_rate?: number
          ipn_resident_rate?: number
          mrp?: number
          mzp?: number
          opv_cap_mzp?: number
          opv_rate?: number
          social_contrib_max_mzp?: number
          social_contrib_min_mzp?: number
          social_contrib_rate?: number
          social_tax_rate?: number
          standard_deduction_mrp?: number
          updated_at?: string | null
          vosms_employee_rate?: number
          vosms_employer_rate?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_settings_company_id_fkey"
            columns: ["company_id"]
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
          base_amount: number | null
          category_id: string | null
          company_id: string
          counterparty_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          invoice_id: string | null
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          vat_amount: number | null
          vat_rate: Database["public"]["Enums"]["vat_rate"] | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          base_amount?: number | null
          category_id?: string | null
          company_id: string
          counterparty_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          to_account_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          vat_amount?: number | null
          vat_rate?: Database["public"]["Enums"]["vat_rate"] | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          base_amount?: number | null
          category_id?: string | null
          company_id?: string
          counterparty_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          to_account_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          vat_amount?: number | null
          vat_rate?: Database["public"]["Enums"]["vat_rate"] | null
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
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
      can_access_payroll: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      can_edit_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      can_edit_payroll: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      can_unlock_period: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      create_company_with_owner: {
        Args: { _bin_iin?: string; _company_name: string }
        Returns: string
      }
      get_current_user_email: { Args: never; Returns: string }
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
      is_payroll_period_open: { Args: { _period_id: string }; Returns: boolean }
      mask_email: { Args: { _email: string }; Returns: string }
    }
    Enums: {
      account_type: "bank" | "cash"
      account_type_class:
        | "asset"
        | "liability"
        | "equity"
        | "revenue"
        | "expense"
      app_role: "owner" | "accountant" | "viewer" | "employee"
      category_type: "income" | "expense"
      coa_standard: "nsfo" | "ifrs"
      employment_type: "full_time" | "contractor"
      invoice_status: "draft" | "sent" | "paid" | "cancelled"
      journal_status: "draft" | "posted" | "reversed"
      period_status: "open" | "soft_closed" | "hard_closed"
      salary_type: "monthly" | "hourly"
      tax_regime: "simplified" | "common" | "retail_tax"
      transaction_type: "income" | "expense" | "transfer"
      vat_rate: "0" | "5" | "12" | "exempt"
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
      account_type_class: [
        "asset",
        "liability",
        "equity",
        "revenue",
        "expense",
      ],
      app_role: ["owner", "accountant", "viewer", "employee"],
      category_type: ["income", "expense"],
      coa_standard: ["nsfo", "ifrs"],
      employment_type: ["full_time", "contractor"],
      invoice_status: ["draft", "sent", "paid", "cancelled"],
      journal_status: ["draft", "posted", "reversed"],
      period_status: ["open", "soft_closed", "hard_closed"],
      salary_type: ["monthly", "hourly"],
      tax_regime: ["simplified", "common", "retail_tax"],
      transaction_type: ["income", "expense", "transfer"],
      vat_rate: ["0", "5", "12", "exempt"],
    },
  },
} as const
