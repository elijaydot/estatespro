import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260724153000_marketplace_public_geo_columns_and_function_expansion.sql',
);

describe('marketplace public geo expansion migration', () => {
  it('adds optional coordinates and exposes them in public listing/detail helpers', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS latitude');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS longitude');
    expect(sql).toContain('marketplace_listings_latitude_check');
    expect(sql).toContain('marketplace_listings_longitude_check');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.get_public_marketplace_listings');
    expect(sql).toContain('DROP FUNCTION IF EXISTS public.get_public_marketplace_listings(text, text, numeric, numeric, int, int, int);');
    expect(sql).toContain('DROP FUNCTION IF EXISTS public.get_public_marketplace_listing_detail(text);');
    expect(sql).toContain('RETURNS TABLE(');
    expect(sql).toContain('latitude numeric');
    expect(sql).toContain('longitude numeric');
    expect(sql).toContain('ml.latitude');
    expect(sql).toContain('ml.longitude');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.get_public_marketplace_listing_detail');
  });
});
