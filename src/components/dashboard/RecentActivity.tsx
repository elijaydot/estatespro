import { 
  CreditCard, 
  UserPlus, 
  Wrench, 
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'payment' | 'tenant' | 'maintenance' | 'lease';
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'warning' | 'error';
}

const activities: Activity[] = [
  {
    id: '1',
    type: 'payment',
    title: 'Rent Payment Received',
    description: 'Sarah Johnson paid $1,500 for Unit 204',
    time: '2 hours ago',
    status: 'success',
  },
  {
    id: '2',
    type: 'tenant',
    title: 'New Tenant Application',
    description: 'Michael Brown applied for Unit 108',
    time: '4 hours ago',
  },
  {
    id: '3',
    type: 'maintenance',
    title: 'Maintenance Request',
    description: 'AC repair needed in Unit 305',
    time: '5 hours ago',
    status: 'warning',
  },
  {
    id: '4',
    type: 'lease',
    title: 'Lease Signed',
    description: 'Emma Wilson signed lease for Unit 412',
    time: '1 day ago',
    status: 'success',
  },
  {
    id: '5',
    type: 'payment',
    title: 'Payment Overdue',
    description: 'Unit 501 rent overdue by 5 days',
    time: '2 days ago',
    status: 'error',
  },
];

const getIcon = (type: Activity['type']) => {
  switch (type) {
    case 'payment':
      return CreditCard;
    case 'tenant':
      return UserPlus;
    case 'maintenance':
      return Wrench;
    case 'lease':
      return FileText;
  }
};

const getStatusIcon = (status?: Activity['status']) => {
  if (!status) return null;
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-warning" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
  }
};

export function RecentActivity() {
  return (
    <div className="bg-card rounded-xl p-6 card-shadow-md animate-fade-in">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => {
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
                  {getStatusIcon(activity.status)}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
