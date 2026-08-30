import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const seerMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260830160000_super_admin_global_seer_rls_visibility.sql'),
  'utf8'
);

const unconditionalPmMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260830180000_super_admin_unconditional_pm_rls.sql'),
  'utf8'
);

describe('Super Admin Global Seer Platform-Wide Visibility', () => {
  it('extends get_user_company_ids with is_platform_super_admin fallback', () => {
    expect(seerMigration).toContain('public.get_user_company_ids');
    expect(seerMigration).toContain('public.is_platform_super_admin(_user_id)');
  });

  it('extends get_company_property_ids with is_platform_super_admin fallback', () => {
    expect(seerMigration).toContain('public.get_company_property_ids');
    expect(seerMigration).toContain('public.is_platform_super_admin(_user_id)');
  });

  it('extends is_company_owner and is_approved_pm with is_platform_super_admin check', () => {
    expect(seerMigration).toContain('public.is_company_owner');
    expect(seerMigration).toContain('public.is_approved_pm');
    expect(seerMigration).toContain('public.get_pm_approved_membership');
  });

  it('defines explicit super admin bypass policies on profiles, companies, and members', () => {
    expect(seerMigration).toContain('Super admins view all profiles');
    expect(seerMigration).toContain('Owners can manage their companies');
    expect(seerMigration).toContain('Company owners can manage members');
    expect(seerMigration).toContain('Company owners can manage assignments');
    expect(seerMigration).toContain('Company owners can manage PM invites');
  });

  it('defines direct unconditional permissive RLS policies on all PM entities for super admin', () => {
    expect(unconditionalPmMigration).toContain('Super admins manage all properties');
    expect(unconditionalPmMigration).toContain('Super admins manage all units');
    expect(unconditionalPmMigration).toContain('Super admins manage all tenants');
    expect(unconditionalPmMigration).toContain('Super admins manage all leases');
    expect(unconditionalPmMigration).toContain('Super admins manage all invoices');
    expect(unconditionalPmMigration).toContain('Super admins manage all payments');
    expect(unconditionalPmMigration).toContain('Super admins manage all maintenance requests');
    expect(unconditionalPmMigration).toContain('Super admins manage all recurring bills');
    expect(unconditionalPmMigration).toContain('Super admins manage all bookings');
    expect(unconditionalPmMigration).toContain('Super admins manage all broadcasts');
    expect(unconditionalPmMigration).toContain('Super admins manage all operational alerts');
    expect(unconditionalPmMigration).toContain('Super admins manage all vendors');
  });
});
