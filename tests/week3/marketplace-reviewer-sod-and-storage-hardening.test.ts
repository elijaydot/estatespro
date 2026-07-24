import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const storagePolicyHardeningPath = resolve(
  process.cwd(),
  'supabase/migrations/20260724124500_storage_policy_company_path_guard.sql',
);

const reviewerAndModerationHardeningPath = resolve(
  process.cwd(),
  'supabase/migrations/20260724125500_marketplace_reviewer_role_and_moderation_sod.sql',
);

describe('marketplace reviewer + storage hardening migrations', () => {
  it('enforces company-id first folder segment in storage policies', () => {
    const sql = readFileSync(storagePolicyHardeningPath, 'utf8');

    expect(sql).toContain("storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'");
    expect(sql).toContain("bucket_id = 'verification-documents'");
    expect(sql).toContain("bucket_id = 'crm-documents'");
  });

  it('adds delegated marketplace_reviewer and moderation SoD enforcement', () => {
    const sql = readFileSync(reviewerAndModerationHardeningPath, 'utf8');

    expect(sql).toContain("'marketplace_reviewer'");
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.is_internal_marketplace_reviewer');
    expect(sql).toContain("SUBMITTER_CANNOT_DECIDE_OWN_CASE");
    expect(sql).toContain("RESOLUTION_REASON_REQUIRED");
    expect(sql).toContain('CREATE POLICY "Internal reviewers can decide moderation cases"');
  });
});
