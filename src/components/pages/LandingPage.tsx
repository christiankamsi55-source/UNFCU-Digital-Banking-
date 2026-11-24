import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { CustomerInfoModal, InfoModalTopic } from '../common/CustomerInfoModal';
import { LanguageSelectModal } from '../common/LanguageSelectModal';
import { UnfcuEmblem, UnfcuGlobeBackdrop } from '../common/UnfcuLogo';
import { getLanguageOption } from '../../lib/i18n';
import applyCardsPromoImg from '../../assets/images/apply_cards_promo_ref.jpg';
import {
  Shield,
  CreditCard,
  DollarSign,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Globe,
  Lock,
  ArrowRight,
  CheckCircle2,
  Send,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, isAdmin, language, setLanguage, t } = useAuth();
  const { setActivePage } = useDevice();
  const [activeTopic, setActiveTopic] = useState<InfoModalTopic | null>(null);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const currentLangOption = getLanguageOption(language);

  const features = [
    {
      icon: Globe,
      title: t.landing.feature1Title,
      desc: t.landing.feature1Desc,
    },
    {
      icon: Send,
      title: t.landing.feature2Title,
      desc: t.landing.feature2Desc,
    },
    {
      icon: Smartphone,
      title: t.landing.feature3Title,
      desc: t.landing.feature3Desc,
    },
    {
      icon: ShieldCheck,
      title: t.landing.feature4Title,
      desc: t.landing.feature4Desc,
    },
  ];

  return (
    <div className="bg-[#E5EBF2] text-[#0F172A] flex-1 flex flex-col">
      {/* Primary UNFCU Welcome Section */}
      <section className="relative flex-1 flex flex-col justify-center py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Mobile Quick Language Selector */}
        <div className="flex justify-end mb-3 md:hidden max-w-5xl mx-auto w-full">
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-[#173A52] shadow-xs cursor-pointer hover:border-[#2166D5]"
            aria-label={t.languageModal.selectLanguage}
          >
            <Globe className="w-3.5 h-3.5 text-[#2166D5]" />
            <span>{currentLangOption.flag}</span>
            <span className="font-semibold text-[11px]">{currentLangOption.nativeName}</span>
          </button>
        </div>

        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Primary Welcome / Onboarding Card (Matches UNFCU Mobile & Web Reference) */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 banking-card-shadow-lg overflow-hidden flex flex-col justify-between relative">
            <div className="px-6 sm:px-9 pt-8 pb-4 text-center relative z-10 space-y-5">
              {/* Centered UNFCU Crest & Wordmark */}
              <div className="flex flex-col items-center">
                <UnfcuEmblem variant="navy" size={64} className="mb-3 shadow-sm rounded-2xl" />
                <div className="flex items-start justify-center gap-0.5">
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#173A52]">
                    UNFCU
                  </h1>
                  <span className="text-xs font-bold text-[#2166D5] mt-1">®</span>
                </div>
                <p className="text-sm font-bold text-[#2166D5] tracking-wide mt-0.5">
                  {t.common.digitalBanking}
                </p>
                <p className="text-[11px] font-medium text-slate-500 mt-1">
                  {t.appName}
                </p>
              </div>

              <div className="space-y-1.5 max-w-xs mx-auto">
                <p className="text-base sm:text-lg font-bold text-[#173A52] leading-snug">
                  {t.landing.partnerTagline}
                </p>
                <p className="text-xs text-slate-500">
                  {t.landing.tagline}
                </p>
              </div>

              {/* Action Buttons */}
              {isAuthenticated ? (
                <div className="pt-2 max-w-sm mx-auto">
                  <button
                    type="button"
                    onClick={() => setActivePage(isAdmin ? 'admin_dashboard' : 'dashboard')}
                    className="w-full min-h-[48px] py-3 px-6 rounded-full bg-[#173A52] hover:bg-[#123047] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isAdmin ? t.nav.adminConsole : t.nav.dashboard}</span>
                    <ArrowRight className="w-4 h-4 rtl-flip" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-1 max-w-sm mx-auto">
                  <button
                    type="button"
                    onClick={() => setActivePage('login')}
                    className="w-full min-h-[48px] py-3 px-6 rounded-full bg-[#173A52] hover:bg-[#123047] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{t.nav.signIn}</span>
                    <ArrowRight className="w-4 h-4 rtl-flip" />
                  </button>

                  <div className="flex items-center gap-3 px-4">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                      {t.common.or}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setActivePage('register')}
                    className="w-full min-h-[48px] py-3 px-6 rounded-full bg-white hover:bg-[#EBF2FC] text-[#173A52] font-bold text-sm border-2 border-[#173A52] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{t.landing.enrollNow}</span>
                  </button>
                </div>
              )}

              {/* Need Help Link */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setActivePage('support')}
                  className="text-xs font-bold text-[#2166D5] hover:text-[#173A52] hover:underline transition-colors cursor-pointer"
                >
                  {t.landing.needHelp}
                </button>
              </div>
            </div>

            {/* UNFCU Globe Horizon Backdrop */}
            <div className="relative mt-2">
              <UnfcuGlobeBackdrop className="w-full h-24 sm:h-28 object-cover pointer-events-none select-none block" />
              <div className="absolute bottom-2.5 inset-x-0 px-4 flex items-center justify-center gap-1.5 text-[11px] text-white/95 font-medium">
                <Lock className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.landing.securityMessage}</span>
              </div>
            </div>
          </div>

          {/* Institutional Highlights Column (Desktop & Tablet) */}
          <div className="lg:col-span-6 unfcu-navy-gradient rounded-3xl text-white banking-card-shadow-lg overflow-hidden flex flex-col justify-between relative">
            <div className="p-6 sm:p-8 space-y-6 relative z-10">
              <div className="flex items-center gap-3">
                <UnfcuEmblem variant="white" size={44} className="shrink-0" />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
                    {t.appName}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {t.landing.globalCitizensTitle}
                  </h2>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                {t.landing.featuresSubtitle}
              </p>

              <div className="space-y-3">
                {features.map((feat, idx) => {
                  const Icon = feat.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                          <span>{feat.title}</span>
                        </div>
                        <p className="text-[11px] text-blue-100/85 mt-0.5 leading-relaxed">
                          {feat.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preserved UNFCU Card Visual */}
            <div className="px-6 sm:px-8 pb-4 relative z-10 flex justify-center">
              <div className="w-full max-w-[320px] rounded-2xl overflow-hidden bg-[#1D3F5A] border border-white/10 shadow-md">
                <img
                  src={applyCardsPromoImg}
                  alt="UNFCU Elite and Azure credit cards"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-contain block"
                />
              </div>
            </div>

            <div className="relative">
              <UnfcuGlobeBackdrop className="w-full h-16 sm:h-20 pointer-events-none select-none block opacity-90" />
            </div>
          </div>
        </div>
      </section>

      {/* Customer Information Section */}
      <section className="bg-white/80 border-t border-slate-200 py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <span className="text-[11px] font-bold text-[#2166D5] uppercase tracking-wider block">
                {t.footer.platformSupportHeading}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#173A52]">
                {t.footer.customerInfoHeading}
              </h3>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              {t.landing.featuresSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => setActiveTopic('account_security')}
              className="p-4 rounded-2xl bg-white hover:bg-[#F8FAFC] border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow text-left transition-all flex items-start gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/20 text-[#2166D5] flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-[#173A52] flex items-center justify-between gap-2">
                  <span>{t.footer.accountSecurity}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2166D5] shrink-0 rtl-flip" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {t.infoTopics.account_security.sections[0]?.body}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTopic('payment_information')}
              className="p-4 rounded-2xl bg-white hover:bg-[#F8FAFC] border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow text-left transition-all flex items-start gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/20 text-[#2166D5] flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-[#173A52] flex items-center justify-between gap-2">
                  <span>{t.footer.paymentInfo}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2166D5] shrink-0 rtl-flip" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {t.infoTopics.payment_information.sections[0]?.body}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTopic('transaction_fees')}
              className="p-4 rounded-2xl bg-white hover:bg-[#F8FAFC] border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow text-left transition-all flex items-start gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/20 text-[#2166D5] flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-[#173A52] flex items-center justify-between gap-2">
                  <span>{t.footer.transactionFees}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2166D5] shrink-0 rtl-flip" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {t.infoTopics.transaction_fees.sections[0]?.body}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTopic('dispute_resolution')}
              className="p-4 rounded-2xl bg-white hover:bg-[#F8FAFC] border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow text-left transition-all flex items-start gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/20 text-[#2166D5] flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-[#173A52] flex items-center justify-between gap-2">
                  <span>{t.footer.disputeResolution}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2166D5] shrink-0 rtl-flip" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {t.infoTopics.dispute_resolution.sections[0]?.body}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTopic('faqs')}
              className="p-4 rounded-2xl bg-white hover:bg-[#F8FAFC] border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow text-left transition-all flex items-start gap-3 cursor-pointer group sm:col-span-2 lg:col-span-2"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/20 text-[#2166D5] flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-[#173A52] flex items-center justify-between gap-2">
                  <span>{t.footer.faqs}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2166D5] shrink-0 rtl-flip" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {t.infoTopics.faqs.sections[0]?.body}
                </p>
              </div>
            </button>
          </div>
        </div>
      </section>

      <CustomerInfoModal
        topic={activeTopic}
        onClose={() => setActiveTopic(null)}
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
