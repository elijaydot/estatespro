export type ScopedChecklistItem = {
  id: string;
  item_name: string;
  item_category: string;
  is_global: boolean;
  property_id: string | null;
  unit_id: string | null;
  created_at?: string;
};

export type ChecklistScope = 'global' | 'property' | 'unit';

export type MergedChecklistItem = {
  id: string;
  item_name: string;
  item_category: string;
  scope: ChecklistScope;
  property_id: string | null;
  unit_id: string | null;
};

function getScope(item: ScopedChecklistItem): ChecklistScope {
  if (item.unit_id) return 'unit';
  if (item.property_id) return 'property';
  return 'global';
}

function getScopeRank(scope: ChecklistScope): number {
  if (scope === 'unit') return 3;
  if (scope === 'property') return 2;
  return 1;
}

export function mergeScopedChecklistItems(items: ScopedChecklistItem[]): MergedChecklistItem[] {
  const byName = new Map<string, MergedChecklistItem & { scopeRank: number; createdAt: string }>();

  items.forEach((item) => {
    const scope = getScope(item);
    const scopeRank = getScopeRank(scope);
    const createdAt = item.created_at || '';
    const key = item.item_name.trim().toLowerCase();

    const candidate = {
      id: item.id,
      item_name: item.item_name,
      item_category: item.item_category,
      scope,
      property_id: item.property_id,
      unit_id: item.unit_id,
      scopeRank,
      createdAt,
    };

    const current = byName.get(key);
    if (!current) {
      byName.set(key, candidate);
      return;
    }

    if (candidate.scopeRank > current.scopeRank) {
      byName.set(key, candidate);
      return;
    }

    if (candidate.scopeRank === current.scopeRank && candidate.createdAt > current.createdAt) {
      byName.set(key, candidate);
    }
  });

  return Array.from(byName.values())
    .sort((a, b) => {
      if (a.item_category !== b.item_category) return a.item_category.localeCompare(b.item_category);
      return a.item_name.localeCompare(b.item_name);
    })
    .map(({ scopeRank: _, createdAt: __, ...item }) => item);
}
