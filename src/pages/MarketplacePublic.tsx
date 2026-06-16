import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BedDouble, Bath, Building2, Loader2, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  useCreateMarketplaceInquiry,
  useMarketplaceListingDetail,
  useMarketplaceListings,
} from '@/hooks/useMarketplace';

export default function MarketplacePublic() {
  const navigate = useNavigate();
  const { idOrSlug, citySlug, areaSlug } = useParams();

  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [bedrooms, setBedrooms] = useState('');

  const [selectedListingIdOrSlug, setSelectedListingIdOrSlug] = useState<string | null>(idOrSlug || null);

  const cityFromPath = useMemo(() => (citySlug ? citySlug.replace(/-/g, ' ') : ''), [citySlug]);
  const areaFromPath = useMemo(() => (areaSlug ? areaSlug.replace(/-/g, ' ') : ''), [areaSlug]);

  const [inquiryForm, setInquiryForm] = useState({
    full_name: '',
    phone_e164: '',
    email: '',
    message: '',
    budget_min: '',
    budget_max: '',
    consent_marketing: false,
  });

  const listParams = useMemo(
    () => ({
      city: city || undefined,
      area: area || undefined,
      minRent: minRent ? Number(minRent) : undefined,
      maxRent: maxRent ? Number(maxRent) : undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      page: 1,
      pageSize: 24,
    }),
    [area, bedrooms, city, maxRent, minRent],
  );

  const listingsQuery = useMarketplaceListings(listParams);
  const listings = useMemo(() => listingsQuery.data ?? [], [listingsQuery.data]);

  useEffect(() => {
    if (cityFromPath) setCity(cityFromPath);
    if (areaFromPath) setArea(areaFromPath);
  }, [cityFromPath, areaFromPath]);

  useEffect(() => {
    if (idOrSlug) {
      setSelectedListingIdOrSlug(idOrSlug);
      return;
    }

    if (!selectedListingIdOrSlug && listings.length > 0) {
      const first = listings[0];
      const next = first.slug || first.id;
      setSelectedListingIdOrSlug(next);
      const base = citySlug ? `/rent/${citySlug}${areaSlug ? `/${areaSlug}` : ''}` : '/marketplace';
      navigate(`${base}/${next}`, { replace: true });
    }
  }, [areaSlug, citySlug, idOrSlug, listings, navigate, selectedListingIdOrSlug]);

  const detailQuery = useMarketplaceListingDetail(selectedListingIdOrSlug);
  const detail = detailQuery.data;

  useEffect(() => {
    const pageTitle = detail?.title
      ? `${detail.title} | FishGate Marketplace`
      : cityFromPath
        ? `Rent in ${cityFromPath}${areaFromPath ? `, ${areaFromPath}` : ''} | FishGate`
        : 'FishGate Marketplace | Verified Rentals';
    document.title = pageTitle;

    const description = detail?.description
      ? `${detail.description.slice(0, 140)}${detail.description.length > 140 ? '...' : ''}`
      : cityFromPath
        ? `Browse verified rental listings in ${cityFromPath}${areaFromPath ? `, ${areaFromPath}` : ''}.`
        : 'Browse verified rental listings and submit inquiry directly to landlords and managers.';

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);
  }, [areaFromPath, cityFromPath, detail?.description, detail?.title]);


  const inquiryMutation = useCreateMarketplaceInquiry();

  const handleSelectListing = (value: string) => {
    setSelectedListingIdOrSlug(value);
    const base = citySlug ? `/rent/${citySlug}${areaSlug ? `/${areaSlug}` : ''}` : '/marketplace';
    navigate(`${base}/${value}`);
  };

  const onInquirySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail?.id) return;

    await inquiryMutation.mutateAsync({
      payload: {
        listing_id: detail.id,
        full_name: inquiryForm.full_name,
        phone_e164: inquiryForm.phone_e164,
        email: inquiryForm.email || undefined,
        message: inquiryForm.message || undefined,
        budget_min: inquiryForm.budget_min ? Number(inquiryForm.budget_min) : undefined,
        budget_max: inquiryForm.budget_max ? Number(inquiryForm.budget_max) : undefined,
        consent_marketing: inquiryForm.consent_marketing,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">FishGate Marketplace</h1>
            <p className="text-sm text-muted-foreground">Verified listings with fast inquiry-to-lease response.</p>
          </div>
          <Badge variant="secondary">Public Beta</Badge>
        </div>

        <Card className="mb-6">
          <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-5">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area" />
            <Input value={minRent} onChange={(e) => setMinRent(e.target.value)} placeholder="Min rent" type="number" />
            <Input value={maxRent} onChange={(e) => setMaxRent(e.target.value)} placeholder="Max rent" type="number" />
            <Input value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="Bedrooms" type="number" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4" /> Listings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {listingsQuery.isLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading listings...
                  </div>
                )}

                {!listingsQuery.isLoading && listings.length === 0 && (
                  <p className="text-sm text-muted-foreground">No listings found for current filters.</p>
                )}

                {listings.map((listing) => {
                  const selected = selectedListingIdOrSlug === listing.slug || selectedListingIdOrSlug === listing.id;
                  return (
                    <button
                      key={listing.id}
                      type="button"
                      onClick={() => handleSelectListing(listing.slug || listing.id)}
                      className={`w-full rounded-lg border p-3 text-left transition ${selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/60'}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h3 className="font-medium leading-tight">{listing.title}</h3>
                        <Badge variant="outline">{listing.currency} {Number(listing.rent_amount || 0).toLocaleString()}</Badge>
                      </div>
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{listing.city}{listing.area ? `, ${listing.area}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {listing.bedrooms ?? '-'} bed</span>
                        <span className="inline-flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {listing.bathrooms ?? '-'} bath</span>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>{detail?.title || 'Listing details'}</CardTitle>
              </CardHeader>
              <CardContent>
                {detailQuery.isLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading detail...
                  </div>
                )}

                {!detailQuery.isLoading && !detail && (
                  <p className="text-sm text-muted-foreground">Select a listing to see details.</p>
                )}

                {detail && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{detail.currency} {Number(detail.rent_amount || 0).toLocaleString()}</Badge>
                      <Badge variant="outline">{detail.verification_state}</Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{detail.city}{detail.area ? `, ${detail.area}` : ''}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" /> {detail.bedrooms ?? '-'} bedrooms</span>
                      <span className="inline-flex items-center gap-1"><Bath className="h-4 w-4" /> {detail.bathrooms ?? '-'} bathrooms</span>
                      <span className="inline-flex items-center gap-1"><Building2 className="h-4 w-4" /> {detail.company_name}</span>
                    </div>

                    {detail.description && (
                      <p className="text-sm leading-relaxed text-muted-foreground">{detail.description}</p>
                    )}

                    {detail.media && detail.media.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {detail.media.slice(0, 4).map((media) => (
                          <img
                            key={media.id}
                            src={media.storage_path}
                            alt={detail.title}
                            className="h-44 w-full rounded-md object-cover"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Send Inquiry</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onInquirySubmit}>
                  <div className="md:col-span-1">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      required
                      value={inquiryForm.full_name}
                      onChange={(e) => setInquiryForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-1">
                    <Label htmlFor="phone_e164">Phone</Label>
                    <Input
                      id="phone_e164"
                      required
                      placeholder="+234..."
                      value={inquiryForm.phone_e164}
                      onChange={(e) => setInquiryForm((prev) => ({ ...prev, phone_e164: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inquiryForm.email}
                      onChange={(e) => setInquiryForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="budget_min">Budget Min</Label>
                    <Input
                      id="budget_min"
                      type="number"
                      value={inquiryForm.budget_min}
                      onChange={(e) => setInquiryForm((prev) => ({ ...prev, budget_min: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="budget_max">Budget Max</Label>
                    <Input
                      id="budget_max"
                      type="number"
                      value={inquiryForm.budget_max}
                      onChange={(e) => setInquiryForm((prev) => ({ ...prev, budget_max: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={4}
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm((prev) => ({ ...prev, message: e.target.value }))}
                    />
                  </div>

                  <label className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={inquiryForm.consent_marketing}
                      onChange={(e) => setInquiryForm((prev) => ({ ...prev, consent_marketing: e.target.checked }))}
                    />
                    I agree to receive follow-up marketing communication.
                  </label>

                  <div className="md:col-span-2">
                    <Button type="submit" disabled={!detail?.id || inquiryMutation.isPending}>
                      {inquiryMutation.isPending ? 'Sending...' : 'Submit Inquiry'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
