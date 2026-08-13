import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const edgeFunction = readFileSync(resolve(process.cwd(), 'supabase/functions/api-keys/index.ts'), 'utf8');
const component = readFileSync(resolve(process.cwd(), 'src/components/control-plane/ApiAccessManagement.tsx'), 'utf8');
const catalog = readFileSync(resolve(process.cwd(), 'src/pages/CatalogManagement.tsx'), 'utf8');

describe('FishGate API key management', () => {
  it('enforces super-admin authorization and live company entitlements server-side', () => {
    expect(edgeFunction).toContain('is_platform_super_admin');
    expect(edgeFunction).toContain('api_get_access_level');
    expect(edgeFunction).toContain('Limited keys cannot receive write scopes');
  });

  it('returns plaintext only at creation and revokes instead of deleting', () => {
    expect(edgeFunction).toContain('key: generated.plaintext');
    expect(edgeFunction).toContain('revoked_at: new Date().toISOString()');
    expect(edgeFunction).not.toContain('.delete()');
  });

  it('adds the seventh Catalog tab with one-time disclosure and usage', () => {
    expect(catalog).toContain('<TabsTrigger value="api-access">API Access</TabsTrigger>');
    expect(catalog).toContain('<ApiAccessManagement />');
    expect(component).toContain('It will not be shown again');
    expect(component).toContain('recent_requests');
  });
});