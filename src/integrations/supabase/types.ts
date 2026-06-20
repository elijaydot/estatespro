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
      abuse_signals: {
        Row: {
          company_id: string
          detected_at: string
          id: string
          inquiry_id: string | null
          listing_id: string | null
          metadata: Json
          severity: string
          signal_type: string
        }
        Insert: {
          company_id: string
          detected_at?: string
          id?: string
          inquiry_id?: string | null
          listing_id?: string | null
          metadata?: Json
          severity: string
          signal_type: string
        }
        Update: {
          company_id?: string
          detected_at?: string
          id?: string
          inquiry_id?: string | null
          listing_id?: string | null
          metadata?: Json
          severity?: string
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "abuse_signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abuse_signals_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "marketplace_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abuse_signals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
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
      audit_events: {
        Row: {
          actor_user_id: string | null
          correlation_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          severity: string
          source: string
        }
        Insert: {
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          severity?: string
          source: string
        }
        Update: {
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          severity?: string
          source?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          check_in: string
          check_out: string
          cleaning_fee: number
          created_at: string
          guest_action_token: string | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          guest_responded_at: string | null
          guest_response_status: string
          id: string
          last_status_email_sent_at: string | null
          last_status_email_type: string | null
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
          guest_action_token?: string | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          guest_responded_at?: string | null
          guest_response_status?: string
          id?: string
          last_status_email_sent_at?: string | null
          last_status_email_type?: string | null
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
          guest_action_token?: string | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          guest_responded_at?: string | null
          guest_response_status?: string
          id?: string
          last_status_email_sent_at?: string | null
          last_status_email_type?: string | null
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
      broadcasts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          message: string
          property_id: string | null
          target_role: string
          title: string
          unit_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          message: string
          property_id?: string | null
          target_role?: string
          title: string
          unit_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          property_id?: string | null
          target_role?: string
          title?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_unit_id_fkey"
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
      crm_accounts: {
        Row: {
          account_type: string | null
          annual_revenue: number | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          owner_user_id: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_type?: string | null
          annual_revenue?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_type?: string | null
          annual_revenue?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_calls: {
        Row: {
          call_type: string
          company_id: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          owner_user_id: string | null
          related_id: string | null
          related_type: string
          result: string | null
          started_at: string
          subject: string
          updated_at: string
        }
        Insert: {
          call_type: string
          company_id: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          owner_user_id?: string | null
          related_id?: string | null
          related_type?: string
          result?: string | null
          started_at: string
          subject: string
          updated_at?: string
        }
        Update: {
          call_type?: string
          company_id?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          owner_user_id?: string | null
          related_id?: string | null
          related_type?: string
          result?: string | null
          started_at?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaigns: {
        Row: {
          bounce_rate: number | null
          budget_amount: number | null
          channel: string
          click_rate: number | null
          company_id: string
          created_at: string
          created_by: string | null
          ends_on: string | null
          id: string
          name: string
          open_rate: number | null
          spend_amount: number | null
          starts_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bounce_rate?: number | null
          budget_amount?: number | null
          channel?: string
          click_rate?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          name: string
          open_rate?: number | null
          spend_amount?: number | null
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bounce_rate?: number | null
          budget_amount?: number | null
          channel?: string
          click_rate?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          name?: string
          open_rate?: number | null
          spend_amount?: number | null
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          account_id: string | null
          amount: number | null
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deal_name: string
          expected_close_date: string | null
          id: string
          lead_id: string | null
          listing_id: string | null
          owner_user_id: string | null
          probability: number
          stage: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_name: string
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          owner_user_id?: string | null
          probability?: number
          stage?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_name?: string
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          owner_user_id?: string | null
          probability?: number
          stage?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "lead_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_documents: {
        Row: {
          company_id: string
          created_at: string
          id: string
          mime_type: string | null
          related_id: string | null
          related_type: string
          storage_path: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          mime_type?: string | null
          related_id?: string | null
          related_type: string
          storage_path: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          mime_type?: string | null
          related_id?: string | null
          related_type?: string
          storage_path?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_meetings: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          ends_at: string
          host_user_id: string | null
          id: string
          notes: string | null
          related_id: string | null
          related_type: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          host_user_id?: string | null
          id?: string
          notes?: string | null
          related_id?: string | null
          related_type?: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          host_user_id?: string | null
          id?: string
          notes?: string | null
          related_id?: string | null
          related_type?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_projects: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          owner_user_id: string | null
          progress_percent: number
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          progress_percent?: number
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          progress_percent?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_visits: {
        Row: {
          address_text: string | null
          check_in_at: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          locality: string | null
          notes: string | null
          outcome: string | null
          proof_path: string | null
          related_id: string | null
          related_type: string
          status: string
          updated_at: string
        }
        Insert: {
          address_text?: string | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          locality?: string | null
          notes?: string | null
          outcome?: string | null
          proof_path?: string | null
          related_id?: string | null
          related_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          address_text?: string | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          locality?: string | null
          notes?: string | null
          outcome?: string | null
          proof_path?: string | null
          related_id?: string | null
          related_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          booking_id: string | null
          created_at: string
          description: string
          due_date: string
          guest_email: string | null
          guest_name: string | null
          id: string
          invoice_number: string
          paid_amount: number
          paid_at: string | null
          property_id: string | null
          source: string
          status: string
          tenant_id: string | null
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          description: string
          due_date: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          invoice_number: string
          paid_amount?: number
          paid_at?: string | null
          property_id?: string | null
          source?: string
          status?: string
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          invoice_number?: string
          paid_amount?: number
          paid_at?: string | null
          property_id?: string | null
          source?: string
          status?: string
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
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
          id: string
          momo_name: string | null
          momo_number: string | null
          momo_provider: string | null
          payment_instructions: string | null
          paystack_enabled: boolean | null
          paystack_public_key: string | null
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
          id?: string
          momo_name?: string | null
          momo_number?: string | null
          momo_provider?: string | null
          payment_instructions?: string | null
          paystack_enabled?: boolean | null
          paystack_public_key?: string | null
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
          id?: string
          momo_name?: string | null
          momo_number?: string | null
          momo_provider?: string | null
          payment_instructions?: string | null
          paystack_enabled?: boolean | null
          paystack_public_key?: string | null
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
      lead_activities: {
        Row: {
          activity_type: string
          actor_user_id: string | null
          channel: string | null
          created_at: string
          id: string
          lead_id: string
          occurred_at: string
          payload_json: Json
        }
        Insert: {
          activity_type: string
          actor_user_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          lead_id: string
          occurred_at?: string
          payload_json?: Json
        }
        Update: {
          activity_type?: string
          actor_user_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          occurred_at?: string
          payload_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_contacts: {
        Row: {
          consent_marketing: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          lead_id: string
          phone_e164: string
          preferred_channel: string | null
        }
        Insert: {
          consent_marketing?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          lead_id: string
          phone_e164: string
          preferred_channel?: string | null
        }
        Update: {
          consent_marketing?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          lead_id?: string
          phone_e164?: string
          preferred_channel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_history: {
        Row: {
          actor_user_id: string | null
          changed_at: string
          from_stage: string | null
          id: string
          lead_id: string
          reason: string | null
          to_stage: string
        }
        Insert: {
          actor_user_id?: string | null
          changed_at?: string
          from_stage?: string | null
          id?: string
          lead_id: string
          reason?: string | null
          to_stage: string
        }
        Update: {
          actor_user_id?: string | null
          changed_at?: string
          from_stage?: string | null
          id?: string
          lead_id?: string
          reason?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          due_at: string
          id: string
          lead_id: string
          notes: string | null
          owner_user_id: string
          status: string
          task_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_at: string
          id?: string
          lead_id: string
          notes?: string | null
          owner_user_id: string
          status?: string
          task_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          owner_user_id?: string
          status?: string
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company_id: string
          converted_at: string | null
          created_at: string
          created_by: string | null
          first_seen_at: string
          id: string
          last_activity_at: string | null
          listing_id: string | null
          lost_reason: string | null
          priority: string
          score: number
          source: string
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          first_seen_at?: string
          id?: string
          last_activity_at?: string | null
          listing_id?: string | null
          lost_reason?: string | null
          priority?: string
          score?: number
          source?: string
          stage?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          first_seen_at?: string
          id?: string
          last_activity_at?: string | null
          listing_id?: string | null
          lost_reason?: string | null
          priority?: string
          score?: number
          source?: string
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
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
      listing_media: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          listing_id: string
          media_type: string
          moderation_state: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          listing_id: string
          media_type?: string
          moderation_state?: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          listing_id?: string
          media_type?: string
          moderation_state?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_publish_history: {
        Row: {
          actor_user_id: string | null
          changed_at: string
          company_id: string
          from_status: string
          id: string
          listing_id: string
          metadata: Json
          reason_code: string | null
          to_status: string
        }
        Insert: {
          actor_user_id?: string | null
          changed_at?: string
          company_id: string
          from_status: string
          id?: string
          listing_id: string
          metadata?: Json
          reason_code?: string | null
          to_status: string
        }
        Update: {
          actor_user_id?: string | null
          changed_at?: string
          company_id?: string
          from_status?: string
          id?: string
          listing_id?: string
          metadata?: Json
          reason_code?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_publish_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_publish_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_search_index: {
        Row: {
          area_slug: string | null
          city_slug: string
          listing_id: string
          searchable_text: unknown
          seo_path: string
          updated_at: string
        }
        Insert: {
          area_slug?: string | null
          city_slug: string
          listing_id: string
          searchable_text?: unknown
          seo_path: string
          updated_at?: string
        }
        Update: {
          area_slug?: string | null
          city_slug?: string
          listing_id?: string
          searchable_text?: unknown
          seo_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_search_index_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "marketplace_listings"
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
      marketplace_inquiries: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          company_id: string
          consent_marketing: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          idempotency_key: string
          lead_id: string
          listing_id: string
          message: string | null
          move_in_date: string | null
          phone_e164: string
          risk_state: string
          source_ip: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          company_id: string
          consent_marketing?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          idempotency_key: string
          lead_id: string
          listing_id: string
          message?: string | null
          move_in_date?: string | null
          phone_e164: string
          risk_state?: string
          source_ip?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          company_id?: string
          consent_marketing?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          idempotency_key?: string
          lead_id?: string
          listing_id?: string
          message?: string | null
          move_in_date?: string | null
          phone_e164?: string
          risk_state?: string
          source_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_inquiries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_inquiries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          address_hash: string | null
          archived_at: string | null
          area: string | null
          available_from: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          company_id: string
          created_at: string
          created_by: string
          currency: string
          description: string | null
          id: string
          paused_at: string | null
          property_id: string | null
          published_at: string | null
          rent_amount: number
          slug: string
          status: string
          title: string
          unit_id: string | null
          updated_at: string
          verification_state: string
        }
        Insert: {
          address_hash?: string | null
          archived_at?: string | null
          area?: string | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          company_id: string
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          id?: string
          paused_at?: string | null
          property_id?: string | null
          published_at?: string | null
          rent_amount: number
          slug: string
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string
          verification_state?: string
        }
        Update: {
          address_hash?: string | null
          archived_at?: string | null
          area?: string | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          company_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          id?: string
          paused_at?: string | null
          property_id?: string | null
          published_at?: string | null
          rent_amount?: number
          slug?: string
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
          verification_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          message_id: string
          mime_type: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          message_id: string
          mime_type: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          message_id?: string
          mime_type?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_drafts: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          recipient_id: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          recipient_id?: string | null
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          recipient_id?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_presence: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          is_typing: boolean
          last_seen_at: string
          thread_key: string
          updated_at: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          is_typing?: boolean
          last_seen_at?: string
          thread_key: string
          updated_at?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          is_typing?: boolean
          last_seen_at?: string
          thread_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          client_message_id: string | null
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
          client_message_id?: string | null
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
          client_message_id?: string | null
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
      moderation_actions: {
        Row: {
          action_type: string
          actor_user_id: string | null
          case_id: string
          company_id: string
          created_at: string
          from_state: string | null
          id: string
          notes: string | null
          to_state: string | null
        }
        Insert: {
          action_type: string
          actor_user_id?: string | null
          case_id: string
          company_id: string
          created_at?: string
          from_state?: string | null
          id?: string
          notes?: string | null
          to_state?: string | null
        }
        Update: {
          action_type?: string
          actor_user_id?: string | null
          case_id?: string
          company_id?: string
          created_at?: string
          from_state?: string | null
          id?: string
          notes?: string | null
          to_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "moderation_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_cases: {
        Row: {
          assigned_moderator: string | null
          closed_at: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          opened_at: string
          queue: string
          reason_code: string
          resolution_notes: string | null
          severity: string
          state: string
          updated_at: string
        }
        Insert: {
          assigned_moderator?: string | null
          closed_at?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          opened_at?: string
          queue?: string
          reason_code: string
          resolution_notes?: string | null
          severity: string
          state?: string
          updated_at?: string
        }
        Update: {
          assigned_moderator?: string | null
          closed_at?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          opened_at?: string
          queue?: string
          reason_code?: string
          resolution_notes?: string | null
          severity?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
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
          booking_id: string | null
          created_at: string
          id: string
          invoice_id: string
          method: string
          momo_phone: string | null
          momo_transaction_id: string | null
          notes: string | null
          payer_email: string | null
          payer_name: string | null
          receipt_number: string | null
          reference: string | null
          source: string
          status: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          method: string
          momo_phone?: string | null
          momo_transaction_id?: string | null
          notes?: string | null
          payer_email?: string | null
          payer_name?: string | null
          receipt_number?: string | null
          reference?: string | null
          source?: string
          status?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          momo_phone?: string | null
          momo_transaction_id?: string | null
          notes?: string | null
          payer_email?: string | null
          payer_name?: string | null
          receipt_number?: string | null
          reference?: string | null
          source?: string
          status?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
      publisher_verifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_submitted_at: string
          rejection_reason: string | null
          state: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_submitted_at?: string
          rejection_reason?: string | null
          state?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_submitted_at?: string
          rejection_reason?: string | null
          state?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publisher_verifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
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
      risk_decisions: {
        Row: {
          company_id: string
          decided_at: string
          decided_by: string | null
          decision: string
          id: string
          inquiry_id: string | null
          listing_id: string | null
          metadata: Json
          reason_codes: string[]
          score: number
        }
        Insert: {
          company_id: string
          decided_at?: string
          decided_by?: string | null
          decision: string
          id?: string
          inquiry_id?: string | null
          listing_id?: string | null
          metadata?: Json
          reason_codes?: string[]
          score?: number
        }
        Update: {
          company_id?: string
          decided_at?: string
          decided_by?: string | null
          decision?: string
          id?: string
          inquiry_id?: string | null
          listing_id?: string | null
          metadata?: Json
          reason_codes?: string[]
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_decisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_decisions_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "marketplace_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_decisions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          recipient_id: string
          scheduled_for: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          recipient_id: string
          scheduled_for: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          recipient_id?: string
          scheduled_for?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
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
      user_mfa: {
        Row: {
          created_at: string
          enabled: boolean
          enrolled_at: string | null
          last_verified_at: string | null
          secret_ciphertext: string | null
          secret_iv: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          enrolled_at?: string | null
          last_verified_at?: string | null
          secret_ciphertext?: string | null
          secret_iv?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          enrolled_at?: string | null
          last_verified_at?: string | null
          secret_ciphertext?: string | null
          secret_iv?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      verification_documents: {
        Row: {
          created_at: string
          document_type: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          storage_path: string
          verification_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          storage_path: string
          verification_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          storage_path?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "publisher_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_dead_letters: {
        Row: {
          correlation_id: string | null
          created_at: string
          endpoint_id: string
          event_id: string
          event_type: string
          failure_reason: string | null
          final_status_code: number | null
          id: string
          payload: Json
          resolution_notes: string | null
          resolved_at: string | null
          total_attempts: number
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          endpoint_id: string
          event_id: string
          event_type: string
          failure_reason?: string | null
          final_status_code?: number | null
          id?: string
          payload: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          total_attempts: number
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          endpoint_id?: string
          event_id?: string
          event_type?: string
          failure_reason?: string | null
          final_status_code?: number | null
          id?: string
          payload?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          total_attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: "webhook_dead_letters_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_delivery_attempts: {
        Row: {
          attempt: number
          correlation_id: string | null
          created_at: string
          delivered_at: string | null
          duration_ms: number | null
          endpoint_id: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          signature: string | null
          status_code: number | null
          success: boolean
        }
        Insert: {
          attempt: number
          correlation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          duration_ms?: number | null
          endpoint_id: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          signature?: string | null
          status_code?: number | null
          success?: boolean
        }
        Update: {
          attempt?: number
          correlation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          duration_ms?: number | null
          endpoint_id?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          signature?: string | null
          status_code?: number | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "webhook_delivery_attempts_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          company_id: string | null
          created_at: string
          event_type: string
          id: string
          is_active: boolean
          max_attempts: number
          secret_ref: string
          target_url: string
          timeout_ms: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          is_active?: boolean
          max_attempts?: number
          secret_ref: string
          target_url: string
          timeout_ms?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          is_active?: boolean
          max_attempts?: number
          secret_ref?: string
          target_url?: string
          timeout_ms?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_recovery_code: { Args: { p_code: string }; Returns: boolean }
      create_marketplace_inquiry: {
        Args: {
          p_budget_max?: number
          p_budget_min?: number
          p_consent_marketing?: boolean
          p_email?: string
          p_full_name: string
          p_idempotency_key: string
          p_listing_id: string
          p_message?: string
          p_move_in_date?: string
          p_phone_e164: string
          p_source_ip?: string
        }
        Returns: {
          inquiry_id: string
          lead_id: string
          reused: boolean
        }[]
      }
      evaluate_marketplace_inquiry_risk: {
        Args: { p_inquiry_id: string }
        Returns: {
          decision: string
          reason_codes: string[]
          score: number
        }[]
      }
      generate_crm_followup_tasks: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_company_property_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_message_participant_name: {
        Args: { _participant_id: string }
        Returns: string
      }
      get_mfa_status: {
        Args: never
        Returns: {
          enabled: boolean
          enrolled_at: string
          last_verified_at: string
          recovery_codes_remaining: number
        }[]
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
      get_public_marketplace_areas: {
        Args: { p_city_slug: string }
        Returns: {
          area_name: string
          area_slug: string
          city_slug: string
          listing_count: number
        }[]
      }
      get_public_marketplace_cities: {
        Args: never
        Returns: {
          city_name: string
          city_slug: string
          listing_count: number
        }[]
      }
      get_public_marketplace_listing_detail: {
        Args: { p_id_or_slug: string }
        Returns: {
          area: string
          available_from: string
          bathrooms: number
          bedrooms: number
          city: string
          company_logo_url: string
          company_name: string
          currency: string
          description: string
          id: string
          published_at: string
          rent_amount: number
          slug: string
          title: string
          verification_state: string
        }[]
      }
      get_public_marketplace_listings: {
        Args: {
          p_area?: string
          p_bedrooms?: number
          p_city?: string
          p_max_rent?: number
          p_min_rent?: number
          p_page?: number
          p_page_size?: number
        }
        Returns: {
          area: string
          available_from: string
          bathrooms: number
          bedrooms: number
          city: string
          company_logo_url: string
          company_name: string
          currency: string
          id: string
          published_at: string
          rent_amount: number
          slug: string
          title: string
          verification_state: string
        }[]
      }
      get_public_marketplace_listings_by_location: {
        Args: {
          p_area_slug?: string
          p_city_slug: string
          p_page?: number
          p_page_size?: number
        }
        Returns: {
          area: string
          available_from: string
          bathrooms: number
          bedrooms: number
          city: string
          company_logo_url: string
          company_name: string
          currency: string
          id: string
          published_at: string
          rent_amount: number
          slug: string
          title: string
          verification_state: string
        }[]
      }
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
      is_internal_marketplace_reviewer: {
        Args: { _user_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_event_type: string
          p_ip_address?: string
          p_metadata?: Json
          p_user_agent?: string
        }
        Returns: string
      }
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
      refresh_listing_search_index_for_listing: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      replay_webhook_dead_letter: {
        Args: {
          p_dead_letter_id: string
          p_note?: string
          p_requested_by?: string
        }
        Returns: Json
      }
      set_recovery_codes: { Args: { p_codes: string[] }; Returns: number }
      slugify_text: { Args: { p_input: string }; Returns: string }
      tenant_lease_update_guard: {
        Args: {
          p_created_at: string
          p_document_url: string
          p_end_date: string
          p_id: string
          p_landlord_signature_url: string
          p_landlord_signed_at: string
          p_lease_number: string
          p_monthly_rent: number
          p_property_id: string
          p_renewal_status: string
          p_security_deposit: number
          p_special_conditions: string
          p_start_date: string
          p_status: string
          p_tenant_id: string
          p_terms: string
          p_unit_id: string
          p_user_id: string
        }
        Returns: boolean
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
