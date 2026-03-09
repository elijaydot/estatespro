import { Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUpcomingRenewals } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function UpcomingRenewals() {
  const { data: renewals = [], isLoading } = useUpcomingRenewals();
  const navigate = useNavigate();

  if (isLoading) {
    return <Skeleton className="h-[380px] rounded-xl" />;
  }

  return (
    <div className="bg-card rounded-xl border border-border/60 p-5 animate-fade-in flex flex-col h-[380px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Upcoming Renewals</h3>
        <Button variant="ghost" size="sm" className="text-primary gap-1 h-7 text-xs" onClick={() => navigate('/leases')}>
          View All <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1 -mr-3 pr-3">
        <div className="space-y-2">
          {renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No upcoming renewals</p>
          ) : (
            renewals.map((renewal) => (
              <div key={renewal.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 hover:bg-secondary/70 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 p-2 rounded-lg bg-card border border-border/60">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{renewal.tenantName}</p>
                    <p className="text-xs text-muted-foreground truncate">{renewal.unitNumber} · {renewal.propertyName}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right ml-3">
                  <p className="text-xs text-muted-foreground">{renewal.leaseEnd ? format(new Date(renewal.leaseEnd), 'MMM d') : '—'}</p>
                  <Badge variant="secondary" className={
                    renewal.daysRemaining <= 14
                      ? 'bg-destructive/10 text-destructive border-destructive/20 text-[10px]'
                      : 'bg-warning/10 text-warning border-warning/20 text-[10px]'
                  }>
                    {renewal.daysRemaining}d left
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
