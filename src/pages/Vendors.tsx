import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, Plus, Search, ShieldAlert, Star, UsersRound, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';
import { useCreateVendor, useVendors, type VendorInput, type Vendor } from '@/hooks/useVendors';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { Pagination } from '@/components/shared/Pagination';
import { FilterBar } from '@/components/shared/FilterBar';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusPill } from '@/components/shared/StatusPill';

type VendorWithCompany = Vendor & {
  companies?: {
    id?: string;
    name?: string;
  } | null;
};

const emptyVendor: VendorInput = {
  name: '', vendor_type: '', contact_name: '', phone: '', email: '', address: '', status: 'active', notes: '', rating: null,
};

type VendorView = 'cards' | 'compact' | 'table';

export default function Vendors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSuperAdmin } = useUserRole();
  const { data: companiesList = [] } = useMyCompanies();
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Vendor['status'] | 'all'>('active');
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('estatepro-view-vendors') as ViewMode) || 'compact');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<VendorInput>(emptyVendor);
  const { data: vendors = [], isLoading, error, refetch } = useVendors();
  const createVendor = useCreateVendor();
  const ratingInvalid = form.rating != null && (form.rating < 0 || form.rating > 5);

  useEffect(() => {
    localStorage.setItem('estatepro-view-vendors', view);
  }, [view]);

  useEffect(() => {
    if (searchParams.get('add') === 'true') setIsCreateOpen(true);
  }, [searchParams]);

  const typedVendors = vendors as VendorWithCompany[];

  const filtered = typedVendors.filter((vendor) => {
    const vendorCompanyId = vendor.company_id || vendor.companies?.id;
    if (selectedOrgFilter !== 'all' && vendorCompanyId && vendorCompanyId !== selectedOrgFilter) {
      return false;
    }
    const query = search.toLowerCase();
    const matchesStatus = status === 'all' || vendor.status === status;
    const matchesSearch = !query || [vendor.name, vendor.vendor_type, vendor.contact_name, vendor.email, vendor.phone, vendor.companies?.name]
      .some((value) => value?.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const paginatedVendors = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [search, status, pageSize, selectedOrgFilter]);

  const closeCreateDialog = () => {
    setIsCreateOpen(false);
    if (searchParams.has('add')) {
      const next = new URLSearchParams(searchParams);
      next.delete('add');
      setSearchParams(next, { replace: true });
    }
  };

  const submit = async () => {
    if (!form.name.trim() || ratingInvalid) return;
    await createVendor.mutateAsync({ ...form, name: form.name.trim() });
    setForm(emptyVendor);
    closeCreateDialog();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">Contractors, compliance documents, work orders, and payments.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add vendor</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          title="All vendors"
          value={vendors.length}
          icon={UsersRound}
          variant="primary"
          subtitle="Registered suppliers"
        />
        <MetricCard
          title="Active vendors"
          value={vendors.filter((vendor) => vendor.status === 'active').length}
          icon={Building2}
          variant="success"
          subtitle="Available for work orders"
        />
        <MetricCard
          title="Needs review"
          value={vendors.filter((vendor) => vendor.status === 'suspended').length}
          icon={ShieldAlert}
          variant="warning"
          subtitle="Suspended accounts"
        />
      </div>

      <FilterBar className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendors..." className="pl-9 h-11" />
          </div>
          {isSuperAdmin && companiesList.length > 0 && (
            <div className="w-full sm:w-auto min-w-[200px]">
              <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="All Organizations (Global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 All Organizations (Global)</SelectItem>
                  {companiesList.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Button size="sm" variant={status === 'all' ? 'default' : 'outline'} onClick={() => setStatus('all')}>All</Button>
            {(['active', 'inactive', 'suspended'] as const).map((value) => (
              <Button key={value} size="sm" variant={status === value ? 'default' : 'outline'} onClick={() => setStatus(value)} className="capitalize">
                {value}
              </Button>
            ))}
          </div>
        </div>

        <ViewToggle view={view} onViewChange={setView} />
      </FilterBar>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground">Loading vendors...</CardContent></Card>}
      {error && <Card className="border-destructive/40"><CardContent className="space-y-3 py-10 text-center text-destructive"><p>{error.message}</p><Button variant="outline" onClick={() => void refetch()}>Try again</Button></CardContent></Card>}
      {!isLoading && !error && filtered.length === 0 && (
        <Card><CardContent className="py-12 text-center"><Building2 className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><p className="font-medium">No vendors found</p></CardContent></Card>
      )}

      {/* 1. Cards View */}
      {!isLoading && !error && view === 'cards' && filtered.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedVendors.map((vendor) => (
              <Link key={vendor.id} to={`/vendors/${vendor.id}`}>
                <Card className="h-full card-shadow-md hover:card-shadow-lg transition-all">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-foreground">{vendor.name}</h2>
                        <p className="text-sm text-muted-foreground">{vendor.vendor_type || 'General contractor'}</p>
                        {vendor.companies?.name && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 mt-1 font-medium">
                            🏢 {vendor.companies.name}
                          </span>
                        )}
                      </div>
                      <Badge variant={vendor.status === 'active' ? 'secondary' : 'outline'} className="capitalize">{vendor.status}</Badge>
                    </div>
                    <div className="space-y-1.5 text-sm text-muted-foreground pt-1">
                      {vendor.contact_name && <p className="text-foreground text-xs font-medium">{vendor.contact_name}</p>}
                      {vendor.email && <p className="flex items-center gap-2 truncate text-xs"><Mail className="h-3.5 w-3.5" />{vendor.email}</p>}
                      {vendor.phone && <p className="flex items-center gap-2 text-xs"><Phone className="h-3.5 w-3.5" />{vendor.phone}</p>}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Star className="h-4 w-4 text-warning fill-warning" />
                        {vendor.rating?.toFixed(1) ?? 'Not rated'}
                      </div>
                      <span className="text-xs text-primary font-medium">View details &rarr;</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 2. Compact View */}
      {!isLoading && !error && view === 'compact' && filtered.length > 0 && (
        <div className="space-y-4">
          <Card className="shadow-xs"><CardContent className="divide-y p-0">
            {paginatedVendors.map((vendor) => (
              <Link key={vendor.id} to={`/vendors/${vendor.id}`} className="grid gap-2 px-4 py-3 transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(180px,1.2fr)_minmax(140px,1fr)_minmax(160px,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium">{vendor.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{vendor.vendor_type || 'General contractor'}</p>
                  {vendor.companies?.name && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 mt-0.5 font-medium">
                      🏢 {vendor.companies.name}
                    </span>
                  )}
                </div>
                <div className="min-w-0 text-sm"><p className="truncate">{vendor.contact_name || 'No contact name'}</p><p className="truncate text-xs text-muted-foreground">{vendor.phone || vendor.email || 'No contact details'}</p></div>
                <div className="flex items-center gap-1 text-sm"><Star className="h-3.5 w-3.5 text-warning fill-warning" />{vendor.rating?.toFixed(1) ?? 'Not rated'}</div>
                <Badge variant={vendor.status === 'active' ? 'secondary' : 'outline'} className="capitalize">{vendor.status}</Badge>
              </Link>
            ))}
          </CardContent></Card>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 3. Table View */}
      {!isLoading && !error && view === 'table' && filtered.length > 0 && (
        <div className="space-y-4">
          <Card className="overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Rating</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedVendors.map((vendor) => (
                    <tr key={vendor.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link className="font-medium hover:underline text-foreground" to={`/vendors/${vendor.id}`}>{vendor.name}</Link>
                        {vendor.companies?.name && <p className="text-[10px] text-primary">🏢 {vendor.companies.name}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{vendor.vendor_type || 'General contractor'}</td>
                      <td className="px-4 py-3">
                        <p>{vendor.contact_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{vendor.phone || vendor.email || '-'}</p>
                      </td>
                      <td className="px-4 py-3 font-medium">{vendor.rating?.toFixed(1) ?? '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={vendor.status === 'active' ? 'secondary' : 'outline'} className="capitalize">{vendor.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {/* Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} records */}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={(open) => open ? setIsCreateOpen(true) : closeCreateDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Add vendor</DialogTitle><DialogDescription>Create a contractor record for this company.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="vendor-name">Vendor name *</Label><Input id="vendor-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="vendor-type">Service type</Label><Input id="vendor-type" value={form.vendor_type ?? ''} onChange={(event) => setForm({ ...form, vendor_type: event.target.value })} placeholder="Plumbing, electrical..." /></div>
            <div className="space-y-2"><Label htmlFor="contact-name">Contact name</Label><Input id="contact-name" value={form.contact_name ?? ''} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="vendor-email">Email</Label><Input id="vendor-email" type="email" value={form.email ?? ''} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="vendor-phone">Phone</Label><Input id="vendor-phone" value={form.phone ?? ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="vendor-address">Address</Label><Input id="vendor-address" value={form.address ?? ''} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as Vendor['status'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent></Select></div>
            <div className="space-y-2">
              <Label htmlFor="vendor-rating">Initial rating (0-5)</Label>
              <Input id="vendor-rating" type="number" min="0" max="5" step="0.5" value={form.rating ?? ''} aria-invalid={ratingInvalid} onChange={(event) => setForm({ ...form, rating: event.target.value ? Number(event.target.value) : null })} />
              <p className={ratingInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{ratingInvalid ? 'Enter a rating between 0 and 5.' : 'Optional. Use 5 for the highest rating.'}</p>
            </div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="vendor-notes">Notes</Label><Textarea id="vendor-notes" value={form.notes ?? ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeCreateDialog}>Cancel</Button><Button onClick={() => void submit()} disabled={!form.name.trim() || ratingInvalid || createVendor.isPending}>Create vendor</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}