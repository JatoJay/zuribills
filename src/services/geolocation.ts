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

export interface GeolocationResult {
  countryCode: string;
  language: string;
}

export const detectLocationLanguage = async (): Promise<GeolocationResult | null> => {
  try {
    const response = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = await response.json();
    const countryCode = data.country_code || data.country || '';
    const language = COUNTRY_TO_LANGUAGE[countryCode] || 'English';
    return { countryCode, language };
  } catch (error) {
    console.warn('Geolocation detection failed:', error);
    return null;
  }
};

export const getLanguageForCountry = (countryCode: string): string => {
  return COUNTRY_TO_LANGUAGE[countryCode?.toUpperCase()] || 'English';
};
