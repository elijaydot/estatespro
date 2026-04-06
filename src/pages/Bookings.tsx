import { useState, useMemo } from 'react';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  Home,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Share2,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, Booking } from '@/hooks/useBookings';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from '@/components/ui/use-toast';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  checked_in: { label: 'Checked In', variant: 'secondary' },
  checked_out: { label: 'Checked Out', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  no_show: { label: 'No Show', variant: 'destructive' },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  unpaid: { label: 'Unpaid', variant: 'destructive' },
  partial: { label: 'Partial', variant: 'outline' },
  paid: { label: 'Paid', variant: 'default' },
  refunded: { label: 'Refunded', variant: 'secondary' },
};

export default function Bookings() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const { data: bookings = [], isLoading } = useBookings();
  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const { formatCurrency } = useSettings();

  // Short-let properties only
  const shortLetProperties = properties.filter((p: any) => p.type === 'short_let');

  const [form, setForm] = useState({
    property_id: '',
    unit_id: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in: '',
    check_out: '',
    nightly_rate: 0,
    cleaning_fee: 0,
    service_fee: 0,
    num_guests: 1,
    notes: '',
    special_requests: '',
  });

  const filteredUnits = units.filter((u: any) => u.property_id === form.property_id);

  const nights = form.check_in && form.check_out
    ? Math.max(0, differenceInDays(new Date(form.check_out), new Date(form.check_in)))
    : 0;
  const totalAmount = (form.nightly_rate * nights) + form.cleaning_fee + form.service_fee;

  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || b.guest_name.toLowerCase().includes(q) || b.guest_email.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesProp = !selectedProperty || b.property_id === selectedProperty;
    return matchesSearch && matchesStatus && matchesProp;
  });

  const stats = useMemo(() => {
    const active = bookings.filter(b => ['confirmed', 'checked_in'].includes(b.status));
    const revenue = bookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + b.total_amount, 0);
    const upcoming = bookings.filter(b => b.status === 'confirmed' && new Date(b.check_in) > new Date());
    return { active: active.length, revenue, upcoming: upcoming.length, total: bookings.length };
  }, [bookings]);

  const resetForm = () => {
    setForm({
      property_id: '', unit_id: '', guest_name: '', guest_email: '', guest_phone: '',
      check_in: '', check_out: '', nightly_rate: 0, cleaning_fee: 0, service_fee: 0,
      num_guests: 1, notes: '', special_requests: '',
    });
  };

  const handleCreate = async () => {
    if (!form.property_id || !form.unit_id || !form.guest_name || !form.guest_email || !form.check_in || !form.check_out) {
      return;
    }
    await createBooking.mutateAsync({
      ...form,
      total_amount: totalAmount,
    });
    resetForm();
    setIsCreateOpen(false);
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    await updateBooking.mutateAsync({ id: bookingId, status: newStatus });
  };

  const handlePaymentStatusChange = async (bookingId: string, newStatus: string) => {
    await updateBooking.mutateAsync({ id: bookingId, payment_status: newStatus });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteBooking.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEdit = (booking: Booking) => {
    setForm({
      property_id: booking.property_id,
      unit_id: booking.unit_id,
      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone || '',
      check_in: booking.check_in,
      check_out: booking.check_out,
      nightly_rate: booking.nightly_rate,
      cleaning_fee: booking.cleaning_fee,
      service_fee: booking.service_fee,
      num_guests: booking.num_guests,
      notes: booking.notes || '',
      special_requests: booking.special_requests || '',
    });
    setEditingBooking(booking);
  };

  const handleUpdate = async () => {
    if (!editingBooking) return;
    await updateBooking.mutateAsync({
      id: editingBooking.id,
      ...form,
      total_amount: totalAmount,
    });
    setEditingBooking(null);
    resetForm();
  };

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [calendarMonth]);

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(b => {
      const checkIn = parseISO(b.check_in);
      const checkOut = parseISO(b.check_out);
      return isWithinInterval(date, { start: checkIn, end: checkOut }) && !['cancelled', 'no_show'].includes(b.status);
    });
  };

  const propertyOptions = shortLetProperties.map((p: any) => ({
    value: p.id, label: p.name, description: p.address,
  }));
  const unitOptions = filteredUnits.map((u: any) => ({
    value: u.id, label: `Unit ${u.unit_number}`, description: `Floor ${u.floor}`,
  }));

  const BookingForm = ({ onSubmit, isSubmitting, submitLabel }: { onSubmit: () => void; isSubmitting: boolean; submitLabel: string }) => (
    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Property</Label>
          <SearchableSelect
            options={propertyOptions}
            value={form.property_id}
            onValueChange={(v) => setForm({ ...form, property_id: v, unit_id: '' })}
            placeholder="Select property..."
          />
        </div>
        <div className="space-y-2">
          <Label>Unit</Label>
          <SearchableSelect
            options={unitOptions}
            value={form.unit_id}
            onValueChange={(v) => setForm({ ...form, unit_id: v })}
            placeholder="Select unit..."
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Guest Name</Label>
          <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Guest Email</Label>
          <Input type="email" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Number of Guests</Label>
          <Input type="number" min={1} value={form.num_guests} onChange={(e) => setForm({ ...form, num_guests: parseInt(e.target.value) || 1 })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Check-in</Label>
          <Input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Check-out</Label>
          <Input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Nightly Rate</Label>
          <Input type="number" min={0} value={form.nightly_rate} onChange={(e) => setForm({ ...form, nightly_rate: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label>Cleaning Fee</Label>
          <Input type="number" min={0} value={form.cleaning_fee} onChange={(e) => setForm({ ...form, cleaning_fee: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label>Service Fee</Label>
          <Input type="number" min={0} value={form.service_fee} onChange={(e) => setForm({ ...form, service_fee: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      {nights > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex justify-between text-sm">
              <span>{formatCurrency(form.nightly_rate)} × {nights} nights</span>
              <span>{formatCurrency(form.nightly_rate * nights)}</span>
            </div>
            {form.cleaning_fee > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span>Cleaning fee</span>
                <span>{formatCurrency(form.cleaning_fee)}</span>
              </div>
            )}
            {form.service_fee > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span>Service fee</span>
                <span>{formatCurrency(form.service_fee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold mt-2 pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Special Requests</Label>
        <Textarea value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} rows={2} />
      </div>
      <DialogFooter>
        <Button onClick={onSubmit} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage short-let and Airbnb reservations</p>
        </div>
        <div className="flex gap-2">
          {shortLetProperties.length > 0 && (
            <Select onValueChange={(propId) => {
              const url = `${window.location.origin}/book/${propId}`;
              navigator.clipboard.writeText(url);
              toast({ title: 'Link Copied!', description: 'Share this link with guests so they can book directly.' });
            }}>
              <SelectTrigger className="w-auto gap-2">
                <Share2 className="h-4 w-4" />
                <SelectValue placeholder="Share Booking Link" />
              </SelectTrigger>
              <SelectContent>
                {shortLetProperties.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <CalendarIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-secondary">
                <Home className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card className="card-shadow-md">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search guests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No bookings found</p>
                  <p className="text-sm mt-1">Create a booking to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guest</TableHead>
                        <TableHead>Property / Unit</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Check-out</TableHead>
                        <TableHead>Nights</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{booking.guest_name}</p>
                              <p className="text-xs text-muted-foreground">{booking.guest_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{booking.property_name}</p>
                              <p className="text-xs text-muted-foreground">Unit {booking.unit_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>{format(new Date(booking.check_in), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{format(new Date(booking.check_out), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{booking.nights}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(booking.total_amount)}</TableCell>
                          <TableCell>
                            <Select value={booking.status} onValueChange={(v) => handleStatusChange(booking.id, v)}>
                              <SelectTrigger className="w-[130px] h-8">
                                <Badge variant={STATUS_CONFIG[booking.status]?.variant || 'outline'}>
                                  {STATUS_CONFIG[booking.status]?.label || booking.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={booking.payment_status} onValueChange={(v) => handlePaymentStatusChange(booking.id, v)}>
                              <SelectTrigger className="w-[110px] h-8">
                                <Badge variant={PAYMENT_STATUS_CONFIG[booking.payment_status]?.variant || 'outline'}>
                                  {PAYMENT_STATUS_CONFIG[booking.payment_status]?.label || booking.payment_status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(PAYMENT_STATUS_CONFIG).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(booking)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(booking.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Card className="card-shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle>{format(calendarMonth, 'MMMM yyyy')}</CardTitle>
                <Button variant="outline" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                ))}
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const dayBookings = getBookingsForDate(day);
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[80px] border rounded-lg p-1 ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {day.getDate()}
                      </p>
                      <div className="space-y-0.5 mt-1">
                        {dayBookings.slice(0, 2).map(b => (
                          <div
                            key={b.id}
                            className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary truncate"
                            title={`${b.guest_name} - Unit ${b.unit_number}`}
                          >
                            {b.guest_name}
                          </div>
                        ))}
                        {dayBookings.length > 2 && (
                          <p className="text-[10px] text-muted-foreground">+{dayBookings.length - 2} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>New Booking</DialogTitle>
            <DialogDescription>Create a new short-let reservation</DialogDescription>
          </DialogHeader>
          <BookingForm onSubmit={handleCreate} isSubmitting={createBooking.isPending} submitLabel="Create Booking" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingBooking} onOpenChange={() => { setEditingBooking(null); resetForm(); }}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>Update reservation details</DialogDescription>
          </DialogHeader>
          <BookingForm onSubmit={handleUpdate} isSubmitting={updateBooking.isPending} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
