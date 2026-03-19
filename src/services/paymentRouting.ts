export type PayoutProvider = 'paystack' | 'stripe';

export const PAYSTACK_COUNTRIES = [
  'NG', 'GH', 'KE', 'RW', 'UG', 'TZ', 'ZM', 'ZA', 'CM', 'CI', 'SN', 'BJ', 'TG', 'ML', 'BF'
] as const;

export const STRIPE_COUNTRIES = [
  'US', 'CA', 'GB', 'AU', 'NZ',
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
  'SE', 'NO', 'IS', 'LI', 'CH', 'JP', 'SG', 'HK',
] as const;

const PAYSTACK_CURRENCY_BY_COUNTRY: Record<string, string> = {
  NG: 'NGN',
  GH: 'GHS',
  KE: 'KES',
  RW: 'RWF',
  UG: 'UGX',
  TZ: 'TZS',
  ZM: 'ZMW',
  ZA: 'ZAR',
  CM: 'XAF',
  CI: 'XOF',
  SN: 'XOF',
  BJ: 'XOF',
  TG: 'XOF',
  ML: 'XOF',
  BF: 'XOF',
};

const STRIPE_CURRENCY_BY_COUNTRY: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  AU: 'AUD',
  NZ: 'NZD',
  JP: 'JPY',
  SG: 'SGD',
  HK: 'HKD',
  CH: 'CHF',
  NO: 'NOK',
  SE: 'SEK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  Nigeria: 'NG',
  Ghana: 'GH',
  Kenya: 'KE',
  Rwanda: 'RW',
  Uganda: 'UG',
  Tanzania: 'TZ',
  Zambia: 'ZM',
  'South Africa': 'ZA',
  Cameroon: 'CM',
  "Côte d'Ivoire": 'CI',
  'Ivory Coast': 'CI',
  Senegal: 'SN',
  Benin: 'BJ',
  Togo: 'TG',
  Mali: 'ML',
  'Burkina Faso': 'BF',
  'United States': 'US',
  'United States of America': 'US',
  USA: 'US',
  Canada: 'CA',
  'United Kingdom': 'GB',
  UK: 'GB',
  Australia: 'AU',
  'New Zealand': 'NZ',
  Japan: 'JP',
  Singapore: 'SG',
  'Hong Kong': 'HK',
  France: 'FR',
  Germany: 'DE',
  Netherlands: 'NL',
  Belgium: 'BE',
  Switzerland: 'CH',
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
  if (PAYSTACK_COUNTRIES.includes(normalized as (typeof PAYSTACK_COUNTRIES)[number])) {
    return 'paystack';
  }
  return 'stripe';
};

export const isPaystackRegion = (countryCode?: string) => {
  const normalized = normalizeCountryCode(countryCode);
  return PAYSTACK_COUNTRIES.includes(normalized as (typeof PAYSTACK_COUNTRIES)[number]);
};

export const isStripeRegion = (countryCode?: string) => {
  const normalized = normalizeCountryCode(countryCode);
  return STRIPE_COUNTRIES.includes(normalized as (typeof STRIPE_COUNTRIES)[number]);
};

export const shouldDefaultToUsd = (countryCode?: string) => {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) return true;
  if (isPaystackRegion(normalized)) return false;
  if (isStripeRegion(normalized)) return false;
  return true;
};

export const resolveDefaultCurrency = (countryCode?: string, fallbackCurrency = 'USD') => {
  const normalized = normalizeCountryCode(countryCode);
  if (PAYSTACK_CURRENCY_BY_COUNTRY[normalized]) {
    return PAYSTACK_CURRENCY_BY_COUNTRY[normalized];
  }
  if (STRIPE_CURRENCY_BY_COUNTRY[normalized]) {
    return STRIPE_CURRENCY_BY_COUNTRY[normalized];
  }
  if (isStripeRegion(normalized)) {
    return 'EUR';
  }
  if (shouldDefaultToUsd(normalized)) {
    return 'USD';
  }
  return fallbackCurrency || 'USD';
};
