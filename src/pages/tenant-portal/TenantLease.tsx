import { 
  FileText, 
  Download,
  Calendar,
  DollarSign,
  Home,
  User,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

// Mock lease data
const leaseData = {
  status: 'active',
  startDate: 'Mar 15, 2024',
  endDate: 'Mar 14, 2025',
  signedDate: 'Mar 10, 2024',
  monthlyRent: 1500,
  securityDeposit: 3000,
  daysRemaining: 62,
  totalDays: 365,
  unit: {
    number: '204',
    property: 'Sunset Apartments',
    address: '123 Sunset Boulevard, Los Angeles, CA 90028',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1200,
  },
  landlord: {
    name: 'PropManage LLC',
    email: 'management@propmanage.com',
    phone: '+1 (555) 000-0000',
  },
  terms: [
    { label: 'Lease Type', value: '12-Month Fixed' },
    { label: 'Payment Due', value: '1st of each month' },
    { label: 'Late Fee', value: '$50 after 5 days' },
    { label: 'Pet Policy', value: 'Allowed with deposit' },
    { label: 'Utilities Included', value: 'Water, Trash' },
    { label: 'Parking', value: '1 assigned spot' },
  ],
  documents: [
    { id: '1', name: 'Lease Agreement', date: 'Mar 10, 2024', type: 'PDF' },
    { id: '2', name: 'Move-in Inspection', date: 'Mar 15, 2024', type: 'PDF' },
    { id: '3', name: 'Pet Addendum', date: 'Mar 10, 2024', type: 'PDF' },
  ],
};

export default function TenantLease() {
  const leaseProgress = ((leaseData.totalDays - leaseData.daysRemaining) / leaseData.totalDays) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lease Details</h1>
          <p className="text-muted-foreground">View your lease agreement and documents</p>
        </div>
        <Badge className="bg-success/10 text-success border-success/20 gap-1 text-sm px-3 py-1">
          <CheckCircle className="h-4 w-4" /> Active Lease
        </Badge>
      </div>

      {/* Lease Status Card */}
      <Card className="card-shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="text-xl font-semibold flex items-center gap-2 mt-1">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {leaseData.startDate}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Date</p>
              <p className="text-xl font-semibold flex items-center gap-2 mt-1">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {leaseData.endDate}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="text-xl font-semibold flex items-center gap-2 mt-1">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                ${leaseData.monthlyRent.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time Remaining</p>
              <p className="text-xl font-semibold flex items-center gap-2 mt-1">
                <Clock className="h-5 w-5 text-muted-foreground" />
                {leaseData.daysRemaining} days
              </p>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Lease Progress</span>
              <span className="font-medium">{Math.round(leaseProgress)}% complete</span>
            </div>
            <Progress value={leaseProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unit Details */}
        <Card className="card-shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5" /> Unit Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Unit</p>
              <p className="font-semibold">{leaseData.unit.number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Property</p>
              <p className="font-semibold">{leaseData.unit.property}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium text-sm">{leaseData.unit.address}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-semibold">{leaseData.unit.bedrooms}</p>
                <p className="text-xs text-muted-foreground">Bedrooms</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{leaseData.unit.bathrooms}</p>
                <p className="text-xs text-muted-foreground">Bathrooms</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{leaseData.unit.sqft}</p>
                <p className="text-xs text-muted-foreground">Sq. Ft.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lease Terms */}
        <Card className="card-shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" /> Lease Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaseData.terms.map((term, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{term.label}</span>
                  <span className="text-sm font-medium">{term.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Property Management */}
        <Card className="card-shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" /> Property Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-semibold">{leaseData.landlord.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <a href={`mailto:${leaseData.landlord.email}`} className="font-medium text-primary hover:underline">
                {leaseData.landlord.email}
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <a href={`tel:${leaseData.landlord.phone}`} className="font-medium text-primary hover:underline">
                {leaseData.landlord.phone}
              </a>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Security Deposit</p>
              <p className="text-xl font-semibold">${leaseData.securityDeposit.toLocaleString()}</p>
              <Badge variant="secondary" className="mt-1">On file</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Lease Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaseData.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">Added {doc.date}</p>
                  </div>
                </div>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Renewal Notice */}
      <Card className="card-shadow-md border-info/20 bg-info/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-info/10">
              <Calendar className="h-5 w-5 text-info" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Lease Renewal</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your lease will expire on {leaseData.endDate}. Contact property management 60 days before expiration
                to discuss renewal options.
              </p>
            </div>
            <Button variant="outline">Contact Management</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
