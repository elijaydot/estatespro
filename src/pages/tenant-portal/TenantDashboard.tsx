import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  Wrench, 
  FileText, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Home,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Mock tenant data
const tenantData = {
  name: 'Sarah',
  unit: 'Unit 204',
  property: 'Sunset Apartments',
  nextPayment: {
    amount: 1500,
    dueDate: 'Feb 01, 2025',
    daysUntilDue: 15,
  },
  lease: {
    endDate: 'Mar 14, 2025',
    daysRemaining: 62,
    totalDays: 365,
  },
  balance: 0,
  maintenanceRequests: {
    open: 0,
    completed: 4,
  },
};

// Mock recent activity
const recentActivity = [
  { id: '1', type: 'payment', title: 'Rent payment received', description: 'January 2025 rent - $1,500', date: '2 days ago', icon: DollarSign, color: 'text-success' },
  { id: '2', type: 'maintenance', title: 'Maintenance completed', description: 'HVAC filter replacement', date: '1 week ago', icon: Wrench, color: 'text-info' },
  { id: '3', type: 'message', title: 'Message from property manager', description: 'Regarding upcoming inspection', date: '2 weeks ago', icon: FileText, color: 'text-primary' },
];

// Mock announcements
const announcements = [
  { id: '1', title: 'Building Maintenance', content: 'Elevator maintenance scheduled for Jan 20th, 9 AM - 12 PM.', date: 'Jan 15, 2025', priority: 'normal' },
  { id: '2', title: 'Community Event', content: 'Join us for a resident meet & greet on Jan 25th!', date: 'Jan 10, 2025', priority: 'low' },
];

export default function TenantDashboard() {
  const leaseProgress = ((tenantData.lease.totalDays - tenantData.lease.daysRemaining) / tenantData.lease.totalDays) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {tenantData.name}!</h1>
        <p className="text-muted-foreground flex items-center gap-1 mt-1">
          <Home className="h-4 w-4" />
          {tenantData.unit} • {tenantData.property}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/portal/payments">
          <Card className="card-shadow-md hover:card-shadow-lg transition-all cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-xl bg-success/10 w-fit mx-auto mb-3">
                <CreditCard className="h-6 w-6 text-success" />
              </div>
              <p className="font-medium">Pay Rent</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/portal/maintenance">
          <Card className="card-shadow-md hover:card-shadow-lg transition-all cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-xl bg-warning/10 w-fit mx-auto mb-3">
                <Wrench className="h-6 w-6 text-warning" />
              </div>
              <p className="font-medium">Maintenance</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/portal/lease">
          <Card className="card-shadow-md hover:card-shadow-lg transition-all cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-xl bg-info/10 w-fit mx-auto mb-3">
                <FileText className="h-6 w-6 text-info" />
              </div>
              <p className="font-medium">View Lease</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/portal/messages">
          <Card className="card-shadow-md hover:card-shadow-lg transition-all cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium">Contact</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Status */}
          <Card className="card-shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Upcoming Payment</CardTitle>
              <Link to="/portal/payments">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    ${tenantData.nextPayment.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Due {tenantData.nextPayment.dueDate}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={
                    tenantData.nextPayment.daysUntilDue <= 5
                      ? 'bg-warning/10 text-warning border-warning/20'
                      : 'bg-success/10 text-success border-success/20'
                  }>
                    {tenantData.nextPayment.daysUntilDue} days left
                  </Badge>
                  <Button className="mt-3 gap-2">
                    <CreditCard className="h-4 w-4" />
                    Pay Now
                  </Button>
                </div>
              </div>
              {tenantData.balance > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-sm text-destructive font-medium">
                    Outstanding balance: ${tenantData.balance.toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-secondary`}>
                      <activity.icon className={`h-4 w-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Lease Status */}
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Lease Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Lease Progress</span>
                  <span className="font-medium">{Math.round(leaseProgress)}%</span>
                </div>
                <Progress value={leaseProgress} className="h-2" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span className="font-medium">{tenantData.lease.endDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Days Remaining</span>
                <Badge variant="secondary">{tenantData.lease.daysRemaining} days</Badge>
              </div>
              <Link to="/portal/lease">
                <Button variant="outline" className="w-full mt-2">
                  View Lease Details
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Maintenance Summary */}
          <Card className="card-shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Maintenance</CardTitle>
              <Link to="/portal/maintenance">
                <Button variant="ghost" size="sm" className="gap-1">
                  View <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-warning/10 text-center">
                  <Clock className="h-5 w-5 text-warning mx-auto mb-1" />
                  <p className="text-2xl font-bold">{tenantData.maintenanceRequests.open}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
                <div className="p-4 rounded-lg bg-success/10 text-center">
                  <CheckCircle className="h-5 w-5 text-success mx-auto mb-1" />
                  <p className="text-2xl font-bold">{tenantData.maintenanceRequests.completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                    <p className="font-medium text-sm">{announcement.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">{announcement.date}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
