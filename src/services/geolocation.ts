const COUNTRY_TO_CURRENCY: Record<string, { code: string; symbol: string }> = {
  US: { code: 'USD', symbol: '$' },
  GB: { code: 'GBP', symbol: '£' },
  AU: { code: 'AUD', symbol: 'A$' },
  CA: { code: 'CAD', symbol: 'C$' },
  IE: { code: 'EUR', symbol: '€' },
  NZ: { code: 'NZD', symbol: 'NZ$' },
  ZA: { code: 'ZAR', symbol: 'R' },
  NG: { code: 'NGN', symbol: '₦' },
  GH: { code: 'GHS', symbol: 'GH₵' },
  KE: { code: 'KES', symbol: 'KSh' },
  UG: { code: 'UGX', symbol: 'USh' },
  TZ: { code: 'TZS', symbol: 'TSh' },
  RW: { code: 'RWF', symbol: 'FRw' },
  FR: { code: 'EUR', symbol: '€' },
  BE: { code: 'EUR', symbol: '€' },
  CH: { code: 'CHF', symbol: 'CHF' },
  DE: { code: 'EUR', symbol: '€' },
  AT: { code: 'EUR', symbol: '€' },
  ES: { code: 'EUR', symbol: '€' },
  IT: { code: 'EUR', symbol: '€' },
  NL: { code: 'EUR', symbol: '€' },
  PT: { code: 'EUR', symbol: '€' },
  MX: { code: 'MXN', symbol: 'MX$' },
  BR: { code: 'BRL', symbol: 'R$' },
  AR: { code: 'ARS', symbol: 'AR$' },
  CO: { code: 'COP', symbol: 'CO$' },
  IN: { code: 'INR', symbol: '₹' },
  BD: { code: 'BDT', symbol: '৳' },
  CN: { code: 'CNY', symbol: '¥' },
  JP: { code: 'JPY', symbol: '¥' },
  KR: { code: 'KRW', symbol: '₩' },
  SA: { code: 'SAR', symbol: 'SR' },
  AE: { code: 'AED', symbol: 'AED' },
  EG: { code: 'EGP', symbol: 'E£' },
  TR: { code: 'TRY', symbol: '₺' },
  RU: { code: 'RUB', symbol: '₽' },
  ID: { code: 'IDR', symbol: 'Rp' },
  VN: { code: 'VND', symbol: '₫' },
};

const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  US: 'English',
  GB: 'English',
  AU: 'English',
  CA: 'English',
  IE: 'English',
  NZ: 'English',
  ZA: 'English',
  NG: 'English',
  GH: 'English',
  KE: 'English',
  UG: 'English',
  TZ: 'Swahili',
  RW: 'Kinyarwanda',
  FR: 'French',
  BE: 'French',
  CH: 'French',
  SN: 'French',
  CI: 'French',
  CM: 'French',
  CD: 'French',
  MG: 'French',
  ES: 'Spanish',
  MX: 'Spanish',
  AR: 'Spanish',
  CO: 'Spanish',
  CL: 'Spanish',
  PE: 'Spanish',
  VE: 'Spanish',
  PT: 'Portuguese',
  BR: 'Portuguese',
  AO: 'Portuguese',
  MZ: 'Portuguese',
  DE: 'German',
  AT: 'German',
  SA: 'Arabic',
  AE: 'Arabic',
  EG: 'Arabic',
  MA: 'Arabic',
  DZ: 'Arabic',
  IQ: 'Arabic',
  JO: 'Arabic',
  LB: 'Arabic',
  IN: 'Hindi',
  BD: 'Bengali',
  CN: 'Chinese (Simplified)',
  TW: 'Chinese (Traditional)',
  HK: 'Chinese (Traditional)',
  JP: 'Japanese',
  KR: 'Korean',
  IT: 'Italian',
  NL: 'Dutch',
  RU: 'Russian',
  TR: 'Turkish',
  ID: 'Indonesian',
  VN: 'Vietnamese',
};

export interface CurrencyInfo {
  code: string;
  symbol: string;
}

export interface GeolocationResult {
  countryCode: string;
  language: string;
  currency: CurrencyInfo;
}

const BROWSER_LANG_TO_LANGUAGE: Record<string, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  pt: 'Portuguese',
  de: 'German',
  it: 'Italian',
  nl: 'Dutch',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  bn: 'Bengali',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  tr: 'Turkish',
  id: 'Indonesian',
  vi: 'Vietnamese',
  sw: 'Swahili',
  rw: 'Kinyarwanda',
};

const getBrowserPreferredLanguage = (): string | null => {
  const browserLang = navigator.language || (navigator as any).userLanguage;
  if (!browserLang) return null;

  const langCode = browserLang.split('-')[0].toLowerCase();
  return BROWSER_LANG_TO_LANGUAGE[langCode] || null;
};

export const detectLocationLanguage = async (): Promise<GeolocationResult | null> => {
  const browserLanguage = getBrowserPreferredLanguage();

  try {
    const response = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      if (data.country_code) {
        const countryCode = data.country_code;
        const language = browserLanguage || COUNTRY_TO_LANGUAGE[countryCode] || 'English';
        const currency = COUNTRY_TO_CURRENCY[countryCode] || { code: 'USD', symbol: '$' };
        return { countryCode, language, currency };
      }
    }
  } catch (error) {
    console.warn('Primary geolocation failed:', error);
  }

  try {
    const response = await fetch('https://ip-api.com/json/?fields=countryCode', { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      if (data.countryCode) {
        const countryCode = data.countryCode;
        const language = browserLanguage || COUNTRY_TO_LANGUAGE[countryCode] || 'English';
        const currency = COUNTRY_TO_CURRENCY[countryCode] || { code: 'USD', symbol: '$' };
        return { countryCode, language, currency };
      }
    }
  } catch (error) {
    console.warn('Fallback geolocation failed:', error);
  }

  if (browserLanguage) {
    return { countryCode: 'US', language: browserLanguage, currency: { code: 'USD', symbol: '$' } };
  }

  return null;
};

export const getCurrencyForCountry = (countryCode: string): CurrencyInfo => {
  return COUNTRY_TO_CURRENCY[countryCode?.toUpperCase()] || { code: 'USD', symbol: '$' };
};

export const fetchExchangeRate = async (fromCurrency: string, toCurrency: string): Promise<number | null> => {
  if (fromCurrency === toCurrency) return 1;

  try {
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${fromCurrency}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.rates?.[toCurrency]) {
        return data.rates[toCurrency];
      }
    }
  } catch (error) {
    console.warn('Primary exchange rate API failed:', error);
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.rates?.[toCurrency]) {
        return data.rates[toCurrency];
      }
    }
  } catch (error) {
    console.warn('Fallback exchange rate API failed:', error);
  }

  return null;
};

export const getLanguageForCountry = (countryCode: string): string => {
  return COUNTRY_TO_LANGUAGE[countryCode?.toUpperCase()] || 'English';
};
