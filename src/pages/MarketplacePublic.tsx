import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BedDouble, Bath, Building2, ChevronLeft, ChevronRight, Heart, Loader2, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  useCreateMarketplaceInquiry,
  useMarketplaceListingDetail,
  useMarketplaceListings,
} from '@/hooks/useMarketplace';

const PAGE_SIZE = 12;
const FAVORITES_STORAGE_KEY = 'marketplace_favorite_listing_ids_v1';
const SAVED_SEARCHES_STORAGE_KEY = 'marketplace_saved_searches_v1';

type SavedSearch = {
  id: string;
  label: string;
  city: string;
  area: string;
  minRent: string;
  maxRent: string;
  bedrooms: string;
};

export default function MarketplacePublic() {
  const navigate = useNavigate();
  const { idOrSlug, citySlug, areaSlug } = useParams();

  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [page, setPage] = useState(1);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [favoriteListingIds, setFavoriteListingIds] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

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
      page,
      pageSize: PAGE_SIZE,
    }),
    [area, bedrooms, city, maxRent, minRent, page],
  );

  const listingsQuery = useMarketplaceListings(listParams);
  const listings = useMemo(() => listingsQuery.data?.data ?? [], [listingsQuery.data]);

  const hasNextPage = useMemo(() => {
    if (listings.length === 0) return false;
    return listings.length >= PAGE_SIZE;
  }, [listings]);

  useEffect(() => {
    if (cityFromPath) setCity(cityFromPath);
    if (areaFromPath) setArea(areaFromPath);
  }, [cityFromPath, areaFromPath]);

  useEffect(() => {
    setPage(1);
  }, [city, area, minRent, maxRent, bedrooms]);

  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const parsedFavorites = storedFavorites ? (JSON.parse(storedFavorites) as string[]) : [];
      setFavoriteListingIds(Array.isArray(parsedFavorites) ? parsedFavorites : []);
    } catch {
      setFavoriteListingIds([]);
    }

    try {
      const storedSearches = localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY);
      const parsedSearches = storedSearches ? (JSON.parse(storedSearches) as SavedSearch[]) : [];
      setSavedSearches(Array.isArray(parsedSearches) ? parsedSearches : []);
    } catch {
      setSavedSearches([]);
    }
  }, []);

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
    setActiveMediaIndex(0);
  }, [detail?.id]);

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

  const mapQuery = useMemo(() => {
    if (detail) {
      if (detail.latitude != null && detail.longitude != null) {
        return `${detail.latitude},${detail.longitude}`;
      }
      return [detail.title, detail.city, detail.area].filter(Boolean).join(', ');
    }

    return [city || cityFromPath, area || areaFromPath].filter(Boolean).join(', ');
  }, [area, areaFromPath, city, cityFromPath, detail]);

  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery || 'Nigeria')}&z=14&output=embed`;
  const mapOpenUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery || 'Nigeria')}`;

  const currentMedia = detail?.media?.[activeMediaIndex] || null;

  const handleSelectListing = (value: string) => {
    setSelectedListingIdOrSlug(value);
    const base = citySlug ? `/rent/${citySlug}${areaSlug ? `/${areaSlug}` : ''}` : '/marketplace';
    navigate(`${base}/${value}`);
  };

  const toggleFavorite = (listingId: string) => {
    setFavoriteListingIds((current) => {
      const next = current.includes(listingId)
        ? current.filter((id) => id !== listingId)
        : [...current, listingId];

      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const saveCurrentSearch = () => {
    const label = [city || 'All cities', area || 'All areas', bedrooms ? `${bedrooms} bed` : 'Any bed']
      .filter(Boolean)
      .join(' · ');

    const nextSearch: SavedSearch = {
      id: crypto.randomUUID(),
      label,
      city,
      area,
      minRent,
      maxRent,
      bedrooms,
    };

    setSavedSearches((current) => {
      const next = [nextSearch, ...current].slice(0, 10);
      localStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const applySavedSearch = (search: SavedSearch) => {
    setCity(search.city);
    setArea(search.area);
    setMinRent(search.minRent);
    setMaxRent(search.maxRent);
    setBedrooms(search.bedrooms);
    setPage(1);
  };

  const deleteSavedSearch = (searchId: string) => {
    setSavedSearches((current) => {
      const next = current.filter((search) => search.id !== searchId);
      localStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge variant="secondary">Public Beta</Badge>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-5">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area" />
            <Input value={minRent} onChange={(e) => setMinRent(e.target.value)} placeholder="Min rent" type="number" />
            <Input value={maxRent} onChange={(e) => setMaxRent(e.target.value)} placeholder="Max rent" type="number" />
            <Input value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="Bedrooms" type="number" />
            <div className="md:col-span-5 flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={saveCurrentSearch}>Save Search</Button>
              {savedSearches.map((search) => (
                <div key={search.id} className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-xs">
                  <button type="button" onClick={() => applySavedSearch(search)}>{search.label}</button>
                  <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => deleteSavedSearch(search.id)}>x</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Map View</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe title="Marketplace map" src={mapEmbedUrl} className="h-64 w-full rounded-md border border-border/60" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            <div className="mt-2">
              <a href={mapOpenUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                Open in Maps
              </a>
            </div>
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
                  const isFavorite = favoriteListingIds.includes(listing.id);
                  return (
                    <div
                      key={listing.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectListing(listing.slug || listing.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleSelectListing(listing.slug || listing.id);
                        }
                      }}
                      className={`relative w-full cursor-pointer rounded-lg border p-3 pr-10 text-left transition ${selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/60'}`}
                    >
                      <button
                        type="button"
                        aria-label="Toggle favorite"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleFavorite(listing.id);
                        }}
                        className={`absolute right-2 top-2 rounded-full p-1 ${isFavorite ? 'text-rose-500' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                      </button>
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
                    </div>
                  );
                })}

                <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span>Page {page}</span>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={page <= 1 || listingsQuery.isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
                    <Button type="button" size="sm" variant="outline" disabled={!hasNextPage || listingsQuery.isLoading} onClick={() => setPage((current) => current + 1)}>Next</Button>
                  </div>
                </div>
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
                      <div className="space-y-3">
                        {currentMedia ? (
                          <div className="relative">
                            <img
                              src={currentMedia.storage_path}
                              alt={detail.title}
                              className="h-64 w-full rounded-md object-cover"
                              loading="lazy"
                            />
                            {detail.media.length > 1 ? (
                              <>
                                <button
                                  type="button"
                                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1"
                                  onClick={() => setActiveMediaIndex((current) => (current - 1 + detail.media.length) % detail.media.length)}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1"
                                  onClick={() => setActiveMediaIndex((current) => (current + 1) % detail.media.length)}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="grid grid-cols-4 gap-2">
                          {detail.media.map((media, index) => (
                            <button
                              key={media.id}
                              type="button"
                              onClick={() => setActiveMediaIndex(index)}
                              className={`overflow-hidden rounded-md border ${activeMediaIndex === index ? 'border-primary' : 'border-border/60'}`}
                            >
                              <img src={media.storage_path} alt={`${detail.title} media ${index + 1}`} className="h-16 w-full object-cover" loading="lazy" />
                            </button>
                          ))}
                        </div>
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
