import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ArrowUpRight, Building2, Eye, Loader2, Plus, Store, ToggleLeft } from 'lucide-react';
import { CreateListingFlow } from '@/components/marketplace-crm/CreateListingFlow';
import { QueryErrorState } from '@/components/marketplace-crm/CrmWidgets';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { useHandlePendingListingRemoval, useManagedMarketplaceListings, useToggleMarketplacePublish } from '@/hooks/useMarketplace';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';

function formatCurrency(amount: number, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toLocaleString()}`;
  }
}

export default function MarketplaceManage() {
  const { activeCompanyId, companies } = useActiveCompany();
  const { isLandlord, isPropertyManager, isSuperAdmin } = useUserRole();
  const listingsQuery = useManagedMarketplaceListings(activeCompanyId);
  const togglePublish = useToggleMarketplacePublish(activeCompanyId);
  const handleRemoval = useHandlePendingListingRemoval(activeCompanyId);
  const listings = listingsQuery.data || [];
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (!isLandlord && !isPropertyManager && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const companyName = companies.find((company) => company.id === activeCompanyId)?.name || 'Active company';
  const liveCount = listings.filter((listing) => listing.status === 'live').length;
  const draftCount = listings.filter((listing) => listing.status === 'draft').length;
  const inquiryCount = listings.reduce((total, listing) => total + listing.inquiry_count, 0);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Marketplace Operations"
        title="Listings"
        description={`Create, publish, and monitor marketplace inventory for ${companyName}.`}
        action={<Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Add listing</Button>}
      />

      {!listingsQuery.isError && !listingsQuery.isLoading && listings.length > 0 ? <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>Total Listings</CardDescription><CardTitle className="text-2xl">{listings.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Live / Draft</CardDescription><CardTitle className="text-2xl">{liveCount} / {draftCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Marketplace Leads</CardDescription><CardTitle className="text-2xl">{inquiryCount}</CardTitle></CardHeader></Card>
      </section> : null}

      {listingsQuery.isError ? (
        <Card>
          <QueryErrorState message={listingsQuery.error?.message} onRetry={() => void listingsQuery.refetch()} />
        </Card>
      ) : listingsQuery.isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-border/70 bg-card">
          <div className="text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />Loading marketplace inventory...</div>
        </div>
      ) : listings.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={Store}
            title="Publish your first vacant unit"
            description="Choose a vacant unit, confirm its rental details, add photos, and save a draft. Verification remains enforced before anything goes live."
            action={(
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setIsCreateOpen(true)}>Choose vacant unit<ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button variant="outline" asChild><Link to="/units"><Building2 className="mr-2 h-4 w-4" />Review units</Link></Button>
              </div>
            )}
          />
        </Card>
      ) : (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ToggleLeft className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Listing Publish Controls</h2>
          {(listingsQuery.isLoading || togglePublish.isPending) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {listings.map((listing) => (
            <Card key={listing.id} className="border-border/70">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base">{listing.title}</CardTitle>
                    <CardDescription>{listing.city}{listing.area ? ` · ${listing.area}` : ''} · {formatCurrency(listing.rent_amount, listing.currency)}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={listing.status === 'live' ? 'default' : 'secondary'}>{listing.status}</Badge>
                    <Badge variant="outline">{listing.inquiry_count} leads</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {listing.status === 'pending_removal' && (
                  <div className="space-y-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                    <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" /><div><p className="text-sm font-medium">Lease activated for this unit</p><p className="text-xs text-muted-foreground">This listing is unavailable publicly and will be auto-archived after 24 hours unless you act.</p></div></div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={handleRemoval.isPending} onClick={() => handleRemoval.mutate({ listingId: listing.id, action: 'confirm' })}>Confirm removal</Button>
                      <Button size="sm" variant="outline" disabled={handleRemoval.isPending} onClick={() => handleRemoval.mutate({ listingId: listing.id, action: 'keep_live' })}>Not closed, keep live</Button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Public visibility</p>
                    <p className="text-xs text-muted-foreground">Landlord role and verified publisher status are enforced server-side.</p>
                  </div>
                  <Switch
                    checked={listing.status === 'live'}
                    disabled={!isLandlord || togglePublish.isPending || !['draft', 'live', 'paused'].includes(listing.status)}
                    onCheckedChange={(checked) => togglePublish.mutate({ listingId: listing.id, publish: checked })}
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
          ))}
        </div>

      </section>
      )}
      <CreateListingFlow companyId={activeCompanyId} open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}