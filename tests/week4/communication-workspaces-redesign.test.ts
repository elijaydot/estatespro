import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const messages = readFileSync(resolve('src/pages/MessagesPageV2.tsx'), 'utf8');
const broadcasts = readFileSync(resolve('src/pages/Broadcasts.tsx'), 'utf8');
const broadcastHooks = readFileSync(resolve('src/hooks/useBroadcasts.ts'), 'utf8');
const notifications = readFileSync(resolve('src/pages/Notifications.tsx'), 'utf8');

describe('communication workspace redesign contracts', () => {
  it('renders complete conversation dates and restricts destructive controls to landlords', () => {
    expect(messages).toContain("return format(date, 'MMM d, yyyy')");
    expect(messages).toContain("format(new Date(msg.created_at), 'MMM d, yyyy · h:mm a')");
    expect(messages).toContain('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2');
    expect(messages).toContain('w-full overflow-hidden border-b');
    expect(messages).not.toContain('ChevronRight');
    expect(messages).toContain('isLandlord && msg.isFromMe');
    expect(messages).toContain('Delete sent message');
  });

  it('supports creator-scoped broadcast view, edit, and delete actions', () => {
    expect(broadcasts).toContain('item.created_by === user?.id');
    expect(broadcasts).toContain('openEditor(item)');
    expect(broadcasts).toContain('setViewingBroadcast(item)');
    expect(broadcasts).toContain('setDeletingBroadcast(item)');
    expect(broadcastHooks).toContain('export function useUpdateBroadcast()');
    expect(broadcastHooks).toContain('export function useDeleteBroadcast()');
  });

  it('provides independent filters and pagination for both notification registers', () => {
    expect(notifications).toContain('Search announcements');
    expect(notifications).toContain('Notification status');
    expect(notifications).toContain('Notification type');
    expect(notifications).toContain('page={announcementPage}');
    expect(notifications).toContain('page={notificationPage}');
    expect(notifications).toContain("'MMM d, yyyy · h:mm a'");
  });
});
