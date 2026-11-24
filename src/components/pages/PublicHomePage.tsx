import React, { useState } from 'react';
import { useDevice } from '../../context/DeviceContext';
import { useAuth } from '../../context/AuthContext';
import { usePWAInstallContext } from '../../context/PWAInstallContext';
import { UnfcuEmblem } from '../common/UnfcuLogo';
import { CustomerInfoModal, InfoModalTopic } from '../common/CustomerInfoModal';
import { LanguageSelectModal } from '../common/LanguageSelectModal';
import { getLanguageOption } from '../../lib/i18n';
import { WHATSAPP_JOIN_URL } from '../../lib/contact';
import heroBankingExecutiveImg from '../../assets/images/hero_banking_executive_full_1794826777679.jpg';
import globalCitizensImg from '../../assets/images/global_banking_citizens_1794821021380.jpg';
import unFlagImpactImg from '../../assets/images/un_flag_impact_1794821021863.jpg';
import oceanCoastImg from '../../assets/images/ocean_coastline_aerial_1794821021747.jpg';
import {
  ArrowRight,
  ChevronDown,
  Globe,
  Menu,
  MessageSquare,
  Search,
  Smartphone,
  ShieldCheck,
  X,
} from 'lucide-react';

interface ServiceNoticeState {
  title: string;
  category: string;
  description: string;
}

