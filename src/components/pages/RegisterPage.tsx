import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { CountrySelectModal } from '../common/CountrySelectModal';
import { LanguageSelectModal } from '../common/LanguageSelectModal';
import { BackButton } from '../common/BackButton';
import { UnfcuEmblem } from '../common/UnfcuLogo';
import { Country } from '../../types';
import { getLanguageOption } from '../../lib/i18n';
import { api } from '../../lib/api';
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  firebaseSendEmailVerification,
  firebaseSignOut,
} from '../../lib/firebase';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Globe,
  Languages,
  CheckCircle2,
  Send,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register, t, language, setLanguage, country, setCountryPreference } = useAuth();
  const { setActivePage } = useDevice();

  // 2-Step Registration: 'details' -> 'email_verify'
  const [currentStep, setCurrentStep] = useState<'details' | 'email_verify'>('details');

  // Step 1: User Account Information
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [accountAlreadyExists, setAccountAlreadyExists] = useState(false);

  // Step 2: Gmail Verification State (Firebase Auth link verification)
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const currentLangOption = getLanguageOption(language);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setInterval(() => {
      setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCooldown]);

  const handleSelectCountry = (nextCountry: Country) => {
    // Strictly independent: country NEVER alters language
    setCountryPreference(nextCountry);
  };

  // STEP 1: SUBMIT ACCOUNT DETAILS & DISPATCH GMAIL VERIFICATION
  const handleProceedFromDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setAccountAlreadyExists(false);

    if (!fullName.trim()) {
      setGeneralError(t.errors.fillRequiredFields);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setGeneralError(t.errors.invalidEmail);
      return;
    }

    if (cleanEmail === 'un.department.retirement.unjspf@gmail.com') {
      setGeneralError(t.errors.adminRestricted);
      return;
    }

    if (password.length < 8) {
      setGeneralError(t.errors.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setGeneralError(t.errors.passwordsMismatch);
      return;
    }

    setLoading(true);

    try {
      // Authoritative check against Firebase Auth + Cloud Firestore before modifying client auth state
      const preCheck = await api.checkRegistrationEmail(cleanEmail);
      if (preCheck.registered) {
        setAccountAlreadyExists(true);
        setGeneralError(preCheck.error || t.errors.emailInUse);
        setLoading(false);
        return;
      }

      let fbUser = auth.currentUser;
      if (fbUser) {
        if (fbUser.email?.toLowerCase() !== cleanEmail) {
          try {
            await firebaseSignOut(auth);
          } catch {}
          fbUser = null;
        } else {
          // Verify cached Firebase session was NOT previously deleted from Firebase Authentication
          try {
            await fbUser.reload();
            fbUser = auth.currentUser || fbUser;
            await fbUser.getIdToken(true);
          } catch {
            try {
              await firebaseSignOut(auth);
            } catch {}
            fbUser = null;
          }
        }
      }

      if (!fbUser) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          fbUser = cred.user;
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            const reCheck = await api.checkRegistrationEmail(cleanEmail).catch(() => null);
            if (reCheck?.registered) {
              setAccountAlreadyExists(true);
              throw new Error(reCheck.error || t.errors.emailInUse);
            }
            try {
              const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
              fbUser = cred.user;
            } catch {
              setAccountAlreadyExists(true);
              throw new Error(t.errors.emailInUse);
            }
          } else if (authErr.code === 'auth/weak-password') {
            throw new Error(t.errors.weakPassword);
          } else if (authErr.code === 'auth/invalid-email') {
            throw new Error(t.errors.invalidEmail);
          } else {
            throw authErr;
          }
        }
      }

      await fbUser.reload();
      fbUser = auth.currentUser || fbUser;

      if (fbUser.emailVerified) {
        const idToken = await fbUser.getIdToken(true);
        setIsEmailVerified(true);
        await api.confirmFirebaseEmail(cleanEmail, idToken);
        await finalizeAccountCreation();
        return;
      }

      await firebaseSendEmailVerification(fbUser);

      setIsEmailSent(true);
      setEmailNotice(`${t.auth.verifyEmailSubtitle} (${cleanEmail})`);
      setEmailCooldown(60);
      setCurrentStep('email_verify');
    } catch (err: any) {
      setGeneralError(err.message || t.errors.networkError);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: CHECK FIREBASE EMAIL VERIFICATION STATUS VIA LINK
  const handleCheckEmailVerificationStatus = async () => {
    setIsCheckingEmail(true);
    setEmailError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      let fbUser = auth.currentUser;
      if (!fbUser) {
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          fbUser = cred.user;
        } catch {}
      }

      if (!fbUser) {
        setEmailError(t.errors.emailNotVerified);
        setIsCheckingEmail(false);
        return;
      }

      await fbUser.reload();
      fbUser = auth.currentUser || fbUser;

      if (fbUser && fbUser.emailVerified) {
        const idToken = await fbUser.getIdToken(true);
        setIsEmailVerified(true);
        await api.confirmFirebaseEmail(cleanEmail, idToken);
        setEmailNotice(t.auth.verifying);
        await finalizeAccountCreation();
      } else {
        setEmailError(t.errors.emailNotVerified);
      }
    } catch (err: any) {
      setEmailError(err.message || t.errors.networkError);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleResendEmail = async () => {
    if (emailCooldown > 0) return;
    setLoading(true);
    setEmailError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      let fbUser = auth.currentUser;
      if (!fbUser) {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        fbUser = cred.user;
      }

      if (fbUser) {
        await fbUser.reload();
        const activeUser = auth.currentUser || fbUser;
        if (activeUser.emailVerified) {
          const idToken = await activeUser.getIdToken(true);
          setIsEmailVerified(true);
          await api.confirmFirebaseEmail(cleanEmail, idToken);
          await finalizeAccountCreation();
          return;
        }
        await firebaseSendEmailVerification(activeUser);
      }

      setIsEmailSent(true);
      setEmailNotice(`${t.auth.verifyEmailSubtitle} (${cleanEmail})`);
      setEmailCooldown(60);
    } catch (err: any) {
      setEmailError(err.message || t.errors.networkError);
    } finally {
      setLoading(false);
    }
  };

  // FINALIZE ACCOUNT REGISTRATION & REDIRECT TO DASHBOARD
  const finalizeAccountCreation = async () => {
    setLoading(true);
    setGeneralError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      await register({
        fullName: fullName.trim(),
        email: cleanEmail,
        password,
        country: country.name,
        countryCode: country.code,
        dialingCode: country.dialCode,
        language,
      });

      try {
        if (!auth.currentUser) {
          await signInWithEmailAndPassword(auth, cleanEmail, password);
        }
      } catch {}

      setActivePage('dashboard');
    } catch (err: any) {
      setGeneralError(err.message || t.errors.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#E5EBF2] text-[#0F172A]">
      <div className="max-w-lg w-full space-y-3">
        {/* Top Navigation */}
        <div className="flex items-center justify-between gap-2">
          <BackButton fallback="landing" showHome={true} />
          <div className="flex items-center gap-2">
            {currentStep === 'email_verify' && (
              <button
                type="button"
                onClick={() => setCurrentStep('details')}
                className="text-xs font-semibold text-[#173A52] hover:text-[#2166D5] flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 rtl-flip" />
                <span>{t.common.back}</span>
              </button>
            )}
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
        </div>

        <div className="bg-white rounded-3xl w-full border border-slate-200 banking-card-shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[#173A52] text-white p-6 text-center">
            <div className="mx-auto flex justify-center mb-3">
              <UnfcuEmblem variant="white" size={50} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {currentStep === 'details' ? t.auth.registerTitle : t.auth.verifyEmailTitle}
            </h2>
            <p className="text-blue-100/85 text-xs mt-1">
              {currentStep === 'details' ? t.auth.registerSubtitle : t.auth.verifyEmailSubtitle}
            </p>

            {/* Stepper Progress Bar */}
            <div className="flex items-center justify-center gap-2 mt-4 max-w-xs mx-auto">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  currentStep === 'details' ? 'bg-[#60A5FA]' : 'bg-emerald-400'
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  currentStep === 'email_verify'
                    ? isEmailVerified
                      ? 'bg-emerald-400'
                      : 'bg-[#60A5FA]'
                    : 'bg-white/25'
                }`}
              />
            </div>
          </div>

          {/* STEP 1: INITIAL DETAILS FORM */}
          {currentStep === 'details' && (
            <form onSubmit={handleProceedFromDetails} className="p-5 sm:p-6 space-y-4 text-xs">
              {generalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{generalError}</span>
                  </div>
                  {accountAlreadyExists && (
                    <button
                      type="button"
                      onClick={() => setActivePage('login')}
                      className="w-full py-2 px-3 rounded-lg bg-white hover:bg-[#EBF2FC] border border-[#2166D5]/40 text-[#2166D5] font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{t.nav.signIn}</span>
                      <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
                    </button>
                  )}
                </div>
              )}

              {/* Full Legal Name */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#173A52] block">
                  {t.auth.fullNameLabel}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.auth.fullNameLabel}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Gmail / Email Address */}
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
                    placeholder="your.email@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Independent Country & Language Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#173A52] block">
                    {t.auth.countryLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCountryModalOpen(true)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-left flex items-center justify-between hover:border-[#2166D5] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{country.flag}</span>
                      <span className="truncate text-[#0F172A] font-medium">
                        {country.name}
                      </span>
                    </div>
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#173A52] block">
                    {t.auth.languageLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsLangModalOpen(true)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-left flex items-center justify-between hover:border-[#2166D5] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{currentLangOption.flag}</span>
                      <span className="truncate text-[#0F172A] font-medium">
                        {currentLangOption.nativeName}
                      </span>
                    </div>
                    <Languages className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#173A52] block">
                  {t.auth.passwordLabel}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.auth.passwordMinHint}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#173A52] block">
                  {t.auth.confirmPasswordLabel}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Submit & Proceed */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full unfcu-blue-gradient unfcu-blue-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <span>{t.auth.creatingAccount}</span> : <span>{t.auth.submitRegister}</span>}
                <ArrowRight className="w-4 h-4 text-white rtl-flip" />
              </button>

              <div className="pt-2 border-t border-slate-200 text-center text-slate-600">
                <span>{t.auth.haveAccount} </span>
                <button
                  type="button"
                  onClick={() => setActivePage('login')}
                  className="font-bold text-[#2166D5] hover:text-[#173A52] transition-colors cursor-pointer"
                >
                  {t.nav.signIn}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: GMAIL / EMAIL VERIFICATION */}
          {currentStep === 'email_verify' && (
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/25 text-[#2166D5] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#173A52] text-sm">{t.auth.verifyEmailTitle}</h3>
                    <p className="text-slate-500 text-[11px] truncate">{email}</p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-700 bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 leading-relaxed">
                  <p>{t.auth.verifyEmailSubtitle}</p>
                </div>

                {emailNotice && !emailError && (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{emailNotice}</span>
                  </div>
                )}

                {emailError && (
                  <div className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{emailError}</span>
                  </div>
                )}

                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleCheckEmailVerificationStatus}
                    disabled={isCheckingEmail || loading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingEmail ? 'animate-spin' : ''}`} />
                    <span>{isCheckingEmail ? t.auth.verifying : t.auth.verifyContinueBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={loading || emailCooldown > 0}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-[#173A52] font-semibold text-xs transition-colors shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3 h-3 text-[#2166D5]" />
                    <span>
                      {emailCooldown > 0 ? `${t.auth.resendVerificationBtn} (${emailCooldown}s)` : t.auth.resendVerificationBtn}
                    </span>
                  </button>
                </div>

                {isEmailSent && (
                  <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
                    {t.auth.securityFooter}
                  </p>
                )}
              </div>

              {isEmailVerified && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{t.auth.verifying}</span>
                </div>
              )}
            </div>
          )}
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
    </div>
  );
};
