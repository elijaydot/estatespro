import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const hooksPath = resolve(
  process.cwd(),
  'src/hooks/useControlPlane.ts',
);

const pagePath = resolve(
  process.cwd(),
  'src/pages/SuperAdminControlPlane.tsx',
);

const analyticsTabPath = resolve(
  process.cwd(),
  'src/components/control-plane/tabs/AnalyticsOpsTab.tsx',
);

describe('control plane pending verification operations visibility', () => {
  it('adds pending verification query hooks', () => {
    const source = readFileSync(hooksPath, 'utf8');

    expect(source).toContain('export type PendingPaymentAttemptRow');
    expect(source).toContain('export type PendingVerificationHealthRow');
    expect(source).toContain('export function usePendingPaymentAttempts');
    expect(source).toContain('saas_get_pending_payment_attempts');
    expect(source).toContain('export function usePendingVerificationHealth');
    expect(source).toContain('saas_get_pending_verification_health');
    expect(source).toContain('metadata, created_at, updated_at, resolved_at');
  });

  it('wires pending verification datasets into super admin control plane', () => {
    const source = readFileSync(pagePath, 'utf8');

    expect(source).toContain('usePendingPaymentAttempts');
    expect(source).toContain('usePendingVerificationHealth');
    expect(source).toContain('pendingAttempts.isLoading');
    expect(source).toContain('pendingHealth.isLoading');
    expect(source).toContain('void pendingAttempts.refetch()');
    expect(source).toContain('void pendingHealth.refetch()');
    expect(source).toContain("row_type: 'pending_verification_health'");
    expect(source).toContain("row_type: 'pending_payment_attempt'");
    expect(source).toContain("pendingVerificationAlerts={pendingVerificationAlerts}");
    expect(source).toContain("onAcknowledgeAlert={(id) => void handleUpdateAlertStatus(id, 'acknowledged')}");
    expect(source).toContain("onResolveAlert={(id) => void handleUpdateAlertStatus(id, 'resolved')}");
    expect(source).toContain('pendingAttempts={filteredPendingAttempts}');
    expect(source).toContain('pendingHealth={filteredPendingHealth}');
  });

  it('renders pending verification health and attempt detail panels', () => {
    const source = readFileSync(analyticsTabPath, 'utf8');

    expect(source).toContain('Pending Payment Verifications');
    expect(source).toContain('Pending Verification Health by Company');
    expect(source).toContain('Pending Payment Attempt Detail');
    expect(source).toContain('Pending Verification Governance Alerts');
    expect(source).toContain('Refresh Pending Verification Data');
    expect(source).toContain('Acknowledge');
    expect(source).toContain('Resolve');
    expect(source).toContain('Retry Count');
    expect(source).toContain('Reference');
    expect(source).toContain('Attempt');
    expect(source).toContain('Triage');
    expect(source).toContain('Open Attempt');
    expect(source).toContain('pending-attempt-');
    expect(source).toContain('scrollIntoView');
    expect(source).toContain("getMetaNumber(row, 'pending_verification_count')");
    expect(source).toContain("getMetaText(row, 'reference')");
    expect(source).toContain("getMetaText(row, 'attempt_id')");
    expect(source).toContain('max_pending_verification_count');
    expect(source).toContain('pending_verification_count');
    expect(source).toContain('last_pending_provider_status');
  });
});
