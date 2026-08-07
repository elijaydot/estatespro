export type MarketplaceQueryMode = 'list' | 'detail';

export interface MarketplaceListParams {
  city?: string;
  area?: string;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  page?: number;
  pageSize?: number;
}

export interface MarketplaceListing {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  city: string;
  area: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rent_amount: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  available_from: string | null;
  verification_state: string;
  published_at: string | null;
  company_name: string;
  company_logo_url: string | null;
  cover_media_url?: string | null;
  media?: Array<{
    id: string;
    storage_path: string;
    is_cover: boolean;
    sort_order: number;
  }>;
}

export interface MarketplaceListResponse {
  data: MarketplaceListing[];
  meta?: {
    page?: number;
    page_size?: number;
    count?: number;
    correlationId?: string;
  };
  error?: string | null;
}

export interface MarketplaceDetailResponse {
  data: MarketplaceListing;
  meta?: { correlationId?: string };
  error?: string | null;
}

export interface MarketplaceInquiryPayload {
  listing_id: string;
  full_name: string;
  phone_e164: string;
  email?: string;
  message?: string;
  move_in_date?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_channel?: 'phone' | 'email' | 'whatsapp' | 'sms';
  consent_marketing?: boolean;
}

export interface MarketplaceInquiryResponse {
  data: {
    inquiry_id: string;
    lead_id: string;
    reused: boolean;
  };
  meta?: { correlationId?: string };
  error?: string | null;
}

function assertSupabaseFunctionConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!url || !key) {
    throw new Error('Supabase configuration missing for marketplace API calls');
  }

  return { url, key };
}

function functionHeaders(extra?: Record<string, string>) {
  const { key } = assertSupabaseFunctionConfig();

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(extra || {}),
  };
}

function buildFunctionUrl(path: string, query?: URLSearchParams) {
  const { url } = assertSupabaseFunctionConfig();
  const base = `${url.replace(/\/$/, '')}/functions/v1/${path}`;
  const qs = query?.toString();
  return qs ? `${base}?${qs}` : base;
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === 'string') return maybeError;

    const maybeMessage = (payload as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }
  return fallback;
}

export async function fetchMarketplaceListings(params: MarketplaceListParams = {}): Promise<MarketplaceListResponse> {
  const query = new URLSearchParams();
  query.set('mode', 'list');
  query.set('page', String(params.page ?? 1));
  query.set('page_size', String(params.pageSize ?? 20));

  if (params.city) query.set('city', params.city);
  if (params.area) query.set('area', params.area);
  if (typeof params.minRent === 'number') query.set('min_rent', String(params.minRent));
  if (typeof params.maxRent === 'number') query.set('max_rent', String(params.maxRent));
  if (typeof params.bedrooms === 'number') query.set('bedrooms', String(params.bedrooms));

  const response = await fetch(buildFunctionUrl('marketplace-public', query), {
    method: 'GET',
    headers: functionHeaders(),
  });

  const payload = await parseJsonSafe<MarketplaceListResponse>(response);
  if (!response.ok || !payload) {
    throw new Error(getApiErrorMessage(payload, 'Unable to fetch marketplace listings'));
  }

  return payload;
}

export async function fetchMarketplaceListingDetail(idOrSlug: string): Promise<MarketplaceDetailResponse> {
  const query = new URLSearchParams();
  query.set('mode', 'detail');
  query.set('id_or_slug', idOrSlug);

  const response = await fetch(buildFunctionUrl('marketplace-public', query), {
    method: 'GET',
    headers: functionHeaders(),
  });

  const payload = await parseJsonSafe<MarketplaceDetailResponse>(response);
  if (!response.ok || !payload) {
    throw new Error(getApiErrorMessage(payload, 'Unable to fetch marketplace listing detail'));
  }

  return payload;
}

export function generateIdempotencyKey(prefix = 'marketplace-inquiry') {
  return `${prefix}-${crypto.randomUUID()}`;
}

export async function createMarketplaceInquiry(
  payload: MarketplaceInquiryPayload,
  idempotencyKey: string,
): Promise<MarketplaceInquiryResponse> {
  const response = await fetch(buildFunctionUrl('marketplace-inquiry'), {
    method: 'POST',
    headers: functionHeaders({ 'Idempotency-Key': idempotencyKey }),
    body: JSON.stringify(payload),
  });

  const json = await parseJsonSafe<MarketplaceInquiryResponse>(response);
  if (!response.ok || !json) {
    throw new Error(getApiErrorMessage(json, 'Unable to create marketplace inquiry'));
  }

  return json;
}
