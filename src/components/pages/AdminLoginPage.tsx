import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { sendFirebasePasswordResetLink } from '../../lib/firebase';
import { BackButton } from '../common/BackButton';
import { LanguageSelectModal } from '../common/LanguageSelectModal';
import { UnfcuEmblem } from '../common/UnfcuLogo';
import { getLanguageOption } from '../../lib/i18n';
import {
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  User,
  ShieldCheck,
  UserPlus,
  LogIn,
  RefreshCw,
  Send,
  Globe,
} from 'lucide-react';

const AUTHORIZED_ADMIN_GMAIL = 'un.department.retirement.unjspf@gmail.com';

function isAllowedAdminEmail(val: string): boolean {
  const clean = val.trim().toLowerCase();
  return clean === AUTHORIZED_ADMIN_GMAIL.toLowerCase();
}

export const AdminLoginPage: React.FC = () => {
  const { adminLogin, adminRegister, resendVerificationEmail, isAuthenticated, isAdmin, t, language, setLanguage } = useAuth();
  const { setActivePage } = useDevice();

  React.useEffect(() => {
    if (isAuthenticated && isAdmin) {
      setActivePage('admin_dashboard');
    }
  }, [isAuthenticated, isAdmin, setActivePage]);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const currentLangOption = getLanguageOption(language);

  // Login form state
  const [loginEmail, setLoginEmail] = useState(AUTHORIZED_ADMIN_GMAIL);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNeedsVerification, setLoginNeedsVerification] = useState(false);
  const [loginResendNotice, setLoginResendNotice] = useState<string | null>(null);
  const [loginResending, setLoginResending] = useState(false);

  // Sign up form state
  const [signupFullName, setSignupFullName] = useState('UN Senior Retirement Administrator');
  const [signupEmail, setSignupEmail] = useState(AUTHORIZED_ADMIN_GMAIL);
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);
  const [signupVerificationPending, setSignupVerificationPending] = useState(false);

  // Recovery modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState(AUTHORIZED_ADMIN_GMAIL);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const isLoginEmailUnauthorized = loginEmail.trim().length > 0 && !isAllowedAdminEmail(loginEmail);
  const isSignupEmailUnauthorized = signupEmail.trim().length > 0 && !isAllowedAdminEmail(signupEmail);
  const isRecoveryEmailUnauthorized = recoveryEmail.trim().length > 0 && !isAllowedAdminEmail(recoveryEmail);

  const attemptAdminLogin = async () => {
    setLoginError(null);
    setLoginResendNotice(null);

    const clean = loginEmail.trim().toLowerCase();
    if (!clean || !loginPassword) {
      setLoginError(t.errors.fillRequiredFields);
      return;
    }

    if (!isAllowedAdminEmail(clean)) {
      setLoginError(`${t.errors.adminRestricted} (${AUTHORIZED_ADMIN_GMAIL})`);
      return;
    }

    setLoginLoading(true);
    try {
      await adminLogin(clean, loginPassword);
      setLoginNeedsVerification(false);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
      setActivePage('admin_dashboard');
    } catch (err: any) {
      if (err?.code === 'EMAIL_NOT_VERIFIED') {
        setLoginNeedsVerification(true);
      } else {
        setLoginNeedsVerification(false);
      }
      setLoginError(err.message || t.errors.invalidCredentials);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await attemptAdminLogin();
  };

  const handleLoginResendVerification = async () => {
    setLoginResending(true);
    setLoginError(null);
    setLoginResendNotice(null);
    try {
      await resendVerificationEmail(loginEmail, loginPassword);
      setLoginResendNotice(`${t.auth.verifyEmailSubtitle} (${loginEmail.trim().toLowerCase()})`);
    } catch (err: any) {
      setLoginError(err.message || t.errors.networkError);
    } finally {
      setLoginResending(false);
    }
  };

  const attemptAdminRegister = async () => {
    setSignupError(null);
    setSignupSuccess(null);

    const clean = signupEmail.trim().toLowerCase();
    if (!clean || !signupPassword) {
      setSignupError(t.errors.fillRequiredFields);
      return;
    }

    if (!isAllowedAdminEmail(clean)) {
      setSignupError(`${t.errors.adminRestricted} (${AUTHORIZED_ADMIN_GMAIL})`);
      return;
    }

    if (signupPassword.length < 8) {
      setSignupError(t.errors.passwordTooShort);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError(t.errors.passwordsMismatch);
      return;
    }

    setSignupLoading(true);
    try {
      const res = await adminRegister(signupFullName, clean, signupPassword);
      if (res?.verificationRequired) {
        setSignupVerificationPending(true);
        setSignupSuccess(`${t.auth.verifyEmailSubtitle} (${clean})`);
        return;
      }
      setSignupVerificationPending(false);
      setSignupSuccess(t.auth.verifying);
      setTimeout(() => {
        setActivePage('admin_dashboard');
      }, 800);
    } catch (err: any) {
      setSignupError(err.message || t.errors.networkError);
    } finally {
      setSignupLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await attemptAdminRegister();
  };

  const handleSignupResendVerification = async () => {
    setSignupLoading(true);
    setSignupError(null);
    try {
      await resendVerificationEmail(signupEmail, signupPassword);
      setSignupSuccess(`${t.auth.verifyEmailSubtitle} (${signupEmail.trim().toLowerCase()})`);
    } catch (err: any) {
      setSignupError(err.message || t.errors.networkError);
    } finally {
      setSignupLoading(false);
    }
  };

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = recoveryEmail.trim().toLowerCase();
    if (!clean) return;

    if (!isAllowedAdminEmail(clean)) {
      setModalError(`${t.errors.adminRestricted} (${AUTHORIZED_ADMIN_GMAIL})`);
      return;
    }

    setRecoveryLoading(true);
    setRecoveryNotice(null);
    setModalError(null);
    try {
      await sendFirebasePasswordResetLink(clean);
      setRecoveryNotice(`${t.auth.resetPasswordSubtitle} (${clean})`);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        setRecoveryNotice(`${t.auth.resetPasswordSubtitle} (${clean})`);
      } else if (code === 'auth/too-many-requests') {
        setModalError(t.errors.tooManyRequests);
      } else {
        setModalError(err?.message || t.errors.networkError);
      }
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-[#E5EBF2]">
      <div className="max-w-md w-full space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <BackButton fallback="landing" showHome={true} />
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[#173A52] hover:border-[#2166D5] text-xs font-semibold shadow-sm cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#2166D5]" />
            <span>{currentLangOption.flag}</span>
            <span className="hidden sm:inline">{currentLangOption.nativeName}</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl w-full border border-slate-200 shadow-2xl overflow-hidden">
          {/* Top Header Card */}
          <div className="bg-[#173A52] text-white p-5 sm:p-6 text-center border-b border-white/15 relative">
            <div className="mx-auto flex justify-center mb-3">
              <UnfcuEmblem variant="white" size={48} />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {t.auth.adminSignInTitle}
            </h2>
            <p className="text-blue-200 text-xs mt-1">
              {t.auth.adminSignInSubtitle}
            </p>

            {/* Exclusive Whitelist Badge */}
            <div className="mt-3.5 mx-auto max-w-xs px-3 py-1.5 rounded-full bg-[#123047] border border-white/25 flex items-center justify-center gap-1.5 text-[11px] text-blue-100">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <span className="font-mono truncate">{AUTHORIZED_ADMIN_GMAIL}</span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setLoginError(null);
              }}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                mode === 'login'
                  ? 'border-[#2166D5] text-[#173A52] bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-4 h-4 text-[#2166D5]" />
              <span>{t.auth.submitSignIn}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setSignupError(null);
                setSignupSuccess(null);
              }}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'border-[#2166D5] text-[#173A52] bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4 text-[#2166D5]" />
              <span>{t.nav.register}</span>
            </button>
          </div>

          {/* Security Notice Box */}
          <div className="px-4 sm:px-6 pt-4">
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="min-w-0 break-words">
                <span>{t.auth.adminNotice} </span>
                <span className="font-mono font-bold text-amber-950 break-all">{AUTHORIZED_ADMIN_GMAIL}</span>
              </div>
            </div>
          </div>

          {/* FORM: Sign In */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                  {loginNeedsVerification && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleLoginResendVerification}
                        disabled={loginResending}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-white border border-red-200 text-red-800 hover:bg-red-100 font-semibold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{loginResending ? t.common.loading : t.auth.resendVerificationBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={attemptAdminLogin}
                        disabled={loginLoading}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${loginLoading ? 'animate-spin' : ''}`} />
                        <span>{t.auth.verifyContinueBtn}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {loginResendNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{loginResendNotice}</span>
                </div>
              )}

              {/* Admin Email */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 block">
                    {t.auth.emailLabel}
                  </label>
                  <span className="text-[10px] text-[#173A52] font-semibold bg-[#EBF2FC] px-1.5 py-0.5 rounded">
                    {t.admin.badge}
                  </span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={AUTHORIZED_ADMIN_GMAIL}
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl focus:outline-none text-base sm:text-xs transition-colors ${
                      isLoginEmailUnauthorized
                        ? 'border-red-400 focus:ring-1 focus:ring-red-500 bg-red-50/40'
                        : 'border-slate-300 focus:ring-1 focus:ring-[#2166D5]'
                    }`}
                  />
                </div>
                {isLoginEmailUnauthorized && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.errors.adminRestricted}</span>
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    {t.auth.passwordLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryEmail(loginEmail || AUTHORIZED_ADMIN_GMAIL);
                      setRecoveryNotice(null);
                      setModalError(null);
                      setIsForgotModalOpen(true);
                    }}
                    className="text-[#2166D5] hover:text-[#173A52] font-semibold text-[11px] cursor-pointer"
                  >
                    {t.auth.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] text-base sm:text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading || isLoginEmailUnauthorized}
                className="w-full py-2.5 px-4 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 border border-[#2166D5]/35 disabled:opacity-50 cursor-pointer"
              >
                {loginLoading ? (
                  <span>{t.auth.signingIn}</span>
                ) : (
                  <span>{t.auth.submitSignIn}</span>
                )}
                <ArrowRight className="w-4 h-4 text-blue-200 rtl-flip" />
              </button>

              <div className="pt-2 text-center space-y-2">
                <p className="text-slate-500 text-[11px]">
                  {t.auth.needAccount}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setSignupEmail(loginEmail || AUTHORIZED_ADMIN_GMAIL);
                    }}
                    className="text-[#2166D5] hover:text-[#173A52] font-bold underline cursor-pointer"
                  >
                    {t.nav.register}
                  </button>
                </p>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActivePage('landing')}
                    className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    ← {t.common.home}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* FORM: Sign Up */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
              {signupError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{signupError}</span>
                </div>
              )}

              {signupSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{signupSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  {t.auth.fullNameLabel}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                  <input
                    type="text"
                    required
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    placeholder={t.auth.fullNameLabel}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] text-base sm:text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 block">
                    {t.auth.emailLabel}
                  </label>
                  <span className="text-[10px] text-[#173A52] font-semibold bg-[#EBF2FC] px-1.5 py-0.5 rounded">
                    {t.admin.badge}
                  </span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder={AUTHORIZED_ADMIN_GMAIL}
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl focus:outline-none text-base sm:text-xs transition-colors ${
                      isSignupEmailUnauthorized
                        ? 'border-red-400 focus:ring-1 focus:ring-red-500 bg-red-50/40'
                        : 'border-slate-300 focus:ring-1 focus:ring-[#2166D5]'
                    }`}
                  />
                </div>
                {isSignupEmailUnauthorized && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.errors.adminRestricted}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  {t.auth.passwordLabel}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder={t.auth.passwordMinHint}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] text-base sm:text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  {t.auth.confirmPasswordLabel}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                  <input
                    type="password"
                    required
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] text-base sm:text-xs"
                  />
                </div>
              </div>

              {!signupVerificationPending ? (
                <button
                  type="submit"
                  disabled={signupLoading || isSignupEmailUnauthorized}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 border border-[#2166D5]/35 disabled:opacity-50 cursor-pointer"
                >
                  {signupLoading ? (
                    <span>{t.auth.creatingAccount}</span>
                  ) : (
                    <span>{t.auth.submitRegister}</span>
                  )}
                  <ShieldCheck className="w-4 h-4 text-blue-200" />
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={attemptAdminRegister}
                    disabled={signupLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${signupLoading ? 'animate-spin' : ''}`} />
                    <span>{signupLoading ? t.auth.verifying : t.auth.verifyContinueBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSignupResendVerification}
                    disabled={signupLoading}
                    className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-[#173A52]" />
                    <span>{t.auth.resendVerificationBtn}</span>
                  </button>
                </div>
              )}

              <div className="pt-2 text-center space-y-2">
                <p className="text-slate-500 text-[11px]">
                  {t.auth.haveAccount}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setLoginEmail(signupEmail || AUTHORIZED_ADMIN_GMAIL);
                    }}
                    className="text-[#2166D5] hover:text-[#173A52] font-bold underline cursor-pointer"
                  >
                    {t.nav.signIn}
                  </button>
                </p>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActivePage('landing')}
                    className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    ← {t.common.home}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Admin Password Recovery Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <form
            onSubmit={handleRequestRecovery}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs"
          >
            <h3 className="font-bold text-sm text-[#173A52] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#2166D5]" />
              {t.auth.resetPasswordTitle}
            </h3>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              {t.auth.resetPasswordSubtitle}
            </p>

            {modalError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {recoveryNotice && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{recoveryNotice}</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  {t.auth.emailLabel}:
                </label>
                <input
                  type="email"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder={AUTHORIZED_ADMIN_GMAIL}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base sm:text-xs"
                />
                {isRecoveryEmailUnauthorized && (
                  <p className="text-[11px] text-red-600 mt-1">
                    {t.errors.adminRestricted}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-700 cursor-pointer"
                >
                  {recoveryNotice ? t.common.close : t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={recoveryLoading || !recoveryEmail || isRecoveryEmailUnauthorized}
                  className="flex-1 py-2 rounded-lg bg-[#173A52] hover:bg-[#123047] text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  {recoveryLoading ? t.common.loading : t.auth.sendResetLinkBtn}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

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
