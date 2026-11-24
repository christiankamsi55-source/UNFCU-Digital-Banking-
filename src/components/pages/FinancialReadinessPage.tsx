import React, { useState } from 'react';
import { useDevice } from '../../context/DeviceContext';
import { useAuth } from '../../context/AuthContext';
import { UnfcuEmblem } from '../common/UnfcuLogo';
import { getLanguageOption } from '../../lib/i18n';
import { LanguageSelectModal } from '../common/LanguageSelectModal';
import { CustomerInfoModal, InfoModalTopic } from '../common/CustomerInfoModal';
import heroPathwayImg from '../../assets/images/hero_wooden_pathway_1794821021067.jpg';
import savingsForestImg from '../../assets/images/fr_savings_forest_clean.jpg';
import everydayProduceImg from '../../assets/images/fr_everyday_produce_ref.jpg';
import planFutureImg from '../../assets/images/fr_plan_future_ref.jpg';
import protectLighthouseImg from '../../assets/images/fr_protect_lighthouse_clean.jpg';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Globe,
  Landmark,
  Menu,
  ShieldCheck,
  Sprout,
  Trees,
  X,
} from 'lucide-react';

export const FinancialReadinessPage: React.FC = () => {
  const { setActivePage, goBack } = useDevice();
  const { isAuthenticated, isAdmin, language, setLanguage } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<InfoModalTopic | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const currentLang = getLanguageOption(language);

  const goToDigitalBankingWelcome = () => {
    setMobileMenuOpen(false);
    setActivePage('landing');
  };

  const handleReturnHome = () => {
    setMobileMenuOpen(false);
    goBack('public_home');
  };

  const handleMarkImageError = (key: string) => {
    setImgErrors((prev) => ({ ...prev, [key]: true }));
  };

  const scrollToDisclosures = () => {
    setMobileMenuOpen(false);
    const el = document.getElementById('financial-readiness-disclosures');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#16364D] font-sans overflow-x-hidden">
      {/* ===================================================================== */}
      {/* SITE TOP NAVIGATION BAR WITH CLEAN RETURN TO PUBLIC HOMEPAGE          */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="border-b border-slate-100 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-9 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-medium text-slate-600">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6">
              <button
                type="button"
                onClick={handleReturnHome}
                className="inline-flex items-center gap-1 hover:text-[#16364D] hover:underline whitespace-nowrap shrink-0 cursor-pointer font-semibold text-[#16364D]"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Home</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTopic('contact_us')}
                className="hover:text-[#16364D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Contact Us
              </button>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <button
                type="button"
                onClick={scrollToDisclosures}
                className="hover:text-[#16364D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Disclosures
              </button>
              <button
                type="button"
                onClick={() => setIsLangModalOpen(true)}
                className="inline-flex items-center gap-1 hover:text-[#16364D] whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Select Language"
              >
                <Globe className="w-3 h-3 text-[#1C6DD0]" />
                <span>{currentLang.code.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 lg:gap-8 min-w-0">
            <button
              type="button"
              onClick={() => setActivePage('public_home')}
              className="flex items-center gap-2.5 text-left shrink-0 cursor-pointer group"
            >
              <UnfcuEmblem variant="navy" size={34} className="shrink-0" />
              <span className="text-xl sm:text-[22px] font-extrabold tracking-tight text-[#16364D] whitespace-nowrap">
                UNFCU<sup className="text-[10px] font-bold text-[#1C6DD0] ml-0.5">®</sup>
              </span>
            </button>

            <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-[#16364D]">
              <button
                type="button"
                onClick={() => setActivePage('public_home')}
                className="hover:text-[#1C6DD0] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
              >
                Overview
              </button>
              <button
                type="button"
                onClick={goToDigitalBankingWelcome}
                className="hover:text-[#1C6DD0] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
              >
                Digital Banking
              </button>
              <button
                type="button"
                onClick={() => setActivePage('support')}
                className="hover:text-[#1C6DD0] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
              >
                Help Center
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={goToDigitalBankingWelcome}
              className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-[#16364D] font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Join</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (isAuthenticated) {
                  setActivePage(isAdmin ? 'admin_dashboard' : 'dashboard');
                } else {
                  goToDigitalBankingWelcome();
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-[#1C6DD0] hover:bg-[#1559AE] text-white font-semibold text-xs shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{isAuthenticated ? 'Banking Portal' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 text-[#16364D] hover:bg-slate-50 flex items-center justify-center cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 text-xs font-semibold text-[#16364D] shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setActivePage('public_home');
              }}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between cursor-pointer"
            >
              <span>Overview</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={goToDigitalBankingWelcome}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between cursor-pointer"
            >
              <span>Digital Banking</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setActivePage('support');
              }}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between cursor-pointer"
            >
              <span>Help Center</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={goToDigitalBankingWelcome}
                className="flex-1 py-2.5 px-4 rounded-full border border-slate-300 text-[#16364D] font-bold text-center cursor-pointer"
              >
                Join
              </button>
              <button
                type="button"
                onClick={goToDigitalBankingWelcome}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#1C6DD0] text-white font-bold text-center cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ===================================================================== */}
      {/* 1. TOP HERO BANNER (WOODEN BOARDWALK PATHWAY LANDSCAPE)               */}
      {/* ===================================================================== */}
      <section className="relative w-full min-h-[260px] sm:min-h-[320px] lg:min-h-[360px] flex items-center justify-center overflow-hidden bg-[#2F4838]">
        {!imgErrors.hero && (
          <img
            src={heroPathwayImg}
            alt="Wooden boardwalk pathway winding through tall green meadow grass"
            referrerPolicy="no-referrer"
            onError={() => handleMarkImageError('hero')}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-950/45 to-slate-950/45"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center space-y-3.5">
          <h1
            className="text-3xl sm:text-4xl lg:text-[42px] font-normal text-white leading-[1.18] tracking-tight drop-shadow-xs"
            style={{ textWrap: 'balance' }}
          >
            Build a path toward financial readiness
          </h1>
          <p className="text-sm sm:text-base text-white/95 max-w-xl mx-auto leading-relaxed drop-shadow-xs">
            Ensure your accounts all work together to help you save, manage, and plan toward your
            financial goals.
          </p>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. INTRODUCTION: WHAT IS FINANCIAL READINESS?                         */}
      {/* ===================================================================== */}
      <section className="bg-[#EEF3F8] py-12 sm:py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-200/60">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="text-2xl sm:text-[32px] font-normal text-[#16364D] leading-tight">
            What is financial readiness?
          </h2>
          <p className="text-[13px] sm:text-sm text-[#334E68] leading-relaxed">
            Financial readiness is the confidence you gain when thoughtful choices about how you
            save, manage, plan, and protect your money all work together. With a solid path
            forward, you can move toward your goals without detours.
          </p>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. START WITH YOUR SAVINGS                                            */}
      {/* ===================================================================== */}
      <section className="bg-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12 items-center">
          <div className="md:col-span-6 space-y-4">
            <h2 className="text-2xl sm:text-[30px] font-normal text-[#16364D] leading-tight">
              Start with your savings
            </h2>
            <p className="text-[13px] sm:text-sm text-[#334E68] leading-relaxed">
              Strong savings cushion you against the unexpected and help your goals take shape. You
              can build on solid ground through strategies such as:
            </p>
            <ul className="list-disc pl-5 space-y-2.5 text-[13px] sm:text-sm text-[#334E68] leading-relaxed">
              <li>
                Creating an emergency fund in a{' '}
                <button
                  type="button"
                  onClick={() => setActivePage(isAuthenticated ? 'account_details' : 'landing')}
                  className="underline text-[#16364D] hover:text-[#1C6DD0] transition-colors cursor-pointer text-left"
                >
                  high-yield savings account
                </button>
              </li>
              <li>
                Organizing your{' '}
                <button
                  type="button"
                  onClick={() => setActiveTopic('payment_information')}
                  className="underline text-[#16364D] hover:text-[#1C6DD0] transition-colors cursor-pointer text-left"
                >
                  share certificates
                </button>{' '}
                with a laddering strategy
              </li>
              <li>
                Setting up{' '}
                <button
                  type="button"
                  onClick={() => setActivePage(isAuthenticated ? 'transfers' : 'landing')}
                  className="underline text-[#16364D] hover:text-[#1C6DD0] transition-colors cursor-pointer text-left"
                >
                  inbound transfers
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-6">
            <div className="w-full rounded-xs overflow-hidden border border-slate-200/80 bg-[#EEF3F8] aspect-[16/10] shadow-xs">
              {!imgErrors.savings ? (
                <img
                  src={savingsForestImg}
                  alt="Tall green pine trees rising through morning light"
                  referrerPolicy="no-referrer"
                  onError={() => handleMarkImageError('savings')}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-[#16364D]">
                  <Trees className="w-8 h-8 text-[#2C6B6A] mb-2" />
                  <span className="text-xs font-semibold">Savings Foundation</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. MANAGE EVERYDAY FINANCES                                           */}
      {/* ===================================================================== */}
      <section className="bg-[#F8FAFC] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-100">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12 items-center">
          <div className="md:col-span-6 order-2 md:order-1">
            <div className="w-full rounded-xs overflow-hidden border border-slate-200/80 bg-[#EEF3F8] aspect-[4/3] shadow-xs">
              {!imgErrors.everyday ? (
                <img
                  src={everydayProduceImg}
                  alt="Hands exchanging fresh green vegetables at a market"
                  referrerPolicy="no-referrer"
                  onError={() => handleMarkImageError('everyday')}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-[#16364D]">
                  <Landmark className="w-8 h-8 text-[#1C6DD0] mb-2" />
                  <span className="text-xs font-semibold">Everyday Checking</span>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-6 order-1 md:order-2 space-y-4">
            <h2 className="text-2xl sm:text-[30px] font-normal text-[#16364D] leading-tight">
              Manage everyday finances
            </h2>
            <p className="text-[13px] sm:text-sm text-[#334E68] leading-relaxed">
              When thinking about financial readiness, day-to-day transactions can be easy to
              overlook. Yet these small, frequent decisions on how income arrives and spending flows
              are often where positive financial habits are strengthened.
            </p>
            <p className="text-[13px] sm:text-sm text-[#334E68] leading-relaxed">
              When paired with automatic deposits and smart budgeting, our{' '}
              <button
                type="button"
                onClick={() => setActivePage(isAuthenticated ? 'account_details' : 'landing')}
                className="underline text-[#16364D] hover:text-[#1C6DD0] transition-colors cursor-pointer"
              >
                checking account
              </button>{' '}
              with a premium rate can help form habits that carry long-term impact.
            </p>
            <div className="pt-2 flex flex-col items-start gap-2.5">
              <button
                type="button"
                onClick={() => setActivePage(isAuthenticated ? 'transfers' : 'landing')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1C6DD0] hover:bg-[#1559AE] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <span>Set up automatic deposits</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActivePage('support')}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#16364D]/60 bg-white hover:bg-slate-50 text-[#16364D] text-xs font-medium transition-colors cursor-pointer"
              >
                <span>Learn about budgeting basics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 5. PLAN FOR THE FUTURE                                                */}
      {/* ===================================================================== */}
      <section className="bg-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12 items-center">
          <div className="md:col-span-6 space-y-4">
            <h2 className="text-2xl sm:text-[30px] font-normal text-[#16364D] leading-tight">
              Plan for the future
            </h2>
            <p className="text-[13px] sm:text-sm text-[#334E68] leading-relaxed">
              Planning for your financial future is important at every stage of life, but
            </p>
          </div>

          <div className="md:col-span-6">
            <div className="w-full rounded-xs overflow-hidden border border-slate-200/80 bg-[#EEF3F8] aspect-[16/9] shadow-xs">
              {!imgErrors.future ? (
                <img
                  src={planFutureImg}
                  alt="Child looking closely at a newly planted young tree outdoors"
                  referrerPolicy="no-referrer"
                  onError={() => handleMarkImageError('future')}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-[#16364D]">
                  <Sprout className="w-8 h-8 text-[#2C6B6A] mb-2" />
                  <span className="text-xs font-semibold">Planning for Growth</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 6. PROTECT WHAT YOU HAVE BUILT                                        */}
      {/* ===================================================================== */}
      <section className="bg-[#F8FAFC] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12 items-center">
          <div className="md:col-span-6 order-2 md:order-1">
            <div className="w-full rounded-xs overflow-hidden border border-slate-200/80 bg-[#EEF3F8] aspect-[4/3] shadow-xs">
              {!imgErrors.protect ? (
                <img
                  src={protectLighthouseImg}
                  alt="Coastal white lighthouse overlooking green cliffs and ocean"
                  referrerPolicy="no-referrer"
                  onError={() => handleMarkImageError('protect')}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-[#16364D]">
                  <ShieldCheck className="w-8 h-8 text-[#1C6DD0] mb-2" />
                  <span className="text-xs font-semibold">Account Protection</span>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-6 order-1 md:order-2 space-y-4">
            <h2 className="text-2xl sm:text-[30px] font-normal text-[#16364D] leading-tight">
              Protect what you have built
            </h2>
            <p className="text-[13px] sm:text-sm text-[#334E68] leading-relaxed">
              A key part of financial readiness is protecting what you have built — your accounts,
              personal information, and financial future. As fraud and scam tactics grow more
              sophisticated, taking simple steps can help secure your funds and can help keep you
              focused on your goals.
            </p>
            <div className="pt-2 flex flex-col items-start gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTopic('account_security')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1C6DD0] hover:bg-[#1559AE] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <span>How pausing can protect you</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTopic('security')}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#16364D]/60 bg-white hover:bg-slate-50 text-[#16364D] text-xs font-medium transition-colors cursor-pointer"
              >
                <span>Spot AI impersonation scams</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 7. FINAL RESOURCES SECTION (DEEP TEAL BANNER)                         */}
      {/* ===================================================================== */}
      <section className="bg-[#2C6B6A] text-white py-14 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-2xl sm:text-[30px] font-normal text-white leading-tight">
            There is always more to learn
          </h2>
          <p className="text-[13px] sm:text-sm text-white/90 leading-relaxed">
            Financial readiness is something you keep building. Stay ready with guides, tools, and
            insights on everything from saving smarter to maintaining good credit.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setActivePage('support')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/80 text-white hover:bg-white/10 text-xs font-medium transition-colors cursor-pointer"
            >
              <span>Explore further resources</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 8. DISCLOSURES SECTION — AT THE VERY BOTTOM                           */}
      {/* ===================================================================== */}
      <section
        id="financial-readiness-disclosures"
        className="bg-[#EEF3F8] py-12 sm:py-14 px-4 sm:px-6 lg:px-8 flex-1 border-t border-slate-200/80"
      >
        <div className="max-w-5xl mx-auto text-[#2B3E50] space-y-3 text-[11px] sm:text-xs leading-relaxed">
          <h2 className="text-xl sm:text-2xl font-bold text-[#16364D] pb-1">
            Disclosures
          </h2>
          <p>
            Important regulatory and advisory disclosures for UNFCU Advisors LLC and Copper Financial
            Network, LLC (Member FINRA/SIPC) apply to investment and financial readiness resources.
            For questions or written compliance inquiries, contact{' '}
            <span className="font-medium text-[#16364D]">compliance@cu.financial</span> or speak
            with our team via UNFCU Help &amp; Support.
          </p>
        </div>
      </section>

      <CustomerInfoModal topic={activeTopic} onClose={() => setActiveTopic(null)} />

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
