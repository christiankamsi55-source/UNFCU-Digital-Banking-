import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { Home, ArrowLeftRight, Clock, Menu } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { isAuthenticated, unreadNotifications, t } = useAuth();
  const { activePage, setActivePage, deviceMode } = useDevice();

  const isAdminRoute = activePage === 'admin_dashboard' || activePage === 'admin_login';

  if (!isAuthenticated || deviceMode !== 'desktop' || isAdminRoute) {
    return null;
  }

  const isHomeActive = activePage === 'dashboard' || activePage === 'account_details';
  const isTransfersActive =
    activePage === 'transfers' || activePage === 'transfer' || activePage === 'withdrawal';
  const isHistoryActive = activePage === 'history';
  const isMoreActive =
    activePage === 'more' ||
    activePage === 'notifications' ||
    activePage === 'profile' ||
    activePage === 'support';

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-6px_24px_rgba(23,58,82,0.08)]"
    >
      <button
        type="button"
        onClick={() => setActivePage('dashboard')}
        className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-xl transition-colors cursor-pointer ${
          isHomeActive ? 'text-[#2166D5] font-semibold' : 'text-slate-500 hover:text-[#173A52]'
        }`}
      >
        <Home className="w-5 h-5" strokeWidth={isHomeActive ? 2.4 : 1.8} />
        <span className="text-[11px] leading-none">{t.common.home}</span>
      </button>

      <button
        type="button"
        onClick={() => setActivePage('transfers')}
        className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-xl transition-colors cursor-pointer ${
          isTransfersActive ? 'text-[#2166D5] font-semibold' : 'text-slate-500 hover:text-[#173A52]'
        }`}
      >
        <ArrowLeftRight className="w-5 h-5" strokeWidth={isTransfersActive ? 2.4 : 1.8} />
        <span className="text-[11px] leading-none">{t.nav.transfersHub}</span>
      </button>

      <button
        type="button"
        onClick={() => setActivePage('history')}
        className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-xl transition-colors cursor-pointer ${
          isHistoryActive ? 'text-[#2166D5] font-semibold' : 'text-slate-500 hover:text-[#173A52]'
        }`}
      >
        <Clock className="w-5 h-5" strokeWidth={isHistoryActive ? 2.4 : 1.8} />
        <span className="text-[11px] leading-none">{t.common.history}</span>
      </button>

      <button
        type="button"
        onClick={() => setActivePage('more')}
        className={`relative flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-xl transition-colors cursor-pointer ${
          isMoreActive ? 'text-[#2166D5] font-semibold' : 'text-slate-500 hover:text-[#173A52]'
        }`}
      >
        <div className="relative">
          <Menu className="w-5 h-5" strokeWidth={isMoreActive ? 2.4 : 1.8} />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white" />
          )}
        </div>
        <span className="text-[11px] leading-none">{t.nav.more}</span>
      </button>
    </nav>
  );
};

