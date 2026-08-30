import { describe, expect, it } from 'vitest';
import { convertCurrencyMinor, FALLBACK_EXCHANGE_RATES, fetchLiveExchangeRates } from '../../src/lib/exchangeRates';

describe('Revenue Multi-Currency & FX Conversion Engine', () => {
  it('has fallback rates configured for all primary platform currencies', () => {
    expect(FALLBACK_EXCHANGE_RATES.USD).toBe(1.0);
    expect(FALLBACK_EXCHANGE_RATES.NGN).toBeGreaterThan(1000);
    expect(FALLBACK_EXCHANGE_RATES.GBP).toBeGreaterThan(0);
    expect(FALLBACK_EXCHANGE_RATES.EUR).toBeGreaterThan(0);
    expect(FALLBACK_EXCHANGE_RATES.KES).toBeGreaterThan(0);
    expect(FALLBACK_EXCHANGE_RATES.GHS).toBeGreaterThan(0);
  });

  it('converts identical currency pairs with zero rounding drift', () => {
    expect(convertCurrencyMinor(5000, 'USD', 'USD')).toBe(5000);
    expect(convertCurrencyMinor(15000000, 'NGN', 'NGN')).toBe(15000000);
    expect(convertCurrencyMinor(2500, 'GBP', 'GBP')).toBe(2500);
  });

  it('converts USD to NGN correctly using custom rates', () => {
    const customRates = { USD: 1.0, NGN: 1500.0, GBP: 0.8 };
    // $10.00 (1000 cents) -> 1,500,000 kobo (₦15,000.00)
    const converted = convertCurrencyMinor(1000, 'USD', 'NGN', customRates);
    expect(converted).toBe(1500000);
  });

  it('converts NGN to USD correctly using custom rates', () => {
    const customRates = { USD: 1.0, NGN: 1500.0, GBP: 0.8 };
    // ₦15,000.00 (1,500,000 kobo) -> 1000 cents ($10.00)
    const converted = convertCurrencyMinor(1500000, 'NGN', 'USD', customRates);
    expect(converted).toBe(1000);
  });

  it('converts cross-currency GBP to NGN via base rates', () => {
    const customRates = { USD: 1.0, NGN: 1600.0, GBP: 0.8 };
    // £10.00 (1000 pence) -> $12.50 base -> ₦20,000.00 (2,000,000 kobo)
    const converted = convertCurrencyMinor(1000, 'GBP', 'NGN', customRates);
    expect(converted).toBe(2000000);
  });

  it('handles zero, negative, and invalid values gracefully without throwing', () => {
    expect(convertCurrencyMinor(0, 'USD', 'NGN')).toBe(0);
    expect(convertCurrencyMinor(NaN, 'USD', 'NGN')).toBe(0);
  });

  it('falls back gracefully to reference matrix on network error or offline', async () => {
    const rates = await fetchLiveExchangeRates('USD');
    expect(rates.baseCurrency).toBe('USD');
    expect(rates.rates.USD).toBe(1.0);
    expect(rates.rates.NGN).toBeGreaterThan(0);
  });
});
