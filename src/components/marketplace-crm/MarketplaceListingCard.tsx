import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Bath, BedDouble, Eye, ImageOff, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { StatusPill, type StatusPillProps } from '@/components/shared/StatusPill';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import type { ManagedMarketplaceListing } from '@/hooks/useMarketplace';
import { listingStatusVariant } from '@/lib/marketplaceListingStatus';

function verificationVariant(state: string): StatusPillProps['variant'] {
  if (state === 'pending') return 'info';
  if (state === 'rejected') return 'destructive';
  return 'neutral';
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function formatCurrency(amount: number, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toLocaleString()}`;
  }
}

type MarketplaceListingCardProps = {
  listing: ManagedMarketplaceListing;
  canPublish: boolean;
  isPublishing: boolean;
  isHandlingRemoval: boolean;
  onTogglePublish: (listingId: string, publish: boolean) => void;
  onHandleRemoval: (listingId: string, action: 'confirm' | 'keep_live') => void;
};

export function MarketplaceListingCard({
  listing,
  canPublish,
  isPublishing,
  isHandlingRemoval,
  onTogglePublish,
  onHandleRemoval,
}: MarketplaceListingCardProps) {
  const { signedUrl, isLoading: isLoadingImage } = useSignedUrl('listing-media', listing.cover_media_path);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [signedUrl]);

  const showImage = Boolean(signedUrl) && !imageFailed;

  return (
    <Card className="overflow-hidden border-border/70 transition-colors duration-200 hover:border-border">
      <div className="relative aspect-video overflow-hidden bg-muted/30">
        {showImage ? (
          <img
            src={signedUrl || ''}
            alt={`${listing.title} cover`}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-7 w-7" />
            <span className="text-xs">{isLoadingImage ? 'Loading photo...' : 'No photos yet'}</span>
          </div>
        )}
        <StatusPill variant={listingStatusVariant(listing.status)} className="absolute left-3 top-3 bg-card/95 capitalize shadow-sm">
          {formatLabel(listing.status)}
        </StatusPill>
        <Link
          to={`/marketplace/crm/leads?listing=${listing.id}`}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          aria-label={`View ${listing.inquiry_count} leads for ${listing.title}`}
        >
          <Eye className="h-3.5 w-3.5" />{listing.inquiry_count}
        </Link>
      </div>

      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="truncate text-base font-semibold" title={listing.title}>{listing.title}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">{listing.city}{listing.area ? ` · ${listing.area}` : ''}</p>
          <p className="mt-2 text-lg font-semibold">{formatCurrency(listing.rent_amount, listing.currency)}<span className="ml-1 text-xs font-normal text-muted-foreground">/ month</span></p>
        </div>

        <div className="flex min-h-7 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {listing.bedrooms !== null && <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4" />{listing.bedrooms} bed{listing.bedrooms === 1 ? '' : 's'}</span>}
          {listing.bathrooms !== null && <span className="inline-flex items-center gap-1.5"><Bath className="h-4 w-4" />{listing.bathrooms} bath{listing.bathrooms === 1 ? '' : 's'}</span>}
          {listing.verification_state !== 'verified' && (
            <StatusPill variant={verificationVariant(listing.verification_state)} className="capitalize">
              <ShieldAlert className="mr-1 h-3.5 w-3.5" />{formatLabel(listing.verification_state)}
            </StatusPill>
          )}
        </div>

        {listing.status === 'pending_removal' && (
          <div className="space-y-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><div><p className="text-sm font-medium">Lease activated for this unit</p><p className="text-xs text-muted-foreground">This listing is unavailable publicly and will be auto-archived after 24 hours unless you act.</p></div></div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={isHandlingRemoval} onClick={() => onHandleRemoval(listing.id, 'confirm')}>Confirm removal</Button>
              <Button size="sm" variant="outline" disabled={isHandlingRemoval} onClick={() => onHandleRemoval(listing.id, 'keep_live')}>Not closed, keep live</Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Public visibility</p>
            <p className="text-xs text-muted-foreground">Landlord role and verification are enforced server-side.</p>
          </div>
          <Switch
            checked={listing.status === 'live'}
            disabled={!canPublish || isPublishing || !['draft', 'live', 'paused'].includes(listing.status)}
            onCheckedChange={(checked) => onTogglePublish(listing.id, checked)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/marketplace/crm/leads?listing=${listing.id}`}><Eye className="mr-1.5 h-3.5 w-3.5" />View leads</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/marketplace/${listing.slug}`} target="_blank" rel="noreferrer"><ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />Public listing</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
