import { 
  CreditCard, 
  Wrench, 
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecentActivity } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

const getIcon = (type: string) => {
  switch (type) {
    case 'payment':
      return CreditCard;
    case 'maintenance':
      return Wrench;
    case 'invoice':
      return FileText;
    default:
      return FileText;
  }
};

const getStatusInfo = (type: string, title: string) => {
  if (title.toLowerCase().includes('completed') || title.toLowerCase().includes('received')) {
    return <CheckCircle className="h-4 w-4 text-success" />;
  }
  if (title.toLowerCase().includes('overdue')) {
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  }
  if (type === 'maintenance') {
    return <AlertCircle className="h-4 w-4 text-warning" />;
  }
  return null;
};

export function RecentActivity() {
  const { data: activities = [], isLoading } = useRecentActivity();

  if (isLoading) {
    return <Skeleton className="h-[350px] rounded-xl" />;
  }

  return (
    <div className="bg-card rounded-xl p-6 card-shadow-md animate-fade-in">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
        ) : (
          activities.map((activity, index) => {
            const Icon = getIcon(activity.type);
            return (
              <div
                key={activity.id}
                className={cn(
                  'flex items-start gap-4 pb-4',
                  index !== activities.length - 1 && 'border-b border-border'
                )}
              >
                <div className="p-2 rounded-lg bg-secondary">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.title}
                    </p>
                    {getStatusInfo(activity.type, activity.title)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
