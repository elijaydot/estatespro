import { describe, expect, it } from 'vitest';
import { mergeScopedChecklistItems, type ScopedChecklistItem } from '../../src/lib/inspectionChecklist';

const base: ScopedChecklistItem[] = [
  {
    id: 'g1',
    item_name: 'Walls - condition & paint',
    item_category: 'structure',
    is_global: true,
    property_id: null,
    unit_id: null,
    created_at: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'p1',
    item_name: 'Walls - condition & paint',
    item_category: 'structure',
    is_global: false,
    property_id: 'prop-1',
    unit_id: null,
    created_at: '2026-07-02T00:00:00.000Z',
  },
  {
    id: 'u1',
    item_name: 'Walls - condition & paint',
    item_category: 'structure',
    is_global: false,
    property_id: 'prop-1',
    unit_id: 'unit-1',
    created_at: '2026-07-03T00:00:00.000Z',
  },
  {
    id: 'g2',
    item_name: 'Toilet & flush system',
    item_category: 'plumbing',
    is_global: true,
    property_id: null,
    unit_id: null,
    created_at: '2026-07-01T00:00:00.000Z',
  },
];

describe('inspection checklist merge', () => {
  it('prefers unit over property over global for the same item name', () => {
    const merged = mergeScopedChecklistItems(base);
    const walls = merged.find((row) => row.item_name === 'Walls - condition & paint');

    expect(walls?.id).toBe('u1');
    expect(walls?.scope).toBe('unit');
  });

  it('keeps unrelated global items', () => {
    const merged = mergeScopedChecklistItems(base);
    const toilet = merged.find((row) => row.item_name === 'Toilet & flush system');

    expect(toilet?.id).toBe('g2');
    expect(toilet?.scope).toBe('global');
  });

  it('returns a deterministic category/name sort order', () => {
    const merged = mergeScopedChecklistItems(base);

    expect(merged.map((item) => item.item_name)).toEqual([
      'Toilet & flush system',
      'Walls - condition & paint',
    ]);
  });
});
