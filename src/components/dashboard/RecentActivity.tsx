import { CreditCard, Wrench, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecentActivity } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const getIcon = (type: string) => {
  switch (type) {
    case 'payment': return CreditCard;
    case 'maintenance': return Wrench;
    default: return FileText;
  }
};

const getIconColor = (type: string) => {
  switch (type) {
    case 'payment': return 'bg-success/10 text-success';
    case 'maintenance': return 'bg-warning/10 text-warning';
    default: return 'bg-info/10 text-info';
  }
};

export function RecentActivity() {
  const { data: activities = [], isLoading } = useRecentActivity();

  if (isLoading) {
    return <Skeleton className="h-[380px] rounded-xl" />;
  }

  return (
    <div className="bg-card rounded-xl border border-border/60 p-5 animate-fade-in flex flex-col h-[380px]">
      <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
      <ScrollArea className="flex-1 -mr-3 pr-3">
        <div className="space-y-1">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No recent activity</p>
          ) : (
            activities.map((activity) => {
              const Icon = getIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className={cn('shrink-0 p-2 rounded-lg', getIconColor(activity.type))}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
