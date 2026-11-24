import { Country } from '../types';

/**
 * Worldwide Country & Region Directory (strictly excluding African countries).
 * Selecting a country sets regional formatting metadata & phone dialing code
 * cleanly as an independent preference without altering the user's selected UI language.
 */
export const COUNTRIES: Country[] = [
  // Americas
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸', region: 'Americas', dateLocale: 'en-US', numberLocale: 'en-US', currencyCode: 'USD', currencySymbol: '$', suggestedLang: 'en' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦', region: 'Americas', dateLocale: 'en-CA', numberLocale: 'en-CA', currencyCode: 'CAD', currencySymbol: 'CA$', suggestedLang: 'en' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽', region: 'Americas', dateLocale: 'es-MX', numberLocale: 'es-MX', currencyCode: 'MXN', currencySymbol: 'MX$', suggestedLang: 'es' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷', region: 'Americas', dateLocale: 'pt-BR', numberLocale: 'pt-BR', currencyCode: 'BRL', currencySymbol: 'R$', suggestedLang: 'pt-BR' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷', region: 'Americas', dateLocale: 'es-AR', numberLocale: 'es-AR', currencyCode: 'ARS', currencySymbol: 'ARS', suggestedLang: 'es' },
  { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴', region: 'Americas', dateLocale: 'es-CO', numberLocale: 'es-CO', currencyCode: 'COP', currencySymbol: 'COP', suggestedLang: 'es' },
  { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱', region: 'Americas', dateLocale: 'es-CL', numberLocale: 'es-CL', currencyCode: 'CLP', currencySymbol: 'CLP', suggestedLang: 'es' },
  { name: 'Peru', code: 'PE', dialCode: '+51', flag: '🇵🇪', region: 'Americas', dateLocale: 'es-PE', numberLocale: 'es-PE', currencyCode: 'PEN', currencySymbol: 'S/', suggestedLang: 'es' },

  // Europe
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧', region: 'Europe', dateLocale: 'en-GB', numberLocale: 'en-GB', currencyCode: 'GBP', currencySymbol: '£', suggestedLang: 'en' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭', region: 'Europe', dateLocale: 'de-CH', numberLocale: 'de-CH', currencyCode: 'CHF', currencySymbol: 'CHF', suggestedLang: 'de' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪', region: 'Europe', dateLocale: 'de-DE', numberLocale: 'de-DE', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'de' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷', region: 'Europe', dateLocale: 'fr-FR', numberLocale: 'fr-FR', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'fr' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹', region: 'Europe', dateLocale: 'it-IT', numberLocale: 'it-IT', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'it' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸', region: 'Europe', dateLocale: 'es-ES', numberLocale: 'es-ES', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'es' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹', region: 'Europe', dateLocale: 'pt-PT', numberLocale: 'pt-PT', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'pt' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱', region: 'Europe', dateLocale: 'nl-NL', numberLocale: 'nl-NL', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'nl' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪', region: 'Europe', dateLocale: 'nl-BE', numberLocale: 'nl-BE', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'fr' },
  { name: 'Luxembourg', code: 'LU', dialCode: '+352', flag: '🇱🇺', region: 'Europe', dateLocale: 'fr-LU', numberLocale: 'fr-LU', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'fr' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪', region: 'Europe', dateLocale: 'en-IE', numberLocale: 'en-IE', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'en' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹', region: 'Europe', dateLocale: 'de-AT', numberLocale: 'de-AT', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'de' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪', region: 'Europe', dateLocale: 'sv-SE', numberLocale: 'sv-SE', currencyCode: 'SEK', currencySymbol: 'kr', suggestedLang: 'sv' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴', region: 'Europe', dateLocale: 'nb-NO', numberLocale: 'nb-NO', currencyCode: 'NOK', currencySymbol: 'kr', suggestedLang: 'no' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰', region: 'Europe', dateLocale: 'da-DK', numberLocale: 'da-DK', currencyCode: 'DKK', currencySymbol: 'kr', suggestedLang: 'da' },
  { name: 'Finland', code: 'FI', dialCode: '+358', flag: '🇫🇮', region: 'Europe', dateLocale: 'fi-FI', numberLocale: 'fi-FI', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'fi' },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: '🇵🇱', region: 'Europe', dateLocale: 'pl-PL', numberLocale: 'pl-PL', currencyCode: 'PLN', currencySymbol: 'zł', suggestedLang: 'pl' },
  { name: 'Czechia', code: 'CZ', dialCode: '+420', flag: '🇨🇿', region: 'Europe', dateLocale: 'cs-CZ', numberLocale: 'cs-CZ', currencyCode: 'CZK', currencySymbol: 'Kč', suggestedLang: 'cs' },
  { name: 'Slovakia', code: 'SK', dialCode: '+421', flag: '🇸🇰', region: 'Europe', dateLocale: 'sk-SK', numberLocale: 'sk-SK', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'sk' },
  { name: 'Hungary', code: 'HU', dialCode: '+36', flag: '🇭🇺', region: 'Europe', dateLocale: 'hu-HU', numberLocale: 'hu-HU', currencyCode: 'HUF', currencySymbol: 'Ft', suggestedLang: 'hu' },
  { name: 'Romania', code: 'RO', dialCode: '+40', flag: '🇷🇴', region: 'Europe', dateLocale: 'ro-RO', numberLocale: 'ro-RO', currencyCode: 'RON', currencySymbol: 'lei', suggestedLang: 'ro' },
  { name: 'Bulgaria', code: 'BG', dialCode: '+359', flag: '🇧🇬', region: 'Europe', dateLocale: 'bg-BG', numberLocale: 'bg-BG', currencyCode: 'BGN', currencySymbol: 'лв', suggestedLang: 'bg' },
  { name: 'Greece', code: 'GR', dialCode: '+30', flag: '🇬🇷', region: 'Europe', dateLocale: 'el-GR', numberLocale: 'el-GR', currencyCode: 'EUR', currencySymbol: '€', suggestedLang: 'el' },
  { name: 'Ukraine', code: 'UA', dialCode: '+380', flag: '🇺🇦', region: 'Europe', dateLocale: 'uk-UA', numberLocale: 'uk-UA', currencyCode: 'UAH', currencySymbol: '₴', suggestedLang: 'uk' },

  // Asia
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳', region: 'Asia', dateLocale: 'zh-CN', numberLocale: 'zh-CN', currencyCode: 'CNY', currencySymbol: '¥', suggestedLang: 'zh-CN' },
  { name: 'Taiwan', code: 'TW', dialCode: '+886', flag: '🇹🇼', region: 'Asia', dateLocale: 'zh-TW', numberLocale: 'zh-TW', currencyCode: 'TWD', currencySymbol: 'NT$', suggestedLang: 'zh-TW' },
  { name: 'Hong Kong', code: 'HK', dialCode: '+852', flag: '🇭🇰', region: 'Asia', dateLocale: 'zh-HK', numberLocale: 'en-HK', currencyCode: 'HKD', currencySymbol: 'HK$', suggestedLang: 'zh-TW' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵', region: 'Asia', dateLocale: 'ja-JP', numberLocale: 'ja-JP', currencyCode: 'JPY', currencySymbol: '¥', suggestedLang: 'ja' },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷', region: 'Asia', dateLocale: 'ko-KR', numberLocale: 'ko-KR', currencyCode: 'KRW', currencySymbol: '₩', suggestedLang: 'ko' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳', region: 'Asia', dateLocale: 'en-IN', numberLocale: 'en-IN', currencyCode: 'INR', currencySymbol: '₹', suggestedLang: 'hi' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰', region: 'Asia', dateLocale: 'ur-PK', numberLocale: 'en-PK', currencyCode: 'PKR', currencySymbol: '₨', suggestedLang: 'ur' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩', region: 'Asia', dateLocale: 'bn-BD', numberLocale: 'bn-BD', currencyCode: 'BDT', currencySymbol: '৳', suggestedLang: 'bn' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳', region: 'Asia', dateLocale: 'vi-VN', numberLocale: 'vi-VN', currencyCode: 'VND', currencySymbol: '₫', suggestedLang: 'vi' },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭', region: 'Asia', dateLocale: 'th-TH', numberLocale: 'th-TH', currencyCode: 'THB', currencySymbol: '฿', suggestedLang: 'th' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬', region: 'Asia', dateLocale: 'en-SG', numberLocale: 'en-SG', currencyCode: 'SGD', currencySymbol: 'S$', suggestedLang: 'en' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾', region: 'Asia', dateLocale: 'ms-MY', numberLocale: 'ms-MY', currencyCode: 'MYR', currencySymbol: 'RM', suggestedLang: 'ms' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩', region: 'Asia', dateLocale: 'id-ID', numberLocale: 'id-ID', currencyCode: 'IDR', currencySymbol: 'Rp', suggestedLang: 'id' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭', region: 'Asia', dateLocale: 'en-PH', numberLocale: 'en-PH', currencyCode: 'PHP', currencySymbol: '₱', suggestedLang: 'fil' },

  // Middle East (Non-African)
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪', region: 'Middle East', dateLocale: 'ar-AE', numberLocale: 'en-AE', currencyCode: 'AED', currencySymbol: 'د.إ', suggestedLang: 'ar' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦', region: 'Middle East', dateLocale: 'ar-SA', numberLocale: 'en-SA', currencyCode: 'SAR', currencySymbol: '﷼', suggestedLang: 'ar' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', flag: '🇶🇦', region: 'Middle East', dateLocale: 'ar-QA', numberLocale: 'en-QA', currencyCode: 'QAR', currencySymbol: 'ر.ق', suggestedLang: 'ar' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼', region: 'Middle East', dateLocale: 'ar-KW', numberLocale: 'en-KW', currencyCode: 'KWD', currencySymbol: 'د.ك', suggestedLang: 'ar' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973', flag: '🇧🇭', region: 'Middle East', dateLocale: 'ar-BH', numberLocale: 'en-BH', currencyCode: 'BHD', currencySymbol: '.د.ب', suggestedLang: 'ar' },
  { name: 'Oman', code: 'OM', dialCode: '+968', flag: '🇴🇲', region: 'Middle East', dateLocale: 'ar-OM', numberLocale: 'en-OM', currencyCode: 'OMR', currencySymbol: 'ر.ع.', suggestedLang: 'ar' },
  { name: 'Jordan', code: 'JO', dialCode: '+962', flag: '🇯🇴', region: 'Middle East', dateLocale: 'ar-JO', numberLocale: 'en-JO', currencyCode: 'JOD', currencySymbol: 'د.ا', suggestedLang: 'ar' },
  { name: 'Lebanon', code: 'LB', dialCode: '+961', flag: '🇱🇧', region: 'Middle East', dateLocale: 'ar-LB', numberLocale: 'en-LB', currencyCode: 'LBP', currencySymbol: 'ل.ل', suggestedLang: 'ar' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱', region: 'Middle East', dateLocale: 'he-IL', numberLocale: 'he-IL', currencyCode: 'ILS', currencySymbol: '₪', suggestedLang: 'he' },
  { name: 'Türkiye', code: 'TR', dialCode: '+90', flag: '🇹🇷', region: 'Middle East', dateLocale: 'tr-TR', numberLocale: 'tr-TR', currencyCode: 'TRY', currencySymbol: '₺', suggestedLang: 'tr' },
  { name: 'Iran', code: 'IR', dialCode: '+98', flag: '🇮🇷', region: 'Middle East', dateLocale: 'fa-IR', numberLocale: 'fa-IR', currencyCode: 'IRR', currencySymbol: '﷼', suggestedLang: 'fa' },

  // Oceania
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺', region: 'Oceania', dateLocale: 'en-AU', numberLocale: 'en-AU', currencyCode: 'AUD', currencySymbol: 'A$', suggestedLang: 'en' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿', region: 'Oceania', dateLocale: 'en-NZ', numberLocale: 'en-NZ', currencyCode: 'NZD', currencySymbol: 'NZ$', suggestedLang: 'en' },
];

export function findCountryByCode(code?: string | null): Country {
  if (!code) return COUNTRIES[0];
  return COUNTRIES.find((c) => c.code.toUpperCase() === code.trim().toUpperCase()) || COUNTRIES[0];
}

export function findCountryByDialCode(dialCode: string): Country | undefined {
  return COUNTRIES.find((c) => c.dialCode === dialCode);
}
