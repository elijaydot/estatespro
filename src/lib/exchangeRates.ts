export type ExchangeRatesResponse = {
  result: string;
  provider: string;
  time_last_update_utc: string;
  time_next_update_utc: string;
  base_code: string;
  rates: Record<string, number>;
};

export type ExchangeRateState = {
  baseCurrency: string;
  rates: Record<string, number>;
  lastUpdated: string;
  isFallback: boolean;
};

export interface CurrencyDefinition {
  code: string;
  name: string;
  symbol: string;
  country: string;
  region: string;
  fallbackRateToUsd: number;
}

export const SUPPORTED_CURRENCIES: CurrencyDefinition[] = [
  // East Africa
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RWF', country: 'Rwanda', region: 'East Africa', fallbackRateToUsd: 1474.0 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', country: 'Kenya', region: 'East Africa', fallbackRateToUsd: 129.5 },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', country: 'Uganda', region: 'East Africa', fallbackRateToUsd: 3775.0 },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', country: 'Tanzania', region: 'East Africa', fallbackRateToUsd: 2645.0 },
  { code: 'BIF', name: 'Burundian Franc', symbol: 'FBu', country: 'Burundi', region: 'East Africa', fallbackRateToUsd: 2995.0 },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', country: 'Ethiopia', region: 'East Africa', fallbackRateToUsd: 161.0 },
  { code: 'SOS', name: 'Somali Shilling', symbol: 'S', country: 'Somalia', region: 'East Africa', fallbackRateToUsd: 571.0 },
  { code: 'SSP', name: 'South Sudanese Pound', symbol: 'SSP', country: 'South Sudan', region: 'East Africa', fallbackRateToUsd: 5650.0 },

  // West & Central Africa
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', country: 'Nigeria', region: 'West Africa', fallbackRateToUsd: 1330.0 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', country: 'Ghana', region: 'West Africa', fallbackRateToUsd: 11.4 },
  { code: 'XOF', name: 'West African CFA', symbol: 'CFA', country: 'West Africa (WAEMU)', region: 'West Africa', fallbackRateToUsd: 571.0 },
  { code: 'XAF', name: 'Central African CFA', symbol: 'FCFA', country: 'Central Africa (CEMAC)', region: 'Central Africa', fallbackRateToUsd: 571.0 },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC', country: 'DR Congo', region: 'Central Africa', fallbackRateToUsd: 2310.0 },
  { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le', country: 'Sierra Leone', region: 'West Africa', fallbackRateToUsd: 24668.0 },
  { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$', country: 'Liberia', region: 'West Africa', fallbackRateToUsd: 174.0 },
  { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D', country: 'Gambia', region: 'West Africa', fallbackRateToUsd: 74.5 },

  // Southern & Northern Africa
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', country: 'South Africa', region: 'Southern Africa', fallbackRateToUsd: 16.3 },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', country: 'Egypt', region: 'North Africa', fallbackRateToUsd: 52.1 },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD', country: 'Morocco', region: 'North Africa', fallbackRateToUsd: 9.5 },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', country: 'Mauritius', region: 'Southern Africa', fallbackRateToUsd: 47.4 },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P', country: 'Botswana', region: 'Southern Africa', fallbackRateToUsd: 13.9 },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', country: 'Zambia', region: 'Southern Africa', fallbackRateToUsd: 19.3 },
  { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$', country: 'Namibia', region: 'Southern Africa', fallbackRateToUsd: 16.3 },

  // Global Majors & Middle East / Asia
  { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States', region: 'Global', fallbackRateToUsd: 1.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', country: 'European Union', region: 'Europe', fallbackRateToUsd: 0.87 },
  { code: 'GBP', name: 'British Pound', symbol: '£', country: 'United Kingdom', region: 'Europe', fallbackRateToUsd: 0.75 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', country: 'Canada', region: 'North America', fallbackRateToUsd: 1.40 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: 'Australia', region: 'Asia-Pacific', fallbackRateToUsd: 1.41 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', country: 'Switzerland', region: 'Europe', fallbackRateToUsd: 0.82 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', country: 'United Arab Emirates', region: 'Middle East', fallbackRateToUsd: 3.67 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', country: 'Saudi Arabia', region: 'Middle East', fallbackRateToUsd: 3.75 },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', country: 'Qatar', region: 'Middle East', fallbackRateToUsd: 3.64 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', country: 'India', region: 'Asia', fallbackRateToUsd: 96.0 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', country: 'China', region: 'Asia', fallbackRateToUsd: 6.72 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan', region: 'Asia', fallbackRateToUsd: 155.8 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', country: 'Singapore', region: 'Asia', fallbackRateToUsd: 1.28 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', country: 'Brazil', region: 'Americas', fallbackRateToUsd: 5.14 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', country: 'Turkey', region: 'Europe / Middle East', fallbackRateToUsd: 48.7 },
];

