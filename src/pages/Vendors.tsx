import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, Plus, Search, ShieldAlert, Star, UsersRound } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateVendor, useVendors, type VendorInput, type Vendor } from '@/hooks/useVendors';

const emptyVendor: VendorInput = {
  name: '', vendor_type: '', contact_name: '', phone: '', email: '', address: '', status: 'active', notes: '', rating: null,
};

export default function Vendors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Vendor['status'] | 'all'>('active');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<VendorInput>(emptyVendor);
  const { data: vendors = [], isLoading, error, refetch } = useVendors();
  const createVendor = useCreateVendor();

  useEffect(() => {
    if (searchParams.get('add') === 'true') setIsCreateOpen(true);
  }, [searchParams]);

  const filtered = vendors.filter((vendor) => {
    const query = search.toLowerCase();
    const matchesStatus = status === 'all' || vendor.status === status;
    const matchesSearch = !query || [vendor.name, vendor.vendor_type, vendor.contact_name, vendor.email, vendor.phone]
      .some((value) => value?.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const closeCreateDialog = () => {
    setIsCreateOpen(false);
    if (searchParams.has('add')) {
      const next = new URLSearchParams(searchParams);
      next.delete('add');
      setSearchParams(next, { replace: true });
    }
  };

  const submit = async () => {
    if (!form.name.trim()) return;
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
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">All vendors</p><p className="mt-1 text-2xl font-bold">{vendors.length}</p></div><UsersRound className="h-5 w-5 text-primary" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Active</p><p className="mt-1 text-2xl font-bold text-success">{vendors.filter((vendor) => vendor.status === 'active').length}</p></div><Building2 className="h-5 w-5 text-success" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Needs review</p><p className="mt-1 text-2xl font-bold text-warning">{vendors.filter((vendor) => vendor.status === 'suspended').length}</p></div><ShieldAlert className="h-5 w-5 text-warning" /></CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendors..." className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={status === 'all' ? 'default' : 'outline'} onClick={() => setStatus('all')}>All</Button>
          {(['active', 'inactive', 'suspended'] as const).map((value) => (
            <Button key={value} size="sm" variant={status === value ? 'default' : 'outline'} onClick={() => setStatus(value)}>
              {value}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground">Loading vendors...</CardContent></Card>}
      {error && <Card className="border-destructive/40"><CardContent className="space-y-3 py-10 text-center text-destructive"><p>{error.message}</p><Button variant="outline" onClick={() => void refetch()}>Try again</Button></CardContent></Card>}
      {!isLoading && !error && filtered.length === 0 && (
        <Card><CardContent className="py-12 text-center"><Building2 className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><p className="font-medium">No vendors found</p></CardContent></Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((vendor) => (
          <Link key={vendor.id} to={`/vendors/${vendor.id}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{vendor.name}</h2>
                    <p className="text-sm text-muted-foreground">{vendor.vendor_type || 'General contractor'}</p>
                  </div>
                  <Badge variant={vendor.status === 'active' ? 'secondary' : 'outline'}>{vendor.status}</Badge>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {vendor.contact_name && <p>{vendor.contact_name}</p>}
                  {vendor.email && <p className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5" />{vendor.email}</p>}
                  {vendor.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{vendor.phone}</p>}
                </div>
                <div className="flex items-center gap-1 text-sm"><Star className="h-4 w-4 text-warning" />{vendor.rating?.toFixed(1) ?? 'Not rated'}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

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
            <div className="space-y-2"><Label htmlFor="vendor-rating">Initial rating</Label><Input id="vendor-rating" type="number" min="0" max="5" step="0.5" value={form.rating ?? ''} onChange={(event) => setForm({ ...form, rating: event.target.value ? Number(event.target.value) : null })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="vendor-notes">Notes</Label><Textarea id="vendor-notes" value={form.notes ?? ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeCreateDialog}>Cancel</Button><Button onClick={() => void submit()} disabled={!form.name.trim() || createVendor.isPending}>Create vendor</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}