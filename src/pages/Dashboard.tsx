import { 
  Building2, 
  Home, 
  Users, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  Wrench,
  Calendar,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { OccupancyChart } from '@/components/dashboard/OccupancyChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { UpcomingRenewals } from '@/components/dashboard/UpcomingRenewals';

const stats = [
  {
    title: 'Total Properties',
    value: '24',
    change: '+2 this month',
    changeType: 'positive' as const,
    icon: Building2,
    iconBg: 'bg-primary/10',
  },
  {
    title: 'Total Units',
    value: '156',
    change: '85% occupied',
    changeType: 'neutral' as const,
    icon: Home,
    iconBg: 'bg-info/10',
  },
  {
    title: 'Active Tenants',
    value: '132',
    change: '+8 this month',
    changeType: 'positive' as const,
    icon: Users,
    iconBg: 'bg-success/10',
  },
  {
    title: 'Monthly Revenue',
    value: '$85,400',
    change: '+12.5% from last month',
    changeType: 'positive' as const,
    icon: DollarSign,
    iconBg: 'bg-accent/10',
  },
  {
    title: 'Pending Payments',
    value: '$12,350',
    change: '8 invoices pending',
    changeType: 'neutral' as const,
    icon: TrendingUp,
    iconBg: 'bg-warning/10',
  },
  {
    title: 'Overdue Payments',
    value: '$4,200',
    change: '3 overdue invoices',
    changeType: 'negative' as const,
    icon: AlertCircle,
    iconBg: 'bg-destructive/10',
  },
  {
    title: 'Maintenance Requests',
    value: '12',
    change: '5 in progress',
    changeType: 'neutral' as const,
    icon: Wrench,
    iconBg: 'bg-muted',
  },
  {
    title: 'Upcoming Renewals',
    value: '7',
    change: 'Next 30 days',
    changeType: 'neutral' as const,
    icon: Calendar,
    iconBg: 'bg-secondary',
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your properties today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={stat.title}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <OccupancyChart />
        </div>
      </div>

      {/* Activity & Renewals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <UpcomingRenewals />
      </div>
    </div>
  );
}
