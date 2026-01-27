import { Building2, MapPin, Home, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PropertyPreviewCardProps {
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  totalUnits: number;
  description?: string;
  imageUrl?: string;
}

const getPropertyTypeBadge = (type: string) => {
  const styles: Record<string, string> = {
    apartment: 'bg-info/10 text-info border-info/20',
    house: 'bg-success/10 text-success border-success/20',
    commercial: 'bg-accent/10 text-accent border-accent/20',
    mixed: 'bg-primary/10 text-primary border-primary/20',
  };
  return styles[type] || 'bg-muted text-muted-foreground';
};

export function PropertyPreviewCard({
  name,
  type,
  address,
  city,
  state,
  zipCode,
  country,
  totalUnits,
  description,
  imageUrl,
}: PropertyPreviewCardProps) {
  const hasData = name || address || city || imageUrl;

  return (
    <Card className="card-shadow-md border-dashed border-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-6 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start filling in the form to see a preview</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center relative overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt={name || 'Property'} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-primary/40" />
              )}
              {type && (
                <Badge className={`absolute top-2 right-2 text-xs ${getPropertyTypeBadge(type)}`}>
                  {type}
                </Badge>
              )}
            </div>

            {/* Details */}
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {name || 'Property Name'}
              </h3>
              {(city || state) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{[city, state].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>

            {address && (
              <p className="text-sm text-muted-foreground">
                {address}
                {zipCode && `, ${zipCode}`}
                {country && `, ${country}`}
              </p>
            )}

            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 italic">
                {description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{totalUnits || 0} units</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">0% occupied</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
