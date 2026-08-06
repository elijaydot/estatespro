import { useState } from 'react';
import { ChevronDown, CreditCard, FileText, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecentActivity } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-16 rounded-xl" />;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-xl border border-border/60 bg-card animate-fade-in">
      <div className="flex min-h-16 items-center justify-between gap-3 px-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          <Badge variant="secondary">{activities.length}</Badge>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={isOpen ? 'Collapse recent activity' : 'Expand recent activity'}>
            <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="border-t border-border/60 px-5 pb-5">
        <ScrollArea className="mt-3 h-72 pr-3">
          <div className="space-y-1">
            {activities.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No recent activity</p>
            ) : activities.map((activity) => {
              const Icon = getIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/50">
                  <div className={cn('shrink-0 rounded-lg p-2', getIconColor(activity.type))}><Icon className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{activity.title}</p><p className="truncate text-xs text-muted-foreground">{activity.description}</p></div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}
