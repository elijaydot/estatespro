import { useMemo, useState, useEffect } from 'react';
import { Link2, Copy, Check, ExternalLink, Building, Sparkles, Search, MapPin, Eye, Share2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useProperties, type Property } from '@/hooks/useProperties';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';
import { toast } from '@/components/ui/use-toast';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';

export default function GuestBookingPortal() {
  const { isSuperAdmin } = useUserRole();
  const { data: companiesList = [] } = useMyCompanies();
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const { data: properties = [], isLoading } = useProperties();
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('estatepro-view-guest-portal') as ViewMode) || 'cards');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  useEffect(() => {
    localStorage.setItem('estatepro-view-guest-portal', view);
  }, [view]);

  const shortLetProperties = useMemo(
    () => properties.filter((property: Property) => {
      if (selectedOrgFilter !== 'all' && property.company_id && property.company_id !== selectedOrgFilter) {
        return false;
      }
      return property.type === 'short_let' || property.type === 'residential';
    }),
    [properties, selectedOrgFilter]
  );

  const filteredProperties = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shortLetProperties;
    return shortLetProperties.filter((p: Property) =>
      p.name.toLowerCase().includes(q) ||
      (p.address && p.address.toLowerCase().includes(q)) ||
      (p.city && p.city.toLowerCase().includes(q))
    );
  }, [shortLetProperties, search]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedOrgFilter, pageSize]);

  const paginatedProperties = filteredProperties.slice((page - 1) * pageSize, page * pageSize);

  const selectedProperty = properties.find((property: Property) => property.id === selectedPropertyId);

  const quickBookingLink = selectedPropertyId
    ? `${window.location.origin}/book/${selectedPropertyId}`
    : '';

  const handleCopyLink = async (propId: string) => {
    const link = `${window.location.origin}/book/${propId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(propId);
      toast({
        title: 'Link copied',
        description: 'Guest booking link copied to clipboard and ready to share.',
      });
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy automatically. Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Guest Booking Portals</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Generate, customize, and share public booking links for short-let and Airbnb-ready properties.
          </p>
        </div>
      </div>

      {/* Quick Generator Box */}
      <Card className="card-shadow-md border-primary/20 bg-gradient-to-br from-card to-primary/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5 text-primary" />
            Quick Share Link Generator
          </CardTitle>
          <CardDescription>
            Select any property to instantly generate a branded public booking portal link for guests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Select Property</p>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={isLoading ? 'Loading properties...' : 'Choose a property to generate link'} />
                </SelectTrigger>
                <SelectContent>
                  {shortLetProperties.map((property: Property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name} ({property.type === 'short_let' ? 'Short Let' : 'Residential'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => selectedPropertyId && handleCopyLink(selectedPropertyId)}
                disabled={!selectedPropertyId}
                className="h-10 gap-2 px-5"
              >
                {copiedId === selectedPropertyId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedId === selectedPropertyId ? 'Copied Link' : 'Copy Guest Link'}
              </Button>
              {quickBookingLink && (
                <Button asChild variant="outline" className="h-10 gap-2">
                  <a href={quickBookingLink} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Preview Portal
                  </a>
                </Button>
              )}
            </div>
          </div>

          {selectedProperty && (
            <div className="rounded-lg border border-border bg-background/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-foreground truncate">{selectedProperty.name}</span>
                <Badge variant="outline" className="text-[10px] uppercase">{selectedProperty.type}</Badge>
                <span className="text-muted-foreground truncate">{selectedProperty.address}, {selectedProperty.city}</span>
              </div>
              <code className="text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono truncate max-w-sm">
                {quickBookingLink}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Directory & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-1 items-center gap-3 min-w-[240px] max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search short-let properties..." className="pl-9" />
          </div>

          {isSuperAdmin && companiesList.length > 0 && (
            <div className="w-48 sm:w-56 shrink-0">
              <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 All Organizations</SelectItem>
                  {companiesList.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {filteredProperties.length === 0 && (
        <EmptyState
          icon={Building}
          title="No guest properties found"
          description="No short-let properties match the selected search query or organization filter."
        />
      )}

      {/* Cards View */}
      {view === 'cards' && filteredProperties.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedProperties.map((property: Property) => {
              const directLink = `${window.location.origin}/book/${property.id}`;
              const isCopied = copiedId === property.id;

              return (
                <Card key={property.id} className="p-5 card-shadow-md hover:card-shadow-lg transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-base text-foreground truncate">{property.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                          {[property.address, property.city, property.state].filter(Boolean).join(', ') || 'Address not listed'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                        {property.type === 'short_let' ? 'Short Let' : 'Rental'}
                      </Badge>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/40 text-xs flex items-center justify-between">
                      <span className="text-muted-foreground">Public Booking:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Live & Enabled
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(property.id)}
                      className="text-xs gap-1.5 flex-1"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {isCopied ? 'Copied' : 'Copy Link'}
                    </Button>
                    <Button asChild size="sm" variant="default" className="text-xs gap-1.5">
                      <a href={directLink} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Portal
                      </a>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredProperties.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Compact View */}
      {view === 'compact' && filteredProperties.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y rounded-lg border border-border bg-card shadow-xs">
            {paginatedProperties.map((property: Property) => {
              const directLink = `${window.location.origin}/book/${property.id}`;
              const isCopied = copiedId === property.id;

              return (
                <div key={property.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">{property.name}</span>
                      <Badge variant="secondary" className="text-[10px] uppercase">{property.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {[property.address, property.city, property.state].filter(Boolean).join(', ') || 'Address not listed'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(property.id)}
                      className="h-8 text-xs gap-1.5"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button asChild size="sm" variant="default" className="h-8 text-xs gap-1.5">
                      <a href={directLink} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Preview
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredProperties.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Table View */}
      {view === 'table' && filteredProperties.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Property</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProperties.map((property: Property) => {
                  const directLink = `${window.location.origin}/book/${property.id}`;
                  const isCopied = copiedId === property.id;

                  return (
                    <TableRow key={property.id} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="font-medium text-foreground">{property.name}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[property.address, property.city, property.state].filter(Boolean).join(', ') || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs uppercase">{property.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <Sparkles className="h-3 w-3" /> Live
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(property.id)}
                            className="h-7 text-xs gap-1"
                          >
                            {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            {isCopied ? 'Copied' : 'Copy'}
                          </Button>
                          <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1">
                            <a href={directLink} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3" /> Open
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 pt-0">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredProperties.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}
    </div>
  );
}
