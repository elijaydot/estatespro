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
            foreignKeyName: "abuse_signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
      alert_thresholds: {
        Row: {
          alert_type: string
          company_id: string
          created_at: string
          enabled: boolean
          id: string
          threshold_days: number
          updated_at: string
        }
        Insert: {
          alert_type: string
          company_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          threshold_days: number
          updated_at?: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          threshold_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_thresholds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_thresholds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "broadcasts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
          account_kind: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          name: string
          owner_user_id: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_kind?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name: string
          owner_user_id?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_kind?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
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
          {
            foreignKeyName: "crm_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_automation_rules: {
        Row: {
          actions_json: Json
          company_id: string
          conditions_json: Json
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          is_active: boolean
          name: string
          retry_limit: number
          updated_at: string
        }
        Insert: {
          actions_json?: Json
          company_id: string
          conditions_json?: Json
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          name: string
          retry_limit?: number
          updated_at?: string
        }
        Update: {
          actions_json?: Json
          company_id?: string
          conditions_json?: Json
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          name?: string
          retry_limit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_automation_runs: {
        Row: {
          attempts: number
          company_id: string
          correlation_id: string | null
          created_at: string
          event_source_id: string | null
          event_source_type: string
          event_type: string
          id: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          payload_json: Json
          result_json: Json
          rule_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          company_id: string
          correlation_id?: string | null
          created_at?: string
          event_source_id?: string | null
          event_source_type: string
          event_type: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload_json?: Json
          result_json?: Json
          rule_id: string
          status: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          company_id?: string
          correlation_id?: string | null
          created_at?: string
          event_source_id?: string | null
          event_source_type?: string
          event_type?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload_json?: Json
          result_json?: Json
          rule_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_automation_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_automation_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "crm_automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "crm_automation_rules"
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
          {
            foreignKeyName: "crm_calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "crm_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_deal_handoffs: {
        Row: {
          checklist_json: Json
          company_id: string
          completed_at: string | null
          created_at: string
          deal_id: string
          id: string
          lease_id: string | null
          readiness_notes: string | null
          started_at: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          checklist_json?: Json
          company_id: string
          completed_at?: string | null
          created_at?: string
          deal_id: string
          id?: string
          lease_id?: string | null
          readiness_notes?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          checklist_json?: Json
          company_id?: string
          completed_at?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          lease_id?: string | null
          readiness_notes?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_handoffs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_handoffs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "crm_deal_handoffs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_handoffs_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_handoffs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deal_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          company_id: string
          deal_id: string
          from_stage: string | null
          id: string
          metadata: Json
          reason: string | null
          to_stage: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          company_id: string
          deal_id: string
          from_stage?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_stage: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          company_id?: string
          deal_id?: string
          from_stage?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_stage_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_stage_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "crm_deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
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
            foreignKeyName: "crm_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
      crm_document_comments: {
        Row: {
          author_user_id: string
          body: string
          company_id: string
          created_at: string
          document_id: string
          id: string
          updated_at: string
        }
        Insert: {
          author_user_id?: string
          body: string
          company_id: string
          created_at?: string
          document_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          company_id?: string
          created_at?: string
          document_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_document_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_document_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "crm_document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "crm_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_documents: {
        Row: {
          company_id: string
          compliance_state: string
          created_at: string
          expires_at: string | null
          id: string
          mime_type: string | null
          related_id: string | null
          related_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
          version_no: number
        }
        Insert: {
          company_id: string
          compliance_state?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          mime_type?: string | null
          related_id?: string | null
          related_type: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Update: {
          company_id?: string
          compliance_state?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          mime_type?: string | null
          related_id?: string | null
          related_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_followup_automation_log: {
        Row: {
          company_id: string
          created_at: string
          id: string
          lead_id: string | null
          message: string | null
          metadata: Json
          source_id: string
          source_type: string
          status: string
          task_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          lead_id?: string | null
          message?: string | null
          metadata?: Json
          source_id: string
          source_type: string
          status: string
          task_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          message?: string | null
          metadata?: Json
          source_id?: string
          source_type?: string
          status?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_followup_automation_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_followup_automation_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "crm_followup_automation_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_followup_automation_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "lead_tasks"
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
          {
            foreignKeyName: "crm_meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "crm_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_trust_flags: {
        Row: {
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          reason: string | null
          severity: string
          source: string
          source_id: string | null
          state: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          reason?: string | null
          severity: string
          source: string
          source_id?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          reason?: string | null
          severity?: string
          source?: string
          source_id?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_trust_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_trust_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      crm_visits: {
        Row: {
          address_text: string | null
          assigned_to: string | null
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
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address_text?: string | null
          assigned_to?: string | null
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
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address_text?: string | null
          assigned_to?: string | null
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
          scheduled_at?: string | null
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
          {
            foreignKeyName: "crm_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean
          item_category?: string
          item_name: string
          property_id?: string | null
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean
          item_category?: string
          item_name?: string
          property_id?: string | null
          unit_id?: string | null
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
          {
            foreignKeyName: "default_inspection_checklist_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_decisions: {
        Row: {
          action: string
          actor_user_id: string | null
          allowed: boolean
          company_id: string
          correlation_id: string
          created_at: string
          decision_reason: string | null
          entitlement_key: string
          id: string
          metadata: Json
          module: string
          risk_score: number
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          allowed: boolean
          company_id: string
          correlation_id: string
          created_at?: string
          decision_reason?: string | null
          entitlement_key: string
          id?: string
          metadata?: Json
          module: string
          risk_score?: number
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          allowed?: boolean
          company_id?: string
          correlation_id?: string
          created_at?: string
          decision_reason?: string | null
          entitlement_key?: string
          id?: string
          metadata?: Json
          module?: string
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_decisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlement_decisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      exit_inspection_items: {
        Row: {
          baseline_condition: string
          baseline_notes: string | null
          baseline_photo_url: string | null
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
          baseline_condition?: string
          baseline_notes?: string | null
          baseline_photo_url?: string | null
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
          baseline_condition?: string
          baseline_notes?: string | null
          baseline_photo_url?: string | null
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
      governance_alerts: {
        Row: {
          alert_type: string
          company_id: string | null
          correlation_id: string | null
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          metadata: Json
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          company_id?: string | null
          correlation_id?: string | null
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          company_id?: string | null
          correlation_id?: string | null
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "governance_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "platform_audit_events"
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
            foreignKeyName: "landlord_payment_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          pipeline_kind: string
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
          pipeline_kind?: string
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
          pipeline_kind?: string
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
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
      lease_inventory_items: {
        Row: {
          condition: string
          created_at: string
          damage_cost: number
          id: string
          item_category: string
          item_name: string
          notes: string | null
          photo_url: string | null
          snapshot_id: string
          updated_at: string
        }
        Insert: {
          condition?: string
          created_at?: string
          damage_cost?: number
          id?: string
          item_category?: string
          item_name: string
          notes?: string | null
          photo_url?: string | null
          snapshot_id: string
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          damage_cost?: number
          id?: string
          item_category?: string
          item_name?: string
          notes?: string | null
          photo_url?: string | null
          snapshot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_inventory_items_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "lease_inventory_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_inventory_snapshots: {
        Row: {
          captured_at: string | null
          captured_by: string | null
          created_at: string
          exit_id: string | null
          id: string
          lease_id: string | null
          notes: string | null
          phase: string
          property_id: string
          status: string
          tenant_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          captured_at?: string | null
          captured_by?: string | null
          created_at?: string
          exit_id?: string | null
          id?: string
          lease_id?: string | null
          notes?: string | null
          phase: string
          property_id: string
          status?: string
          tenant_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          captured_at?: string | null
          captured_by?: string | null
          created_at?: string
          exit_id?: string | null
          id?: string
          lease_id?: string | null
          notes?: string | null
          phase?: string
          property_id?: string
          status?: string
          tenant_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_inventory_snapshots_exit_id_fkey"
            columns: ["exit_id"]
            isOneToOne: false
            referencedRelation: "tenant_exits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_inventory_snapshots_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_inventory_snapshots_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_inventory_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_inventory_snapshots_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
            foreignKeyName: "listing_publish_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
          actual_cost: number | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string
          estimated_cost: number | null
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
          vendor_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          estimated_cost?: number | null
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
          vendor_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          estimated_cost?: number | null
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
          vendor_id?: string | null
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
          {
            foreignKeyName: "maintenance_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
            foreignKeyName: "marketplace_inquiries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
          latitude: number | null
          longitude: number | null
          paused_at: string | null
          property_id: string | null
          published_at: string | null
          removal_flagged_at: string | null
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
          latitude?: number | null
          longitude?: number | null
          paused_at?: string | null
          property_id?: string | null
          published_at?: string | null
          removal_flagged_at?: string | null
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
          latitude?: number | null
          longitude?: number | null
          paused_at?: string | null
          property_id?: string | null
          published_at?: string | null
          removal_flagged_at?: string | null
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
            foreignKeyName: "marketplace_listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
      marketplace_trust_config: {
        Row: {
          min_account_age_days: number
          singleton: boolean
        }
        Insert: {
          min_account_age_days?: number
          singleton?: boolean
        }
        Update: {
          min_account_age_days?: number
          singleton?: boolean
        }
        Relationships: []
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
          {
            foreignKeyName: "moderation_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      moderation_cases: {
        Row: {
          assigned_moderator: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          opened_at: string
          opened_by: string | null
          queue: string
          reason_code: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          state: string
          updated_at: string
        }
        Insert: {
          assigned_moderator?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          opened_at?: string
          opened_by?: string | null
          queue?: string
          reason_code: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          state?: string
          updated_at?: string
        }
        Update: {
          assigned_moderator?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          opened_at?: string
          opened_by?: string | null
          queue?: string
          reason_code?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
      operational_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json
          reference_id: string
          reference_table: string
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          reference_id: string
          reference_table: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          reference_id?: string
          reference_table?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      owner_billing_group_members: {
        Row: {
          added_at: string
          added_by: string | null
          company_id: string
          group_id: string
          id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          company_id: string
          group_id: string
          id?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          company_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_billing_group_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_billing_group_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "owner_billing_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "owner_billing_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_billing_groups: {
        Row: {
          created_at: string
          created_by: string | null
          dissolved_at: string | null
          id: string
          metadata: Json
          name: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dissolved_at?: string | null
          id?: string
          metadata?: Json
          name: string
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dissolved_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          owner_id?: string
          status?: string
          updated_at?: string
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
      platform_analytics_snapshots: {
        Row: {
          blocked_events: number
          company_risk_watchlist: Json
          created_at: string
          critical_open_alerts: number
          denied_events: number
          entitlement_allowed: number
          entitlement_denied: number
          high_risk_events: number
          id: string
          metadata: Json
          module_breakdown: Json
          open_alerts: number
          snapshot_end: string
          snapshot_start: string
          snapshot_window: string
          total_events: number
          usage_pressure_count: number
        }
        Insert: {
          blocked_events?: number
          company_risk_watchlist?: Json
          created_at?: string
          critical_open_alerts?: number
          denied_events?: number
          entitlement_allowed?: number
          entitlement_denied?: number
          high_risk_events?: number
          id?: string
          metadata?: Json
          module_breakdown?: Json
          open_alerts?: number
          snapshot_end: string
          snapshot_start: string
          snapshot_window: string
          total_events?: number
          usage_pressure_count?: number
        }
        Update: {
          blocked_events?: number
          company_risk_watchlist?: Json
          created_at?: string
          critical_open_alerts?: number
          denied_events?: number
          entitlement_allowed?: number
          entitlement_denied?: number
          high_risk_events?: number
          id?: string
          metadata?: Json
          module_breakdown?: Json
          open_alerts?: number
          snapshot_end?: string
          snapshot_start?: string
          snapshot_window?: string
          total_events?: number
          usage_pressure_count?: number
        }
        Relationships: []
      }
      platform_audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          company_id: string | null
          correlation_id: string
          created_at: string
          device_info: Json
          event_type: string
          id: string
          impersonator_user_id: string | null
          ip_address: string | null
          metadata: Json
          module: string
          result_status: string
          risk_score: number
          severity: string
          source: string
          target_entity_id: string | null
          target_entity_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          company_id?: string | null
          correlation_id: string
          created_at?: string
          device_info?: Json
          event_type: string
          id?: string
          impersonator_user_id?: string | null
          ip_address?: string | null
          metadata?: Json
          module: string
          result_status?: string
          risk_score?: number
          severity?: string
          source: string
          target_entity_id?: string | null
          target_entity_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          company_id?: string | null
          correlation_id?: string
          created_at?: string
          device_info?: Json
          event_type?: string
          id?: string
          impersonator_user_id?: string | null
          ip_address?: string | null
          metadata?: Json
          module?: string
          result_status?: string
          risk_score?: number
          severity?: string
          source?: string
          target_entity_id?: string | null
          target_entity_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      platform_drift_checks: {
        Row: {
          alert_id: string | null
          check_key: string
          created_at: string
          details: Json
          id: string
          observed_value: number
          status: string
          threshold_value: number
          window_end: string
          window_start: string
        }
        Insert: {
          alert_id?: string | null
          check_key: string
          created_at?: string
          details?: Json
          id?: string
          observed_value: number
          status: string
          threshold_value: number
          window_end: string
          window_start: string
        }
        Update: {
          alert_id?: string | null
          check_key?: string
          created_at?: string
          details?: Json
          id?: string
          observed_value?: number
          status?: string
          threshold_value?: number
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_drift_checks_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "governance_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_entitlement_overrides: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          decision: string
          entitlement_key: string
          expires_at: string | null
          id: string
          metadata: Json
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          decision: string
          entitlement_key: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          decision?: string
          entitlement_key?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_entitlement_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_entitlement_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      platform_impersonation_sessions: {
        Row: {
          actor_user_id: string
          company_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          metadata: Json
          reason: string | null
          session_id: string | null
          started_at: string
          target_user_id: string
        }
        Insert: {
          actor_user_id: string
          company_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          session_id?: string | null
          started_at?: string
          target_user_id: string
        }
        Update: {
          actor_user_id?: string
          company_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          session_id?: string | null
          started_at?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_impersonation_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_impersonation_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "platform_impersonation_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "platform_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_operator_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_principal_suspensions: {
        Row: {
          cleared_at: string | null
          cleared_by: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          metadata: Json
          principal_id: string
          principal_type: string
          reason: string
          updated_at: string
        }
        Insert: {
          cleared_at?: string | null
          cleared_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          principal_id: string
          principal_type: string
          reason: string
          updated_at?: string
        }
        Update: {
          cleared_at?: string | null
          cleared_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          principal_id?: string
          principal_type?: string
          reason?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_risk_queue_triage_actions: {
        Row: {
          actor_user_id: string | null
          company_id: string | null
          created_at: string
          id: string
          metadata: Json
          notes: string | null
          row_id: string
          row_type: string
          triage_status: string
        }
        Insert: {
          actor_user_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          row_id: string
          row_type: string
          triage_status: string
        }
        Update: {
          actor_user_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          row_id?: string
          row_type?: string
          triage_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_risk_queue_triage_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_risk_queue_triage_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      platform_sessions: {
        Row: {
          company_id: string | null
          created_at: string
          device_info: Json
          ended_at: string | null
          id: string
          ip_address: string | null
          metadata: Json
          risk_score: number
          session_key: string
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          device_info?: Json
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          risk_score?: number
          session_key: string
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          device_info?: Json
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          risk_score?: number
          session_key?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "pm_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_company_id: string | null
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
          default_company_id?: string | null
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
          default_company_id?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_company_id_fkey"
            columns: ["default_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_default_company_id_fkey"
            columns: ["default_company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
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
          owner_account_id: string | null
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
          owner_account_id?: string | null
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
          owner_account_id?: string | null
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
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "properties_owner_account_id_fkey"
            columns: ["owner_account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
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
            foreignKeyName: "property_manager_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
      publisher_verification_audit: {
        Row: {
          action_type: string
          actor_user_id: string | null
          company_id: string
          created_at: string
          from_state: string | null
          id: string
          metadata: Json
          reason: string | null
          to_state: string
          verification_id: string
        }
        Insert: {
          action_type: string
          actor_user_id?: string | null
          company_id: string
          created_at?: string
          from_state?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_state: string
          verification_id: string
        }
        Update: {
          action_type?: string
          actor_user_id?: string | null
          company_id?: string
          created_at?: string
          from_state?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_state?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publisher_verification_audit_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publisher_verification_audit_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "publisher_verification_audit_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "publisher_verifications"
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
          {
            foreignKeyName: "publisher_verifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "risk_decisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
      saas_addon_entitlements: {
        Row: {
          addon_id: string
          bool_value: boolean | null
          created_at: string
          entitlement_key_id: string
          id: string
          int_value: number | null
          json_value: Json | null
          mode: string
          updated_at: string
        }
        Insert: {
          addon_id: string
          bool_value?: boolean | null
          created_at?: string
          entitlement_key_id: string
          id?: string
          int_value?: number | null
          json_value?: Json | null
          mode?: string
          updated_at?: string
        }
        Update: {
          addon_id?: string
          bool_value?: boolean | null
          created_at?: string
          entitlement_key_id?: string
          id?: string
          int_value?: number | null
          json_value?: Json | null
          mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_addon_entitlements_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "saas_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_addon_entitlements_entitlement_key_id_fkey"
            columns: ["entitlement_key_id"]
            isOneToOne: false
            referencedRelation: "saas_entitlement_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_addon_prices: {
        Row: {
          addon_id: string
          amount_minor: number
          billing_interval: string
          created_at: string
          currency_code: string
          id: string
          is_default: boolean
          updated_at: string
        }
        Insert: {
          addon_id: string
          amount_minor: number
          billing_interval?: string
          created_at?: string
          currency_code: string
          id?: string
          is_default?: boolean
          updated_at?: string
        }
        Update: {
          addon_id?: string
          amount_minor?: number
          billing_interval?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_default?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_addon_prices_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "saas_addons"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_addon_quota_overrides: {
        Row: {
          addon_id: string
          created_at: string
          hard_limit_override: number | null
          id: string
          increment_by: number | null
          mode: string
          quota_dimension_id: string
          updated_at: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          hard_limit_override?: number | null
          id?: string
          increment_by?: number | null
          mode?: string
          quota_dimension_id: string
          updated_at?: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          hard_limit_override?: number | null
          id?: string
          increment_by?: number | null
          mode?: string
          quota_dimension_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_addon_quota_overrides_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "saas_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_addon_quota_overrides_quota_dimension_id_fkey"
            columns: ["quota_dimension_id"]
            isOneToOne: false
            referencedRelation: "saas_quota_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_addons: {
        Row: {
          attach_scope: string
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          attach_scope?: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          attach_scope?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      saas_catalog_change_sets: {
        Row: {
          changes: Json
          created_at: string
          created_by: string
          id: string
          published_at: string | null
          published_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          changes?: Json
          created_at?: string
          created_by?: string
          id?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          changes?: Json
          created_at?: string
          created_by?: string
          id?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      saas_company_addon_subscriptions: {
        Row: {
          addon_id: string
          company_id: string
          created_at: string
          created_by: string | null
          end_at: string | null
          grace_end_at: string | null
          id: string
          metadata: Json
          notes: string | null
          start_at: string
          status: string
          trial_end_at: string | null
          updated_at: string
        }
        Insert: {
          addon_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          grace_end_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          start_at?: string
          status?: string
          trial_end_at?: string | null
          updated_at?: string
        }
        Update: {
          addon_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          grace_end_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          start_at?: string
          status?: string
          trial_end_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_company_addon_subscriptions_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "saas_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_company_addon_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_company_addon_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      saas_company_billing_access_states: {
        Row: {
          access_state: string
          company_id: string
          created_at: string
          needs_plan_since: string | null
          source_group_id: string | null
          transition_reason: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_state?: string
          company_id: string
          created_at?: string
          needs_plan_since?: string | null
          source_group_id?: string | null
          transition_reason?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_state?: string
          company_id?: string
          created_at?: string
          needs_plan_since?: string | null
          source_group_id?: string | null
          transition_reason?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_company_billing_access_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_company_billing_access_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "saas_company_billing_access_states_source_group_id_fkey"
            columns: ["source_group_id"]
            isOneToOne: false
            referencedRelation: "owner_billing_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_company_plan_subscriptions: {
        Row: {
          auto_renew: boolean
          company_id: string
          created_at: string
          created_by: string | null
          current_period_end: string | null
          current_period_start: string | null
          dunning_attempt_count: number
          end_at: string | null
          grace_end_at: string | null
          id: string
          last_dunning_attempt_at: string | null
          last_paid_at: string | null
          metadata: Json
          next_billing_at: string | null
          next_renewal_at: string | null
          notes: string | null
          payment_state: string
          plan_id: string
          product_id: string
          renewal_interval: string
          start_at: string
          status: string
          trial_end_at: string | null
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          dunning_attempt_count?: number
          end_at?: string | null
          grace_end_at?: string | null
          id?: string
          last_dunning_attempt_at?: string | null
          last_paid_at?: string | null
          metadata?: Json
          next_billing_at?: string | null
          next_renewal_at?: string | null
          notes?: string | null
          payment_state?: string
          plan_id: string
          product_id: string
          renewal_interval?: string
          start_at?: string
          status?: string
          trial_end_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          dunning_attempt_count?: number
          end_at?: string | null
          grace_end_at?: string | null
          id?: string
          last_dunning_attempt_at?: string | null
          last_paid_at?: string | null
          metadata?: Json
          next_billing_at?: string | null
          next_renewal_at?: string | null
          notes?: string | null
          payment_state?: string
          plan_id?: string
          product_id?: string
          renewal_interval?: string
          start_at?: string
          status?: string
          trial_end_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_company_plan_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_company_plan_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "saas_company_plan_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_company_plan_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "saas_products"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_entitlement_keys: {
        Row: {
          created_at: string
          description: string | null
          domain: string
          id: string
          key: string
          value_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          domain: string
          id?: string
          key: string
          value_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          domain?: string
          id?: string
          key?: string
          value_type?: string
        }
        Relationships: []
      }
      saas_owner_group_addon_subscriptions: {
        Row: {
          addon_id: string
          created_at: string
          created_by: string | null
          end_at: string | null
          grace_end_at: string | null
          group_id: string
          id: string
          metadata: Json
          notes: string | null
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          grace_end_at?: string | null
          group_id: string
          id?: string
          metadata?: Json
          notes?: string | null
          start_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          grace_end_at?: string | null
          group_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_owner_group_addon_subscriptions_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "saas_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_owner_group_addon_subscriptions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "owner_billing_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_owner_group_entitlement_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          decision: string
          entitlement_key_id: string
          expires_at: string | null
          group_id: string
          id: string
          reason: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decision: string
          entitlement_key_id: string
          expires_at?: string | null
          group_id: string
          id?: string
          reason: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decision?: string
          entitlement_key_id?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_owner_group_entitlement_overrides_entitlement_key_id_fkey"
            columns: ["entitlement_key_id"]
            isOneToOne: false
            referencedRelation: "saas_entitlement_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_owner_group_entitlement_overrides_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "owner_billing_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_owner_group_plan_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          created_by: string | null
          current_period_end: string | null
          current_period_start: string | null
          dunning_attempt_count: number
          end_at: string | null
          grace_end_at: string | null
          group_id: string
          id: string
          last_dunning_attempt_at: string | null
          last_paid_at: string | null
          metadata: Json
          next_renewal_at: string | null
          notes: string | null
          payment_state: string
          plan_id: string
          renewal_interval: string
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          dunning_attempt_count?: number
          end_at?: string | null
          grace_end_at?: string | null
          group_id: string
          id?: string
          last_dunning_attempt_at?: string | null
          last_paid_at?: string | null
          metadata?: Json
          next_renewal_at?: string | null
          notes?: string | null
          payment_state?: string
          plan_id: string
          renewal_interval?: string
          start_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          dunning_attempt_count?: number
          end_at?: string | null
          grace_end_at?: string | null
          group_id?: string
          id?: string
          last_dunning_attempt_at?: string | null
          last_paid_at?: string | null
          metadata?: Json
          next_renewal_at?: string | null
          notes?: string | null
          payment_state?: string
          plan_id?: string
          renewal_interval?: string
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_owner_group_plan_subscriptions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "owner_billing_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_owner_group_plan_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_owner_group_quota_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          group_id: string
          hard_limit_override: number | null
          id: string
          increment_by: number | null
          mode: string
          quota_dimension_id: string
          reason: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          group_id: string
          hard_limit_override?: number | null
          id?: string
          increment_by?: number | null
          mode: string
          quota_dimension_id: string
          reason: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          group_id?: string
          hard_limit_override?: number | null
          id?: string
          increment_by?: number | null
          mode?: string
          quota_dimension_id?: string
          reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_owner_group_quota_overrides_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "owner_billing_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_owner_group_quota_overrides_quota_dimension_id_fkey"
            columns: ["quota_dimension_id"]
            isOneToOne: false
            referencedRelation: "saas_quota_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_owner_group_subscription_change_log: {
        Row: {
          actor_user_id: string | null
          correlation_id: string | null
          created_at: string
          currency_code: string
          effective_at: string
          estimated_charge_minor: number | null
          estimated_credit_minor: number | null
          group_id: string
          id: string
          new_plan_id: string | null
          previous_plan_id: string | null
          reason: string | null
          subscription_id: string
        }
        Insert: {
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          currency_code: string
          effective_at: string
          estimated_charge_minor?: number | null
          estimated_credit_minor?: number | null
          group_id: string
          id?: string
          new_plan_id?: string | null
          previous_plan_id?: string | null
          reason?: string | null
          subscription_id: string
        }
        Update: {
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          currency_code?: string
          effective_at?: string
          estimated_charge_minor?: number | null
          estimated_credit_minor?: number | null
          group_id?: string
          id?: string
          new_plan_id?: string | null
          previous_plan_id?: string | null
          reason?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_owner_group_subscription_change_log_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "owner_billing_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_owner_group_subscription_change_log_new_plan_id_fkey"
            columns: ["new_plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_owner_group_subscription_change_log_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_owner_group_subscription_change_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "saas_owner_group_plan_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_owner_group_subscription_events: {
        Row: {
          actor_user_id: string | null
          correlation_id: string | null
          created_at: string
          details: Json
          event_type: string
          group_id: string
          id: string
          subscription_id: string
        }
        Insert: {
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          group_id: string
          id?: string
          subscription_id: string
        }
        Update: {
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          group_id?: string
          id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_owner_group_subscription_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "owner_billing_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_owner_group_subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "saas_owner_group_plan_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_owner_group_subscription_invoices: {
        Row: {
          amount_minor: number
          correlation_id: string | null
          created_at: string
          currency_code: string
          due_at: string
          external_reference: string | null
          group_id: string
          id: string
          invoice_kind: string
          invoice_status: string
          metadata: Json
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          correlation_id?: string | null
          created_at?: string
          currency_code?: string
          due_at?: string
          external_reference?: string | null
          group_id: string
          id?: string
          invoice_kind: string
          invoice_status?: string
          metadata?: Json
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          correlation_id?: string | null
          created_at?: string
          currency_code?: string
          due_at?: string
          external_reference?: string | null
          group_id?: string
          id?: string
          invoice_kind?: string
          invoice_status?: string
          metadata?: Json
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_owner_group_subscription_invoices_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "owner_billing_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_owner_group_subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "saas_owner_group_plan_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_owner_group_subscription_payment_attempts: {
        Row: {
          amount_minor: number
          attempt_count: number
          correlation_id: string | null
          created_at: string
          currency_code: string
          failure_reason: string | null
          gateway: string
          gateway_reference: string
          gateway_transaction_id: string | null
          group_id: string
          id: string
          idempotency_key: string
          invoice_id: string
          metadata: Json
          payment_method: string
          payment_status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          attempt_count?: number
          correlation_id?: string | null
          created_at?: string
          currency_code: string
          failure_reason?: string | null
          gateway: string
          gateway_reference: string
          gateway_transaction_id?: string | null
          group_id: string
          id?: string
          idempotency_key: string
          invoice_id: string
          metadata?: Json
          payment_method: string
          payment_status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          attempt_count?: number
          correlation_id?: string | null
          created_at?: string
          currency_code?: string
          failure_reason?: string | null
          gateway?: string
          gateway_reference?: string
          gateway_transaction_id?: string | null
          group_id?: string
          id?: string
          idempotency_key?: string
          invoice_id?: string
          metadata?: Json
          payment_method?: string
          payment_status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_owner_group_subscription_payment_atte_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "saas_owner_group_plan_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_owner_group_subscription_payment_attempts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "owner_billing_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_owner_group_subscription_payment_attempts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "saas_owner_group_subscription_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_plan_entitlements: {
        Row: {
          bool_value: boolean | null
          created_at: string
          entitlement_key_id: string
          id: string
          int_value: number | null
          json_value: Json | null
          plan_id: string
          updated_at: string
        }
        Insert: {
          bool_value?: boolean | null
          created_at?: string
          entitlement_key_id: string
          id?: string
          int_value?: number | null
          json_value?: Json | null
          plan_id: string
          updated_at?: string
        }
        Update: {
          bool_value?: boolean | null
          created_at?: string
          entitlement_key_id?: string
          id?: string
          int_value?: number | null
          json_value?: Json | null
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_plan_entitlements_entitlement_key_id_fkey"
            columns: ["entitlement_key_id"]
            isOneToOne: false
            referencedRelation: "saas_entitlement_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_plan_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_plan_prices: {
        Row: {
          amount_minor: number
          billing_interval: string
          created_at: string
          currency_code: string
          id: string
          is_default: boolean
          plan_id: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          billing_interval?: string
          created_at?: string
          currency_code: string
          id?: string
          is_default?: boolean
          plan_id: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          billing_interval?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_default?: boolean
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_plan_quotas: {
        Row: {
          created_at: string
          hard_limit: number
          id: string
          is_unlimited: boolean
          plan_id: string
          quota_dimension_id: string
          soft_limit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          hard_limit: number
          id?: string
          is_unlimited?: boolean
          plan_id: string
          quota_dimension_id: string
          soft_limit: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          hard_limit?: number
          id?: string
          is_unlimited?: boolean
          plan_id?: string
          quota_dimension_id?: string
          soft_limit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_plan_quotas_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_plan_quotas_quota_dimension_id_fkey"
            columns: ["quota_dimension_id"]
            isOneToOne: false
            referencedRelation: "saas_quota_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_plans: {
        Row: {
          billing_interval: string
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          product_id: string | null
          sort_order: number
          tier: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          product_id?: string | null
          sort_order?: number
          tier: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string | null
          sort_order?: number
          tier?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "saas_products"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_products: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_standalone: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_standalone?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_standalone?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      saas_quota_dimensions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          unit: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          unit: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          unit?: string
        }
        Relationships: []
      }
      saas_subscription_change_log: {
        Row: {
          actor_user_id: string | null
          company_id: string
          created_at: string
          currency_code: string
          effective_at: string
          estimated_charge_minor: number | null
          estimated_credit_minor: number | null
          id: string
          new_plan_id: string | null
          previous_plan_id: string | null
          product_id: string
          reason: string | null
          subscription_id: string
        }
        Insert: {
          actor_user_id?: string | null
          company_id: string
          created_at?: string
          currency_code: string
          effective_at: string
          estimated_charge_minor?: number | null
          estimated_credit_minor?: number | null
          id?: string
          new_plan_id?: string | null
          previous_plan_id?: string | null
          product_id: string
          reason?: string | null
          subscription_id: string
        }
        Update: {
          actor_user_id?: string | null
          company_id?: string
          created_at?: string
          currency_code?: string
          effective_at?: string
          estimated_charge_minor?: number | null
          estimated_credit_minor?: number | null
          id?: string
          new_plan_id?: string | null
          previous_plan_id?: string | null
          product_id?: string
          reason?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscription_change_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_change_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "saas_subscription_change_log_new_plan_id_fkey"
            columns: ["new_plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_change_log_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_change_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "saas_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_change_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "saas_company_plan_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_subscription_events: {
        Row: {
          actor_user_id: string | null
          company_id: string
          correlation_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          product_id: string
          subscription_id: string
        }
        Insert: {
          actor_user_id?: string | null
          company_id: string
          correlation_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          product_id: string
          subscription_id: string
        }
        Update: {
          actor_user_id?: string | null
          company_id?: string
          correlation_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          product_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscription_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "saas_subscription_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "saas_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "saas_company_plan_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_subscription_invoices: {
        Row: {
          amount_minor: number
          company_id: string
          correlation_id: string | null
          created_at: string
          currency_code: string
          due_at: string
          external_reference: string | null
          id: string
          invoice_kind: string
          invoice_status: string
          metadata: Json
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          product_id: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          company_id: string
          correlation_id?: string | null
          created_at?: string
          currency_code?: string
          due_at?: string
          external_reference?: string | null
          id?: string
          invoice_kind: string
          invoice_status?: string
          metadata?: Json
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          product_id: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          company_id?: string
          correlation_id?: string | null
          created_at?: string
          currency_code?: string
          due_at?: string
          external_reference?: string | null
          id?: string
          invoice_kind?: string
          invoice_status?: string
          metadata?: Json
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          product_id?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscription_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "saas_subscription_invoices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "saas_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "saas_company_plan_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_subscription_payment_attempts: {
        Row: {
          amount_minor: number
          attempt_count: number
          company_id: string
          correlation_id: string | null
          created_at: string
          currency_code: string
          failure_reason: string | null
          gateway: string
          gateway_reference: string
          gateway_transaction_id: string | null
          id: string
          idempotency_key: string
          invoice_id: string
          metadata: Json
          payment_method: string
          payment_status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          attempt_count?: number
          company_id: string
          correlation_id?: string | null
          created_at?: string
          currency_code: string
          failure_reason?: string | null
          gateway: string
          gateway_reference: string
          gateway_transaction_id?: string | null
          id?: string
          idempotency_key: string
          invoice_id: string
          metadata?: Json
          payment_method: string
          payment_status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          attempt_count?: number
          company_id?: string
          correlation_id?: string | null
          created_at?: string
          currency_code?: string
          failure_reason?: string | null
          gateway?: string
          gateway_reference?: string
          gateway_transaction_id?: string | null
          id?: string
          idempotency_key?: string
          invoice_id?: string
          metadata?: Json
          payment_method?: string
          payment_status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscription_payment_attempts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_payment_attempts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "saas_subscription_payment_attempts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "saas_subscription_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscription_payment_attempts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "saas_company_plan_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_usage_counters: {
        Row: {
          company_id: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          product_id: string
          quota_dimension_id: string
          updated_at: string
          used_value: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          product_id: string
          quota_dimension_id: string
          updated_at?: string
          used_value?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          product_id?: string
          quota_dimension_id?: string
          updated_at?: string
          used_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "saas_usage_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_usage_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "saas_usage_counters_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "saas_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_usage_counters_quota_dimension_id_fkey"
            columns: ["quota_dimension_id"]
            isOneToOne: false
            referencedRelation: "saas_quota_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_usage_events: {
        Row: {
          actor_user_id: string | null
          allowed: boolean
          company_id: string
          correlation_id: string | null
          created_at: string
          delta: number
          id: string
          metadata: Json
          product_id: string
          quota_dimension_id: string
          reason: string | null
          resulting_used: number
        }
        Insert: {
          actor_user_id?: string | null
          allowed: boolean
          company_id: string
          correlation_id?: string | null
          created_at?: string
          delta: number
          id?: string
          metadata?: Json
          product_id: string
          quota_dimension_id: string
          reason?: string | null
          resulting_used: number
        }
        Update: {
          actor_user_id?: string | null
          allowed?: boolean
          company_id?: string
          correlation_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          product_id?: string
          quota_dimension_id?: string
          reason?: string | null
          resulting_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "saas_usage_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_usage_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "saas_usage_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "saas_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_usage_events_quota_dimension_id_fkey"
            columns: ["quota_dimension_id"]
            isOneToOne: false
            referencedRelation: "saas_quota_dimensions"
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
          account_id: string | null
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
          account_id?: string | null
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
          account_id?: string | null
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
            foreignKeyName: "tenants_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
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
          status_changed_at: string
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
          status_changed_at?: string
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
          status_changed_at?: string
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
      usage_snapshots: {
        Row: {
          company_id: string
          created_at: string
          hard_limit: number
          id: string
          limit_state: string
          product_code: string
          quota_code: string
          remaining: number
          snapshot_at: string
          soft_limit: number
          usage_percent: number
          used_value: number
        }
        Insert: {
          company_id: string
          created_at?: string
          hard_limit: number
          id?: string
          limit_state: string
          product_code: string
          quota_code: string
          remaining: number
          snapshot_at?: string
          soft_limit: number
          usage_percent: number
          used_value: number
        }
        Update: {
          company_id?: string
          created_at?: string
          hard_limit?: number
          id?: string
          limit_state?: string
          product_code?: string
          quota_code?: string
          remaining?: number
          snapshot_at?: string
          soft_limit?: number
          usage_percent?: number
          used_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
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
      vendor_documents: {
        Row: {
          company_id: string
          created_at: string
          document_type: string
          expiry_date: string | null
          id: string
          mime_type: string
          storage_path: string
          uploaded_by: string | null
          vendor_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_type: string
          expiry_date?: string | null
          id?: string
          mime_type: string
          storage_path: string
          uploaded_by?: string | null
          vendor_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_type?: string
          expiry_date?: string | null
          id?: string
          mime_type?: string
          storage_path?: string
          uploaded_by?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          maintenance_request_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          reference_number: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          maintenance_request_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          maintenance_request_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_payments_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          company_id: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          status: string
          updated_at: string
          vendor_type: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          status?: string
          updated_at?: string
          vendor_type?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          status?: string
          updated_at?: string
          vendor_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
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
          {
            foreignKeyName: "webhook_endpoints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_marketplace_funnel_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
    }
    Views: {
      crm_marketplace_funnel_metrics: {
        Row: {
          company_id: string | null
          company_name: string | null
          deals_open: number | null
          deals_won_30d: number | null
          inquiries_30d: number | null
          inquiry_to_won_rate_pct: number | null
          leads_open: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_remove_stale_pending_listings: { Args: never; Returns: number }
      can_access_tenant_exit_inventory: {
        Args: { tenant_id_text: string }
        Returns: boolean
      }
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
      crm_complete_handoff: {
        Args: {
          p_handoff_id: string
          p_lease_end: string
          p_lease_start: string
          p_monthly_rent: number
          p_security_deposit?: number
          p_tenant_email: string
          p_tenant_name: string
          p_tenant_phone: string
        }
        Returns: string
      }
      crm_compute_lead_score: { Args: { p_lead_id: string }; Returns: number }
      crm_conditions_match: {
        Args: { conditions: Json; payload: Json }
        Returns: boolean
      }
      crm_execute_automation_rule: {
        Args: {
          p_correlation_id?: string
          p_event_type: string
          p_payload: Json
          p_rule_id: string
          p_source_id: string
          p_source_type: string
        }
        Returns: undefined
      }
      crm_preview_automation_rule: {
        Args: { p_rule_id: string; p_sample_payload?: Json }
        Returns: Json
      }
      crm_refresh_lead_score: { Args: { p_lead_id: string }; Returns: number }
      crm_replay_automation_run: { Args: { p_run_id: string }; Returns: string }
      crm_replay_automation_run_system: {
        Args: { p_replay_mode?: string; p_run_id: string }
        Returns: string
      }
      crm_retry_failed_automation_runs: {
        Args: { p_limit?: number }
        Returns: Json
      }
      crm_run_automation_for_event: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_event_type: string
          p_payload: Json
          p_source_id: string
          p_source_type: string
        }
        Returns: undefined
      }
      crm_schedule_automation_retry_worker: { Args: never; Returns: boolean }
      evaluate_marketplace_inquiry_risk: {
        Args: { p_inquiry_id: string }
        Returns: {
          decision: string
          reason_codes: string[]
          score: number
        }[]
      }
      evaluate_operational_alerts: {
        Args: { p_company_id?: string }
        Returns: Json
      }
      evaluate_publisher_auto_trust: {
        Args: { p_company_id: string }
        Returns: {
          account_age_days: number
          auto_qualified: boolean
          has_active_paid_plan: boolean
          has_tenancy_history: boolean
          min_account_age_days: number
          property_count: number
          state: string
          verification_id: string
          verified_at: string
        }[]
      }
      generate_crm_followup_tasks: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_accessible_company_executive_report: {
        Args: never
        Returns: {
          access_role: string
          active_tenant_count: number
          ai_credits_used: number
          company_address: string
          company_email: string
          company_id: string
          company_name: string
          company_phone: string
          occupancy_rate: number
          occupied_unit_count: number
          open_maintenance_count: number
          outstanding_balance: number
          property_count: number
          team_member_count: number
          total_collected: number
          unit_count: number
        }[]
      }
      get_company_property_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_managed_marketplace_listings_with_inquiry_counts: {
        Args: { p_company_id: string }
        Returns: {
          area: string
          bathrooms: number
          bedrooms: number
          city: string
          company_id: string
          cover_media_path: string
          created_at: string
          currency: string
          id: string
          inquiry_count: number
          published_at: string
          rent_amount: number
          slug: string
          status: string
          title: string
          verification_state: string
        }[]
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
          latitude: number
          longitude: number
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
          latitude: number
          longitude: number
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
      handle_pending_listing_removal: {
        Args: { p_action: string; p_listing_id: string }
        Returns: undefined
      }
      has_platform_operator_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
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
      is_platform_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_valid_crm_deal_stage_transition: {
        Args: { from_stage: string; to_stage: string }
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
      notify_listing_owner: {
        Args: {
          p_listing_id: string
          p_message: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      notify_listing_owner_of_lead: {
        Args: { p_lead_id: string }
        Returns: undefined
      }
      owner_billing_group_add_company: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_group_id: string
          p_reason: string
        }
        Returns: undefined
      }
      owner_billing_group_assert_actor: {
        Args: { p_owner_id: string }
        Returns: undefined
      }
      owner_billing_group_assert_capacity: {
        Args: { p_company_ids: string[]; p_plan_id: string }
        Returns: undefined
      }
      owner_billing_group_assert_reason: {
        Args: { p_reason: string }
        Returns: undefined
      }
      owner_billing_group_assert_super_admin: {
        Args: never
        Returns: undefined
      }
      owner_billing_group_capacity_violations: {
        Args: { p_company_ids: string[]; p_plan_id: string }
        Returns: Json
      }
      owner_billing_group_change_plan: {
        Args: {
          p_correlation_id?: string
          p_currency_code: string
          p_group_id: string
          p_plan_id: string
          p_reason: string
        }
        Returns: string
      }
      owner_billing_group_create: {
        Args: {
          p_company_ids: string[]
          p_correlation_id?: string
          p_name: string
          p_plan_id: string
          p_reason: string
        }
        Returns: string
      }
      owner_billing_group_dissolve: {
        Args: {
          p_correlation_id?: string
          p_group_id: string
          p_reason: string
        }
        Returns: undefined
      }
      owner_billing_group_pause_company_subscriptions: {
        Args: { p_company_ids: string[]; p_group_id: string; p_reason: string }
        Returns: number
      }
      owner_billing_group_preview_capacity: {
        Args: { p_company_ids: string[]; p_plan_id: string }
        Returns: Json
      }
      owner_billing_group_remove_company: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_group_id: string
          p_reason: string
        }
        Returns: undefined
      }
      owner_billing_group_rename: {
        Args: {
          p_correlation_id?: string
          p_group_id: string
          p_name: string
          p_reason: string
        }
        Returns: undefined
      }
      owner_billing_group_set_addon_status: {
        Args: {
          p_addon_code: string
          p_correlation_id?: string
          p_enabled: boolean
          p_end_at?: string
          p_group_id: string
          p_metadata?: Json
          p_reason: string
        }
        Returns: Json
      }
      owner_billing_group_set_company_state: {
        Args: {
          p_access_state: string
          p_company_ids: string[]
          p_group_id: string
          p_reason: string
        }
        Returns: undefined
      }
      owner_billing_group_write_audit: {
        Args: {
          p_action: string
          p_correlation_id: string
          p_event_type: string
          p_group_id: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      platform_admin_change_company_plan: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_currency_code?: string
          p_metadata?: Json
          p_new_plan_code: string
          p_product_code: string
          p_reason?: string
        }
        Returns: Json
      }
      platform_clear_owner_billing_group_entitlement_override: {
        Args: {
          p_correlation_id?: string
          p_entitlement_key: string
          p_group_id: string
          p_reason: string
        }
        Returns: undefined
      }
      platform_clear_owner_billing_group_quota_override: {
        Args: {
          p_correlation_id?: string
          p_group_id: string
          p_quota_code: string
          p_reason: string
        }
        Returns: undefined
      }
      platform_create_governance_alert: {
        Args: {
          p_alert_type: string
          p_company_id?: string
          p_correlation_id?: string
          p_description?: string
          p_event_id?: string
          p_metadata?: Json
          p_severity: string
          p_title: string
        }
        Returns: string
      }
      platform_get_company_admin_snapshot: {
        Args: { p_company_id: string }
        Returns: Json
      }
      platform_get_risk_queue: {
        Args: { p_company_id?: string; p_limit?: number }
        Returns: {
          company_id: string
          detail: string
          metadata: Json
          occurred_at: string
          row_id: string
          row_type: string
          score: number
          severity: string
          status: string
          title: string
        }[]
      }
      platform_get_risk_queue_triage_actions_page: {
        Args: {
          p_actor_user_id?: string
          p_company_id?: string
          p_created_after?: string
          p_created_before?: string
          p_page?: number
          p_page_size?: number
          p_triage_status?: string
        }
        Returns: Json
      }
      platform_get_session_revocation_history_page: {
        Args: {
          p_actor_user_id?: string
          p_company_id?: string
          p_correlation_id?: string
          p_created_after?: string
          p_created_before?: string
          p_page?: number
          p_page_size?: number
          p_principal_type?: string
          p_result_status?: string
          p_severity?: string
        }
        Returns: Json
      }
      platform_ingest_audit_event: {
        Args: {
          p_action: string
          p_actor_user_id?: string
          p_company_id?: string
          p_correlation_id?: string
          p_device_info?: Json
          p_event_type: string
          p_ip_address?: string
          p_metadata?: Json
          p_module: string
          p_result_status?: string
          p_risk_score?: number
          p_severity?: string
          p_source: string
          p_target_entity_id?: string
          p_target_entity_type?: string
          p_user_agent?: string
        }
        Returns: string
      }
      platform_is_principal_suspended: {
        Args: { p_principal_id: string; p_principal_type: string }
        Returns: boolean
      }
      platform_list_active_suspensions: {
        Args: { p_limit?: number; p_principal_type?: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          metadata: Json
          principal_id: string
          principal_type: string
          reason: string
        }[]
      }
      platform_list_entitlement_overrides: {
        Args: {
          p_company_id?: string
          p_limit?: number
          p_only_active?: boolean
        }
        Returns: {
          company_id: string
          created_at: string
          created_by: string
          decision: string
          entitlement_key: string
          expires_at: string
          id: string
          reason: string
          revoked_at: string
          revoked_by: string
        }[]
      }
      platform_list_impersonation_sessions: {
        Args: { p_limit?: number; p_only_active?: boolean }
        Returns: {
          actor_user_id: string
          company_id: string
          created_at: string
          ended_at: string
          id: string
          reason: string
          session_id: string
          started_at: string
          target_user_id: string
        }[]
      }
      platform_phase10_run_all: {
        Args: { p_emit_alerts?: boolean; p_window?: string }
        Returns: Json
      }
      platform_phase10_schedule_drift_checks: { Args: never; Returns: boolean }
      platform_record_drift_check: {
        Args: {
          p_check_key: string
          p_correlation_id?: string
          p_details?: Json
          p_emit_alert?: boolean
          p_observed_value: number
          p_status: string
          p_threshold_value: number
          p_window_end: string
          p_window_start: string
        }
        Returns: string
      }
      platform_refresh_usage_snapshot: {
        Args: { p_company_id: string; p_product_code?: string }
        Returns: number
      }
      platform_revoke_active_platform_sessions: {
        Args: {
          p_metadata?: Json
          p_principal_id: string
          p_principal_type: string
          p_reason: string
        }
        Returns: Json
      }
      platform_revoke_entitlement_override: {
        Args: { p_metadata?: Json; p_override_id: string; p_reason?: string }
        Returns: Json
      }
      platform_set_entitlement_override: {
        Args: {
          p_company_id: string
          p_decision: string
          p_entitlement_key: string
          p_expires_at?: string
          p_metadata?: Json
          p_reason: string
        }
        Returns: Json
      }
      platform_set_owner_billing_group_entitlement_override: {
        Args: {
          p_correlation_id?: string
          p_decision: string
          p_entitlement_key: string
          p_expires_at?: string
          p_group_id: string
          p_reason: string
        }
        Returns: string
      }
      platform_set_owner_billing_group_quota_override: {
        Args: {
          p_correlation_id?: string
          p_expires_at?: string
          p_group_id: string
          p_mode: string
          p_quota_code: string
          p_reason: string
          p_value: number
        }
        Returns: string
      }
      platform_set_principal_suspension: {
        Args: {
          p_metadata?: Json
          p_principal_id: string
          p_principal_type: string
          p_reason: string
          p_suspend: boolean
        }
        Returns: Json
      }
      platform_start_impersonation_session: {
        Args: {
          p_company_id?: string
          p_metadata?: Json
          p_reason?: string
          p_target_user_id: string
        }
        Returns: Json
      }
      platform_stop_impersonation_session: {
        Args: { p_impersonation_session_id: string; p_metadata?: Json }
        Returns: Json
      }
      platform_triage_risk_queue_item: {
        Args: {
          p_metadata?: Json
          p_notes?: string
          p_row_id: string
          p_row_type: string
          p_triage_status: string
        }
        Returns: Json
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
      resolve_moderation_case_company_id: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: string
      }
      revoke_publisher_verification_to_manual_review: {
        Args: { p_reason: string; p_verification_id: string }
        Returns: undefined
      }
      saas_adjust_usage_counter: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_delta: number
          p_metadata?: Json
          p_product_code?: string
          p_quota_code: string
          p_reason?: string
        }
        Returns: Json
      }
      saas_cancel_subscription: {
        Args: {
          p_at_period_end?: boolean
          p_company_id: string
          p_correlation_id?: string
          p_product_code: string
          p_reason?: string
        }
        Returns: string
      }
      saas_catalog_active_subscription_count: {
        Args: { p_plan_id: string }
        Returns: number
      }
      saas_catalog_plan_has_active_subscriptions: {
        Args: { p_plan_id: string }
        Returns: boolean
      }
      saas_change_subscription_plan: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_currency_code?: string
          p_effective_now?: boolean
          p_metadata?: Json
          p_new_plan_code: string
          p_product_code: string
          p_reason?: string
        }
        Returns: Json
      }
      saas_check_quota: {
        Args: {
          p_company_id: string
          p_product_code?: string
          p_quota_code: string
          p_requested_delta?: number
        }
        Returns: Json
      }
      saas_emit_billing_notification: {
        Args: {
          p_company_id: string
          p_link?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type?: string
        }
        Returns: undefined
      }
      saas_emit_owner_group_billing_notification: {
        Args: {
          p_group_id: string
          p_link?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type?: string
        }
        Returns: undefined
      }
      saas_finalize_owner_group_payment_attempt: {
        Args: {
          p_attempt_id: string
          p_correlation_id?: string
          p_gateway_reference?: string
          p_gateway_transaction_id?: string
          p_metadata?: Json
        }
        Returns: Json
      }
      saas_finalize_plan_change_after_payment: {
        Args: {
          p_attempt_id: string
          p_correlation_id?: string
          p_gateway_reference?: string
          p_gateway_transaction_id?: string
          p_metadata?: Json
        }
        Returns: Json
      }
      saas_finalize_subscription_payment_attempt: {
        Args: {
          p_attempt_id: string
          p_correlation_id?: string
          p_gateway_reference?: string
          p_gateway_transaction_id?: string
          p_metadata?: Json
        }
        Returns: Json
      }
      saas_get_effective_plan_id: {
        Args: { p_company_id: string; p_product_code?: string }
        Returns: string
      }
      saas_get_effective_quota_limits: {
        Args: {
          p_company_id: string
          p_product_code?: string
          p_quota_code: string
        }
        Returns: {
          hard_limit: number
          limit_state: string
          plan_id: string
          product_id: string
          remaining: number
          soft_limit: number
          used_value: number
        }[]
      }
      saas_get_pending_payment_attempts: {
        Args: { p_company_id?: string; p_limit?: number }
        Returns: {
          attempt_id: string
          company_id: string
          gateway: string
          last_pending_provider_status: string
          last_pending_reference: string
          last_pending_verification_at: string
          payment_status: string
          pending_verification_count: number
          subscription_id: string
          updated_at: string
        }[]
      }
      saas_get_pending_verification_health: {
        Args: { p_company_id?: string; p_limit?: number }
        Returns: {
          company_id: string
          latest_pending_verification_at: string
          max_pending_verification_count: number
          oldest_pending_verification_at: string
          pending_attempt_count: number
        }[]
      }
      saas_get_plan_price_minor: {
        Args: { p_currency_code?: string; p_plan_id: string }
        Returns: number
      }
      saas_get_quota_snapshot: {
        Args: { p_company_id: string; p_product_code?: string }
        Returns: {
          hard_limit: number
          limit_state: string
          quota_code: string
          remaining: number
          soft_limit: number
          usage_percent: number
          used_value: number
        }[]
      }
      saas_has_entitlement: {
        Args: {
          p_company_id: string
          p_entitlement_key: string
          p_product_code?: string
        }
        Returns: boolean
      }
      saas_mark_owner_group_payment_attempt_failed: {
        Args: {
          p_attempt_id: string
          p_correlation_id?: string
          p_failure_reason: string
          p_metadata?: Json
        }
        Returns: Json
      }
      saas_mark_plan_change_payment_failed: {
        Args: {
          p_attempt_id: string
          p_correlation_id?: string
          p_failure_reason?: string
        }
        Returns: Json
      }
      saas_mark_subscription_grace: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_grace_days?: number
          p_product_code: string
          p_reason?: string
        }
        Returns: string
      }
      saas_prepare_owner_group_renewal_payment_attempts: {
        Args: {
          p_correlation_id?: string
          p_gateway?: string
          p_limit?: number
          p_payment_method?: string
        }
        Returns: {
          amount_minor: number
          attempt_id: string
          currency_code: string
          gateway: string
          gateway_reference: string
          group_id: string
          invoice_id: string
          payment_method: string
          subscription_id: string
        }[]
      }
      saas_prepare_plan_change_charge: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_currency_code?: string
          p_gateway?: string
          p_metadata?: Json
          p_new_plan_code: string
          p_payment_method?: string
          p_product_code: string
        }
        Returns: Json
      }
      saas_prepare_renewal_payment_attempts: {
        Args: {
          p_correlation_id?: string
          p_gateway?: string
          p_limit?: number
          p_payment_method?: string
        }
        Returns: {
          amount_minor: number
          attempt_id: string
          company_id: string
          currency_code: string
          gateway: string
          gateway_reference: string
          invoice_id: string
          payment_method: string
          subscription_id: string
        }[]
      }
      saas_process_owner_group_renewals: {
        Args: { p_correlation_id?: string; p_limit?: number }
        Returns: Json
      }
      saas_process_subscription_renewals: {
        Args: { p_correlation_id?: string; p_limit?: number }
        Returns: Json
      }
      saas_publish_catalog_change_set: {
        Args: { p_change_set_id: string }
        Returns: Json
      }
      saas_queue_owner_group_renewal_invoices: {
        Args: { p_correlation_id?: string; p_limit?: number }
        Returns: Json
      }
      saas_queue_subscription_renewal_invoices: {
        Args: { p_correlation_id?: string; p_limit?: number }
        Returns: Json
      }
      saas_quota_is_unlimited: {
        Args: { p_plan_id: string; p_quota_code: string }
        Returns: boolean
      }
      saas_reactivate_subscription: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_product_code: string
        }
        Returns: string
      }
      saas_reconcile_usage_counters: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_product_code?: string
        }
        Returns: Json
      }
      saas_record_usage: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_delta: number
          p_metadata?: Json
          p_product_code?: string
          p_quota_code: string
        }
        Returns: Json
      }
      saas_schedule_subscription_renewal_worker: {
        Args: never
        Returns: boolean
      }
      saas_start_or_replace_subscription: {
        Args: {
          p_company_id: string
          p_correlation_id?: string
          p_metadata?: Json
          p_plan_code: string
          p_product_code: string
          p_trial_days?: number
        }
        Returns: string
      }
      saas_trial_expiry_candidates: {
        Args: { p_as_of?: string }
        Returns: {
          days_remaining: number
          subscription_id: string
        }[]
      }
      saas_user_can_access_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      saas_user_can_access_owner_billing_group: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      saas_user_can_administer_billing: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      schedule_marketplace_stale_listing_removal: {
        Args: never
        Returns: undefined
      }
      schedule_operational_alert_evaluation: { Args: never; Returns: boolean }
      search_crm_leads: {
        Args: {
          p_company_id: string
          p_limit?: number
          p_query?: string
          p_stage?: string
          p_status?: string
        }
        Returns: {
          assigned_to: string
          company_id: string
          contact_email: string
          contact_name: string
          contact_phone: string
          converted_at: string
          created_at: string
          id: string
          last_activity_at: string
          listing_id: string
          listing_slug: string
          listing_title: string
          lost_reason: string
          pipeline_kind: string
          priority: string
          score: number
          stage: string
          status: string
        }[]
      }
      seed_exit_inspection_items_from_scope: {
        Args: { p_exit_id: string }
        Returns: number
      }
      seed_move_in_inventory_snapshot: {
        Args: {
          p_lease_id?: string
          p_property_id: string
          p_tenant_id: string
          p_unit_id: string
        }
        Returns: string
      }
      set_recovery_codes: { Args: { p_codes: string[] }; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify_text: { Args: { p_input: string }; Returns: string }
      tenant_exit_sync_checkout_snapshot: {
        Args: { p_exit_id: string }
        Returns: string
      }
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
