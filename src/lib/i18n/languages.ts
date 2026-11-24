import { SupportedLanguage } from '../../types';
import { LanguageOption } from './types';

/**
 * 38 supported international languages (strictly zero African languages).
 * Covers Americas, Europe, Asia, and Middle East with RTL metadata.
 */
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', flag: '🇺🇸', rtl: false },
  { code: 'zh-CN', nativeName: '简体中文', englishName: 'Chinese (Simplified)', flag: '🇨🇳', rtl: false },
  { code: 'zh-TW', nativeName: '繁體中文', englishName: 'Chinese (Traditional)', flag: '🇹🇼', rtl: false },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', flag: '🇪🇸', rtl: false },
  { code: 'fr', nativeName: 'Français', englishName: 'French', flag: '🇫🇷', rtl: false },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', flag: '🇵🇹', rtl: false },
  { code: 'pt-BR', nativeName: 'Português (Brasil)', englishName: 'Portuguese (Brazil)', flag: '🇧🇷', rtl: false },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', flag: '🇩🇪', rtl: false },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', flag: '🇮🇹', rtl: false },
  { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch', flag: '🇳🇱', rtl: false },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', flag: '🇸🇦', rtl: true },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', flag: '🇯🇵', rtl: false },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean', flag: '🇰🇷', rtl: false },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', flag: '🇻🇳', rtl: false },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', flag: '🇮🇳', rtl: false },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', flag: '🇵🇰', rtl: true },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', flag: '🇧🇩', rtl: false },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', flag: '🇮🇩', rtl: false },
  { code: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay', flag: '🇲🇾', rtl: false },
  { code: 'th', nativeName: 'ไทย', englishName: 'Thai', flag: '🇹🇭', rtl: false },
  { code: 'fil', nativeName: 'Filipino', englishName: 'Filipino', flag: '🇵🇭', rtl: false },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', flag: '🇹🇷', rtl: false },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian', flag: '🇷🇺', rtl: false },
  { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian', flag: '🇺🇦', rtl: false },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish', flag: '🇵🇱', rtl: false },
  { code: 'el', nativeName: 'Ελληνικά', englishName: 'Greek', flag: '🇬🇷', rtl: false },
  { code: 'sv', nativeName: 'Svenska', englishName: 'Swedish', flag: '🇸🇪', rtl: false },
  { code: 'no', nativeName: 'Norsk', englishName: 'Norwegian', flag: '🇳🇴', rtl: false },
  { code: 'da', nativeName: 'Dansk', englishName: 'Danish', flag: '🇩🇰', rtl: false },
  { code: 'fi', nativeName: 'Suomi', englishName: 'Finnish', flag: '🇫🇮', rtl: false },
  { code: 'he', nativeName: 'עברית', englishName: 'Hebrew', flag: '🇮🇱', rtl: true },
  { code: 'fa', nativeName: 'فارسی', englishName: 'Persian', flag: '🇮🇷', rtl: true },
  { code: 'ro', nativeName: 'Română', englishName: 'Romanian', flag: '🇷🇴', rtl: false },
  { code: 'cs', nativeName: 'Čeština', englishName: 'Czech', flag: '🇨🇿', rtl: false },
  { code: 'hu', nativeName: 'Magyar', englishName: 'Hungarian', flag: '🇭🇺', rtl: false },
  { code: 'sk', nativeName: 'Slovenčina', englishName: 'Slovak', flag: '🇸🇰', rtl: false },
  { code: 'ca', nativeName: 'Català', englishName: 'Catalan', flag: '🇪🇸', rtl: false },
  { code: 'bg', nativeName: 'Български', englishName: 'Bulgarian', flag: '🇧🇬', rtl: false },
];

export const RTL_LANGUAGES: SupportedLanguage[] = ['ar', 'ur', 'he', 'fa'];

export function isRTLLanguage(lang: SupportedLanguage | string): boolean {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage);
}

export function findLanguageOption(code?: string | null): LanguageOption {
  if (!code) return SUPPORTED_LANGUAGES[0];
  return (
    SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === code.trim().toLowerCase()) ||
    SUPPORTED_LANGUAGES[0]
  );
}
