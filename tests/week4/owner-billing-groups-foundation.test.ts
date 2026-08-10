import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20260810100000_owner_billing_groups_foundation.sql');

describe('owner billing groups foundation', () => {
  it('adds group storage without changing company subscription tables', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.owner_billing_groups');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.owner_billing_group_members');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.saas_owner_group_plan_subscriptions');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.saas_owner_group_addon_subscriptions');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.saas_owner_group_quota_overrides');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.saas_owner_group_entitlement_overrides');
    expect(migration).not.toContain('ALTER TABLE public.saas_company_plan_subscriptions');
    expect(migration).not.toContain('ALTER TABLE public.saas_company_addon_subscriptions');
  });

  it('uses parallel group billing ledgers instead of company billing foreign keys', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.saas_owner_group_subscription_events');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.saas_owner_group_subscription_change_log');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.saas_owner_group_subscription_invoices');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.saas_owner_group_subscription_payment_attempts');
    expect(migration).toContain('REFERENCES public.saas_owner_group_plan_subscriptions(id)');
    expect(migration).not.toContain('REFERENCES public.saas_company_plan_subscriptions(id)');
  });

  it('allows only one billing group per company and one active plan for a viable group', () => {
    expect(migration).toContain('owner_billing_group_members_company_key UNIQUE (company_id)');
    expect(migration).toContain('uq_saas_owner_group_active_plan_subscription');
    expect(migration).toContain("WHERE status IN ('active', 'grace_period')");
    expect(migration).toContain('OWNER_BILLING_GROUP_REQUIRES_TWO_MEMBERS');
    expect(migration).toContain('IF v_member_count < 2 THEN');
  });

  it('requires matching true ownership and keeps group ownership immutable', () => {
    expect(migration).toContain('OWNER_BILLING_GROUP_COMPANY_OWNER_MISMATCH');
    expect(migration).toContain('v_company_owner_id <> v_group_owner_id');
    expect(migration).toContain('OWNER_BILLING_GROUP_OWNER_IMMUTABLE');
    expect(migration).not.toContain('company_members');
  });

  it('accepts active unified plans and does not model group trials', () => {
    expect(migration).toContain('OWNER_BILLING_GROUP_REQUIRES_ACTIVE_UNIFIED_PLAN');
    expect(migration).toContain('AND product_id IS NULL');
    expect(migration).not.toContain('trial_end_at');
    expect(migration).not.toContain("'trialing'");
  });

  it('keeps direct access read-only so mutations must use validated RPCs', () => {
    expect(migration).toContain('CREATE POLICY "Owners can view own billing groups"');
    expect(migration).toContain('CREATE POLICY "Super admins can view owner billing groups"');
    expect(migration).toContain('saas_user_can_access_owner_billing_group(auth.uid(), group_id)');
    expect(migration).not.toContain('Owners can manage own billing groups');
    expect(migration).not.toContain('GRANT INSERT, UPDATE, DELETE');
    expect(migration).not.toContain('FOR ALL TO authenticated');
  });
});