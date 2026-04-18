import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Check, Info, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useUnreadNotificationsCount, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';

const iconByType = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertCircle,
};

export default function TenantNotifications() {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleOpen = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead.mutateAsync(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const Icon = iconByType[(notification.type as keyof typeof iconByType) || 'info'];

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleOpen(notification)}
                    className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-primary/10 p-2 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{notification.title}</p>
                          {!notification.is_read && (
                            <Badge variant="secondary" className="text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
