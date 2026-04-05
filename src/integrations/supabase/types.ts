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
      app_settings: {
        Row: {
          accent_color: string | null
          created_at: string
          currency_code: string
          currency_symbol: string
          date_format: string
          default_country: string
          email_lease_expiry: boolean | null
          email_maintenance: boolean | null
          email_payments: boolean | null
          email_tenant_invites: boolean | null
          id: string
          in_app_lease_expiry: boolean | null
          in_app_maintenance: boolean | null
          in_app_messages: boolean | null
          in_app_payments: boolean | null
          lease_font: string
          lease_header_color: string
          lease_primary_color: string
          lease_secondary_color: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          date_format?: string
          default_country?: string
          email_lease_expiry?: boolean | null
          email_maintenance?: boolean | null
          email_payments?: boolean | null
          email_tenant_invites?: boolean | null
          id?: string
          in_app_lease_expiry?: boolean | null
          in_app_maintenance?: boolean | null
          in_app_messages?: boolean | null
          in_app_payments?: boolean | null
          lease_font?: string
          lease_header_color?: string
          lease_primary_color?: string
          lease_secondary_color?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          date_format?: string
          default_country?: string
          email_lease_expiry?: boolean | null
          email_maintenance?: boolean | null
          email_payments?: boolean | null
          email_tenant_invites?: boolean | null
          id?: string
          in_app_lease_expiry?: boolean | null
          in_app_maintenance?: boolean | null
          in_app_messages?: boolean | null
          in_app_payments?: boolean | null
          lease_font?: string
          lease_header_color?: string
          lease_primary_color?: string
          lease_secondary_color?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          check_in: string
          check_out: string
          cleaning_fee: number
          created_at: string
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          nightly_rate: number
          nights: number | null
          notes: string | null
          num_guests: number
          payment_status: string
          property_id: string
          service_fee: number
          special_requests: string | null
          status: string
          total_amount: number
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in: string
          check_out: string
          cleaning_fee?: number
          created_at?: string
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          nightly_rate?: number
          nights?: number | null
          notes?: string | null
          num_guests?: number
          payment_status?: string
          property_id: string
          service_fee?: number
          special_requests?: string | null
          status?: string
          total_amount?: number
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in?: string
          check_out?: string
          cleaning_fee?: number
          created_at?: string
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          nightly_rate?: number
          nights?: number | null
          notes?: string | null
          num_guests?: number
          payment_status?: string
          property_id?: string
          service_fee?: number
          special_requests?: string | null
          status?: string
          total_amount?: number
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_verified: boolean | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          role: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          role?: string
          status?: string
          updated_at?: string | null
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
      company_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          id: string
          logo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      default_inspection_checklist: {
        Row: {
          created_at: string
          id: string
          is_global: boolean
          item_category: string
          item_name: string
          property_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean
          item_category?: string
          item_name: string
          property_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean
          item_category?: string
          item_name?: string
          property_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "default_inspection_checklist_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      exit_inspection_items: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          condition: string
          created_at: string
          damage_cost: number
          exit_id: string
          id: string
          item_category: string
          item_name: string
          notes: string | null
          photo_url: string | null
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          condition?: string
          created_at?: string
          damage_cost?: number
          exit_id: string
          id?: string
          item_category?: string
          item_name: string
          notes?: string | null
          photo_url?: string | null
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          condition?: string
          created_at?: string
          damage_cost?: number
          exit_id?: string
          id?: string
          item_category?: string
          item_name?: string
          notes?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exit_inspection_items_exit_id_fkey"
            columns: ["exit_id"]
            isOneToOne: false
            referencedRelation: "tenant_exits"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          description: string
          due_date: string
          id: string
          invoice_number: string
          paid_amount: number
          paid_at: string | null
          property_id: string | null
          status: string
          tenant_id: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          due_date: string
          id?: string
          invoice_number: string
          paid_amount?: number
          paid_at?: string | null
          property_id?: string | null
          status?: string
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          invoice_number?: string
          paid_amount?: number
          paid_at?: string | null
          property_id?: string | null
          status?: string
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      landlord_payment_settings: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          company_id: string | null
          created_at: string
          flutterwave_enabled: boolean | null
          flutterwave_merchant_id: string | null
          flutterwave_public_key: string | null
          flutterwave_secret_key: string | null
          id: string
          momo_name: string | null
          momo_number: string | null
          momo_provider: string | null
          payment_instructions: string | null
          paystack_enabled: boolean | null
          paystack_public_key: string | null
          paystack_secret_key: string | null
          preferred_method: string | null
          property_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          company_id?: string | null
          created_at?: string
          flutterwave_enabled?: boolean | null
          flutterwave_merchant_id?: string | null
          flutterwave_public_key?: string | null
          flutterwave_secret_key?: string | null
          id?: string
          momo_name?: string | null
          momo_number?: string | null
          momo_provider?: string | null
          payment_instructions?: string | null
          paystack_enabled?: boolean | null
          paystack_public_key?: string | null
          paystack_secret_key?: string | null
          preferred_method?: string | null
          property_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          company_id?: string | null
          created_at?: string
          flutterwave_enabled?: boolean | null
          flutterwave_merchant_id?: string | null
          flutterwave_public_key?: string | null
          flutterwave_secret_key?: string | null
          id?: string
          momo_name?: string | null
          momo_number?: string | null
          momo_provider?: string | null
          payment_instructions?: string | null
          paystack_enabled?: boolean | null
          paystack_public_key?: string | null
          paystack_secret_key?: string | null
          preferred_method?: string | null
          property_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landlord_payment_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landlord_payment_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_attachments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          lease_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          lease_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          lease_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_attachments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leases: {
        Row: {
          created_at: string
          document_url: string | null
          end_date: string
          id: string
          landlord_signature_url: string | null
          landlord_signed_at: string | null
          lease_number: string
          monthly_rent: number
          property_id: string
          renewal_status: string | null
          security_deposit: number
          special_conditions: string | null
          start_date: string
          status: string
          tenant_id: string
          tenant_signature_url: string | null
          tenant_signed_at: string | null
          terms: string | null
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          end_date: string
          id?: string
          landlord_signature_url?: string | null
          landlord_signed_at?: string | null
          lease_number: string
          monthly_rent?: number
          property_id: string
          renewal_status?: string | null
          security_deposit?: number
          special_conditions?: string | null
          start_date: string
          status?: string
          tenant_id: string
          tenant_signature_url?: string | null
          tenant_signed_at?: string | null
          terms?: string | null
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_url?: string | null
          end_date?: string
          id?: string
          landlord_signature_url?: string | null
          landlord_signed_at?: string | null
          lease_number?: string
          monthly_rent?: number
          property_id?: string
          renewal_status?: string | null
          security_deposit?: number
          special_conditions?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          tenant_signature_url?: string | null
          tenant_signed_at?: string | null
          terms?: string | null
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string
          id: string
          image_url: string | null
          priority: string
          property_id: string | null
          status: string
          tenant_id: string | null
          title: string
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          priority?: string
          property_id?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          priority?: string
          property_id?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          parent_message_id: string | null
          property_id: string | null
          recipient_id: string
          sender_id: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          property_id?: string | null
          recipient_id: string
          sender_id: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          property_id?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string
          momo_phone: string | null
          momo_transaction_id: string | null
          notes: string | null
          receipt_number: string | null
          reference: string | null
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method: string
          momo_phone?: string | null
          momo_transaction_id?: string | null
          notes?: string | null
          receipt_number?: string | null
          reference?: string | null
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          momo_phone?: string | null
          momo_transaction_id?: string | null
          notes?: string | null
          receipt_number?: string | null
          reference?: string | null
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_invites: {
        Row: {
          company_id: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          token: string
          used_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          token: string
          used_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          city: string
          company_id: string | null
          country: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          name: string
          occupied_units: number
          state: string
          total_units: number
          type: string
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          company_id?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          name: string
          occupied_units?: number
          state: string
          total_units?: number
          type?: string
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          company_id?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          name?: string
          occupied_units?: number
          state?: string
          total_units?: number
          type?: string
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      property_manager_assignments: {
        Row: {
          assigned_by: string
          company_id: string
          created_at: string | null
          id: string
          manager_id: string
          property_id: string
        }
        Insert: {
          assigned_by: string
          company_id: string
          created_at?: string | null
          id?: string
          manager_id: string
          property_id: string
        }
        Update: {
          assigned_by?: string
          company_id?: string
          created_at?: string | null
          id?: string
          manager_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_manager_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_manager_assignments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_bills: {
        Row: {
          amount: number
          bill_type: string
          created_at: string
          description: string | null
          frequency: string
          id: string
          is_active: boolean
          name: string
          property_id: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          bill_type?: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          property_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bill_type?: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          property_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bills_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_exits: {
        Row: {
          completed_at: string | null
          created_at: string
          deduction_amount: number
          deduction_reason: string | null
          deposit_amount: number
          deposit_decision: string | null
          email_sent_at: string | null
          exit_date: string | null
          exit_reason: string
          id: string
          initiated_by: string
          inspection_completed_by: string | null
          inspection_date: string | null
          inspection_notes: string | null
          landlord_approved_at: string | null
          landlord_approved_by: string | null
          portal_access_until: string | null
          property_id: string
          refund_amount: number
          refund_method: string | null
          refund_processed_at: string | null
          refund_reference: string | null
          status: string
          tenant_id: string
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deduction_amount?: number
          deduction_reason?: string | null
          deposit_amount?: number
          deposit_decision?: string | null
          email_sent_at?: string | null
          exit_date?: string | null
          exit_reason?: string
          id?: string
          initiated_by: string
          inspection_completed_by?: string | null
          inspection_date?: string | null
          inspection_notes?: string | null
          landlord_approved_at?: string | null
          landlord_approved_by?: string | null
          portal_access_until?: string | null
          property_id: string
          refund_amount?: number
          refund_method?: string | null
          refund_processed_at?: string | null
          refund_reference?: string | null
          status?: string
          tenant_id: string
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deduction_amount?: number
          deduction_reason?: string | null
          deposit_amount?: number
          deposit_decision?: string | null
          email_sent_at?: string | null
          exit_date?: string | null
          exit_reason?: string
          id?: string
          initiated_by?: string
          inspection_completed_by?: string | null
          inspection_date?: string | null
          inspection_notes?: string | null
          landlord_approved_at?: string | null
          landlord_approved_by?: string | null
          portal_access_until?: string | null
          property_id?: string
          refund_amount?: number
          refund_method?: string | null
          refund_processed_at?: string | null
          refund_reference?: string | null
          status?: string
          tenant_id?: string
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_exits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_exits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_exits_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          tenant_id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          tenant_id: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          avatar_url: string | null
          balance: number
          created_at: string
          email: string
          emergency_contact: string | null
          emergency_phone: string | null
          employer: string | null
          id: string
          id_document: string | null
          lease_end_date: string | null
          monthly_rent: number
          move_in_date: string | null
          name: string
          occupation: string | null
          phone: string
          property_id: string | null
          security_deposit: number
          status: string
          tenant_user_id: string | null
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          email: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          employer?: string | null
          id?: string
          id_document?: string | null
          lease_end_date?: string | null
          monthly_rent?: number
          move_in_date?: string | null
          name: string
          occupation?: string | null
          phone: string
          property_id?: string | null
          security_deposit?: number
          status?: string
          tenant_user_id?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          email?: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          employer?: string | null
          id?: string
          id_document?: string | null
          lease_end_date?: string | null
          monthly_rent?: number
          move_in_date?: string | null
          name?: string
          occupation?: string | null
          phone?: string
          property_id?: string | null
          security_deposit?: number
          status?: string
          tenant_user_id?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          amenities: string[] | null
          bathrooms: number
          bedrooms: number
          created_at: string
          description: string | null
          floor: number
          id: string
          image_url: string | null
          image_urls: string[] | null
          property_id: string
          rent_amount: number
          sqft: number
          status: string
          unit_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amenities?: string[] | null
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description?: string | null
          floor?: number
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          property_id: string
          rent_amount?: number
          sqft?: number
          status?: string
          unit_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amenities?: string[] | null
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description?: string | null
          floor?: number
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          property_id?: string
          rent_amount?: number
          sqft?: number
          status?: string
          unit_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      get_company_property_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_message_participant_name: {
        Args: { _participant_id: string }
        Returns: string
      }
      get_payment_settings_for_property: {
        Args: { p_property_id: string }
        Returns: {
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          flutterwave_enabled: boolean
          flutterwave_public_key: string
          id: string
          momo_name: string
          momo_number: string
          momo_provider: string
          payment_instructions: string
          paystack_enabled: boolean
          paystack_public_key: string
          preferred_method: string
        }[]
      }
      get_pm_approved_membership: {
        Args: { _user_id: string }
        Returns: {
          company_id: string
          status: string
        }[]
      }
      get_profile_role: { Args: { _user_id: string }; Returns: string }
      get_tenant_id_by_user: { Args: { _user_id: string }; Returns: string[] }
      get_tenant_property_id: { Args: { _user_id: string }; Returns: string[] }
      get_tenant_unit_id: { Args: { _user_id: string }; Returns: string[] }
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_pm: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_owner: { Args: { _user_id: string }; Returns: boolean }
      process_payment:
        | {
            Args: {
              p_amount: number
              p_invoice_id: string
              p_method: string
              p_momo_phone?: string
              p_momo_transaction_id?: string
              p_notes?: string
              p_reference?: string
              p_tenant_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_invoice_id: string
              p_method: string
              p_momo_phone?: string
              p_momo_transaction_id?: string
              p_notes?: string
              p_reference?: string
              p_tenant_id: string
            }
            Returns: string
          }
      validate_invite_token: {
        Args: { lookup_token: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          tenant_email: string
          tenant_id: string
          tenant_name: string
          tenant_phone: string
          tenant_property_id: string
          tenant_unit_id: string
          used_at: string
        }[]
      }
      validate_pm_invite_token: {
        Args: { lookup_token: string }
        Returns: {
          company_id: string
          company_name: string
          email: string
          expires_at: string
          id: string
        }[]
      }
    }
    Enums: {
      app_role: "landlord" | "property_manager" | "tenant"
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
      app_role: ["landlord", "property_manager", "tenant"],
    },
  },
} as const
