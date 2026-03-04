import { Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUpcomingRenewals } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function UpcomingRenewals() {
  const { data: renewals = [], isLoading } = useUpcomingRenewals();
  const navigate = useNavigate();

  if (isLoading) {
    return <Skeleton className="h-[250px] rounded-xl" />;
  }

  return (
    <div className="bg-card rounded-xl p-6 card-shadow-md animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Upcoming Renewals</h3>
        <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => navigate('/leases')}>
          View All <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-4">
        {renewals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No upcoming renewals</p>
        ) : (
          renewals.map((renewal) => (
            <div
              key={renewal.id}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-card">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{renewal.tenantName}</p>
                  <p className="text-sm text-muted-foreground">
                    {renewal.unitNumber} • {renewal.propertyName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {renewal.leaseEnd ? format(new Date(renewal.leaseEnd), 'MMM d, yyyy') : 'N/A'}
                </p>
                <Badge
                  variant="secondary"
                  className={
                    renewal.daysRemaining <= 14
                      ? 'bg-warning/10 text-warning border-warning/20'
                      : 'bg-info/10 text-info border-info/20'
                  }
                >
                  {renewal.daysRemaining} days left
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
