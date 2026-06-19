import { describe, expect, it } from 'vitest';

import {
  REQUIRED_POLICY_DOC,
  REQUIRED_DOC,
  requiresInventoryUpdate,
} from '../../scripts/contract-inventory-check-core.js';

describe('Week 2 - contract inventory CI guard', () => {
  it('fails when contract-sensitive files change without inventory update', () => {
    const result = requiresInventoryUpdate([
      'supabase/functions/payment-checkout/index.ts',
      'src/pages/Dashboard.tsx',
    ]);

    expect(result.touchedContract).toBe(true);
    expect(result.touchedInventory).toBe(false);
    expect(result.shouldFail).toBe(true);
  });

  it('passes when both contract-sensitive files and inventory are updated', () => {
    const result = requiresInventoryUpdate([
      'supabase/functions/invite-token/index.ts',
      REQUIRED_DOC,
    ]);

    expect(result.touchedContract).toBe(true);
    expect(result.touchedInventory).toBe(true);
    expect(result.shouldFail).toBe(false);
  });

  it('passes when no contract-sensitive files are touched', () => {
    const result = requiresInventoryUpdate([
      'src/pages/Reports.tsx',
      'docs/parity/WAVE_EXECUTION_BOARD.md',
    ]);

    expect(result.touchedContract).toBe(false);
    expect(result.shouldFail).toBe(false);
  });

  it('fails webhook-capable changes without policy update', () => {
    const result = requiresInventoryUpdate([
      'supabase/functions/send-broadcast/index.ts',
      'src/pages/Reports.tsx',
    ]);

    expect(result.touchedWebhookCapable).toBe(true);
    expect(result.touchedPolicy).toBe(false);
    expect(result.shouldFailPolicy).toBe(true);
  });

  it('passes webhook-capable changes when policy doc is updated', () => {
    const result = requiresInventoryUpdate([
      'supabase/functions/send-broadcast/index.ts',
      REQUIRED_POLICY_DOC,
    ]);

    expect(result.touchedWebhookCapable).toBe(true);
    expect(result.touchedPolicy).toBe(true);
    expect(result.shouldFailPolicy).toBe(false);
  });
});
