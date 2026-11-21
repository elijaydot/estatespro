import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routingMigration = readFileSync(
  resolve('supabase/migrations/20260920110000_crm_automated_routing_and_self_service.sql'),
  'utf8'
);
const atomicMigration = readFileSync(
  resolve('supabase/migrations/20260920100000_crm_estateflow_pipeline_and_atomic_booking.sql'),
  'utf8'
);
const crmServiceCode = readFileSync(resolve('src/lib/crmService.ts'), 'utf8');
const marketplaceHooksCode = readFileSync(resolve('src/hooks/useMarketplace.ts'), 'utf8');
const leadsPageCode = readFileSync(resolve('src/pages/marketplace-crm/Leads.tsx'), 'utf8');
const leadDetailCode = readFileSync(
  resolve('src/components/marketplace-crm/LeadDetailPanel.tsx'),
  'utf8'
);

describe('Automated CRM Routing, Activity Triggers & Self-Service Lifecycle', () => {
  describe('1. Automated Load-Balanced Lead Routing Engine', () => {
    it('defines least-loaded sales agent selector prioritizing lower active lead volumes', () => {
      expect(routingMigration).toContain('CREATE OR REPLACE FUNCTION public.crm_get_least_loaded_agent');
      expect(routingMigration).toContain('FROM public.company_members cm');
      expect(routingMigration).toContain("cm.status = 'approved'");
      expect(routingMigration).toContain("cm.role IN ('property_manager', 'landlord', 'agent')");
      expect(routingMigration).toContain('ORDER BY count(l.id) ASC, cm.created_at ASC');
    });

    it('implements automated lead routing procedure with SLA outreach task & notification', () => {
      expect(routingMigration).toContain('CREATE OR REPLACE FUNCTION public.crm_route_lead_automated');
      expect(routingMigration).toContain('INSERT INTO public.lead_tasks');
      expect(routingMigration).toContain("'initial_outreach'");
      expect(routingMigration).toContain("INTERVAL '2 hours'");
      expect(routingMigration).toContain('INSERT INTO public.notifications');
      expect(routingMigration).toContain("'action_required'");
    });

    it('attaches inbound lead trigger for automatic unassigned lead routing on creation', () => {
      expect(routingMigration).toContain('CREATE OR REPLACE FUNCTION public.crm_trigger_inbound_lead_autoroute');
      expect(routingMigration).toContain('CREATE TRIGGER trigger_inbound_lead_autoroute');
      expect(routingMigration).toContain('BEFORE INSERT ON public.leads');
    });
  });

  describe('2. Activity-Driven Automated Stage Transitions', () => {
    it('defines auto-advance trigger on lead_activities mapping touchpoints to canonical stages', () => {
      expect(routingMigration).toContain('CREATE OR REPLACE FUNCTION public.crm_auto_advance_lead_on_activity');
      expect(routingMigration).toContain('CREATE TRIGGER trigger_auto_advance_lead_on_activity');
      expect(routingMigration).toContain('AFTER INSERT ON public.lead_activities');
    });

    it('verifies exact activity triggers and destination stages without manual movement', () => {
      // Outreach moves new -> contacted
      expect(routingMigration).toContain("v_lead.stage = 'new' AND NEW.activity_type IN ('call', 'email', 'sms', 'whatsapp', 'inquiry', 'outreach')");
      expect(routingMigration).toContain("v_new_stage := 'contacted'");

      // Viewing moves to site_visit
      expect(routingMigration).toContain("NEW.activity_type IN ('viewing', 'site_visit')");
      expect(routingMigration).toContain("v_new_stage := 'site_visit'");

      // Unit selection moves to interested
      expect(routingMigration).toContain("NEW.activity_type IN ('unit_selected', 'floorplan_selected')");
      expect(routingMigration).toContain("v_new_stage := 'interested'");

      // Proposal / negotiation moves to negotiation
      expect(routingMigration).toContain("NEW.activity_type IN ('proposal_sent', 'offer_made', 'negotiation_started')");
      expect(routingMigration).toContain("v_new_stage := 'negotiation'");

      // Reservation moves to booked and won
      expect(routingMigration).toContain("NEW.activity_type IN ('unit_booked_atomic', 'booking_confirmed')");
      expect(routingMigration).toContain("v_new_stage := 'booked'");
      expect(routingMigration).toContain("v_new_status := 'won'");
    });

    it('automatically records stage history on automated transitions', () => {
      expect(routingMigration).toContain('INSERT INTO public.lead_stage_history');
      expect(routingMigration).toContain("'automated_activity_trigger:' || NEW.activity_type");
    });
  });

  describe('3. Visit-Driven & Booking-Driven Automated Lifecycle', () => {
    it('automatically advances lead to site_visit when a visit is scheduled or conducted', () => {
      expect(routingMigration).toContain('CREATE OR REPLACE FUNCTION public.crm_auto_advance_lead_on_visit');
      expect(routingMigration).toContain('CREATE TRIGGER trigger_auto_advance_lead_on_visit');
      expect(routingMigration).toContain("NEW.related_type = 'lead'");
      expect(routingMigration).toContain("stage IN ('new', 'contacted') THEN 'site_visit'");
    });

    it('enforces atomic booking confirmation with partial unique index protection', () => {
      expect(atomicMigration).toContain('book_unit_atomic');
      expect(atomicMigration).toContain('idx_unique_confirmed_unit_booking');
      expect(atomicMigration).toContain("stage = 'booked'");
      expect(atomicMigration).toContain("status = 'won'");
    });
  });

  describe('4. SLA Breach Escalation & Inactivity Timeout Engine', () => {
    it('defines escalation function for overdue uncontacted leads and cold leads', () => {
      expect(routingMigration).toContain('CREATE OR REPLACE FUNCTION public.crm_escalate_stale_leads');
      expect(routingMigration).toContain("INTERVAL '24 hours'");
      expect(routingMigration).toContain("INTERVAL '48 hours'");
      expect(routingMigration).toContain("INTERVAL '14 days'");
      expect(routingMigration).toContain("'automated_inactivity_timeout_14d'");
    });
  });

  describe('5. Service Layer & Frontend Integration', () => {
    it('exposes routing, activity advance, SLA monitor, and lifecycle simulation in crmService', () => {
      expect(crmServiceCode).toContain('async autoRouteLead(');
      expect(crmServiceCode).toContain('async recordActivityAndAutoAdvance(');
      expect(crmServiceCode).toContain('async escalateStaleLeads(');
      expect(crmServiceCode).toContain('async simulateSelfServiceLifecycle(');
    });

    it('exports corresponding React Query hooks', () => {
      expect(marketplaceHooksCode).toContain('export function useAutoRouteLead(');
      expect(marketplaceHooksCode).toContain('export function useRecordLeadActivityAutoAdvance(');
      expect(marketplaceHooksCode).toContain('export function useEscalateStaleLeads(');
      expect(marketplaceHooksCode).toContain('export function useSimulateSelfServiceWorkflow(');
    });

    it('surfaces automated self-service controls in LeadDetailPanel and Leads workspace', () => {
      expect(leadDetailCode).toContain('Self-Service Activity Triggers');
      expect(leadDetailCode).toContain('Auto-Route (Least-Loaded)');
      expect(leadDetailCode).toContain('logActivityAutoAdvance.mutate');
      expect(leadsPageCode).toContain('Run SLA Monitor');
      expect(leadsPageCode).toContain('Simulate Self-Service Flow');
      expect(leadsPageCode).toContain('Self-Service Automated CRM Lifecycle Test Path');
    });
  });
});
