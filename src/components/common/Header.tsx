import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { findLanguageOption } from '../../lib/i18n';
import { LanguageSelectModal } from './LanguageSelectModal';
import { PWAInstallButton } from './PWAInstallButton';
import { UnfcuEmblem } from './UnfcuLogo';
import {
  ShieldCheck,
  Globe,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, unreadNotifications, logout, language, setLanguage, t } = useAuth();
  const { deviceMode, activePage, setActivePage } = useDevice();
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminRoute = activePage === 'admin_dashboard' || activePage === 'admin_login';
  const isMobileFrame = deviceMode === 'mobile_iphone' || deviceMode === 'mobile_android';
  const hasNativeMobileHeader =
    activePage === 'landing' ||
    activePage === 'dashboard' ||
    activePage === 'account_details' ||
    activePage === 'transfers' ||
    activePage === 'more' ||
    activePage === 'support' ||
    activePage === 'history' ||
    activePage === 'notifications';

  // Inside simulated phone frames on native-header screens, avoid duplicate header bar
  if (isMobileFrame && hasNativeMobileHeader) {
    return null;
  }

  const currentLangObj = findLanguageOption(language);

  const handleNavClick = (page: any) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  // UNFCU Deep Navy header for customer pages; crisp white for admin pages
  const headerClasses = isAdminRoute
    ? 'sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 text-slate-900'
    : `sticky top-0 z-40 unfcu-navy-gradient border-b border-white/10 text-white shadow-sm ${
        hasNativeMobileHeader ? 'hidden md:block' : ''
      }`;

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Zone 1: UNFCU Brand Wordmark & Emblem */}
          <button
            onClick={() => handleNavClick(isAuthenticated ? (isAdmin ? 'admin_dashboard' : 'dashboard') : 'public_home')}
            className="flex items-center gap-2.5 sm:gap-3 text-left group focus:outline-none shrink min-w-0 cursor-pointer"
          >
            <UnfcuEmblem
              variant={isAdminRoute ? 'navy' : 'white'}
              size={36}
              className="shrink-0 transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col min-w-0">
              <span
                className={`font-bold text-xs sm:text-sm tracking-tight transition-colors truncate max-w-[82px] min-[360px]:max-w-[120px] min-[420px]:max-w-[190px] sm:max-w-none ${
                  isAdminRoute
                    ? 'text-[#173A52] group-hover:text-[#2166D5]'
                    : 'text-white group-hover:text-blue-100'
                }`}
              >
                {t.appName}
              </span>
              <span
                className={`text-[10px] tracking-wide uppercase font-semibold truncate ${
                  isAdminRoute ? 'text-[#2166D5]' : 'text-blue-200/90'
                }`}
              >
                {isAuthenticated && user
                  ? isAdmin
                    ? t.common.adminPortal
                    : t.common.digitalBanking
                  : t.common.digitalBanking}
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav
            className={`hidden lg:flex items-center gap-5 text-xs font-semibold ${
              isAdminRoute ? 'text-slate-600' : 'text-blue-100/85'
            }`}
          >
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => setActivePage('dashboard')}
                  className={`transition-colors whitespace-nowrap cursor-pointer ${
                    activePage === 'dashboard' || activePage === 'account_details'
                      ? isAdminRoute
                        ? 'text-[#173A52] border-b-2 border-[#2166D5] pb-0.5 font-bold'
                        : 'text-white border-b-2 border-white pb-0.5 font-bold'
                      : isAdminRoute
                      ? 'hover:text-[#173A52]'
                      : 'hover:text-white'
                  }`}
                >
                  {t.nav.dashboard}
                </button>
                <button
                  onClick={() => setActivePage('transfers')}
                  className={`transition-colors whitespace-nowrap cursor-pointer ${
                    activePage === 'transfers' || activePage === 'transfer' || activePage === 'withdrawal'
                      ? isAdminRoute
                        ? 'text-[#173A52] border-b-2 border-[#2166D5] pb-0.5 font-bold'
                        : 'text-white border-b-2 border-white pb-0.5 font-bold'
                      : isAdminRoute
                      ? 'hover:text-[#173A52]'
                      : 'hover:text-white'
                  }`}
                >
                  {t.nav.transfersHub}
                </button>
                <button
                  onClick={() => setActivePage('history')}
                  className={`transition-colors whitespace-nowrap cursor-pointer ${
                    activePage === 'history'
                      ? isAdminRoute
                        ? 'text-[#173A52] border-b-2 border-[#2166D5] pb-0.5 font-bold'
                        : 'text-white border-b-2 border-white pb-0.5 font-bold'
                      : isAdminRoute
                      ? 'hover:text-[#173A52]'
                      : 'hover:text-white'
                  }`}
                >
                  {t.nav.history}
                </button>
                <button
                  onClick={() => setActivePage('support')}
                  className={`transition-colors whitespace-nowrap cursor-pointer ${
                    activePage === 'support'
                      ? isAdminRoute
                        ? 'text-[#173A52] border-b-2 border-[#2166D5] pb-0.5 font-bold'
                        : 'text-white border-b-2 border-white pb-0.5 font-bold'
                      : isAdminRoute
                      ? 'hover:text-[#173A52]'
                      : 'hover:text-white'
                  }`}
                >
                  {t.nav.helpSupport}
                </button>
                <button
                  onClick={() => setActivePage('credit_cards')}
                  className={`transition-colors whitespace-nowrap cursor-pointer ${
                    activePage === 'credit_cards'
                      ? isAdminRoute
                        ? 'text-[#173A52] border-b-2 border-[#2166D5] pb-0.5 font-bold'
                        : 'text-white border-b-2 border-white pb-0.5 font-bold'
                      : isAdminRoute
                      ? 'hover:text-[#173A52]'
                      : 'hover:text-white'
                  }`}
                >
                  Credit Cards
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActivePage('admin_dashboard')}
                    className={`font-bold transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                      isAdminRoute ? 'text-[#173A52] hover:text-[#2166D5]' : 'text-blue-100 hover:text-white'
                    } ${activePage === 'admin_dashboard' ? 'border-b-2 border-[#2166D5] pb-0.5' : ''}`}
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 ${isAdminRoute ? 'text-[#2166D5]' : 'text-blue-200'}`} />
                    <span>{t.nav.adminConsole}</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setActivePage('public_home')}
                  className={`transition-colors whitespace-nowrap cursor-pointer ${
                    activePage === 'public_home'
                      ? isAdminRoute
                        ? 'text-[#173A52] font-bold'
                        : 'text-white font-bold'
                      : isAdminRoute
                      ? 'hover:text-[#173A52]'
                      : 'hover:text-white'
                  }`}
                >
                  {t.nav.home}
                </button>
                <button
                  onClick={() => setActivePage('credit_cards')}
                  className={`transition-colors whitespace-nowrap cursor-pointer ${
                    activePage === 'credit_cards'
                      ? isAdminRoute
                        ? 'text-[#173A52] font-bold'
                        : 'text-white font-bold'
                      : isAdminRoute
                      ? 'hover:text-[#173A52]'
                      : 'hover:text-white'
                  }`}
                >
                  Credit Cards
                </button>
                <button
                  onClick={() => setActivePage('landing')}
                  className={`transition-colors whitespace-nowrap cursor-pointer ${
                    activePage === 'landing'
                      ? isAdminRoute
                        ? 'text-[#173A52] font-bold'
                        : 'text-white font-bold'
                      : isAdminRoute
                      ? 'hover:text-[#173A52]'
                      : 'hover:text-white'
                  }`}
                >
                  {t.common.digitalBanking}
                </button>
                <button
                  onClick={() => setActivePage('support')}
                  className={`transition-colors whitespace-nowrap cursor-pointer ${
                    activePage === 'support'
                      ? isAdminRoute
                        ? 'text-[#173A52] font-bold'
                        : 'text-white font-bold'
                      : isAdminRoute
                      ? 'hover:text-[#173A52]'
                      : 'hover:text-white'
                  }`}
                >
                  {t.nav.helpSupport}
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: Actions (Language, PWA, Auth) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Language Selector Trigger (38 Languages Modal) */}
            <button
              type="button"
              onClick={() => {
                setLangModalOpen(true);
              }}
              aria-label={t.nav.language}
              title={t.languageModal.title}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer ${
                isAdminRoute
                  ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
                  : 'text-white bg-white/10 hover:bg-white/15 border-white/15'
              }`}
            >
              <span>{currentLangObj.flag}</span>
              <span className="hidden sm:inline text-[11px]">{currentLangObj.code.toUpperCase()}</span>
              <Globe className="w-3 h-3 opacity-80" />
            </button>

            <PWAInstallButton variant="header" />

            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => handleNavClick('notifications')}
                  className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
                    isAdminRoute
                      ? 'text-slate-600 hover:text-[#173A52] hover:bg-slate-100'
                      : 'text-blue-100 hover:text-white hover:bg-white/10'
                  }`}
                  title={t.common.notifications}
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-1 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleNavClick('profile')}
                  className={`hidden md:flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isAdminRoute
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center ${
                      isAdminRoute
                        ? 'bg-[#173A52] text-white'
                        : 'bg-[#2166D5] text-white border border-white/25'
                    }`}
                  >
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <span className="max-w-[100px] truncate">{user?.fullName?.split(' ')[0]}</span>
                </button>

                <button
                  onClick={logout}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    isAdminRoute
                      ? 'text-slate-500 hover:text-red-700 hover:bg-red-50'
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
                  title={t.nav.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => handleNavClick('login')}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    isAdminRoute ? 'text-[#173A52] hover:text-[#2166D5]' : 'text-blue-100 hover:text-white'
                  }`}
                >
                  {t.nav.signIn}
                </button>
                <button
                  onClick={() => handleNavClick('register')}
                  className="px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white unfcu-blue-gradient unfcu-blue-gradient-hover rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
                >
                  {t.nav.register}
                </button>
              </div>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-1.5 rounded-lg transition-colors border cursor-pointer ${
                isAdminRoute
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                  : 'text-white hover:bg-white/10 border-white/15'
              }`}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className={`lg:hidden border-b px-4 py-3 shadow-lg text-xs font-semibold space-y-1 ${
            isAdminRoute ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#123047] border-white/10 text-blue-100'
          }`}
        >
          {isAuthenticated ? (
            <>
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full text-left py-2 px-3 rounded-lg flex items-center justify-between ${
                  activePage === 'dashboard'
                    ? isAdminRoute
                      ? 'bg-[#EBF2FC] text-[#173A52] font-bold'
                      : 'bg-white/15 text-white font-bold'
                    : ''
                }`}
              >
                <span>{t.nav.dashboard}</span>
              </button>
              <button
                onClick={() => handleNavClick('account_details')}
                className={`w-full text-left py-2 px-3 rounded-lg flex items-center justify-between ${
                  activePage === 'account_details'
                    ? isAdminRoute
                      ? 'bg-[#EBF2FC] text-[#173A52] font-bold'
                      : 'bg-white/15 text-white font-bold'
                    : ''
                }`}
              >
                <span>{t.nav.accountDetails}</span>
              </button>
              <button
                onClick={() => handleNavClick('transfers')}
                className={`w-full text-left py-2 px-3 rounded-lg flex items-center justify-between ${
                  activePage === 'transfers' || activePage === 'transfer' || activePage === 'withdrawal'
                    ? isAdminRoute
                      ? 'bg-[#EBF2FC] text-[#173A52] font-bold'
                      : 'bg-white/15 text-white font-bold'
                    : ''
                }`}
              >
                <span>{t.nav.transfersHub}</span>
              </button>
              <button
                onClick={() => handleNavClick('history')}
                className={`w-full text-left py-2 px-3 rounded-lg flex items-center justify-between ${
                  activePage === 'history'
                    ? isAdminRoute
                      ? 'bg-[#EBF2FC] text-[#173A52] font-bold'
                      : 'bg-white/15 text-white font-bold'
                    : ''
                }`}
              >
                <span>{t.nav.history}</span>
              </button>
              <button
                onClick={() => handleNavClick('profile')}
                className={`w-full text-left py-2 px-3 rounded-lg flex items-center justify-between ${
                  activePage === 'profile'
                    ? isAdminRoute
                      ? 'bg-[#EBF2FC] text-[#173A52] font-bold'
                      : 'bg-white/15 text-white font-bold'
                    : ''
                }`}
              >
                <span>{t.nav.profile}</span>
              </button>
              <button
                onClick={() => handleNavClick('support')}
                className={`w-full text-left py-2 px-3 rounded-lg flex items-center justify-between ${
                  activePage === 'support'
                    ? isAdminRoute
                      ? 'bg-[#EBF2FC] text-[#173A52] font-bold'
                      : 'bg-white/15 text-white font-bold'
                    : ''
                }`}
              >
                <span>{t.nav.helpSupport}</span>
              </button>
              <button
                onClick={() => handleNavClick('credit_cards')}
                className={`w-full text-left py-2 px-3 rounded-lg flex items-center justify-between ${
                  activePage === 'credit_cards'
                    ? isAdminRoute
                      ? 'bg-[#EBF2FC] text-[#173A52] font-bold'
                      : 'bg-white/15 text-white font-bold'
                    : ''
                }`}
              >
                <span>Credit Cards</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleNavClick('admin_dashboard')}
                  className="w-full text-left py-2 px-3 rounded-lg flex items-center gap-1.5 text-white font-bold bg-[#2166D5]/40"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-200" />
                  <span>{t.nav.adminConsole}</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => handleNavClick('public_home')}
                className="w-full text-left py-2 px-3 rounded-lg"
              >
                {t.nav.home}
              </button>
              <button
                onClick={() => handleNavClick('credit_cards')}
                className="w-full text-left py-2 px-3 rounded-lg"
              >
                Credit Cards
              </button>
              <button
                onClick={() => handleNavClick('landing')}
                className="w-full text-left py-2 px-3 rounded-lg"
              >
                {t.common.digitalBanking}
              </button>
              <button
                onClick={() => handleNavClick('support')}
                className="w-full text-left py-2 px-3 rounded-lg"
              >
                {t.nav.helpSupport}
              </button>
              <button
                onClick={() => handleNavClick('login')}
                className="w-full text-left py-2 px-3 rounded-lg"
              >
                {t.nav.signIn}
              </button>
              <button
                onClick={() => handleNavClick('register')}
                className="w-full text-left py-2 px-3 rounded-lg text-white font-bold bg-[#2166D5]"
              >
                {t.nav.register}
              </button>
            </>
          )}
        </div>
      )}
      <LanguageSelectModal
        isOpen={langModalOpen}
        onClose={() => setLangModalOpen(false)}
        selectedLanguage={language}
        onSelectLanguage={setLanguage}
        theme="light"
      />
    </header>
  );
};

