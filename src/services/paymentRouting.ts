export type PayoutProvider = 'momo' | 'flutterwave' | 'stripe';

export const MOMO_COUNTRIES = ['RW', 'GH', 'KE', 'ZA'] as const;
export const FLUTTERWAVE_COUNTRIES = ['NG'] as const;
export const STRIPE_COUNTRIES = [
  'US',
  'GB',
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
  'SE', 'NO', 'IS', 'LI', 'CH',
] as const;

const MOMO_CURRENCY_BY_COUNTRY: Record<string, string> = {
  RW: 'RWF',
  GH: 'GHS',
  KE: 'KES',
  ZA: 'ZAR',
};

const FLUTTERWAVE_CURRENCY_BY_COUNTRY: Record<string, string> = {
  NG: 'NGN',
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  Nigeria: 'NG',
  Ghana: 'GH',
  Kenya: 'KE',
  Rwanda: 'RW',
  'South Africa': 'ZA',
  'United States': 'US',
  'United States of America': 'US',
  USA: 'US',
  'United Kingdom': 'GB',
  UK: 'GB',
};

export const normalizeCountryCode = (countryCode?: string) =>
  (countryCode || '').trim().toUpperCase();

export const resolveCountryCode = (countryCode?: string, countryName?: string) => {
  const normalized = normalizeCountryCode(countryCode);
  if (normalized) return normalized;
  if (countryName && COUNTRY_NAME_TO_CODE[countryName]) {
    return COUNTRY_NAME_TO_CODE[countryName];
  }
  return '';
};

export const resolvePayoutProvider = (countryCode?: string): PayoutProvider => {
  const normalized = normalizeCountryCode(countryCode);
  if (MOMO_COUNTRIES.includes(normalized as (typeof MOMO_COUNTRIES)[number])) {
    return 'momo';
  }
  if (FLUTTERWAVE_COUNTRIES.includes(normalized as (typeof FLUTTERWAVE_COUNTRIES)[number])) {
    return 'flutterwave';
  }
  return 'stripe';
};

export const isStripeRegion = (countryCode?: string) => {
  const normalized = normalizeCountryCode(countryCode);
  return STRIPE_COUNTRIES.includes(normalized as (typeof STRIPE_COUNTRIES)[number]);
};

export const shouldDefaultToUsd = (countryCode?: string) => {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) return true;
  if (MOMO_COUNTRIES.includes(normalized as (typeof MOMO_COUNTRIES)[number])) return false;
  if (FLUTTERWAVE_COUNTRIES.includes(normalized as (typeof FLUTTERWAVE_COUNTRIES)[number])) return false;
  if (isStripeRegion(normalized)) return false;
  return true;
};

export const resolveDefaultCurrency = (countryCode?: string, fallbackCurrency = 'USD') => {
  const normalized = normalizeCountryCode(countryCode);
  if (MOMO_CURRENCY_BY_COUNTRY[normalized]) {
    return MOMO_CURRENCY_BY_COUNTRY[normalized];
  }
  if (FLUTTERWAVE_CURRENCY_BY_COUNTRY[normalized]) {
    return FLUTTERWAVE_CURRENCY_BY_COUNTRY[normalized];
  }
  if (shouldDefaultToUsd(normalized)) {
    return 'USD';
  }
  return fallbackCurrency || 'USD';
};
