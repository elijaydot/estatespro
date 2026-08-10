import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260810150000_owner_billing_group_billing_orchestration.sql'),
  'utf8',
);
const renewalRunner = readFileSync(
  resolve(process.cwd(), 'supabase/functions/run-subscription-renewals/index.ts'),
  'utf8',
);
const paymentVerifier = readFileSync(
  resolve(process.cwd(), 'supabase/functions/saas-verify-subscription-payment/index.ts'),
  'utf8',
);

describe('owner billing group billing orchestration', () => {
  it('creates one renewal invoice with group add-ons counted once', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.saas_queue_owner_group_renewal_invoices');
    expect(migration).toContain('v_total_amount := v_plan_amount + v_addon_amount');
    expect(migration).toContain('group_addon.group_id = v_subscription.group_id');
    expect(migration).not.toMatch(/group_addon[\s\S]{0,300}owner_billing_group_members/);
    expect(migration).toContain("invoice.invoice_kind = 'renewal'");
    expect(migration).toContain("invoice.period_start = date_trunc('month', now())");
  });

  it('uses a parallel idempotent group payment attempt flow', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.saas_prepare_owner_group_renewal_payment_attempts');
    expect(migration).toContain("concat('saas-group-renewal:', v_invoice.id::text)");
    expect(migration).toContain('ON CONFLICT (idempotency_key) DO NOTHING');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.saas_finalize_owner_group_payment_attempt');
    expect(migration).toContain("v_attempt.payment_status = 'succeeded'");
    expect(migration).not.toContain('public.saas_subscription_invoices');
    expect(migration).not.toContain('public.saas_subscription_payment_attempts');
  });

  it('restricts billing workers and payment finalization to trusted service role calls', () => {
    expect(migration.match(/IF auth\.role\(\) <> 'service_role' THEN/g)?.length).toBe(5);
    expect(migration).not.toContain('PERFORM public.owner_billing_group_assert_actor(v_owner_id)');
    expect(migration).not.toContain(
      'GRANT EXECUTE ON FUNCTION public.saas_finalize_owner_group_payment_attempt(uuid,text,text,text,jsonb) TO authenticated',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.saas_finalize_owner_group_payment_attempt(uuid,text,text,text,jsonb) TO service_role',
    );
  });

  it('applies one shared daily-bounded dunning and grace lifecycle', () => {
    expect(migration).toContain("subscription.last_dunning_attempt_at <= now() - interval '1 day'");
    expect(migration).toContain('dunning_attempt_count = dunning_attempt_count + 1');
    expect(migration).toContain('IF coalesce(v_dunning_count, 0) >= 3 THEN');
    expect(migration).toContain("now() + interval '7 days'");
    expect(migration).toContain("'needs_plan'");
    expect(migration).toContain("'billing.group.expired_after_grace'");
  });

  it('notifies the group owner once per billing transition', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.saas_emit_owner_group_billing_notification');
    expect(migration).toContain("jsonb_build_object('owner_billing_group_id', p_group_id)");
    expect(migration).toContain("'Billing group entered grace period'");
    expect(migration).toContain("'Billing group subscription expired'");
  });

  it('routes group renewals through the parallel ledger and group owner notification', () => {
    expect(renewalRunner).toContain('SAAS_RENEWALS_CRON_SECRET');
    expect(renewalRunner).toContain('x-saas-renewals-cron-secret');
    expect(renewalRunner).not.toContain('Authorization header required');
    expect(renewalRunner).toContain('saas_queue_owner_group_renewal_invoices');
    expect(renewalRunner).toContain('saas_prepare_owner_group_renewal_payment_attempts');
    expect(renewalRunner).toContain('saas_owner_group_subscription_payment_attempts');
    expect(renewalRunner).toContain('saas_process_owner_group_renewals');
    expect(renewalRunner).toContain('Billing group renewal payment required');
    expect(renewalRunner).toContain('ownerGroupRenewalAttemptsPrepared');
  });

  it('verifies group payments before using service-role group finalization', () => {
    expect(paymentVerifier).toContain('saas_owner_group_subscription_payment_attempts');
    expect(paymentVerifier).toContain('saas_finalize_owner_group_payment_attempt');
    expect(paymentVerifier).toContain('saas_mark_owner_group_payment_attempt_failed');
    expect(paymentVerifier).toContain('Payment gateway mismatch for this attempt');
    expect(paymentVerifier).toContain('ALLOW_SAAS_PAYMENT_TEST_MODE');
  });
});