import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { CountrySelectModal } from '../common/CountrySelectModal';
import { LanguageSelectModal } from '../common/LanguageSelectModal';
import { Country } from '../../types';
import { findCountryByCode } from '../../lib/countries';
import { getLanguageOption } from '../../lib/i18n';
import {
  formatRegionalDate,
  formatRegionalTime,
  formatRegionalCurrency,
} from '../../lib/formatters';
import { saveUserProfileToFirestore } from '../../lib/firebaseStore';
import { api } from '../../lib/api';
import { BackButton } from '../common/BackButton';
import {
  Globe,
  Languages,
  CheckCircle2,
  Save,
  AlertCircle,
  LogOut,
  ArrowUpRight,
  ShieldCheck,
  CalendarClock,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const {
    user,
    wallet,
    language,
    setLanguage,
    country,
    countryCode,
    setCountryPreference,
    t,
    refreshUserData,
    logout,
    isAdmin,
  } = useAuth();
  const { setActivePage } = useDevice();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    return findCountryByCode(user?.countryCode || countryCode || country.code);
  });
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.fullName) setFullName(user.fullName);
    if (user?.phoneNumber !== undefined) setPhoneNumber(user.phoneNumber);
    if (user?.countryCode) {
      setSelectedCountry(findCountryByCode(user.countryCode));
    }
  }, [user?.fullName, user?.phoneNumber, user?.countryCode]);

  // Strictly independent country selection (does NOT alter language)
  const handleSelectCountry = (nextCountry: Country) => {
    setSelectedCountry(nextCountry);
    setCountryPreference(nextCountry);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const payload = {
        fullName: fullName.trim(),
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        dialingCode: selectedCountry.dialCode,
        phoneNumber: phoneNumber.trim(),
        language,
      };
      const res = await api.updateProfile(payload);
      if (res.user) {
        await saveUserProfileToFirestore(res.user).catch(() => {});
      } else if (user) {
        await saveUserProfileToFirestore({ ...user, ...payload }).catch(() => {});
      }
      await refreshUserData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || t.errors.networkError);
    } finally {
      setSaving(false);
    }
  };

  const activeLanguageOption = getLanguageOption(language);
  const previewNowIso = new Date().toISOString();
  const previewBalance = wallet?.availableBalance ?? 0;

  return (
    <div className="flex-1 flex flex-col bg-[#E5EBF2] text-[#0F172A]">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-8 space-y-5">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <BackButton fallback="dashboard" showHome={true} showWallet={true} />
        </div>

        <div className="pb-4 border-b border-slate-300/80">
          <h1 className="text-xl sm:text-2xl font-bold text-[#173A52] tracking-tight">
            {t.profile.title}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">{t.profile.subtitle}</p>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t.profile.savedSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* Personal Details Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 banking-card-shadow space-y-4">
            <h3 className="font-bold text-sm text-[#173A52] pb-2 border-b border-slate-200">
              {t.profile.personalInfo}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#173A52] block">
                  {t.auth.fullNameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#173A52] block">
                  {t.profile.emailFixed}
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs cursor-not-allowed font-mono"
                />
              </div>
            </div>
          </div>

          {/* Independent Country & Phone Dialing Code */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 banking-card-shadow space-y-4">
            <div className="pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-[#173A52]">{t.profile.countrySettings}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{t.profile.countrySub}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#173A52] block">
                  {t.auth.countryLabel}
                </label>
                <button
                  type="button"
                  onClick={() => setIsCountryModalOpen(true)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-left flex items-center justify-between hover:border-[#2166D5] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{selectedCountry.flag}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#0F172A] truncate">{selectedCountry.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {selectedCountry.region} · {selectedCountry.code} · {selectedCountry.currencyCode}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#2166D5] shrink-0 flex items-center gap-1 ml-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{t.profile.changeCountryBtn}</span>
                  </span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#173A52] block">
                  {t.auth.phoneLabel}
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-[#EBF2FC] text-[#173A52] font-mono font-semibold text-xs shrink-0">
                    {selectedCountry.dialCode}
                  </span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="2025550198"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-r-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Independent 38-Language Selector + Regional Formatting Preview */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 banking-card-shadow space-y-4">
            <div className="pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-[#173A52]">{t.profile.languageSettings}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{t.profile.languageSub}</p>
            </div>

            <button
              type="button"
              onClick={() => setIsLanguageModalOpen(true)}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 hover:border-[#2166D5] rounded-2xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl leading-none shrink-0">{activeLanguageOption.flag}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0F172A] truncate">
                      {activeLanguageOption.nativeName}
                    </span>
                    {activeLanguageOption.rtl && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EBF2FC] text-[#2166D5] border border-[#2166D5]/25 uppercase">
                        {t.languageModal.rtlBadge}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {activeLanguageOption.englishName} · {activeLanguageOption.code.toUpperCase()}
                  </div>
                </div>
              </div>

              <span className="px-3 py-1.5 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/25 text-[#2166D5] font-bold text-[11px] flex items-center gap-1.5 shrink-0">
                <Languages className="w-3.5 h-3.5" />
                <span>{t.profile.changeLanguageBtn}</span>
              </span>
            </button>

            {/* Regional Formatting Preview (Adapts Date/Time & Grouping Separators Only — Exact USD Value Unchanged) */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#173A52]">
                <CalendarClock className="w-3.5 h-3.5 text-[#2166D5] shrink-0" />
                <span>{t.profile.formattingPreview}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-slate-500 text-[10px]">{t.profile.regionBadge}</div>
                  <div className="font-semibold text-[#0F172A] mt-0.5 truncate">
                    {selectedCountry.flag} {selectedCountry.region} ({selectedCountry.code})
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-slate-500 text-[10px]">{t.history.colDate}</div>
                  <div className="font-semibold text-[#0F172A] mt-0.5 truncate">
                    {formatRegionalDate(previewNowIso, language, selectedCountry.code)} ·{' '}
                    {formatRegionalTime(previewNowIso, language, selectedCountry.code)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-slate-500 text-[10px]">{t.dashboard.availableBalance}</div>
                  <div className="font-mono font-bold text-[#173A52] mt-0.5 tabular-nums truncate">
                    {formatRegionalCurrency(previewBalance, language, selectedCountry.code, true)}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {t.countryModal.independentNote}
              </p>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 rounded-full unfcu-blue-gradient unfcu-blue-gradient-hover text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 text-white" />
              <span>{saving ? t.common.saving : t.profile.saveChanges}</span>
            </button>
          </div>
        </form>

        {/* Account Actions & Quick Navigation */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 border border-slate-200 banking-card-shadow space-y-3 text-xs">
          <h3 className="font-bold text-sm text-[#173A52]">{t.profile.accountActions}</h3>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setActivePage('withdrawal')}
              className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-[#173A52] font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-[#2166D5]" />
              <span>{t.dashboard.withdrawBtn}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActivePage('admin_dashboard')}
                className="px-4 py-2.5 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-blue-200" />
                <span>{t.nav.adminConsole}</span>
              </button>
            )}

            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.nav.logout}</span>
            </button>
          </div>
        </div>

        <CountrySelectModal
          isOpen={isCountryModalOpen}
          onClose={() => setIsCountryModalOpen(false)}
          selectedCountryCode={selectedCountry.code}
          onSelectCountry={handleSelectCountry}
          theme="light"
        />

        <LanguageSelectModal
          isOpen={isLanguageModalOpen}
          onClose={() => setIsLanguageModalOpen(false)}
          selectedLanguage={language}
          onSelectLanguage={setLanguage}
          theme="light"
        />
      </div>
    </div>
  );
};
