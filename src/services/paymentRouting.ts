export type PayoutProvider = 'polar';

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'CHF', 'NOK', 'SEK', 'DKK',
  'NGN', 'GHS', 'KES', 'ZAR', 'RWF', 'UGX', 'TZS', 'ZMW', 'XAF', 'XOF',
  'JPY', 'SGD', 'HKD', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'INR', 'AED',
] as const;

const CURRENCY_BY_COUNTRY: Record<string, string> = {
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
  IN: 'INR',
  AE: 'AED',
  FR: 'EUR',
  DE: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  CY: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
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
  India: 'IN',
  'United Arab Emirates': 'AE',
  UAE: 'AE',
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

export const resolvePayoutProvider = (_countryCode?: string): PayoutProvider => {
  return 'polar';
};

export const isPolarSupported = (_countryCode?: string) => {
  return true;
};

export const shouldDefaultToUsd = (countryCode?: string) => {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) return true;
  return !CURRENCY_BY_COUNTRY[normalized];
};

export const resolveDefaultCurrency = (countryCode?: string, fallbackCurrency = 'USD') => {
  const normalized = normalizeCountryCode(countryCode);
  if (CURRENCY_BY_COUNTRY[normalized]) {
    return CURRENCY_BY_COUNTRY[normalized];
  }
  return fallbackCurrency || 'USD';
};
