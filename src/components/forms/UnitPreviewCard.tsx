import { Home, Bed, Bath, Square, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/useSettings';

interface UnitPreviewCardProps {
  unitNumber: string;
  propertyName?: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  rentAmount: number;
  status: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'occupied':
      return <Badge className="bg-info/10 text-info border-info/20">Occupied</Badge>;
    case 'vacant':
      return <Badge className="bg-success/10 text-success border-success/20">Vacant</Badge>;
    case 'maintenance':
      return <Badge className="bg-warning/10 text-warning border-warning/20">Maintenance</Badge>;
    default:
      return null;
  }
};

export function UnitPreviewCard({
  unitNumber,
  propertyName,
  floor,
  bedrooms,
  bathrooms,
  sqft,
  rentAmount,
  status,
}: UnitPreviewCardProps) {
  const { formatCurrency } = useSettings();
  const hasData = unitNumber || propertyName || rentAmount > 0;

  return (
    <Card className="card-shadow-md border-dashed border-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Home className="h-4 w-4" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-6 text-muted-foreground">
            <Home className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start filling in the form to see a preview</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {unitNumber ? `Unit ${unitNumber}` : 'Unit Number'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {propertyName || 'Select a property'}
                  </p>
                </div>
              </div>
              {status && getStatusBadge(status)}
            </div>

            {/* Details */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Bed className="h-4 w-4" />
                <span>{bedrooms || 0} bed</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Bath className="h-4 w-4" />
                <span>{bathrooms || 0} bath</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Square className="h-4 w-4" />
                <span>{sqft || 0} sqft</span>
              </div>
            </div>

            {floor > 0 && (
              <p className="text-sm text-muted-foreground">
                Floor {floor}
              </p>
            )}

            {/* Rent */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(rentAmount || 0)}
                <span className="text-sm text-muted-foreground font-normal">/mo</span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