export const PublicHomePage: React.FC = () => {
  const { setActivePage } = useDevice();
  const { isAuthenticated, isAdmin, language, setLanguage } = useAuth();
  const { openIOSInstallFlow, openAndroidInstallFlow } = usePWAInstallContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<InfoModalTopic | null>(null);
  const [serviceNotice, setServiceNotice] = useState<ServiceNoticeState | null>(null);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const currentLang = getLanguageOption(language);

  // Sign In & Join connect directly to the existing UNFCU Digital Banking welcome/login page ('landing')
  const goToDigitalBankingWelcome = () => {
    setMobileMenuOpen(false);
    setActivePage('landing');
  };

  const handleHeroPrimaryCta = () => {
    setActivePage('financial_readiness');
  };

  const handleMarkImageError = (key: string) => {
    setImgErrors((prev) => ({ ...prev, [key]: true }));
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const searchableItems = [
    {
      label: 'Digital Banking Portal (Sign In / Enroll)',
      keywords: 'login sign in enroll register digital banking account',
      action: goToDigitalBankingWelcome,
    },
    {
      label: 'USD Transfers & Commercial Wire / Bitcoin Services',
      keywords: 'usd transfers wire ach bitcoin withdraw send money',
      action: () => (isAuthenticated ? setActivePage('transfers') : setActivePage('landing')),
    },
    {
      label: 'Credit Cards — UNFCU Elite & Azure Cards',
      keywords: 'credit cards elite azure visa rewards balance transfer apr',
      action: () => setActivePage('credit_cards'),
    },
    {
      label: 'Help Center & Customer Support',
      keywords: 'help support faq questions dispute resolution',
      action: () => setActivePage('support'),
    },
    {
      label: 'Fees & Service Charges Disclosure',
      keywords: 'fees rates charges service charges transaction',
      action: () => setActiveTopic('transaction_fees'),
    },
    {
      label: 'Account Security & Protection',
      keywords: 'security privacy protection firebase',
      action: () => setActiveTopic('account_security'),
    },
    {
      label: 'Wire & Settlement Payment Information',
      keywords: 'routing wire clearing payment deposit escrow',
      action: () => setActiveTopic('payment_information'),
    },
  ];

  const filteredSearchItems = searchQuery.trim()
    ? searchableItems.filter((item) => {
        const q = searchQuery.toLowerCase();
        return item.label.toLowerCase().includes(q) || item.keywords.includes(q);
      })
    : searchableItems.slice(0, 4);

  const primaryNavLinks = [
    { label: 'Save', action: () => scrollToSection('promotional-cards') },
    { label: 'Spend', action: () => scrollToSection('global-solutions') },
    { label: 'Borrow', action: () => scrollToSection('help-solutions') },
    {
      label: 'Credit Cards',
      action: () => {
        setMobileMenuOpen(false);
        setActivePage('credit_cards');
      },
    },
    {
      label: 'Transfer',
      action: () => (isAuthenticated ? setActivePage('transfers') : goToDigitalBankingWelcome()),
    },
    { label: 'Learn', action: () => scrollToSection('impact-section') },
  ];

  const globalSolutionLinks = [
    {
      label: 'Digital Banking',
      action: goToDigitalBankingWelcome,
    },
    {
      label: 'USD Transfers',
      action: () => (isAuthenticated ? setActivePage('transfers') : goToDigitalBankingWelcome()),
    },
    {
      label: 'Loans',
      action: () =>
        setServiceNotice({
          title: 'Personal & Institutional Loan Inquiries',
          category: 'Borrowing Solutions',
          description:
            'Information coming soon. Contact us through Help & Support to inquire about available account services and lending eligibility.',
        }),
    },
    {
      label: 'Credit Cards',
      action: () => setActivePage('credit_cards'),
    },
    {
      label: 'High-Yield Savings',
      action: () =>
        setServiceNotice({
          title: 'Savings & Reserve Account Options',
          category: 'Save',
          description:
            'Contact us for current rates and account eligibility details. Visit the UNFCU Digital Banking portal to access your account.',
        }),
    },
    {
      label: 'Payroll Deposit',
      action: () => setActiveTopic('payment_information'),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#173A52] font-sans overflow-x-hidden relative">
      {/* ===================================================================== */}
      {/* 1. TOP UTILITY NAVIGATION + 2. MAIN NAVIGATION BAR                    */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-2xs">
        {/* Top Utility Strip */}
        <div className="border-b border-slate-100 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-9 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-medium text-slate-600">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6">
              <button
                type="button"
                onClick={() => setActiveTopic('about_us')}
                className="hover:text-[#173A52] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => setActiveTopic('contact_us')}
                className="hover:text-[#173A52] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Contact Us
              </button>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <button
                type="button"
                onClick={() =>
                  setServiceNotice({
                    title: 'Current Account Rates & Fee Schedule',
                    category: 'Rates Overview',
                    description:
                      'Contact us for current rates. Standard transfer and withdrawal fee schedules can be reviewed in our Fees & Service Charges disclosure.',
                  })
                }
                className="hover:text-[#173A52] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Rates
              </button>
              <button
                type="button"
                onClick={() => setActiveTopic('payment_information')}
                className="hover:text-[#173A52] hover:underline whitespace-nowrap shrink-0 cursor-pointer hidden min-[420px]:inline-flex items-center"
              >
                Wire &amp; Routing Info
              </button>
              <button
                type="button"
                onClick={() => setIsLangModalOpen(true)}
                className="inline-flex items-center gap-1 hover:text-[#173A52] whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Select Language"
              >
                <Globe className="w-3 h-3 text-[#2166D5]" />
                <span>{currentLang.code.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: UNFCU Logo + Primary Links */}
          <div className="flex items-center gap-6 lg:gap-8 min-w-0">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 text-left shrink-0 cursor-pointer group"
            >
              <UnfcuEmblem variant="navy" size={34} className="shrink-0" />
              <span className="text-xl sm:text-[22px] font-extrabold tracking-tight text-[#173A52] whitespace-nowrap">
                UNFCU<sup className="text-[10px] font-bold text-[#2166D5] ml-0.5">®</sup>
              </span>
            </button>

            <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-[#173A52]">
              {primaryNavLinks.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="inline-flex items-center gap-1 hover:text-[#2166D5] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
                >
                  <span>{item.label}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </nav>
          </div>

          {/* Right: Search Icon, Join Button, Sign In Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Search UNFCU services"
              className="w-9 h-9 rounded-full hover:bg-slate-100 text-[#173A52] flex items-center justify-center transition-colors cursor-pointer"
            >
              {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>

            <a
              href={WHATSAPP_JOIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-[#173A52] font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Join</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </a>

            <button
              type="button"
              onClick={goToDigitalBankingWelcome}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-[#2166D5] hover:bg-[#1A54B5] text-white font-semibold text-xs shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{isAuthenticated ? 'Banking Portal' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 text-[#173A52] hover:bg-slate-50 flex items-center justify-center cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Interactive Site Search Bar */}
        {searchOpen && (
          <div className="border-t border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-3 shadow-md">
            <div className="max-w-3xl mx-auto space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Digital Banking, Transfers, Help Center, Fees..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2166D5]"
                />
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
                {filteredSearchItems.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-500">
                    No matching topics found.{' '}
                    <button
                      type="button"
                      onClick={() => setActivePage('support')}
                      className="text-[#2166D5] font-semibold hover:underline cursor-pointer"
                    >
                      Visit Help &amp; Support
                    </button>
                  </div>
                ) : (
                  filteredSearchItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                        item.action();
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#173A52] hover:bg-[#EBF2FC]/60 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span>{item.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#2166D5] shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 text-xs font-semibold text-[#173A52] shadow-lg">
            {primaryNavLinks.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between cursor-pointer"
              >
                <span>{item.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ))}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <a
                href={WHATSAPP_JOIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-full border border-slate-300 text-[#173A52] font-bold text-center cursor-pointer"
              >
                Join
              </a>
              <button
                type="button"
                onClick={goToDigitalBankingWelcome}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#2166D5] text-white font-bold text-center cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ===================================================================== */}
      {/* 3. MAIN WELCOME / HERO SECTION                                        */}
      {/* ===================================================================== */}
      <section className="bg-white pt-10 pb-14 sm:pt-14 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Hero Copy */}
          <div className="lg:col-span-6 space-y-5 text-left">
            <h1
              className="text-3xl sm:text-4xl lg:text-[46px] font-normal tracking-tight text-[#173A52] leading-[1.15]"
              style={{ textWrap: 'balance' }}
            >
              Build a path toward financial readiness
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-md leading-relaxed">
              Ensure your accounts all work together to help support your goals.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleHeroPrimaryCta}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#173A52] hover:text-[#2166D5] transition-colors cursor-pointer group"
              >
                <span>Learn more</span>
                <ArrowRight className="w-4 h-4 text-[#2166D5] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Column: Large Circular Banking Executive Portrait Photograph */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-64 h-64 sm:w-80 sm:h-80 lg:w-[360px] lg:h-[360px] rounded-full overflow-hidden shadow-lg border border-slate-200/80 bg-[#E5EBF2] shrink-0">
              {!imgErrors.hero ? (
                <img
                  src={heroBankingExecutiveImg}
                  alt="Professional female banking advisor in formal business attire working inside a modern international banking office"
                  referrerPolicy="no-referrer"
                  onError={() => handleMarkImageError('hero')}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#EBF2FC] to-[#D4E2F4] text-[#173A52]">
                  <UnfcuEmblem variant="navy" size={56} />
                  <span className="text-xs font-semibold mt-3">UNFCU Digital Banking</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. THREE PROMOTIONAL INFORMATION CARDS                                */}
      {/* ===================================================================== */}
      <section id="promotional-cards" className="bg-[#EEF3F8] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card One */}
          <div className="bg-white rounded-sm border border-slate-200/80 p-7 flex flex-col justify-between min-h-[210px] shadow-2xs">
            <div className="space-y-3">
              <span className="text-[11px] font-medium text-slate-500 block">
                Share Certificates
              </span>
              <h2 className="text-lg sm:text-xl font-normal text-[#173A52] leading-snug">
                Explore fixed-term certificate savings options
              </h2>
              <p className="text-xs text-slate-500">
                Contact us for current rates and availability.
              </p>
            </div>
            <div className="pt-6">
              <button
                type="button"
                onClick={() =>
                  setServiceNotice({
                    title: 'Share Certificates & Term Savings',
                    category: 'Share Certificates',
                    description:
                      'Contact us for current rates, term options, and eligibility. Visit Digital Banking or Help & Support to speak with our team.',
                  })
                }
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173A52] hover:text-[#2166D5] transition-colors cursor-pointer"
              >
                <span>See details</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#2166D5]" />
              </button>
            </div>
          </div>

          {/* Card Two */}
          <div className="bg-white rounded-sm border border-slate-200/80 p-7 flex flex-col justify-between min-h-[210px] shadow-2xs">
            <div className="space-y-3">
              <span className="text-[11px] font-medium text-slate-500 block">
                Spend
              </span>
              <h2 className="text-lg sm:text-xl font-normal text-[#173A52] leading-snug">
                Manage everyday funds with flexible digital account access
              </h2>
              <p className="text-xs text-slate-500">
                Contact us for current rates and account features.
              </p>
            </div>
            <div className="pt-6">
              <button
                type="button"
                onClick={goToDigitalBankingWelcome}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173A52] hover:text-[#2166D5] transition-colors cursor-pointer"
              >
                <span>Explore available services</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#2166D5]" />
              </button>
            </div>
          </div>

          {/* Card Three */}
          <div className="bg-white rounded-sm border border-slate-200/80 p-7 flex flex-col justify-between min-h-[210px] shadow-2xs">
            <div className="space-y-3">
              <span className="text-[11px] font-medium text-slate-500 block">
                Learn
              </span>
              <h2 className="text-lg sm:text-xl font-normal text-[#173A52] leading-snug">
                Simplify saving with scheduled account deposits
              </h2>
              <p className="text-xs text-slate-500">
                Explore available services and deposit instructions.
              </p>
            </div>
            <div className="pt-6">
              <button
                type="button"
                onClick={() => setActiveTopic('payment_information')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173A52] hover:text-[#2166D5] transition-colors cursor-pointer"
              >
                <span>Explore deposit options</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#2166D5]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 5. GLOBAL BANKING SOLUTIONS SECTION (APPEARS ONCE ONLY)               */}
      {/* ===================================================================== */}
      <section id="global-solutions" className="bg-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Heading + Photograph */}
          <div className="lg:col-span-5 space-y-6">
            <h2
              className="text-2xl sm:text-3xl lg:text-[34px] font-normal text-[#173A52] leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Global banking solutions for global citizens
            </h2>

            <div className="rounded-sm overflow-hidden border border-slate-200 bg-[#E5EBF2] aspect-[4/3]">
              {!imgErrors.global ? (
                <img
                  src={globalCitizensImg}
                  alt="Person holding a bank card while another person uses a smartphone banking app"
                  referrerPolicy="no-referrer"
                  onError={() => handleMarkImageError('global')}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#EBF2FC] text-[#173A52]">
                  <Smartphone className="w-8 h-8 text-[#2166D5] mb-2" />
                  <span className="text-xs font-semibold">Global Banking Solutions</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Vertical List of 6 Links with Hairline Dividers */}
          <div className="lg:col-span-7 lg:pl-6 divide-y divide-slate-200 border-t border-b border-slate-200">
            {globalSolutionLinks.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="w-full py-5 px-1 flex items-center justify-between gap-4 text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
              >
                <span className="text-sm sm:text-base font-normal text-[#2166D5] group-hover:text-[#173A52] transition-colors">
                  {item.label}
                </span>
                <ArrowRight className="w-4 h-4 text-[#2166D5] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 6. HELP AND BANKING SOLUTIONS SECTION                                 */}
      {/* ===================================================================== */}
      <section id="help-solutions" className="bg-[#EEF3F8] py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Heading + Visit Help Center Pill CTA */}
          <div className="lg:col-span-4 space-y-6">
            <h2
              className="text-2xl sm:text-3xl lg:text-[34px] font-normal text-[#173A52] leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Make the most of every UNFCU solution
            </h2>
            <button
              type="button"
              onClick={() => setActivePage('support')}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-[#173A52] bg-white hover:bg-[#173A52] hover:text-white text-[#173A52] font-semibold text-xs transition-colors cursor-pointer"
            >
              <span>Visit the Help Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Column: 4 White Cards in 2x2 Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Help Card 1 */}
            <div className="bg-white rounded-sm border border-slate-200/80 p-6 sm:p-7 flex flex-col justify-between min-h-[190px] shadow-2xs">
              <div className="space-y-2.5">
                <span className="text-[11px] font-medium text-slate-500 block">
                  US Mortgages
                </span>
                <h3 className="text-base sm:text-lg font-normal text-[#173A52] leading-snug">
                  Home equity and lending overview
                </h3>
                <p className="text-[11px] text-slate-500">
                  Information coming soon. Contact us for current rates.
                </p>
              </div>
              <div className="pt-5">
                <button
                  type="button"
                  onClick={() =>
                    setServiceNotice({
                      title: 'Home Equity & Mortgage Resources',
                      category: 'US Mortgages',
                      description:
                        'Interactive payment estimators are coming soon. Please contact us for current rates or lending information.',
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173A52] hover:text-[#2166D5] transition-colors cursor-pointer"
                >
                  <span>Explore available services</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#2166D5]" />
                </button>
              </div>
            </div>

            {/* Help Card 2 */}
            <div className="bg-white rounded-sm border border-slate-200/80 p-6 sm:p-7 flex flex-col justify-between min-h-[190px] shadow-2xs">
              <div className="space-y-2.5">
                <span className="text-[11px] font-medium text-slate-500 block">
                  Savings &amp; Spending Accounts
                </span>
                <h3 className="text-base sm:text-lg font-normal text-[#173A52] leading-snug">
                  Understanding transaction fees and FAQs
                </h3>
                <p className="text-[11px] text-slate-500">
                  Review transfer and withdrawal fee schedules before confirming.
                </p>
              </div>
              <div className="pt-5">
                <button
                  type="button"
                  onClick={() => setActiveTopic('transaction_fees')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173A52] hover:text-[#2166D5] transition-colors cursor-pointer"
                >
                  <span>Find answers</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#2166D5]" />
                </button>
              </div>
            </div>

            {/* Help Card 3 */}
            <div className="bg-white rounded-sm border border-slate-200/80 p-6 sm:p-7 flex flex-col justify-between min-h-[190px] shadow-2xs">
              <div className="space-y-2.5">
                <span className="text-[11px] font-medium text-slate-500 block">
                  Credit Cards
                </span>
                <h3 className="text-base sm:text-lg font-normal text-[#173A52] leading-snug">
                  Balance transfer &amp; card solutions
                </h3>
                <p className="text-[11px] text-slate-500">
                  Information coming soon. Contact us for current rates.
                </p>
              </div>
              <div className="pt-5">
                <button
                  type="button"
                  onClick={() => setActivePage('credit_cards')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173A52] hover:text-[#2166D5] transition-colors cursor-pointer"
                >
                  <span>Explore credit cards</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#2166D5]" />
                </button>
              </div>
            </div>

            {/* Help Card 4 */}
            <div className="bg-white rounded-sm border border-slate-200/80 p-6 sm:p-7 flex flex-col justify-between min-h-[190px] shadow-2xs">
              <div className="space-y-2.5">
                <span className="text-[11px] font-medium text-slate-500 block">
                  Savings &amp; Spending Accounts
                </span>
                <h3 className="text-base sm:text-lg font-normal text-[#173A52] leading-snug">
                  Set up direct account deposits
                </h3>
                <p className="text-[11px] text-slate-500">
                  View receiving details inside your Digital Banking account.
                </p>
              </div>
              <div className="pt-5">
                <button
                  type="button"
                  onClick={goToDigitalBankingWelcome}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173A52] hover:text-[#2166D5] transition-colors cursor-pointer"
                >
                  <span>Learn how</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#2166D5]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 7. SOCIAL AND ENVIRONMENTAL IMPACT SECTION                            */}
      {/* ===================================================================== */}
      <section id="impact-section" className="bg-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <h2
            className="text-2xl sm:text-3xl lg:text-[34px] font-normal text-[#173A52] tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            Committed to social and environmental impact
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Image Card One: People looking toward UN flag */}
            <div className="bg-[#EEF3F8] rounded-sm overflow-hidden border border-slate-200/80 flex flex-col">
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#D4E2F4]">
                {!imgErrors.flag ? (
                  <img
                    src={unFlagImpactImg}
                    alt="Two people looking toward a United Nations flag waving outdoors"
                    referrerPolicy="no-referrer"
                    onError={() => handleMarkImageError('flag')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-[#173A52]">
                    <Globe className="w-8 h-8 text-[#2166D5] mb-2" />
                    <span className="text-xs font-semibold">Global Community Impact</span>
                  </div>
                )}
              </div>
              <div className="p-6 sm:p-7 flex items-center gap-4">
                <div className="w-1.5 h-8 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
                <p className="text-base sm:text-lg font-normal text-[#173A52]">
                  Delivering local impact on a global scale
                </p>
              </div>
            </div>

            {/* Image Card Two: Aerial coastline and blue ocean */}
            <div className="bg-[#EEF3F8] rounded-sm overflow-hidden border border-slate-200/80 flex flex-col">
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#D4E2F4]">
                {!imgErrors.ocean ? (
                  <img
                    src={oceanCoastImg}
                    alt="Aerial photograph of a green coastline beside clear turquoise and blue ocean"
                    referrerPolicy="no-referrer"
                    onError={() => handleMarkImageError('ocean')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-[#173A52]">
                    <ShieldCheck className="w-8 h-8 text-[#2166D5] mb-2" />
                    <span className="text-xs font-semibold">Environmental Stewardship</span>
                  </div>
                )}
              </div>
              <div className="p-6 sm:p-7 flex items-center gap-4">
                <div className="w-1.5 h-8 rounded-full bg-[#2166D5] shrink-0" aria-hidden="true" />
                <p className="text-base sm:text-lg font-normal text-[#173A52]">
                  Supporting sustainable global community initiatives
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 8. FOOTER NAVIGATION + 9. FOUR COLUMNS + 10. DISCLOSURES + 11. BOTTOM */}
      {/* ===================================================================== */}
      <footer className="mt-auto">
        {/* Footer Top Light Nav Bar (Mirrors Reference Section 8) */}
        <div className="bg-white border-t border-slate-200 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 flex-wrap">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-2 text-left cursor-pointer shrink-0"
              >
                <UnfcuEmblem variant="navy" size={28} />
                <span className="text-lg font-extrabold tracking-tight text-[#173A52]">
                  UNFCU
                </span>
              </button>

              <nav className="flex flex-wrap items-center gap-5 text-xs font-medium text-[#173A52]">
                {primaryNavLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="hover:text-[#2166D5] transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="Search"
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-[#173A52] flex items-center justify-center cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
              <a
                href={WHATSAPP_JOIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-[#173A52] text-xs font-semibold cursor-pointer"
              >
                Join
              </a>
              <button
                type="button"
                onClick={goToDigitalBankingWelcome}
                className="px-4 py-1.5 rounded-full bg-[#2166D5] hover:bg-[#1A54B5] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Dark Navy Footer Body */}
        <div className="bg-[#16364D] text-white/85">
          {/* Footer Secondary Utility Row */}
          <div className="border-b border-white/15 px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 gap-y-2 text-xs font-medium text-white">
              <button
                type="button"
                onClick={() => setActiveTopic('about_us')}
                className="hover:text-blue-200 transition-colors cursor-pointer"
              >
                About
              </button>
              <span className="hidden sm:inline text-white/25" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => setActiveTopic('contact_us')}
                className="hover:text-blue-200 transition-colors cursor-pointer"
              >
                Contact Us
              </button>
              <span className="hidden sm:inline text-white/25" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => setActiveTopic('transaction_fees')}
                className="hover:text-blue-200 transition-colors cursor-pointer"
              >
                Rates
              </button>
              <span className="hidden sm:inline text-white/25" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => setActiveTopic('payment_information')}
                className="hover:text-blue-200 transition-colors cursor-pointer"
              >
                Wire &amp; Routing Info
              </button>
            </div>
          </div>

          {/* 9. Four Columns */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 border-b border-white/15">
            {/* Column One: Institutional Information */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <UnfcuEmblem variant="white" size={36} className="shrink-0" />
                <div className="space-y-0.5">
                  <h3 className="text-sm sm:text-base font-semibold text-white">
                    United Nations Federal Credit Union
                  </h3>
                  <p className="text-sm font-medium text-blue-100">
                    Your Financial Partner Always with You
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs text-blue-200/90">
                  Access UNFCU Digital Banking on desktop or mobile:
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={openIOSInstallFlow}
                    className="px-3.5 py-2 rounded-lg bg-[#0D2335] hover:bg-[#091A28] border border-white/25 text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Smartphone className="w-4 h-4 text-blue-300 shrink-0" />
                    <div className="leading-tight">
                      <span className="text-[9px] text-blue-200/80 block">Mobile Web App</span>
                      <span className="text-xs font-bold block">iOS Safari Install</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => openAndroidInstallFlow()}
                    className="px-3.5 py-2 rounded-lg bg-[#0D2335] hover:bg-[#091A28] border border-white/25 text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-300 shrink-0" />
                    <div className="leading-tight">
                      <span className="text-[9px] text-blue-200/80 block">Mobile Web App</span>
                      <span className="text-xs font-bold block">Android Chrome Install</span>
                    </div>
                  </button>
                </div>

                <div className="pt-2 space-y-2 text-[11px] leading-relaxed text-white/75 max-w-md">
                  <p>
                    ‡ APY = Annual Percentage Yield. Rates are subject to change without prior notice.
                    However, the rate in effect at the time of a share certificate opening will be
                    fixed for the term of the product. The Flex Rate share certificate, which allows
                    you to change the rate once during its term, is the only exception. The minimum
                    amount to open a standard share certificate is $500. Fees may reduce earnings.
                    View our fees and service charges for specific penalties. Effective date: 16
                    November 2026.
                  </p>
                  <p>
                    All monetary amounts are in US dollars (USD) unless otherwise noted.
                  </p>
                </div>
              </div>
            </div>

            {/* Column Two: Featured Solutions */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-white tracking-wide">
                Featured Solutions
              </h4>
              <ul className="space-y-2 text-xs text-white/80">
                <li>
                  <button
                    type="button"
                    onClick={goToDigitalBankingWelcome}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Digital Banking
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => (isAuthenticated ? setActivePage('transfers') : goToDigitalBankingWelcome())}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Transfers
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      setServiceNotice({
                        title: 'Personal Lending Information',
                        category: 'Featured Solutions',
                        description:
                          'Information coming soon. Contact us through Help & Support to inquire about available services.',
                      })
                    }
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Personal Loans
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActivePage('credit_cards')}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Credit Cards
                  </button>
                </li>
              </ul>
            </div>

            {/* Column Three: Helpful Resources */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-bold text-white tracking-wide">
                Helpful Resources
              </h4>
              <ul className="space-y-2 text-xs text-white/80">
                <li>
                  <button
                    type="button"
                    onClick={() => setActivePage('support')}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Help Center
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTopic('transaction_fees')}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Fees &amp; Service Charges
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTopic('faqs')}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Financial Wellness
                  </button>
                </li>
              </ul>
            </div>

            {/* Column Four: Membership Details */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-white tracking-wide">
                Membership Details
              </h4>
              <ul className="space-y-2 text-xs text-white/80">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTopic('about_us')}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Eligibility
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTopic('account_security')}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Member Benefits
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTopic('terms_conditions')}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Agreements &amp; Disclosures
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* 10. Small Print and Neutral Financial Disclosures */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4 border-b border-white/15 text-[11px] leading-relaxed text-white/75">
            <p className="max-w-3xl">
              Product availability, account rates, and service terms are subject to confirmation and
              applicable membership guidelines. Contact us for current rates before opening a new
              product or initiating a settlement. View our Fees &amp; Service Charges schedule for
              specific transfer and withdrawal fee details.
            </p>
            <p>
              All monetary amounts in UNFCU Digital Banking are in US dollars (USD) unless otherwise
              noted.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <p className="max-w-md text-white/85">
                © {new Date().getFullYear()} United Nations Federal Credit Union (UNFCU). All rights reserved.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-blue-200/85">
                <button
                  type="button"
                  onClick={() => setActiveTopic('account_security')}
                  className="hover:text-white underline-offset-2 hover:underline cursor-pointer"
                >
                  Security &amp; Encryption Details
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setActiveTopic('transaction_info')}
                  className="hover:text-white underline-offset-2 hover:underline cursor-pointer"
                >
                  Institutional Settlement Notice
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setActiveTopic('dispute_resolution')}
                  className="hover:text-white underline-offset-2 hover:underline cursor-pointer"
                >
                  Dispute Resolution
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setActivePage('admin_login')}
                  className="hover:text-white underline-offset-2 hover:underline cursor-pointer"
                >
                  Administrator Sign In
                </button>
              </div>
            </div>
          </div>

          {/* 11. Very Bottom Footer */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/85">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => setActiveTopic('privacy_policy')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="hidden sm:inline text-white/25" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => setActiveTopic('terms_conditions')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Terms of Use
              </button>
              <span className="hidden sm:inline text-white/25" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => setActiveTopic('help_support')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Accessibility
              </button>
              <span className="hidden sm:inline text-white/25" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => setActiveTopic('privacy_policy')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Cookie Preferences
              </button>
              <span className="hidden sm:inline text-white/25" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => setActiveTopic('about_us')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Career Center
              </button>
            </div>

            {/* Social Media Icons */}
            <div className="flex items-center gap-4 text-white/85">
              <button
                type="button"
                onClick={() => setActiveTopic('contact_us')}
                aria-label="Facebook"
                className="hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M13.5 9H16V6h-2.5C11.57 6 10 7.57 10 9.5V11H8v3h2v7h3v-7h2.3l.7-3H13v-1.5c0-.28.22-.5.5-.5z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setActiveTopic('contact_us')}
                aria-label="LinkedIn"
                className="hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6.94 8.5H3.56V19.5H6.94V8.5ZM5.25 3.5A1.97 1.97 0 1 0 5.25 7.44A1.97 1.97 0 1 0 5.25 3.5ZM20.44 13.02C20.44 9.88 18.76 8.22 16.16 8.22C14.37 8.22 13.48 9.2 13.02 9.93V8.5H9.65C9.7 9.45 9.65 19.5 9.65 19.5H13.02V13.36C13.02 13.02 13.05 12.69 13.15 12.45C13.42 11.78 14.03 11.09 15.07 11.09C16.41 11.09 17.06 12.11 17.06 13.6V19.5H20.44V13.02Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setActiveTopic('contact_us')}
                aria-label="Instagram"
                className="hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 stroke-current fill-none" strokeWidth="1.9" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-none" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setActiveTopic('contact_us')}
                aria-label="YouTube"
                className="hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21.58 7.19a2.75 2.75 0 0 0-1.94-1.95C17.93 4.78 12 4.78 12 4.78s-5.93 0-7.64.46A2.75 2.75 0 0 0 2.42 7.2 28.7 28.7 0 0 0 2 12a28.7 28.7 0 0 0 .42 4.81 2.75 2.75 0 0 0 1.94 1.95c1.71.46 7.64.46 7.64.46s5.93 0 7.64-.46a2.75 2.75 0 0 0 1.94-1.95A28.7 28.7 0 0 0 22 12a28.7 28.7 0 0 0-.42-4.81ZM10 15.15V8.85L15.45 12 10 15.15Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setActiveTopic('contact_us')}
                aria-label="X"
                className="hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2H21.5l-7.11 8.13L22.75 22h-6.54l-5.12-6.7L5.23 22H1.97l7.61-8.7L1.5 2h6.7l4.63 6.12L18.244 2Zm-1.14 18h1.8L7.23 3.9H5.3L17.104 20Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* FLOATING BLUE CHAT / SUPPORT BUTTON ON RIGHT SIDE                     */}
      {/* ===================================================================== */}
      <button
        type="button"
        onClick={() => setActivePage('support')}
        aria-label="Help & Support"
        title="Help & Support"
        className="fixed bottom-6 right-5 z-40 w-12 h-12 rounded-full bg-[#2166D5] hover:bg-[#1A54B5] text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105 cursor-pointer border-2 border-white"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Modals for Existing Policy Topics & Neutral Product Notices */}
      <CustomerInfoModal
        topic={activeTopic}
        onClose={() => setActiveTopic(null)}
      />

      {serviceNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#173A52] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-blue-200 block">
                  {serviceNotice.category}
                </span>
                <h3 className="text-sm font-bold text-white">{serviceNotice.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setServiceNotice(null)}
                aria-label="Close"
                className="p-1.5 rounded-lg hover:bg-white/10 text-blue-100 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>{serviceNotice.description}</p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setServiceNotice(null);
                    goToDigitalBankingWelcome();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#2166D5] hover:bg-[#1A54B5] text-white font-bold cursor-pointer"
                >
                  Open Digital Banking
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServiceNotice(null);
                    setActivePage('support');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-full border border-slate-300 text-[#173A52] hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Help &amp; Support
                </button>
              </div>
            </div>
          </div>
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
