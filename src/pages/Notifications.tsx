import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, Trash2, Info, AlertCircle, CheckCircle, AlertTriangle, MoreHorizontal, Megaphone, ArrowLeft } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification, useClearAllNotifications, useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBroadcastAnnouncements } from '@/hooks/useBroadcasts';

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const typeColors = {
  info: 'text-info bg-info/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  error: 'text-destructive bg-destructive/10',
};

export default function Notifications() {
  const navigate = useNavigate();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: announcements = [], isLoading: announcementsLoading } = useBroadcastAnnouncements();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  const handleMarkAsRead = async (id: string) => {
    await markAsRead.mutateAsync(id);
  };

  const handleDelete = async (id: string) => {
    await deleteNotification.mutateAsync(id);
  };

  const handleOpenNotification = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead.mutateAsync(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
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
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Notifications</h1>
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
            <CardContent className="pt-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading announcements...</div>
              ) : announcementsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading announcements...</div>
              ) : announcements.length === 0 ? (
                renderEmpty('There are no entries on your list.', 'Announcements from FishGate will appear here.', 'megaphone')
              ) : (
                <div className="space-y-2 py-2">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="p-4 rounded-lg border bg-card space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{announcement.title}</p>
                        <Badge variant="outline" className="text-xs">Announcement</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{announcement.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-0">
          <div className="flex flex-wrap gap-2 mb-3">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending} className="gap-2">
                <CheckCheck className="h-4 w-4" />
                Mark All Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" onClick={() => setClearDialogOpen(true)} className="gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>

          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-base">All Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                renderEmpty('There are no entries on your list.', 'We will notify you when something important happens.', 'bell')
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => {
                    const IconComponent = typeIcons[notification.type as keyof typeof typeIcons] || Info;
                    const colorClass = typeColors[notification.type as keyof typeof typeColors] || typeColors.info;

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'flex items-start gap-4 p-4 rounded-lg border transition-colors',
                          notification.is_read ? 'bg-card' : 'bg-muted/30 border-primary/20'
                        )}
                      >
                        <div className={cn('p-2 rounded-lg shrink-0', colorClass)}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={cn('font-medium', !notification.is_read && 'text-foreground')}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                            </div>
                            {!notification.is_read && (
                              <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!notification.is_read && (
                              <DropdownMenuItem onClick={() => handleMarkAsRead(notification.id)}>
                                <Check className="h-4 w-4 mr-2" />
                                Mark as read
                              </DropdownMenuItem>
                            )}
                            {notification.link && (
                              <DropdownMenuItem onClick={() => handleOpenNotification(notification)}>
                                View details
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(notification.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clear All Dialog */}
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
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
