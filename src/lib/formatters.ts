import { SupportedLanguage, Transaction } from '../types';
import { findCountryByCode } from './countries';

export const LANGUAGE_TO_LOCALE: Record<SupportedLanguage, string> = {
  en: 'en-US',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  vi: 'vi-VN',
  it: 'it-IT',
  fr: 'fr-FR',
  es: 'es-ES',
  pt: 'pt-PT',
  'pt-BR': 'pt-BR',
  de: 'de-DE',
  nl: 'nl-NL',
  ar: 'ar-SA',
  ja: 'ja-JP',
  ko: 'ko-KR',
  hi: 'hi-IN',
  ur: 'ur-PK',
  bn: 'bn-BD',
  id: 'id-ID',
  ms: 'ms-MY',
  th: 'th-TH',
  tr: 'tr-TR',
  ru: 'ru-RU',
  uk: 'uk-UA',
  pl: 'pl-PL',
  el: 'el-GR',
  sv: 'sv-SE',
  no: 'nb-NO',
  da: 'da-DK',
  fi: 'fi-FI',
  he: 'he-IL',
  fa: 'fa-IR',
  fil: 'fil-PH',
  ro: 'ro-RO',
  cs: 'cs-CZ',
  hu: 'hu-HU',
  sk: 'sk-SK',
  ca: 'ca-ES',
  bg: 'bg-BG',
};

export function isIncomingTransaction(tx: Transaction): boolean {
  if (tx.type === 'admin_credit') return true;
  if (
    tx.type === 'admin_adjustment' &&
    typeof tx.newBalance === 'number' &&
    typeof tx.previousBalance === 'number'
  ) {
    return tx.newBalance >= tx.previousBalance;
  }
  return false;
}

/**
 * Resolves the active BCP 47 formatting locale cleanly without ever mutating currency values.
 * If a specific country code is selected, uses the regional number/date pattern matched with
 * the active language script so dates and separators respect both preferences.
 */
export function resolveFormattingLocale(
  language?: SupportedLanguage | string | null,
  countryCode?: string | null
): { dateLocale: string; numberLocale: string } {
  const langKey = (language || (typeof localStorage !== 'undefined' ? localStorage.getItem('ungb_language') : 'en') || 'en') as SupportedLanguage;
  const langLocale = LANGUAGE_TO_LOCALE[langKey] || 'en-US';
  const storedCountry =
    countryCode || (typeof localStorage !== 'undefined' ? localStorage.getItem('ungb_country') : null);

  if (!storedCountry) {
    return { dateLocale: langLocale, numberLocale: langLocale };
  }

  const country = findCountryByCode(storedCountry);
  return {
    dateLocale: langLocale,
    numberLocale: country.numberLocale || langLocale,
  };
}

export function formatRegionalDate(
  isoDate: string,
  language?: SupportedLanguage | string | null,
  countryCode?: string | null
): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  const { dateLocale } = resolveFormattingLocale(language, countryCode);
  try {
    return new Intl.DateTimeFormat(dateLocale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

export function formatRegionalTime(
  isoDate: string,
  language?: SupportedLanguage | string | null,
  countryCode?: string | null
): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  const { dateLocale } = resolveFormattingLocale(language, countryCode);
  try {
    return new Intl.DateTimeFormat(dateLocale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}

export function formatTransactionDateTime(
  isoDate: string,
  language?: SupportedLanguage | string | null,
  countryCode?: string | null
): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  const dateStr = formatRegionalDate(isoDate, language, countryCode);
  const timeStr = formatRegionalTime(isoDate, language, countryCode);
  return timeStr ? `${dateStr} • ${timeStr}` : dateStr;
}

/**
 * Formats an exact USD ledger amount (numeric only, 2 decimal places) according to the active
 * country/language number grouping & decimal separators while NEVER converting currency or changing numbers.
 */
export function formatCurrencyAmount(
  amount: number,
  language?: SupportedLanguage | string | null,
  countryCode?: string | null
): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const { numberLocale } = resolveFormattingLocale(language, countryCode);
  try {
    return new Intl.NumberFormat(numberLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return safe.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

/**
 * Formats an exact USD amount with `$` / `USD` styling per locale without altering numeric value.
 */
export function formatRegionalCurrency(
  usdAmount: number,
  language?: SupportedLanguage | string | null,
  countryCode?: string | null,
  includeCode: boolean = false
): string {
  const numericFormatted = formatCurrencyAmount(usdAmount, language, countryCode);
  return includeCode ? `$${numericFormatted} USD` : `$${numericFormatted}`;
}

export function formatRegionalNumber(
  value: number,
  language?: SupportedLanguage | string | null,
  countryCode?: string | null
): string {
  const safe = Number.isFinite(value) ? value : 0;
  const { numberLocale } = resolveFormattingLocale(language, countryCode);
  try {
    return new Intl.NumberFormat(numberLocale).format(safe);
  } catch {
    return safe.toLocaleString('en-US');
  }
}

export function formatPhoneNumber(dialCode?: string | null, phoneNumber?: string | null): string {
  const cleanDial = (dialCode || '').trim();
  const cleanNum = (phoneNumber || '').trim();
  if (!cleanNum) return cleanDial;
  return cleanDial ? `${cleanDial} ${cleanNum}` : cleanNum;
}
