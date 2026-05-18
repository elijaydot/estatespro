import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { format, differenceInDays, addDays, parseISO, isWithinInterval } from 'date-fns';
import {
  CalendarIcon,
  MapPin,
  Home,
  Users,
  BedDouble,
  Bath,
  Maximize,
  CheckCircle,
  Loader2,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface PropertyInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[] | null;
}

interface UnitInfo {
  id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  rent_amount: number;
  description: string | null;
  amenities: string[] | null;
  image_url: string | null;
  image_urls: string[] | null;
  status: string;
}

interface BookingRecord {
  check_in: string;
  check_out: string;
  status: string;
}

export default function GuestBookingPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [searchParams] = useSearchParams();
  const preselectedUnit = searchParams.get('unit');

  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [existingBookings, setExistingBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>(preselectedUnit || '');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [form, setForm] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in: '',
    check_out: '',
    num_guests: 1,
    special_requests: '',
  });

  // Fetch property and units (public access via anon key)
  useEffect(() => {
    if (!propertyId) return;

    async function load() {
      setLoading(true);
      const [propRes, unitsRes] = await Promise.all([
        supabase.from('properties').select('id, name, address, city, state, country, description, image_url, image_urls').eq('id', propertyId!).eq('type', 'short_let').single(),
        supabase.from('units').select('id, unit_number, bedrooms, bathrooms, sqft, rent_amount, description, amenities, image_url, image_urls, status').eq('property_id', propertyId!).order('unit_number'),
      ]);

      if (propRes.error || !propRes.data) {
        setError('Property not found or not available for booking.');
        setLoading(false);
        return;
      }

      const allUnits = (unitsRes.data || []) as UnitInfo[];
      const bookableUnits = allUnits.filter((unit) => {
        const status = (unit.status || '').toLowerCase();
        return status === 'vacant' || status === 'available';
      });

      setProperty(propRes.data as PropertyInfo);
      setUnits(bookableUnits);
      setLoading(false);
    }

    load();
  }, [propertyId]);

  useEffect(() => {
    if (selectedUnit) return;
    if (units.length === 0) return;

    const targetUnit = preselectedUnit && units.some((u) => u.id === preselectedUnit)
      ? preselectedUnit
      : units[0].id;

    setSelectedUnit(targetUnit);
  }, [units, preselectedUnit, selectedUnit]);

  // Fetch existing bookings for selected unit
  useEffect(() => {
    if (!selectedUnit) {
      setExistingBookings([]);
      return;
    }

    async function loadBookings() {
      const { data } = await supabase
        .from('bookings')
        .select('check_in, check_out, status')
        .eq('unit_id', selectedUnit)
        .not('status', 'in', '("cancelled","no_show")')
        .gte('check_out', new Date().toISOString().split('T')[0]);

      setExistingBookings((data || []) as BookingRecord[]);
    }

    loadBookings();
  }, [selectedUnit]);

  const selectedUnitData = units.find(u => u.id === selectedUnit);
  const selectedUnitImages = selectedUnitData
    ? ((selectedUnitData.image_urls && selectedUnitData.image_urls.length > 0)
        ? selectedUnitData.image_urls
        : selectedUnitData.image_url
          ? [selectedUnitData.image_url]
          : [])
    : [];

  const nights = form.check_in && form.check_out
    ? differenceInDays(new Date(form.check_out), new Date(form.check_in))
    : 0;
  const nightlyRate = selectedUnitData?.rent_amount || 0;
  const totalAmount = nights * nightlyRate;

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [calendarMonth]);

  const isDateBooked = (date: Date) => {
    return existingBookings.some(b => {
      const ci = parseISO(b.check_in);
      const co = parseISO(b.check_out);
      return date >= ci && date < co;
    });
  };

  const isDatePast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedUnit) {
      setError('Please select a unit.');
      return;
    }
    if (!form.guest_name || !form.guest_email || !form.check_in || !form.check_out) {
      setError('Please fill in all required fields.');
      return;
    }
    if (nights <= 0) {
      setError('Check-out must be after check-in.');
      return;
    }

    setSubmitting(true);

    try {
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guest-booking`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            property_id: propertyId,
            unit_id: selectedUnit,
            ...form,
          }),
        }
      );

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const detailedError = [
          data?.error,
          data?.message,
          data?.details,
          data?.hint,
          data?.code,
          rawText && !data ? rawText : null,
          `HTTP ${res.status}`,
        ]
          .filter(Boolean)
          .join(' - ');
        setError(detailedError || 'Failed to submit booking request.');
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Property Not Available</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Booking Request Sent!</h2>
            <p className="text-muted-foreground mb-4">
              Your booking request for <strong>{property?.name}</strong> has been submitted.
              The property owner will review and confirm your reservation.
            </p>
            <div className="bg-muted rounded-lg p-4 text-sm text-left space-y-1">
              <p><strong>Check-in:</strong> {format(new Date(form.check_in), 'PPP')}</p>
              <p><strong>Check-out:</strong> {format(new Date(form.check_out), 'PPP')}</p>
              <p><strong>Nights:</strong> {nights}</p>
              <p><strong>Estimated Total:</strong> {totalAmount.toLocaleString()}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              A confirmation will be sent to <strong>{form.guest_email}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const heroImage = property?.image_urls?.[0] || property?.image_url;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-64 md:h-80 bg-muted overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={property?.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-20 w-20 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <Badge className="bg-primary/90 text-primary-foreground mb-2">Short Let</Badge>
          <h1 className="text-2xl md:text-4xl font-bold text-white">{property?.name}</h1>
          <div className="flex items-center gap-1 text-white/80 mt-1">
            <MapPin className="h-4 w-4" />
            <span>{property?.address}, {property?.city}, {property?.state}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Property Info & Units */}
        <div className="lg:col-span-2 space-y-6">
          {property?.description && (
            <Card>
              <CardHeader><CardTitle>About This Property</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">{property.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Available Units */}
          <Card>
            <CardHeader>
              <CardTitle>Available Units</CardTitle>
              <CardDescription>Select a unit to book</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {units.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No units currently available.</p>
              ) : (
                units.map(unit => (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit.id)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedUnit === unit.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {((unit.image_urls && unit.image_urls.length > 0) || unit.image_url) && (
                      <div className="mb-3 h-32 w-full overflow-hidden rounded-md bg-muted">
                        <img
                          src={(unit.image_urls && unit.image_urls.length > 0) ? unit.image_urls[0] : unit.image_url || ''}
                          alt={`Unit ${unit.unit_number}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Unit {unit.unit_number}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{unit.bedrooms} bed</span>
                          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{unit.bathrooms} bath</span>
                          {unit.sqft > 0 && <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{unit.sqft} sqft</span>}
                        </div>
                        {unit.description && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2 whitespace-pre-line">
                            {unit.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{unit.rent_amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">per night</p>
                      </div>
                    </div>
                    {unit.amenities && unit.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {unit.amenities.slice(0, 5).map(a => (
                          <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                        ))}
                        {unit.amenities.length > 5 && (
                          <Badge variant="outline" className="text-xs">+{unit.amenities.length - 5} more</Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Availability Calendar */}
          {selectedUnit && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" /> Availability
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium min-w-[120px] text-center">{format(calendarMonth, 'MMMM yyyy')}</span>
                    <Button variant="outline" size="icon" onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedUnitImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Unit Photos</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedUnitImages.slice(0, 6).map((image, index) => (
                        <div key={`${image}-${index}`} className="h-28 overflow-hidden rounded-md border bg-muted">
                          <img
                            src={image}
                            alt={`Unit photo ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="font-medium text-muted-foreground py-2">{d}</div>
                  ))}
                  {calendarDays.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} />;
                    const booked = isDateBooked(day);
                    const past = isDatePast(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`py-2 rounded text-sm ${
                          booked ? 'bg-destructive/15 text-destructive line-through' :
                          past ? 'text-muted-foreground/40' :
                          'bg-success/10 text-success'
                        }`}
                      >
                        {day.getDate()}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-success/20" /> Available</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-destructive/20" /> Booked</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Booking Form */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Book Your Stay</CardTitle>
              <CardDescription>
                {selectedUnitData
                  ? `Unit ${selectedUnitData.unit_number} - ${nightlyRate.toLocaleString()} / night`
                  : 'Select a unit to get started'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="guest_name">Full Name *</Label>
                  <Input
                    id="guest_name"
                    value={form.guest_name}
                    onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guest_email">Email Address *</Label>
                  <Input
                    id="guest_email"
                    type="email"
                    value={form.guest_email}
                    onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guest_phone">Phone Number</Label>
                  <Input
                    id="guest_phone"
                    value={form.guest_phone}
                    onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))}
                    placeholder="+233 xxx xxx xxx"
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="check_in">Check-in *</Label>
                    <Input
                      id="check_in"
                      type="date"
                      value={form.check_in}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="check_out">Check-out *</Label>
                    <Input
                      id="check_out"
                      type="date"
                      value={form.check_out}
                      min={form.check_in || new Date().toISOString().split('T')[0]}
                      onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="num_guests">Number of Guests</Label>
                  <Input
                    id="num_guests"
                    type="number"
                    min={1}
                    max={20}
                    value={form.num_guests}
                    onChange={e => setForm(f => ({ ...f, num_guests: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="special_requests">Special Requests</Label>
                  <Textarea
                    id="special_requests"
                    value={form.special_requests}
                    onChange={e => setForm(f => ({ ...f, special_requests: e.target.value }))}
                    placeholder="Early check-in, extra pillows, etc."
                    rows={3}
                  />
                </div>

                {nights > 0 && selectedUnitData && (
                  <>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{nightlyRate.toLocaleString()} x {nights} night{nights > 1 ? 's' : ''}</span>
                        <span>{totalAmount.toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span className="text-primary">{totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!selectedUnit || submitting || nights <= 0}
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
                  ) : (
                    'Request to Book'
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  You won't be charged yet. The owner will confirm your booking.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/30 py-6 text-center text-sm text-muted-foreground">
        Powered by <strong>FishGate</strong>
      </div>
    </div>
  );
}

