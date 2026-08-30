import { useQuery } from '@tanstack/react-query';
import { fetchLiveExchangeRates, convertCurrencyMinor, FALLBACK_EXCHANGE_RATES, type ExchangeRateState } from '@/lib/exchangeRates';

export function useExchangeRates(baseCurrency = 'USD') {
  const query = useQuery({
    queryKey: ['exchange-rates', baseCurrency],
    queryFn: () => fetchLiveExchangeRates(baseCurrency),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
  });

  const rates = query.data?.rates || FALLBACK_EXCHANGE_RATES;

  const convert = (amountMinor: number, fromCurrency: string, toCurrency: string) => {
    return convertCurrencyMinor(amountMinor, fromCurrency, toCurrency, rates);
  };

  return {
    ...query,
    rates,
    lastUpdated: query.data?.lastUpdated || 'Reference rates',
    isFallback: Boolean(query.data?.isFallback),
    convert,
  };
}
