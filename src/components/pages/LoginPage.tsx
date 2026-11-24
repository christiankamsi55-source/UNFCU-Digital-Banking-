import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { CountrySelectModal } from '../common/CountrySelectModal';
import { LanguageSelectModal } from '../common/LanguageSelectModal';
import { BackButton } from '../common/BackButton';
import { UnfcuEmblem } from '../common/UnfcuLogo';
import { Country } from '../../types';
import { getLanguageOption } from '../../lib/i18n';
import { sendFirebasePasswordResetLink } from '../../lib/firebase';
import { Lock, Mail, ArrowRight, AlertCircle, KeyRound, CheckCircle2, RefreshCw, Send, UserPlus, Globe } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, resendVerificationEmail, t, language, setLanguage, country, setCountryPreference } = useAuth();
  const { setActivePage } = useDevice();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // Forgot password link modal states
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const currentLangOption = getLanguageOption(language);

  const attemptLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setResendNotice(null);
    setAccountNotFound(false);
    try {
      await login(email, password);
      setNeedsVerification(false);
      setActivePage('dashboard');
    } catch (err: any) {
      if (err?.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true);
      } else {
        setNeedsVerification(false);
      }
      if (err?.code === 'ACCOUNT_NOT_FOUND' || err?.code === 'PROFILE_MISSING_FOR_AUTH_USER') {
        setAccountNotFound(true);
      }
      setError(err.message || t.errors.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await attemptLogin();
  };

  const handleResendVerification = async () => {
    setResending(true);
    setError(null);
    setResendNotice(null);
    try {
      await resendVerificationEmail(email, password);
      setResendNotice(`${t.auth.verifyEmailSubtitle} (${email.trim().toLowerCase()})`);
    } catch (err: any) {
      setError(err.message || t.errors.networkError);
    } finally {
      setResending(false);
    }
  };

  const handleSelectCountry = (nextCountry: Country) => {
    setCountryPreference(nextCountry);
  };

  const handleRequestPasswordResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setModalError(t.errors.invalidEmail);
      return;
    }
    setForgotLoading(true);
    setForgotNotice(null);
    setModalError(null);
    try {
      await sendFirebasePasswordResetLink(cleanEmail);
      setForgotNotice(`${t.auth.resetPasswordSubtitle} (${cleanEmail})`);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        setForgotNotice(`${t.auth.resetPasswordSubtitle} (${cleanEmail})`);
      } else if (code === 'auth/invalid-email') {
        setModalError(t.errors.invalidEmail);
      } else if (code === 'auth/too-many-requests') {
        setModalError(t.errors.tooManyRequests);
      } else {
        setModalError(err?.message || t.errors.networkError);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#E5EBF2] text-[#0F172A]">
      <div className="max-w-md w-full space-y-3">
        <div className="flex items-center justify-between gap-2">
          <BackButton fallback="landing" showHome={true} />
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[#173A52] hover:border-[#2166D5] text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#2166D5]" />
            <span>{currentLangOption.flag}</span>
            <span className="hidden sm:inline">{currentLangOption.nativeName}</span>
          </button>
        </div>

        <div className="bg-white rounded-3xl w-full border border-slate-200 banking-card-shadow-lg overflow-hidden">
          {/* Top Header Card */}
          <div className="bg-[#173A52] text-white p-6 text-center">
            <div className="mx-auto flex justify-center mb-3">
              <UnfcuEmblem variant="white" size={50} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.auth.signInTitle}
            </h2>
            <p className="text-blue-100/85 text-xs mt-1">
              {t.auth.signInSubtitle}
            </p>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
                {accountNotFound && (
                  <button
                    type="button"
                    onClick={() => setActivePage('register')}
                    className="w-full py-2 px-3 rounded-lg bg-white hover:bg-[#EBF2FC] border border-[#2166D5]/40 text-[#2166D5] font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{t.auth.noAccountFoundBtn}</span>
                  </button>
                )}
                {needsVerification && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resending}
                      className="flex-1 py-2 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-[#173A52] font-semibold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3 h-3 text-[#2166D5]" />
                      <span>{resending ? t.common.loading : t.auth.resendVerificationBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={attemptLogin}
                      disabled={loading}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      <span>{t.auth.verifyContinueBtn}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {resendNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2 text-[11px]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{resendNotice}</span>
              </div>
            )}

            {/* Independent Region / Country Pill */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-600 font-medium">{t.auth.countryLabel}:</span>
              <button
                type="button"
                onClick={() => setIsCountryModalOpen(true)}
                className="flex items-center gap-2 font-semibold text-[#173A52] hover:text-[#2166D5] transition-colors cursor-pointer"
              >
                <span>{country.flag}</span>
                <span className="truncate max-w-[130px]">{country.name}</span>
                <span className="text-slate-500 text-[11px] font-mono">({country.dialCode})</span>
              </button>
            </div>

            {/* Email input */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#173A52] block">
                {t.auth.emailLabel}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[#173A52]">
                  {t.auth.passwordLabel}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotNotice(null);
                    setModalError(null);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-[#2166D5] hover:text-[#173A52] font-semibold text-[11px] cursor-pointer"
                >
                  {t.auth.forgotPassword}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-full unfcu-blue-gradient unfcu-blue-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <span>{t.auth.signingIn}</span> : <span>{t.auth.submitSignIn}</span>}
              <ArrowRight className="w-4 h-4 text-white rtl-flip" />
            </button>

            <div className="pt-3 border-t border-slate-200 text-center text-slate-600">
              <span>{t.auth.needAccount} </span>
              <button
                type="button"
                onClick={() => setActivePage('register')}
                className="font-bold text-[#2166D5] hover:text-[#173A52] transition-colors cursor-pointer"
              >
                {t.nav.register}
              </button>
            </div>
          </form>
        </div>
      </div>

      <CountrySelectModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        selectedCountryCode={country.code}
        onSelectCountry={handleSelectCountry}
      />

      <LanguageSelectModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        selectedLanguage={language}
        onSelectLanguage={setLanguage}
        theme="light"
      />

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleRequestPasswordResetLink}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs text-[#0F172A]"
          >
            <h3 className="font-bold text-sm text-[#173A52] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#2166D5]" />
              {t.auth.resetPasswordTitle}
            </h3>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              {t.auth.resetPasswordSubtitle}
            </p>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {forgotNotice && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{forgotNotice}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-[#173A52] block mb-1">
                  {t.auth.emailLabel}:
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2166D5] focus:bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  {forgotNotice ? t.common.close : t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 py-2 rounded-lg unfcu-blue-gradient unfcu-blue-gradient-hover text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  {forgotLoading ? t.common.loading : t.auth.sendResetLinkBtn}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
