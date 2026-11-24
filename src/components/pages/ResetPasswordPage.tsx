import React, { useState, useEffect } from 'react';
import { useDevice } from '../../context/DeviceContext';
import { useAuth } from '../../context/AuthContext';
import { BackButton } from '../common/BackButton';
import { LanguageSelectModal } from '../common/LanguageSelectModal';
import { UnfcuEmblem } from '../common/UnfcuLogo';
import { getLanguageOption } from '../../lib/i18n';
import { auth, verifyPasswordResetCode, confirmPasswordReset } from '../../lib/firebase';
import {
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Globe,
} from 'lucide-react';

function extractResetParams(): { mode: string | null; oobCode: string | null } {
  if (typeof window === 'undefined') {
    return { mode: null, oobCode: null };
  }
  const searchParams = new URLSearchParams(window.location.search);
  let mode = searchParams.get('mode');
  let oobCode = searchParams.get('oobCode');

  if (!oobCode && window.location.hash.includes('?')) {
    const hashQuery = window.location.hash.split('?')[1];
    const hashParams = new URLSearchParams(hashQuery);
    mode = mode || hashParams.get('mode');
    oobCode = oobCode || hashParams.get('oobCode');
  }

  return { mode, oobCode };
}

export const ResetPasswordPage: React.FC = () => {
  const { setActivePage } = useDevice();
  const { t, language, setLanguage } = useAuth();

  const [status, setStatus] = useState<'verifying' | 'ready' | 'submitting' | 'success' | 'invalid'>('verifying');
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [oobCode, setOobCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const currentLangOption = getLanguageOption(language);

  const mapFirebaseResetError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/expired-action-code':
        return t.errors.resetLinkExpired;
      case 'auth/invalid-action-code':
        return t.errors.resetLinkInvalid;
      case 'auth/user-disabled':
        return t.errors.userDisabled;
      case 'auth/user-not-found':
        return t.errors.noAccountFound;
      case 'auth/weak-password':
        return t.errors.weakPassword;
      default:
        return err?.message || t.errors.resetLinkInvalid;
    }
  };

  useEffect(() => {
    let active = true;

    const validateCode = async () => {
      const { mode, oobCode: rawCode } = extractResetParams();
      if (!rawCode || (mode && mode !== 'resetPassword')) {
        if (active) {
          setError(t.errors.resetLinkInvalid);
          setStatus('invalid');
        }
        return;
      }

      try {
        const email = await verifyPasswordResetCode(auth, rawCode);
        if (active) {
          setOobCode(rawCode);
          setAccountEmail(email);
          setError(null);
          setStatus('ready');
        }
      } catch (err: any) {
        if (active) {
          setError(mapFirebaseResetError(err));
          setStatus('invalid');
        }
      }
    };

    validateCode();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError(t.errors.passwordTooShort);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.errors.passwordsMismatch);
      return;
    }

    setStatus('submitting');
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus('success');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/reset-password');
      }
    } catch (err: any) {
      const code = err?.code || '';
      setError(mapFirebaseResetError(err));
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        setStatus('invalid');
      } else {
        setStatus('ready');
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#E5EBF2] text-[#0F172A]">
      <div className="max-w-md w-full space-y-3">
        <div className="flex items-center justify-between gap-2">
          <BackButton fallback="login" showHome={true} />
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
          <div className="bg-[#173A52] text-white p-6 text-center">
            <div className="mx-auto flex justify-center mb-3">
              <UnfcuEmblem variant="white" size={50} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-200" />
              <span>{t.auth.resetPasswordTitle}</span>
            </h2>
            <p className="text-blue-100/85 text-xs mt-1">
              {t.auth.resetPasswordSubtitle}
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-4 text-xs">
            {status === 'verifying' && (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-7 h-7 text-[#2166D5] animate-spin mx-auto" />
                <p className="text-slate-600 font-medium">{t.auth.verifying}</p>
              </div>
            )}

            {status === 'invalid' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('login')}
                  className="w-full py-3 px-4 rounded-full unfcu-blue-gradient unfcu-blue-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t.nav.signIn}</span>
                  <ArrowRight className="w-4 h-4 text-white rtl-flip" />
                </button>
              </div>
            )}

            {(status === 'ready' || status === 'submitting') && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {accountEmail && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] flex items-center justify-between gap-2">
                    <span className="text-slate-500">{t.auth.emailLabel}:</span>
                    <span className="font-bold text-[#2166D5] truncate">{accountEmail}</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#173A52] block">
                    {t.auth.newPasswordLabel}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t.auth.passwordMinHint}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#173A52] block">
                    {t.auth.confirmPasswordLabel}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full py-3 px-4 rounded-full unfcu-blue-gradient unfcu-blue-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{status === 'submitting' ? t.common.saving : t.auth.resetPasswordSubmit}</span>
                  <ArrowRight className="w-4 h-4 text-white rtl-flip" />
                </button>
              </form>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-900">{t.profile.savedSuccess}</p>
                    <p className="leading-relaxed">{t.auth.resetPasswordSubmit}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('login')}
                  className="w-full py-3 px-4 rounded-full unfcu-blue-gradient unfcu-blue-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t.nav.signIn}</span>
                  <ArrowRight className="w-4 h-4 text-white rtl-flip" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <LanguageSelectModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        selectedLanguage={language}
        onSelectLanguage={setLanguage}
        theme="light"
      />
    </div>
  );
};
