import { useMemo, useState } from 'react';
import { Link2, Copy, Check, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useProperties, type Property } from '@/hooks/useProperties';
import { toast } from '@/components/ui/use-toast';

export default function GuestBookingPortal() {
  const { data: properties = [], isLoading } = useProperties();
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [copied, setCopied] = useState(false);

  const shortLetProperties = useMemo(
    () => properties.filter((property: Property) => property.type === 'short_let'),
    [properties]
  );

  const selectedProperty = shortLetProperties.find((property: Property) => property.id === selectedPropertyId);

  const bookingLink = selectedPropertyId
    ? `${window.location.origin}/book/${selectedPropertyId}`
    : '';

  const handleCopyLink = async () => {
    if (!bookingLink) return;

    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      toast({
        title: 'Link copied',
        description: 'Guest booking link copied to clipboard and ready to share.',
      });

      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy automatically. Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Guest Booking Portal</h1>
        <p className="text-muted-foreground mt-1">
          Generate and share public booking links for short-let and Airbnb-ready properties.
        </p>
      </div>

      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share Guest Booking Link
          </CardTitle>
          <CardDescription>
            Select a short-let property to generate a public booking page link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Property</p>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Loading properties...' : 'Select a short-let property'} />
              </SelectTrigger>
              <SelectContent>
                {shortLetProperties.map((property: Property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProperty && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-medium">{selectedProperty.name}</p>
                <Badge variant="secondary">Short Let</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {[selectedProperty.address, selectedProperty.city, selectedProperty.state]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-background p-3 break-all text-sm">
            {bookingLink || 'Select a property to generate the public guest booking link.'}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCopyLink} disabled={!bookingLink} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
            {bookingLink ? (
              <Button asChild variant="outline">
                <a href={bookingLink} target="_blank" rel="noreferrer" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open Portal
                </a>
              </Button>
            ) : (
              <Button variant="outline" disabled className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Portal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
