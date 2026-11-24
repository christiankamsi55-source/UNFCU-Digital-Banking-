import React, { useState, useMemo } from 'react';
import { Country, CountryRegion } from '../../types';
import { COUNTRIES } from '../../lib/countries';
import { useAuth } from '../../context/AuthContext';
import { Search, X, Check, Globe } from 'lucide-react';

interface CountrySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountryCode: string;
  onSelectCountry: (country: Country) => void;
  theme?: 'dark' | 'light';
}

const REGIONS: ('ALL' | CountryRegion)[] = [
  'ALL',
  'Americas',
  'Europe',
  'Asia',
  'Middle East',
  'Oceania',
];

export const CountrySelectModal: React.FC<CountrySelectModalProps> = ({
  isOpen,
  onClose,
  selectedCountryCode,
  onSelectCountry,
  theme = 'light',
}) => {
  const { t } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<'ALL' | CountryRegion>('ALL');

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COUNTRIES.filter((c) => {
      if (selectedRegion !== 'ALL' && c.region !== selectedRegion) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        c.currencyCode.toLowerCase().includes(q)
      );
    });
  }, [search, selectedRegion]);

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
          className="p-4 flex items-center justify-between border-b bg-[#173A52] border-white/15 text-white"
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-blue-200" />
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">
                {t.countryModal.title}
              </h3>
              <p className="text-[10px] text-blue-200/80 mt-0.5">
                {t.countryModal.subtitle}
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

        {/* Search & Region Filter */}
        <div
          className={`p-3 border-b space-y-2.5 ${
            isDark ? 'bg-[#123047] border-white/10' : 'bg-slate-50 border-slate-100'
          }`}
        >
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.countryModal.searchPlaceholder}
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#2166D5] ${
                isDark
                  ? 'bg-[#0F2436] border-white/15 text-white placeholder-slate-400'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((region) => {
              const active = selectedRegion === region;
              return (
                <button
                  type="button"
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#2166D5] text-white'
                      : isDark
                      ? 'bg-white/5 text-blue-100 hover:bg-white/10'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {region === 'ALL' ? t.countryModal.allRegions : region}
                </button>
              );
            })}
          </div>
        </div>

        {/* List of Countries */}
        <div
          className={`overflow-y-auto divide-y p-2 flex-1 ${
            isDark ? 'divide-white/5' : 'divide-slate-100'
          }`}
        >
          {filteredCountries.map((c) => {
            const isSelected = c.code.toUpperCase() === selectedCountryCode.toUpperCase();
            return (
              <button
                type="button"
                key={c.code}
                onClick={() => {
                  onSelectCountry(c);
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
                  <span className="text-xl leading-none shrink-0">{c.flag}</span>
                  <div className="min-w-0">
                    <div className="text-xs truncate">{c.name}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isDark ? 'text-blue-200/70' : 'text-slate-500'
                      }`}
                    >
                      {c.region} · {c.code} · {c.currencyCode} ({c.currencySymbol})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded ${
                      isDark
                        ? 'bg-[#0F2436] text-blue-200 border border-white/15'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {c.dialCode}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-[#2166D5]" />}
                </div>
              </button>
            );
          })}

          {filteredCountries.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              {t.countryModal.noResults} "{search}"
            </div>
          )}
        </div>

        {/* Independent Note Footer */}
        <div
          className={`px-3 py-2 border-t text-[10px] text-center ${
            isDark
              ? 'bg-[#0F2436] border-white/10 text-blue-200/70'
              : 'bg-slate-50 border-slate-100 text-slate-500'
          }`}
        >
          {t.countryModal.independentNote}
        </div>
      </div>
    </div>
  );
};

