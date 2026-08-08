import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, Trash2, Info, AlertCircle, CheckCircle, AlertTriangle, MoreHorizontal, Megaphone, ArrowLeft, Search } from 'lucide-react';
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
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification, useClearAllNotifications, useUnreadNotificationsCount, type Notification } from '@/hooks/useNotifications';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBroadcastAnnouncements } from '@/hooks/useBroadcasts';
import { Input } from '@/components/ui/input';
import { TablePagination } from '@/components/marketplace-crm/TablePagination';

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
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [announcementDateFrom, setAnnouncementDateFrom] = useState('');
  const [announcementDateTo, setAnnouncementDateTo] = useState('');
  const [announcementPage, setAnnouncementPage] = useState(1);
  const [announcementPageSize, setAnnouncementPageSize] = useState(10);
  const [notificationSearch, setNotificationSearch] = useState('');
  const [notificationDateFrom, setNotificationDateFrom] = useState('');
  const [notificationDateTo, setNotificationDateTo] = useState('');
  const [notificationStatus, setNotificationStatus] = useState('all');
  const [notificationType, setNotificationType] = useState('all');
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationPageSize, setNotificationPageSize] = useState(10);
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: announcements = [], isLoading: announcementsLoading } = useBroadcastAnnouncements();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  const matchesDateRange = (value: string, from: string, to: string) => {
    const timestamp = new Date(value).getTime();
    const afterStart = !from || timestamp >= new Date(`${from}T00:00:00`).getTime();
    const beforeEnd = !to || timestamp <= new Date(`${to}T23:59:59.999`).getTime();
    return afterStart && beforeEnd;
  };

  const filteredAnnouncements = useMemo(() => {
    const query = announcementSearch.trim().toLowerCase();
    return announcements.filter((item) => (
      (!query || `${item.title} ${item.message}`.toLowerCase().includes(query))
      && matchesDateRange(item.created_at, announcementDateFrom, announcementDateTo)
    ));
  }, [announcementDateFrom, announcementDateTo, announcementSearch, announcements]);

  const filteredNotifications = useMemo(() => {
    const query = notificationSearch.trim().toLowerCase();
    return notifications.filter((item) => (
      (!query || `${item.title} ${item.message}`.toLowerCase().includes(query))
      && (notificationStatus === 'all' || (notificationStatus === 'unread' ? !item.is_read : item.is_read))
      && (notificationType === 'all' || item.type === notificationType)
      && matchesDateRange(item.created_at, notificationDateFrom, notificationDateTo)
    ));
  }, [notificationDateFrom, notificationDateTo, notificationSearch, notificationStatus, notificationType, notifications]);

  const paginatedAnnouncements = filteredAnnouncements.slice((announcementPage - 1) * announcementPageSize, announcementPage * announcementPageSize);
  const paginatedNotifications = filteredNotifications.slice((notificationPage - 1) * notificationPageSize, notificationPage * notificationPageSize);

  useEffect(() => setAnnouncementPage(1), [announcementSearch, announcementDateFrom, announcementDateTo, announcementPageSize]);
  useEffect(() => setNotificationPage(1), [notificationSearch, notificationDateFrom, notificationDateTo, notificationStatus, notificationType, notificationPageSize]);

  const handleMarkAsRead = async (id: string) => {
    await markAsRead.mutateAsync(id);
  };

  const handleDelete = async (id: string) => {
    await deleteNotification.mutateAsync(id);
  };

  const handleOpenNotification = async (notification: Notification) => {
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
        <div><h1 className="text-2xl font-semibold text-foreground">Notifications</h1><p className="mt-1 text-sm text-muted-foreground">Announcements and operational alerts, organized for quick review.</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border/70 py-3 text-sm"><span><strong className="font-semibold">{announcements.length}</strong> announcements</span><span><strong className="font-semibold">{notifications.length}</strong> notifications</span><span className={unreadCount ? 'text-primary' : 'text-muted-foreground'}><strong className="font-semibold">{unreadCount}</strong> unread</span></div>

      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList className="grid h-10 w-full grid-cols-2 sm:w-[380px]">
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
          <Card>
            <CardHeader className="space-y-3 pb-3"><div><CardTitle className="text-base">Announcement register</CardTitle><p className="mt-1 text-sm text-muted-foreground">Broadcasts available to your current company and audience.</p></div><div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_160px_160px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={announcementSearch} onChange={(event) => setAnnouncementSearch(event.target.value)} placeholder="Search announcements" /></div><Input aria-label="Announcements from date" type="date" value={announcementDateFrom} onChange={(event) => setAnnouncementDateFrom(event.target.value)} /><Input aria-label="Announcements to date" type="date" value={announcementDateTo} onChange={(event) => setAnnouncementDateTo(event.target.value)} /></div></CardHeader>
            <CardContent className="pt-0">
              {announcementsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading announcements...</div>
              ) : filteredAnnouncements.length === 0 ? (
                renderEmpty('No announcements found.', 'Try a different search term or date range.', 'megaphone')
              ) : (
                <div className="overflow-hidden rounded-lg border border-border/70">
                  <div className="divide-y divide-border/60">{paginatedAnnouncements.map((announcement) => (
                    <article key={announcement.id} className="grid gap-2 px-4 py-3 hover:bg-muted/20 md:grid-cols-[minmax(0,1fr)_180px]">
                      <div className="min-w-0"><div className="flex items-center gap-2"><Megaphone className="h-4 w-4 shrink-0 text-primary" /><p className="truncate font-medium text-foreground">{announcement.title}</p><Badge variant="outline" className="text-[10px]">{announcement.target_role === 'all' ? 'All users' : announcement.target_role.replace('_', ' ')}</Badge></div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{announcement.message}</p></div>
                      <div className="text-xs text-muted-foreground md:text-right"><p>{format(new Date(announcement.created_at), 'MMM d, yyyy · h:mm a')}</p><p className="mt-1">{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</p></div>
                    </article>
                  ))}</div>
                  <TablePagination page={announcementPage} pageSize={announcementPageSize} total={filteredAnnouncements.length} onPageChange={setAnnouncementPage} onPageSizeChange={setAnnouncementPageSize} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-0">
          <div className="mb-3 flex flex-wrap gap-2">
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

          <Card>
            <CardHeader className="space-y-3 pb-3">
              <div><CardTitle className="text-base">Notification register</CardTitle><p className="mt-1 text-sm text-muted-foreground">Filter alerts by status, type, or delivery date.</p></div>
              <div className="grid gap-2 md:grid-cols-[minmax(200px,1fr)_130px_130px_150px_150px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={notificationSearch} onChange={(event) => setNotificationSearch(event.target.value)} placeholder="Search notifications" /></div><select aria-label="Notification status" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={notificationStatus} onChange={(event) => setNotificationStatus(event.target.value)}><option value="all">All status</option><option value="unread">Unread</option><option value="read">Read</option></select><select aria-label="Notification type" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={notificationType} onChange={(event) => setNotificationType(event.target.value)}><option value="all">All types</option><option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Error</option></select><Input aria-label="Notifications from date" type="date" value={notificationDateFrom} onChange={(event) => setNotificationDateFrom(event.target.value)} /><Input aria-label="Notifications to date" type="date" value={notificationDateTo} onChange={(event) => setNotificationDateTo(event.target.value)} /></div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading notifications...</div>
              ) : filteredNotifications.length === 0 ? (
                renderEmpty('No notifications found.', 'Adjust the filters to broaden this view.', 'bell')
              ) : (
                <div className="overflow-hidden rounded-lg border border-border/70"><div className="divide-y divide-border/60">
                  {paginatedNotifications.map((notification) => {
                    const IconComponent = typeIcons[notification.type as keyof typeof typeIcons] || Info;
                    const colorClass = typeColors[notification.type as keyof typeof typeColors] || typeColors.info;

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'flex items-start gap-3 p-4 transition-colors',
                          notification.is_read ? 'bg-card' : 'bg-primary/[0.04]'
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
                          <div className="mt-2 flex flex-wrap gap-x-2 text-xs text-muted-foreground"><span>{format(new Date(notification.created_at), 'MMM d, yyyy · h:mm a')}</span><span>·</span><span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span></div>
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
                </div><TablePagination page={notificationPage} pageSize={notificationPageSize} total={filteredNotifications.length} onPageChange={setNotificationPage} onPageSizeChange={setNotificationPageSize} /></div>
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
