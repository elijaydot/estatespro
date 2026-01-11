import { Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Renewal {
  id: string;
  tenant: string;
  unit: string;
  property: string;
  expiryDate: string;
  daysLeft: number;
}

const renewals: Renewal[] = [
  {
    id: '1',
    tenant: 'Sarah Johnson',
    unit: 'Unit 204',
    property: 'Sunset Apartments',
    expiryDate: 'Jan 25, 2026',
    daysLeft: 14,
  },
  {
    id: '2',
    tenant: 'Michael Brown',
    unit: 'Unit 108',
    property: 'Oak Ridge Complex',
    expiryDate: 'Feb 01, 2026',
    daysLeft: 21,
  },
  {
    id: '3',
    tenant: 'Emma Wilson',
    unit: 'Unit 412',
    property: 'Riverside Heights',
    expiryDate: 'Feb 15, 2026',
    daysLeft: 35,
  },
];

export function UpcomingRenewals() {
  return (
    <div className="bg-card rounded-xl p-6 card-shadow-md animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Upcoming Renewals</h3>
        <Button variant="ghost" size="sm" className="text-primary gap-1">
          View All <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-4">
        {renewals.map((renewal) => (
          <div
            key={renewal.id}
            className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-card">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{renewal.tenant}</p>
                <p className="text-sm text-muted-foreground">
                  {renewal.unit} • {renewal.property}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{renewal.expiryDate}</p>
              <Badge
                variant="secondary"
                className={
                  renewal.daysLeft <= 14
                    ? 'bg-warning/10 text-warning border-warning/20'
                    : 'bg-info/10 text-info border-info/20'
                }
              >
                {renewal.daysLeft} days left
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