export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map(c => [c.code, c.symbol])
);

// Resilient fallback rates table (reference base: USD)
export const FALLBACK_EXCHANGE_RATES: Record<string, number> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map(c => [c.code, c.fallbackRateToUsd])
);

const CACHE_PREFIX = 'fishgate_fx_rates_v1_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchLiveExchangeRates(baseCurrency = 'USD'): Promise<ExchangeRateState> {
  const normalizedBase = (baseCurrency || 'USD').toUpperCase();
  const cacheKey = `${CACHE_PREFIX}${normalizedBase}`;

  // Check localStorage cache
  if (typeof window !== 'undefined') {
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { timestamp: number; data: ExchangeRateState };
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data?.rates) {
          return parsed.data;
        }
      }
    } catch {
      // Ignore cache read errors
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://open.er-api.com/v6/latest/${normalizedBase}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`FX HTTP Error ${response.status}`);
    }

    const payload = (await response.json()) as ExchangeRatesResponse;
    if (payload.result === 'success' && payload.rates) {
      const state: ExchangeRateState = {
        baseCurrency: normalizedBase,
        rates: { ...FALLBACK_EXCHANGE_RATES, ...payload.rates },
        lastUpdated: payload.time_last_update_utc || new Date().toISOString(),
        isFallback: false,
      };

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: state }));
        } catch {
          // Ignore cache write errors
        }
      }

      return state;
    }
  } catch (error) {
    console.warn('Live FX rate fetch failed, falling back to cached/reference rates:', error);
  }

  // Calculate fallback relative to requested base
  const baseRateToUsd = FALLBACK_EXCHANGE_RATES[normalizedBase] || 1.0;
  const relativeRates: Record<string, number> = {};
  for (const [curr, rateToUsd] of Object.entries(FALLBACK_EXCHANGE_RATES)) {
    relativeRates[curr] = rateToUsd / baseRateToUsd;
  }

  return {
    baseCurrency: normalizedBase,
    rates: relativeRates,
    lastUpdated: 'Reference exchange matrix',
    isFallback: true,
  };
}

/**
 * Converts minor currency units from one currency to another using exchange rates.
 * @param amountMinor - Integer minor units (e.g. cents, kobo)
 * @param fromCurrency - Source ISO code (e.g. 'USD', 'NGN')
 * @param toCurrency - Target ISO code (e.g. 'USD', 'NGN')
 * @param rates - Rates dictionary keyed by currency relative to a common base (default USD)
 */
export function convertCurrencyMinor(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number> = FALLBACK_EXCHANGE_RATES
): number {
  if (!amountMinor || isNaN(amountMinor)) return 0;
  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();

  if (from === to) return amountMinor;

  const fromRate = rates[from] ?? FALLBACK_EXCHANGE_RATES[from] ?? 1.0;
  const toRate = rates[to] ?? FALLBACK_EXCHANGE_RATES[to] ?? 1.0;

  if (fromRate <= 0) return amountMinor;

  // Convert from source to base, then base to target
  const amountInBase = amountMinor / fromRate;
  const convertedMinor = Math.round(amountInBase * toRate);

  return convertedMinor;
}
