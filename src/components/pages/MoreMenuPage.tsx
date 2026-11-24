import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { formatCurrencyAmount } from '../../lib/formatters';
import {
  X,
  ChevronRight,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Download,
  Receipt,
  Clock,
  Bell,
  User as UserIcon,
  Headphones,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

export const MoreMenuPage: React.FC = () => {
  const {
    wallet,
    unreadNotifications,
    logout,
    isAdmin,
    language,
    countryCode,
    t,
  } = useAuth();
  const {
    setActivePage,
    setIsReceiveModalOpen,
    setIsPaymentStatusModalOpen,
  } = useDevice();

  const balance = wallet?.availableBalance ?? 0;

  const menuItems = [
    {
      id: 'transfers',
      icon: ArrowLeftRight,
      label: t.unfcu.transfersHubTitle,
      onClick: () => setActivePage('transfers'),
    },
    {
      id: 'account_details',
      icon: CreditCard,
      label: t.unfcu.accountDetailsTitle,
      onClick: () => setActivePage('account_details'),
    },
    {
      id: 'receive',
      icon: Download,
      label: t.dashboard.receiveMoney,
      onClick: () => setIsReceiveModalOpen(true),
    },
    {
      id: 'receipts',
      icon: Receipt,
      label: t.dashboard.trackReceipts,
      onClick: () => setIsPaymentStatusModalOpen(true),
    },
    {
      id: 'history',
      icon: Clock,
      label: t.nav.history,
      onClick: () => setActivePage('history'),
    },
    {
      id: 'notifications',
      icon: Bell,
      label: t.nav.notifications,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
      onClick: () => setActivePage('notifications'),
    },
    {
      id: 'profile',
      icon: UserIcon,
      label: t.nav.profile,
      onClick: () => setActivePage('profile'),
    },
    {
      id: 'support',
      icon: Headphones,
      label: t.nav.helpSupport,
      onClick: () => setActivePage('support'),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#E5EBF2] text-[#0F172A]">
      {/* UNFCU Deep Navy Sub-Header */}
      <div className="bg-[#173A52] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>

          <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
            {t.unfcu.moreMenuTitle}
          </h1>

          <div className="w-9 h-9 shrink-0" />
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Total Deposits Card (Clickable -> Account Details) */}
        <button
          type="button"
          onClick={() => setActivePage('account_details')}
          className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 banking-card-shadow hover:border-[#2166D5]/40 transition-colors flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/20 text-[#2166D5] flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-500 block">
                {t.dashboard.totalDeposits}
              </span>
              <span className="font-mono text-xl sm:text-2xl font-bold text-[#173A52] tabular-nums">
                ${formatCurrencyAmount(balance, language, countryCode)}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 rtl-flip" />
        </button>

        {/* Navigation List Card */}
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden banking-card-shadow">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="w-full text-left px-4 sm:px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#EBF2FC] text-[#2166D5] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" strokeWidth={1.9} />
                  </div>
                  <span className="font-semibold text-xs sm:text-sm text-[#0F172A] truncate">
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2166D5] rtl-flip" />
                </div>
              </button>
            );
          })}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActivePage('admin_dashboard')}
              className="w-full text-left px-4 sm:px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#173A52]/10 text-[#173A52] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs sm:text-sm text-[#173A52] truncate">
                  {t.nav.adminConsole}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 rtl-flip" />
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="w-full text-left px-4 sm:px-5 py-3.5 hover:bg-rose-50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="font-semibold text-xs sm:text-sm text-rose-600 truncate">
                {t.nav.logout}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400 rtl-flip" />
          </button>
        </div>
      </div>
    </div>
  );
};
