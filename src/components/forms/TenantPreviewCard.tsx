import { User, Mail, Phone, Home, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/useSettings';
import { format } from 'date-fns';

interface TenantPreviewCardProps {
  name: string;
  email: string;
  phone: string;
  propertyName?: string;
  unitNumber?: string;
  monthlyRent: number;
  securityDeposit: number;
  moveInDate?: string;
  leaseEndDate?: string;
}

const getInitials = (name: string) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function TenantPreviewCard({
  name,
  email,
  phone,
  propertyName,
  unitNumber,
  monthlyRent,
  securityDeposit,
  moveInDate,
  leaseEndDate,
}: TenantPreviewCardProps) {
  const { formatCurrency } = useSettings();
  const hasData = name || email || phone;

  return (
    <Card className="card-shadow-md border-dashed border-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <User className="h-4 w-4" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-6 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start filling in the form to see a preview</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with Avatar */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-foreground">{name || 'Tenant Name'}</h3>
                <Badge className="bg-success/10 text-success border-success/20 text-xs">
                  New Tenant
                </Badge>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              {email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {email}
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {phone}
                </div>
              )}
            </div>

            {/* Property/Unit */}
            {(propertyName || unitNumber) && (
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{unitNumber ? `Unit ${unitNumber}` : 'No unit'}</p>
                  <p className="text-xs text-muted-foreground">{propertyName || 'No property'}</p>
                </div>
              </div>
            )}

            {/* Dates */}
            {(moveInDate || leaseEndDate) && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {moveInDate && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Move-in: {format(new Date(moveInDate), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Financial */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monthly Rent</span>
                <span className="font-semibold">{formatCurrency(monthlyRent || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Security Deposit</span>
                <span className="font-semibold">{formatCurrency(securityDeposit || 0)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
