import type { CrmContact, CrmProject } from '@/hooks/useMarketplaceCrm';

export interface ContactDuplicateGroup {
  key: string;
  contacts: CrmContact[];
}

function normalizeEmail(email: string | null) {
  return (email || '').trim().toLowerCase();
}

function normalizePhone(phone: string) {
  return phone.replace(/\s|\(|\)|-/g, '');
}

export function findDuplicateContactGroups(contacts: CrmContact[]): ContactDuplicateGroup[] {
  const buckets = new Map<string, CrmContact[]>();

  for (const contact of contacts) {
    const email = normalizeEmail(contact.email);
    const phone = normalizePhone(contact.phone_e164);
    const key = email ? `email:${email}` : phone ? `phone:${phone}` : '';
    if (!key) continue;

    const current = buckets.get(key) || [];
    current.push(contact);
    buckets.set(key, current);
  }

  return Array.from(buckets.entries())
    .filter(([, grouped]) => grouped.length > 1)
    .map(([key, grouped]) => ({
      key,
      contacts: [...grouped].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }));
}

export function buildProjectSlaSummary(projects: CrmProject[], nowMs = Date.now()) {
  const oneDay = 24 * 60 * 60 * 1000;

  return projects.reduce(
    (acc, project) => {
      if (!project.due_date || project.status === 'completed' || project.status === 'canceled') return acc;

      const dueMs = new Date(project.due_date).getTime();
      if (Number.isNaN(dueMs)) return acc;

      if (dueMs < nowMs) {
        acc.overdue += 1;
      } else if (dueMs - nowMs <= (7 * oneDay)) {
        acc.dueSoon += 1;
      }

      return acc;
    },
    { overdue: 0, dueSoon: 0 },
  );
}
