import React from 'react';
import { useDevice } from '../../context/DeviceContext';
import { useAuth } from '../../context/AuthContext';
import {
  Wifi,
  Battery,
  Smartphone,
  Laptop,
  Home,
  ArrowLeftRight,
  Clock,
  Menu,
  Tablet,
} from 'lucide-react';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const { deviceMode, setDeviceMode, activePage, setActivePage } = useDevice();
  const { isAuthenticated, unreadNotifications, t, language, countryCode } = useAuth();

  if (deviceMode === 'desktop') {
    return <div className="min-h-screen w-full max-w-full flex flex-col overflow-x-clip">{children}</div>;
  }

  const isIphone = deviceMode === 'mobile_iphone';
  const isAndroid = deviceMode === 'mobile_android';
  const isTablet = deviceMode === 'tablet';
  const isAdminRoute = activePage === 'admin_dashboard' || activePage === 'admin_login';

  const isHomeActive = activePage === 'dashboard' || activePage === 'account_details';
  const isTransfersActive =
    activePage === 'transfers' || activePage === 'transfer' || activePage === 'withdrawal';
  const isHistoryActive = activePage === 'history';
  const isMoreActive =
    activePage === 'more' ||
    activePage === 'notifications' ||
    activePage === 'profile' ||
    activePage === 'support';

  const currentTime = new Intl.DateTimeFormat(language, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-900 py-6 px-3 sm:px-4 flex flex-col items-center justify-center">
      {/* Device Mode Switcher Floating Bar */}
      <div className="mb-4 bg-[#123047] text-white rounded-full p-1.5 flex flex-wrap items-center justify-center gap-1.5 shadow-xl border border-white/15 text-xs">
        <button
          onClick={() => setDeviceMode('desktop')}
          className="px-3 py-1 rounded-full text-blue-100 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>{t.common.close}</span>
        </button>
        <button
          onClick={() => setDeviceMode('mobile_iphone')}
          className={`px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${
            isIphone ? 'bg-[#2166D5] text-white font-bold shadow-sm' : 'text-blue-100 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>iPhone 16 Pro</span>
        </button>
        <button
          onClick={() => setDeviceMode('mobile_android')}
          className={`px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${
            isAndroid ? 'bg-[#2166D5] text-white font-bold shadow-sm' : 'text-blue-100 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Android S24</span>
        </button>
        <button
          onClick={() => setDeviceMode('tablet')}
          className={`px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${
            isTablet ? 'bg-[#2166D5] text-white font-bold shadow-sm' : 'text-blue-100 hover:text-white'
          }`}
        >
          <Tablet className="w-3.5 h-3.5" />
          <span>iPad</span>
        </button>
      </div>

      {/* Frame Container */}
      <div
        className={`relative bg-[#E5EBF2] shadow-2xl transition-all duration-300 border-4 ${
          isTablet
            ? 'w-full max-w-4xl h-[780px] rounded-[36px] border-slate-700'
            : isIphone
            ? 'w-[390px] max-w-full h-[830px] rounded-[52px] border-slate-700 ring-8 ring-slate-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]'
            : 'w-[390px] max-w-full h-[830px] rounded-[42px] border-slate-700 ring-8 ring-slate-800/80'
        } overflow-hidden flex flex-col`}
      >
        {/* Dynamic Island / Bezel Top Notch */}
        {isIphone && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_6px_#10b981]" />
          </div>
        )}

        {isAndroid && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-black rounded-full z-50 border border-slate-800" />
        )}

        {/* Status Bar */}
        <div
          className={`${
            (activePage === 'landing' ||
              activePage === 'public_home' ||
              activePage === 'credit_cards' ||
              activePage === 'financial_readiness') &&
            !isAdminRoute
              ? 'bg-white text-[#173A52]'
              : 'bg-[#173A52] text-white'
          } px-6 pt-3 pb-2 text-[11px] font-semibold flex items-center justify-between z-40 select-none shrink-0`}
        >
          <span className="font-mono">{currentTime}</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold tracking-tight ${
                (activePage === 'landing' ||
                  activePage === 'public_home' ||
                  activePage === 'credit_cards' ||
                  activePage === 'financial_readiness') &&
                !isAdminRoute
                  ? 'text-[#2166D5]'
                  : 'text-blue-200'
              }`}
            >
              5G · {countryCode}
            </span>
            <Wifi className="w-3.5 h-3.5 opacity-90" />
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <span>98%</span>
              <Battery
                className={`w-4 h-4 ${
                  (activePage === 'landing' ||
                    activePage === 'public_home' ||
                    activePage === 'credit_cards' ||
                    activePage === 'financial_readiness') &&
                  !isAdminRoute
                    ? 'text-emerald-600'
                    : 'text-emerald-400'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Mobile Content Viewport */}
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col no-scrollbar ${
            isAdminRoute
              ? 'bg-slate-50 text-slate-900'
              : activePage === 'public_home' ||
                activePage === 'credit_cards' ||
                activePage === 'financial_readiness'
              ? 'bg-white text-[#173A52]'
              : 'bg-[#E5EBF2] text-[#0F172A]'
          }`}
        >
          {children}
        </div>

        {/* Native Mobile Bottom Navigation Bar (if signed in on customer view) */}
        {isAuthenticated && !isTablet && !isAdminRoute && (
          <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-2 flex items-center justify-around z-40 shrink-0">
            <button
              type="button"
              onClick={() => setActivePage('dashboard')}
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-1 transition-colors cursor-pointer ${
                isHomeActive ? 'text-[#2166D5] font-semibold' : 'text-slate-500 hover:text-[#173A52]'
              }`}
            >
              <Home className="w-4 h-4" strokeWidth={isHomeActive ? 2.4 : 1.8} />
              <span className="text-[10px] leading-none">{t.common.home}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePage('transfers')}
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-1 transition-colors cursor-pointer ${
                isTransfersActive ? 'text-[#2166D5] font-semibold' : 'text-slate-500 hover:text-[#173A52]'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" strokeWidth={isTransfersActive ? 2.4 : 1.8} />
              <span className="text-[10px] leading-none">{t.nav.transfersHub}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePage('history')}
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-1 transition-colors cursor-pointer ${
                isHistoryActive ? 'text-[#2166D5] font-semibold' : 'text-slate-500 hover:text-[#173A52]'
              }`}
            >
              <Clock className="w-4 h-4" strokeWidth={isHistoryActive ? 2.4 : 1.8} />
              <span className="text-[10px] leading-none">{t.common.history}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePage('more')}
              className={`relative flex flex-col items-center justify-center gap-1 min-w-[60px] py-1 transition-colors cursor-pointer ${
                isMoreActive ? 'text-[#2166D5] font-semibold' : 'text-slate-500 hover:text-[#173A52]'
              }`}
            >
              <div className="relative">
                <Menu className="w-4 h-4" strokeWidth={isMoreActive ? 2.4 : 1.8} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-red-600 rounded-full border border-white" />
                )}
              </div>
              <span className="text-[10px] leading-none">{t.nav.more}</span>
            </button>
          </div>
        )}

        {/* iPhone Home Indicator Line */}
        {isIphone && (
          <div className="bg-white py-1.5 flex justify-center shrink-0">
            <div className="w-32 h-1 bg-slate-300 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
};

