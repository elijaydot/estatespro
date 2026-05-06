import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  CheckCheck,
  Check,
  Info,
  AlertCircle,
  AlertTriangle,
  Megaphone,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useClearAllNotifications,
} from '@/hooks/useNotifications';
import { useBroadcastAnnouncements } from '@/hooks/useBroadcasts';

const iconByType = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertCircle,
};

export default function TenantNotifications() {
  const navigate = useNavigate();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: announcements = [], isLoading: announcementsLoading } = useBroadcastAnnouncements();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  const handleOpen = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead.mutateAsync(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNotification.mutateAsync(id);
  };

  const handleClearAll = async () => {
    await clearAll.mutateAsync();
    setClearDialogOpen(false);
  };

  const renderEmpty = (title: string, subtitle: string, icon: 'bell' | 'megaphone') => (
    <div className="text-center py-16 flex flex-col items-center gap-4">
      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
        {icon === 'bell' ? <Bell className="h-10 w-10 text-muted-foreground" /> : <Megaphone className="h-10 w-10 text-muted-foreground" />}
      </div>
      <div>
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-1">Announcements and account updates in one place.</p>
      </div>

      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList className="w-full grid grid-cols-2 h-11 rounded-lg">
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold inline-flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="mt-0">
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcementsLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading announcements...</p>
              ) : announcements.length === 0 ? (
                renderEmpty('No announcements yet.', 'Broadcast updates from your management team will appear here.', 'megaphone')
              ) : (
                <div className="space-y-2">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="rounded-lg border border-border p-4 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground truncate">{announcement.title}</p>
                        <Badge variant="outline" className="text-xs">Announcement</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{announcement.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-0 space-y-3">
          <div className="flex flex-wrap gap-2">
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
            {notifications.length > 0 && (
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setClearDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Clear All
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
                renderEmpty('No notifications yet.', 'You will see lease, payment, and maintenance updates here.', 'bell')
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => {
                    const Icon = iconByType[(notification.type as keyof typeof iconByType) || 'info'];

                    return (
                      <div key={notification.id} className="w-full rounded-lg border border-border p-4 text-left">
                        <div className="flex items-start gap-3">
                          <div className="rounded-md bg-primary/10 p-2 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpen(notification)}
                            className="flex-1 min-w-0 text-left"
                          >
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
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!notification.is_read && (
                                <DropdownMenuItem onClick={() => markAsRead.mutate(notification.id)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark as read
                                </DropdownMenuItem>
                              )}
                              {notification.link && (
                                <DropdownMenuItem onClick={() => handleOpen(notification)}>
                                  View details
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(notification.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Notifications</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all notifications? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
