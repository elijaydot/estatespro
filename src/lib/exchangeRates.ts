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

// Resilient fallback rates table (reference base: USD)
export const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  RWF: 1380.0,
  NGN: 1550.0,
  GBP: 0.78,
  EUR: 0.92,
  KES: 130.0,
  GHS: 15.5,
  ZAR: 18.2,
  CAD: 1.36,
  AUD: 1.52,
};

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
