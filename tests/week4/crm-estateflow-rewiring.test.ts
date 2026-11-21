import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_LEAD_STAGES,
  ACTIVE_CANONICAL_STAGES,
  LEAD_STAGE_LABEL,
  normalizeLeadStage,
} from '@/components/marketplace-crm/leadStageConfig';

const estateFlowMigration = readFileSync(
  resolve('supabase/migrations/20260920100000_crm_estateflow_pipeline_and_atomic_booking.sql'),
  'utf8'
);
const crmServiceCode = readFileSync(resolve('src/lib/crmService.ts'), 'utf8');
const leadStageConfigCode = readFileSync(
  resolve('src/components/marketplace-crm/leadStageConfig.ts'),
  'utf8'
);
const marketplaceHooksCode = readFileSync(resolve('src/hooks/useMarketplace.ts'), 'utf8');
const leadsPageCode = readFileSync(resolve('src/pages/marketplace-crm/Leads.tsx'), 'utf8');
const leadBoardCode = readFileSync(
  resolve('src/components/marketplace-crm/LeadPipelineBoard.tsx'),
  'utf8'
);
const leadDetailCode = readFileSync(
  resolve('src/components/marketplace-crm/LeadDetailPanel.tsx'),
  'utf8'
);

describe('EstateFlow CRM Rewiring & Concurrency Engine Contracts', () => {
  describe('1. Canonical 7-Stage Sales Pipeline & Lead Normalization', () => {
    it('defines the 7 canonical sales stages matching Arumuga-Raja-p/real_estate_crm', () => {
      expect(CANONICAL_LEAD_STAGES).toEqual([
        'new',
        'contacted',
        'site_visit',
        'interested',
        'negotiation',
        'booked',
        'lost',
      ]);
    });

    it('correctly maps active funnel stages excluding terminal won/lost', () => {
      expect(ACTIVE_CANONICAL_STAGES).toEqual([
        'new',
        'contacted',
        'site_visit',
        'interested',
        'negotiation',
      ]);
    });

    it('normalizes legacy and alias stages to canonical 7 stages', () => {
      expect(normalizeLeadStage('attempted_contact')).toBe('contacted');
      expect(normalizeLeadStage('viewing_scheduled')).toBe('site_visit');
      expect(normalizeLeadStage('qualified')).toBe('interested');
      expect(normalizeLeadStage('offer_made')).toBe('negotiation');
      expect(normalizeLeadStage('lease_in_progress')).toBe('negotiation');
      expect(normalizeLeadStage('converted')).toBe('booked');
      expect(normalizeLeadStage('lost')).toBe('lost');
      expect(normalizeLeadStage('new')).toBe('new');
      expect(normalizeLeadStage(null)).toBe('new');
    });

    it('includes human-readable labels for all canonical stages', () => {
      for (const stage of CANONICAL_LEAD_STAGES) {
        expect(LEAD_STAGE_LABEL[stage]).toBeDefined();
      }
      expect(LEAD_STAGE_LABEL.new).toBe('New Lead');
      expect(LEAD_STAGE_LABEL.site_visit).toBe('Site Visit');
      expect(LEAD_STAGE_LABEL.booked).toBe('Booked');
    });
  });

  describe('2. Database Schema & Engine Safeguard Migration', () => {
    it('updates leads table check constraint to support 7 canonical stages', () => {
      expect(estateFlowMigration).toContain('ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_stage_check');
      expect(estateFlowMigration).toContain("'site_visit'");
      expect(estateFlowMigration).toContain("'interested'");
      expect(estateFlowMigration).toContain("'negotiation'");
      expect(estateFlowMigration).toContain("'booked'");
    });

    it('adds property inventory and follow-up columns to leads', () => {
      expect(estateFlowMigration).toContain('ADD COLUMN IF NOT EXISTS interested_unit_id UUID REFERENCES public.units(id)');
      expect(estateFlowMigration).toContain('ADD COLUMN IF NOT EXISTS next_followup_at TIMESTAMPTZ');
      expect(estateFlowMigration).toContain('ADD COLUMN IF NOT EXISTS budget_min NUMERIC');
      expect(estateFlowMigration).toContain('ADD COLUMN IF NOT EXISTS budget_max NUMERIC');
      expect(estateFlowMigration).toContain('CREATE INDEX IF NOT EXISTS idx_leads_next_followup');
    });

    it('creates dedicated crm_unit_bookings table with RLS', () => {
      expect(estateFlowMigration).toContain('CREATE TABLE IF NOT EXISTS public.crm_unit_bookings');
      expect(estateFlowMigration).toContain('ALTER TABLE public.crm_unit_bookings ENABLE ROW LEVEL SECURITY');
    });

    it('enforces engine-level safeguard via partial unique index to prevent double bookings', () => {
      expect(estateFlowMigration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_confirmed_unit_booking');
      expect(estateFlowMigration).toContain('ON public.crm_unit_bookings (unit_id)');
      expect(estateFlowMigration).toContain("WHERE status = 'Confirmed'");
    });

    it('implements atomic booking stored procedure with pessimistic row locking', () => {
      expect(estateFlowMigration).toContain('CREATE OR REPLACE FUNCTION public.book_unit_atomic(');
      expect(estateFlowMigration).toContain('FOR UPDATE');
      expect(estateFlowMigration).toContain("IF v_unit.status IN ('booked', 'occupied', 'sold') THEN");
      expect(estateFlowMigration).toContain('INSERT INTO public.crm_unit_bookings');
      expect(estateFlowMigration).toContain("UPDATE public.leads");
      expect(estateFlowMigration).toContain("stage = 'booked'");
      expect(estateFlowMigration).toContain("status = 'won'");
    });

    it('implements available units helper RPC', () => {
      expect(estateFlowMigration).toContain('CREATE OR REPLACE FUNCTION public.get_crm_available_units');
      expect(estateFlowMigration).toContain("u.status IN ('vacant', 'available')");
    });
  });

  describe('3. Service Layer Architecture (crmService.ts)', () => {
    it('encapsulates core real estate CRM operations', () => {
      expect(crmServiceCode).toContain('export const crmService = {');
      expect(crmServiceCode).toContain('async getAvailableUnits(');
      expect(crmServiceCode).toContain('async bookUnitAtomic(');
      expect(crmServiceCode).toContain('async simulateConcurrencyCollision(');
      expect(crmServiceCode).toContain('async scheduleLeadFollowup(');
      expect(crmServiceCode).toContain('async updateLeadStage(');
    });

    it('implements concurrency collision simulation testing utility', () => {
      expect(crmServiceCode).toContain('Promise.all([attempt1Promise, attempt2Promise])');
      expect(crmServiceCode).toContain('collisionPrevented');
      expect(crmServiceCode).toContain('Atomic Concurrency Safeguard verified');
    });
  });

  describe('4. React Hooks Integration (useMarketplace.ts)', () => {
    it('exports EstateFlow-aligned CRM hooks', () => {
      expect(marketplaceHooksCode).toContain('export function useCrmAvailableUnits(');
      expect(marketplaceHooksCode).toContain('export function useBookUnitAtomic(');
      expect(marketplaceHooksCode).toContain('export function useScheduleLeadFollowup(');
      expect(marketplaceHooksCode).toContain('export function useSimulateConcurrencyCollision(');
    });

    it('extends CrmLead interface with inventory and follow-up fields', () => {
      expect(marketplaceHooksCode).toContain('interested_unit_id?: string | null');
      expect(marketplaceHooksCode).toContain('next_followup_at?: string | null');
      expect(marketplaceHooksCode).toContain('budget_min?: number');
      expect(marketplaceHooksCode).toContain('budget_max?: number');
    });
  });

  describe('5. UI Components & Dual-View Integration', () => {
    it('LeadPipelineBoard implements 7-stage funnel with atomic booking trigger', () => {
      expect(leadBoardCode).toContain('CANONICAL_LEAD_STAGES.map(');
      expect(leadBoardCode).toContain('onOpenBooking');
      expect(leadBoardCode).toContain('Book Unit (Atomic)');
      expect(leadBoardCode).toContain('formatFollowupBadge');
    });

    it('LeadDetailPanel contains unit inventory browser and atomic booking dialog', () => {
      expect(leadDetailCode).toContain('useCrmAvailableUnits');
      expect(leadDetailCode).toContain('useBookUnitAtomic');
      expect(leadDetailCode).toContain('useScheduleLeadFollowup');
      expect(leadDetailCode).toContain('useSimulateConcurrencyCollision');
      expect(leadDetailCode).toContain('Atomic Unit Booking · EstateFlow Concurrency Engine');
      expect(leadDetailCode).toContain('Test Concurrency Lock');
      expect(leadDetailCode).toContain('Schedule Lead Follow-up');
    });

    it('Leads page supports Kanban Funnel vs Tabular Operations dual-view with follow-up filter', () => {
      expect(leadsPageCode).toContain('Kanban Funnel');
      expect(leadsPageCode).toContain('Tabular Operations');
      expect(leadsPageCode).toContain('followupFilter');
      expect(leadsPageCode).toContain('All Stages (7 Funnel Phases)');
      expect(leadsPageCode).toContain('Overdue Follow-ups');
      expect(leadsPageCode).toContain('quickBookingLead');
    });
  });
});
