import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811130000_platform_scoped_billing_grace_operations.sql'), 'utf8');
const controlPlane = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');
const groups = readFileSync(resolve(process.cwd(), 'src/pages/OwnerBillingGroup360.tsx'), 'utf8');
const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');

describe('platform scoped billing grace operations', () => {
  it('locks and validates the exact company or group subscription scope', () => {
    expect(migration).toContain('WHERE id = p_subscription_id AND company_id = p_company_id');
    expect(migration).toContain('WHERE id = p_subscription_id AND group_id = p_group_id');
    expect(migration.match(/FOR UPDATE;/g)?.length).toBe(2);
    expect(migration.match(/p_grace_days < 1 OR p_grace_days > 90/g)?.length).toBe(2);
    expect(migration.match(/length\(btrim\(p_reason\)\) < 8/g)?.length).toBe(2);
  });

  it('supports explicit from-now and extension semantics', () => {
    expect(migration.match(/p_mode NOT IN \('from_now', 'extend'\)/g)?.length).toBe(2);
    expect(migration.match(/v_previous_grace_end \+ make_interval/g)?.length).toBe(2);
  });

  it('requires platform billing authority and emits domain plus platform audit events', () => {
    expect(migration.match(/has_platform_operator_role\(v_actor, 'billing_operator'\)/g)?.length).toBe(2);
    expect(migration).toContain('billing.subscription.admin_grace_set');
    expect(migration).toContain('billing.group.admin_grace_set');
    expect(migration.match(/INSERT INTO public.platform_audit_events/g)?.length).toBe(2);
  });

  it('wires company rows and group 360 to the scoped RPCs', () => {
    expect(hooks).toContain("'platform_admin_set_company_subscription_grace'");
    expect(controlPlane).toContain('Confirm scoped company grace');
    expect(controlPlane).toContain('Apply from the exact subscription row below');
    expect(groups).toContain("'platform_admin_set_owner_group_subscription_grace'");
    expect(groups).toContain('Affects this billing group');
    expect(groups).toContain('Confirm scoped group grace');
  });
});