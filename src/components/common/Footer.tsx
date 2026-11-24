import React, { useState } from 'react';
import { CustomerInfoModal, InfoModalTopic } from './CustomerInfoModal';
import { UnfcuEmblem } from './UnfcuLogo';
import { ChevronRight, Smartphone, X } from 'lucide-react';
import { useDevice } from '../../context/DeviceContext';
import { useAuth } from '../../context/AuthContext';
import { usePWAInstallContext } from '../../context/PWAInstallContext';

interface FooterNoticeState {
  title: string;
  category: string;
  description: string;
}

export const Footer: React.FC = () => {
  const { setActivePage, activePage, deviceMode } = useDevice();
  const { isAuthenticated, t } = useAuth();
  const { openIOSInstallFlow, openAndroidInstallFlow } = usePWAInstallContext();
  const [activeTopic, setActiveTopic] = useState<InfoModalTopic | null>(null);
  const [serviceNotice, setServiceNotice] = useState<FooterNoticeState | null>(null);

  const isAdminRoute = activePage === 'admin_dashboard' || activePage === 'admin_login';
  const isMobileFrame = deviceMode === 'mobile_iphone' || deviceMode === 'mobile_android';

  if (isAuthenticated && !isAdminRoute && isMobileFrame) {
    return null;
  }

  return (
    <footer
      className={`bg-[#16364D] text-white/85 border-t border-white/15 text-xs mt-auto ${
        isAuthenticated && !isAdminRoute ? 'hidden md:block' : ''
      }`}
    >
      {/* Top Utility Row (Matching Reference Structure) */}
      <div className="border-b border-white/15 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-white">
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

      {/* Main Content Columns (Reference Sections + Complete Existing Footer Content Preserved) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 border-b border-white/15">
        {/* Primary Reference Row: Institution + App Access + Featured Solutions + Helpful Resources + Membership Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8">
          {/* Brand Presentation & App Install Options */}
          <div className="sm:col-span-2 lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <UnfcuEmblem variant="white" size={38} className="shrink-0" />
              <div>
                <span className="text-white font-bold tracking-tight text-sm block">
                  {t.appName}
                </span>
                <span className="text-blue-200 font-semibold text-[11px] tracking-wide block">
                  {t.common.digitalBanking}
                </span>
              </div>
            </div>

            <p className="text-white/80 text-xs leading-relaxed max-w-md">
              {t.footer.tagline}
            </p>

            <div className="space-y-2 pt-1">
              <p className="text-xs text-blue-100/90 font-medium">
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

          {/* Column: Featured Solutions */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white tracking-wide">
              Featured Solutions
            </h4>
            <ul className="space-y-2 text-xs text-white/80">
              <li>
                <button
                  type="button"
                  onClick={() => setActivePage(isAuthenticated ? 'dashboard' : 'landing')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Digital Banking
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePage(isAuthenticated ? 'transfers' : 'landing')}
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

          {/* Column: Helpful Resources */}
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

          {/* Column: Membership Details */}
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

        {/* Preserved Original Footer Columns: Customer Information & Platform Support */}
        <div className="pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Section: CUSTOMER INFORMATION */}
          <div className="md:col-span-6 space-y-3">
            <span className="font-bold text-xs tracking-wider uppercase block text-blue-200">
              {t.footer.customerInfoHeading}
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('account_security')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-blue-300 rtl-flip shrink-0" />
                  <span>{t.footer.accountSecurity}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('payment_information')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-blue-300 rtl-flip shrink-0" />
                  <span>{t.footer.paymentInfo}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('transaction_fees')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-blue-300 rtl-flip shrink-0" />
                  <span>{t.footer.transactionFees}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('dispute_resolution')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-blue-300 rtl-flip shrink-0" />
                  <span>{t.footer.disputeResolution}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('faqs')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-blue-300 rtl-flip shrink-0" />
                  <span>{t.footer.faqs}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Section: PLATFORM & ADMINISTRATION LINKS */}
          <div className="md:col-span-6 space-y-3">
            <span className="text-white font-bold text-xs tracking-wider uppercase block">
              {t.footer.platformSupportHeading}
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('about_us')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  {t.footer.aboutUs}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('contact_us')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  {t.footer.contactUs}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('privacy_policy')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  {t.footer.privacyPolicy}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('terms_conditions')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  {t.footer.termsConditions}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('security')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  {t.footer.security}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('help_support')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  {t.footer.helpSupport}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTopic('transaction_info')}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  {t.footer.transactionInfo}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActivePage('admin_login');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  {t.footer.adminSignIn}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Disclosures & Currency Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-3 border-b border-white/15 text-[11px] leading-relaxed text-white/75">
        <p className="max-w-3xl">
          Product availability, account rates, and service terms are subject to confirmation and
          applicable membership guidelines. Contact us for current rates before opening a new product
          or initiating a settlement. View our Fees &amp; Service Charges schedule for specific
          transfer and withdrawal fee details.
        </p>
        <p>
          All monetary amounts in UNFCU Digital Banking are in US dollars (USD) unless otherwise
          noted.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-white/85">
          <div>
            © {new Date().getFullYear()} {t.appName}. {t.common.allRightsReserved}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-blue-200/85">
            <span>{t.common.encryptionLabel}</span>
            <span>·</span>
            <span>{t.common.digitalBanking}</span>
          </div>
        </div>
      </div>

      {/* Bottom Legal Bar & White Social Icons */}
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
        <div className="flex items-center gap-4 text-white/90">
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

      {/* Customer Information & Policy Content Modal */}
      <CustomerInfoModal
        topic={activeTopic}
        onClose={() => setActiveTopic(null)}
      />

      {/* Service Notice Modal */}
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
                    setActivePage(isAuthenticated ? 'dashboard' : 'landing');
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
    </footer>
  );
};
