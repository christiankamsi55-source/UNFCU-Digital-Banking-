import React, { useState, useMemo } from 'react';
import { SupportedLanguage } from '../../types';
import { SUPPORTED_LANGUAGES, getTranslations } from '../../lib/i18n';
import { Search, X, Check, Languages } from 'lucide-react';

interface LanguageSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  theme?: 'dark' | 'light';
}

export const LanguageSelectModal: React.FC<LanguageSelectModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onSelectLanguage,
  theme = 'light',
}) => {
  const [search, setSearch] = useState('');
  const t = getTranslations(selectedLanguage);

  const filteredLanguages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (l) =>
        l.nativeName.toLowerCase().includes(q) ||
        l.englishName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border ${
          isDark
            ? 'bg-[#123047] border-white/15 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 flex items-center justify-between border-b ${
            isDark
              ? 'bg-[#173A52] border-white/15 text-white'
              : 'bg-[#173A52] border-white/15 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Languages className="w-4 h-4 text-blue-200" />
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">
                {t.languageModal.title}
              </h3>
              <p className="text-[10px] text-blue-200/80 mt-0.5">
                {t.languageModal.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div
          className={`p-3 border-b ${
            isDark ? 'bg-[#123047] border-white/10' : 'bg-slate-50 border-slate-100'
          }`}
        >
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.languageModal.searchPlaceholder}
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#2166D5] ${
                isDark
                  ? 'bg-[#0F2436] border-white/15 text-white placeholder-slate-400'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
              autoFocus
            />
          </div>
        </div>

        {/* Language List */}
        <div
          className={`overflow-y-auto divide-y p-2 ${
            isDark ? 'divide-white/5' : 'divide-slate-100'
          }`}
        >
          {filteredLanguages.map((lang) => {
            const isSelected = lang.code === selectedLanguage;
            return (
              <button
                type="button"
                key={lang.code}
                onClick={() => {
                  onSelectLanguage(lang.code);
                  onClose();
                }}
                className={`w-full p-2.5 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-[#2166D5]/30 text-white font-bold border border-[#2166D5]/50'
                      : 'bg-[#EBF2FC] text-[#173A52] font-bold'
                    : isDark
                    ? 'hover:bg-white/5 text-slate-200'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl leading-none shrink-0">{lang.flag}</span>
                  <div className="min-w-0">
                    <div className="text-xs truncate">{lang.nativeName}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isDark ? 'text-blue-200/70' : 'text-slate-500'
                      }`}
                    >
                      {lang.englishName} · {lang.code.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {lang.rtl && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        isDark
                          ? 'bg-[#2166D5]/25 text-blue-200 border border-[#2166D5]/40'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.languageModal.rtlBadge}
                    </span>
                  )}
                  {isSelected && <Check className="w-4 h-4 text-[#2166D5]" />}
                </div>
              </button>
            );
          })}

          {filteredLanguages.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              {t.languageModal.noResults} "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

