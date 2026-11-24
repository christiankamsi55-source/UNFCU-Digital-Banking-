import { SupportedLanguage } from '../../types';
import { Translations } from './types';
import { EN_TRANSLATIONS } from './en';
import { WESTERN_TRANSLATIONS } from './western';
import { ASIAN_TRANSLATIONS } from './asian';
import { EUROPEAN_TRANSLATIONS } from './european';
import { MIDEAST_RTL_TRANSLATIONS } from './mideast_rtl';
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES, isRTLLanguage, findLanguageOption } from './languages';
import { localizeNotification, resolveAnnouncementContent } from './notifications';

export type { Translations, LanguageOption, InfoTopicContent } from './types';
export {
  SUPPORTED_LANGUAGES,
  RTL_LANGUAGES,
  isRTLLanguage,
  findLanguageOption,
  findLanguageOption as getLanguageOption,
  localizeNotification,
  resolveAnnouncementContent,
};

export const DICTIONARY: Record<SupportedLanguage, Translations> = {
  en: EN_TRANSLATIONS,
  ...WESTERN_TRANSLATIONS,
  ...ASIAN_TRANSLATIONS,
  ...EUROPEAN_TRANSLATIONS,
  ...MIDEAST_RTL_TRANSLATIONS,
};

export function getTranslations(lang?: SupportedLanguage | string | null): Translations {
  if (!lang) return DICTIONARY.en;
  return DICTIONARY[lang as SupportedLanguage] || DICTIONARY.en;
}
