import { useEffect, useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { CreateListingFlow } from '@/components/marketplace-crm/CreateListingFlow';
import { MarketplaceListingCard } from '@/components/marketplace-crm/MarketplaceListingCard';
import { QueryErrorState } from '@/components/marketplace-crm/CrmWidgets';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useHandlePendingListingRemoval,
  useManagedMarketplaceListings,
  usePublisherVerification,
  useToggleMarketplacePublish,
} from '@/hooks/useMarketplace';
import { listingStatusVariant } from '@/lib/marketplaceListingStatus';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'pending_removal', label: 'Pending removal' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
  { value: 'blocked', label: 'Blocked' },
] as const;

const PAGE_SIZE = 6;

export default function MarketplaceManage() {
  const { activeCompanyId, companies } = useActiveCompany();
  const { isLandlord, isPropertyManager, isSuperAdmin } = useUserRole();
  const listingsQuery = useManagedMarketplaceListings(activeCompanyId);
  const verificationQuery = usePublisherVerification(activeCompanyId);
  const togglePublish = useToggleMarketplacePublish(activeCompanyId);
  const handleRemoval = useHandlePendingListingRemoval(activeCompanyId);
  const listings = useMemo(() => listingsQuery.data || [], [listingsQuery.data]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'most_leads'>('newest');
  const [page, setPage] = useState(1);

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = listings.filter((listing) => (
      (statusFilter === 'all' || listing.status === statusFilter)
      && (!query || `${listing.title} ${listing.city} ${listing.area || ''}`.toLowerCase().includes(query))
    ));

    return rows.sort((left, right) => sortBy === 'most_leads'
      ? right.inquiry_count - left.inquiry_count || Date.parse(right.created_at) - Date.parse(left.created_at)
      : Date.parse(right.created_at) - Date.parse(left.created_at));
  }, [listings, search, sortBy, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedListings = filteredListings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => setPage(1), [search, sortBy, statusFilter]);

  if (!isLandlord && !isPropertyManager && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const companyName = companies.find((company) => company.id === activeCompanyId)?.name || 'Active company';
  const liveCount = listings.filter((listing) => listing.status === 'live').length;
  const draftCount = listings.filter((listing) => listing.status === 'draft').length;
  const pendingRemovalCount = listings.filter((listing) => listing.status === 'pending_removal').length;
  const inquiryCount = listings.reduce((total, listing) => total + listing.inquiry_count, 0);
  const verification = verificationQuery.data;
  const verificationState = verification?.state || 'unverified';

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Marketplace Operations"
        title="Listings"
        description={`Create, publish, and monitor marketplace inventory for ${companyName}.`}
        action={<Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Add listing</Button>}
      />

      {!verificationQuery.isLoading && verificationState !== 'verified' && (
        <section className={cn(
          'flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
          verificationState === 'rejected'
            ? 'border-destructive/40 bg-destructive/10'
            : verificationState === 'pending'
              ? 'border-cyan-500/30 bg-cyan-500/10'
              : 'border-amber-500/40 bg-amber-500/10',
        )}>
          <div className="flex gap-3">
            {verificationState === 'pending' ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" /> : <ShieldAlert className={cn('mt-0.5 h-5 w-5 shrink-0', verificationState === 'rejected' ? 'text-destructive' : 'text-amber-500')} />}
            <div>
              <p className="font-semibold">{verificationState === 'pending' ? 'Verification in review' : verificationState === 'rejected' ? 'Verification needs attention' : 'Get verified to publish listings live'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {verificationState === 'pending'
                  ? 'Your company submission is being reviewed. Draft listings remain available to manage.'
                  : verificationState === 'rejected'
                    ? verification?.rejection_reason || 'Review the verification requirements and submit updated documents.'
                    : 'Complete company verification before turning marketplace listings public.'}
              </p>
            </div>
          </div>
          {verificationState !== 'pending' && <Button variant="outline" asChild><Link to="/marketplace/verification">Review verification<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
        </section>
      )}

      {!listingsQuery.isError && !listingsQuery.isLoading && listings.length > 0 && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile label="Total" value={listings.length} icon={Store} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
          <StatTile label="Live" value={liveCount} icon={ShieldCheck} variant="success" active={statusFilter === 'live'} onClick={() => setStatusFilter('live')} />
          <StatTile label="Draft" value={draftCount} icon={FileText} active={statusFilter === 'draft'} onClick={() => setStatusFilter('draft')} />
          {pendingRemovalCount > 0 && <StatTile label="Pending removal" value={pendingRemovalCount} icon={AlertTriangle} variant="warning" active={statusFilter === 'pending_removal'} onClick={() => setStatusFilter('pending_removal')} />}
          <StatTile label="Leads" value={inquiryCount} icon={Users} />
        </section>
      )}

      {listingsQuery.isError ? (
        <Card><QueryErrorState message={listingsQuery.error?.message} onRetry={() => void listingsQuery.refetch()} /></Card>
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
            action={<div className="flex flex-wrap justify-center gap-2"><Button onClick={() => setIsCreateOpen(true)}>Choose vacant unit<ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" asChild><Link to="/units"><Building2 className="mr-2 h-4 w-4" />Review units</Link></Button></div>}
          />
        </Card>
      ) : (
        <section className="space-y-4">
          <div className="space-y-3 rounded-lg border border-border/70 bg-card p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1 lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, city, or area" className="pl-9" />
              </div>
              <select aria-label="Sort listings" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="newest">Newest first</option><option value="most_leads">Most leads</option></select>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Listing status filters">
              {STATUS_FILTERS.map((filter) => (
                <Button key={filter.value} size="sm" variant={statusFilter === filter.value ? 'secondary' : 'ghost'} className="shrink-0" onClick={() => setStatusFilter(filter.value)}>
                  {filter.value !== 'all' && <StatusPill variant={listingStatusVariant(filter.value)} className="mr-1.5 h-2 w-2 p-0" aria-hidden="true" />}{filter.label}
                </Button>
              ))}
            </div>
          </div>

          {filteredListings.length === 0 ? (
            <Card className="border-dashed p-8 text-center"><p className="font-medium">No listings match this view</p><p className="mt-1 text-sm text-muted-foreground">Try another status or clear the search.</p><Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Clear filters</Button></Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {paginatedListings.map((listing) => (
                  <MarketplaceListingCard
                    key={listing.id}
                    listing={listing}
                    canPublish={isLandlord}
                    isPublishing={togglePublish.isPending}
                    isHandlingRemoval={handleRemoval.isPending}
                    onTogglePublish={(listingId, publish) => togglePublish.mutate({ listingId, publish })}
                    onHandleRemoval={(listingId, action) => handleRemoval.mutate({ listingId, action })}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredListings.length)} of {filteredListings.length} listings</span>
                <div className="flex items-center gap-2"><span>Page {currentPage} of {pageCount}</span><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous listings page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next listings page" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button></div>
              </div>
            </>
          )}
        </section>
      )}

      <CreateListingFlow companyId={activeCompanyId} open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}

type StatTileProps = {
  label: string;
  value: number;
  icon: typeof Store;
  variant?: 'success' | 'warning';
  active?: boolean;
  onClick?: () => void;
};

function StatTile({ label, value, icon: Icon, variant, active, onClick }: StatTileProps) {
  const content = <><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-muted-foreground">{label}</span><Icon className={cn('h-4 w-4 text-muted-foreground', variant === 'success' && 'text-success', variant === 'warning' && 'text-warning')} /></div><p className={cn('mt-2 text-2xl font-semibold', variant === 'success' && 'text-success', variant === 'warning' && 'text-warning')}>{value}</p></>;
  return onClick ? <button type="button" onClick={onClick} className={cn('rounded-lg border border-border/70 bg-card p-3 text-left transition-colors hover:border-primary/40', active && 'border-primary/50 bg-primary/5')}>{content}</button> : <div className="rounded-lg border border-border/70 bg-card p-3">{content}</div>;
}
