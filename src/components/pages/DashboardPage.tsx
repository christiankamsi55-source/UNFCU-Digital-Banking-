import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { Transaction, Notification, Announcement } from '../../types';
import { api } from '../../lib/api';
import { UnfcuEmblem } from '../common/UnfcuLogo';
import {
  getUserTransactionsFromFirestore,
  getUserNotificationsFromFirestore,
  getActiveAnnouncementsFromFirestore,
} from '../../lib/firebaseStore';
import {
  isIncomingTransaction,
  formatTransactionDateTime,
  formatCurrencyAmount,
} from '../../lib/formatters';
import { localizeNotification, resolveAnnouncementContent } from '../../lib/i18n/notifications';
import { getLanguageOption } from '../../lib/i18n';
import {
  Send,
  Download,
  Eye,
  EyeOff,
  Copy,
  Check,
  ArrowDown,
  Bell,
  RefreshCw,
  Receipt,
  User as UserIcon,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Megaphone,
  Menu,
  Wallet,
  CreditCard,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, wallet, unreadNotifications, refreshUserData, isAdmin, language, countryCode, t } =
    useAuth();
  const {
    setActivePage,
    setSelectedTransactionId,
    deviceMode,
    setIsReceiveModalOpen,
    setIsPaymentStatusModalOpen,
  } = useDevice();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [copiedAcc, setCopiedAcc] = useState(false);

  // Auto-fit balance text measurement refs
  const balanceContainerRef = useRef<HTMLDivElement | null>(null);
  const balanceTextRef = useRef<HTMLDivElement | null>(null);
  const [balanceFontPx, setBalanceFontPx] = useState<number>(34);

  const isMobileFrame = deviceMode === 'mobile_iphone' || deviceMode === 'mobile_android';

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, notifRes, annRes, fsAnns] = await Promise.all([
        api.getTransactions({ limit: 8 }).catch(() => ({ transactions: [] })),
        api.getNotifications().catch(() => ({ notifications: [] })),
        api.getPublicAnnouncements().catch(() => ({ announcements: [] })),
        getActiveAnnouncementsFromFirestore().catch(() => []),
      ]);

      let txList: Transaction[] = txRes.transactions || [];
      let notifList: Notification[] = notifRes.notifications || [];

      const annMap = new Map<string, Announcement>();
      (annRes.announcements || []).forEach((a) => annMap.set(a.id, a));
      (fsAnns || []).forEach((a) => annMap.set(a.id, a));
      const mergedAnns = Array.from(annMap.values())
        .filter((a) => a.active)
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        );
      setAnnouncements(mergedAnns);

      if (user?.id) {
        try {
          const [fsTx, fsNotifs] = await Promise.all([
            getUserTransactionsFromFirestore(user.id).catch(() => []),
            getUserNotificationsFromFirestore(user.id).catch(() => []),
          ]);

          if (fsTx && fsTx.length > 0) {
            const txMap = new Map<string, Transaction>();
            txList.forEach((tx) => txMap.set(tx.id, tx));
            fsTx.forEach((tx) => txMap.set(tx.id, tx));
            txList = Array.from(txMap.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }

          if (fsNotifs && fsNotifs.length > 0) {
            const nMap = new Map<string, Notification>();
            notifList.forEach((n) => nMap.set(n.id, n));
            fsNotifs.forEach((n) => {
              if (!nMap.has(n.id)) nMap.set(n.id, n);
              else nMap.set(n.id, { ...nMap.get(n.id)!, ...n });
            });
            notifList = Array.from(nMap.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }
        } catch {}
      }

      setTransactions(txList.slice(0, 5));
      setLatestNotification(notifList[0] || null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const balance = wallet?.availableBalance ?? 0;
  const formattedBalance = formatCurrencyAmount(balance, language, countryCode);
  const displayBalanceText = showBalance ? `$${formattedBalance}` : '$•••,•••.••';

  // Dynamically compute optimal font size so ANY balance always fits cleanly
  const fitBalanceText = useCallback(() => {
    const container = balanceContainerRef.current;
    const textEl = balanceTextRef.current;
    if (!container || !textEl) return;

    const availableWidth = container.clientWidth;
    if (availableWidth <= 0) return;

    const len = displayBalanceText.length;
    let idealPx = availableWidth < 200 ? 26 : availableWidth < 300 ? 32 : 36;
    if (len > 11) idealPx = Math.min(idealPx, 30);
    if (len > 14) idealPx = Math.min(idealPx, 25);
    if (len > 17) idealPx = Math.min(idealPx, 21);
    if (len > 21) idealPx = Math.min(idealPx, 17);

    textEl.style.fontSize = `${idealPx}px`;
    const measuredWidth = textEl.scrollWidth;

    if (measuredWidth > availableWidth) {
      const scaled = Math.floor(idealPx * (availableWidth / measuredWidth) * 0.96);
      const clamped = Math.max(12, scaled);
      textEl.style.fontSize = `${clamped}px`;
      setBalanceFontPx(clamped);
    } else {
      setBalanceFontPx(idealPx);
    }
  }, [displayBalanceText]);

  useLayoutEffect(() => {
    fitBalanceText();
  }, [fitBalanceText]);

  useEffect(() => {
    const container = balanceContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      fitBalanceText();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [fitBalanceText]);

  const handleCopyAccount = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (wallet?.accountNumber) {
      navigator.clipboard.writeText(wallet.accountNumber);
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2000);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserData();
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusLabel = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return t.history.statusCompleted;
      case 'pending':
        return t.history.statusPending;
      case 'failed':
        return t.history.statusFailed;
      case 'cancelled':
        return t.history.statusCancelled;
      default:
        return status;
    }
  };

  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'Member';
  const greetingText = t.dashboard.helloGreeting.includes('{name}')
    ? t.dashboard.helloGreeting.replace('{name}', firstName)
    : `${t.dashboard.helloGreeting} ${firstName}`;

  const fullAcc = wallet?.accountNumber || 'UNGB-0000-0000';
  const maskedAcc = `******${fullAcc.slice(-4)}`;

  const localizedLatestNotif = latestNotification
    ? localizeNotification(latestNotification, language, t, countryCode)
    : null;

  return (
    <div className="flex-1 flex flex-col bg-[#E5EBF2] text-[#0F172A]">
      {/* Native UNFCU Deep Navy Mobile Top Bar */}
      <div
        className={`bg-[#173A52] text-white ${
          isMobileFrame ? 'block' : 'block md:hidden'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setActivePage('more')}
            className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            aria-label={t.nav.more}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <UnfcuEmblem variant="white" size={28} className="shrink-0" />
            <div className="flex items-baseline gap-0.5">
              <span className="font-extrabold text-base tracking-tight text-white">UNFCU</span>
              <span className="text-[9px] font-bold text-blue-200">®</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActivePage('notifications')}
              className="relative w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
              aria-label={t.nav.notifications}
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-[#173A52]">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActivePage('profile')}
              className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
              aria-label={t.common.settings}
            >
              <UserIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Container */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-7 pb-8 space-y-5">
        {/* Personalized Greeting & Quick Controls */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#173A52] tracking-tight truncate">
              {greetingText}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {t.dashboard.welcomeToAccount}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-1">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActivePage('admin_dashboard')}
                className="px-2.5 py-1.5 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                title={t.nav.adminConsole}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
                <span className="hidden sm:inline">{t.nav.adminConsole}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPaymentStatusModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#2166D5]/50 text-[#173A52] text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title={t.dashboard.paymentStatus}
            >
              <Receipt className="w-3.5 h-3.5 text-[#2166D5]" />
              <span className="hidden sm:inline">{t.dashboard.paymentStatus}</span>
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:border-[#2166D5]/50 text-[#173A52] transition-colors shadow-xs cursor-pointer"
              title={t.common.refresh}
              aria-label={t.common.refresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#2166D5]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Total Deposits Hero Card (Clickable -> Account Details) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActivePage('account_details')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActivePage('account_details');
            }
          }}
          className="bg-white hover:bg-[#FAFCFF] rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EBF2FC] border border-[#2166D5]/20 text-[#2166D5] flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.9} />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">
                    {t.dashboard.totalDeposits}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBalance((prev) => !prev);
                    }}
                    className="p-1 text-slate-400 hover:text-[#2166D5] transition-colors cursor-pointer rounded-md"
                    aria-label={showBalance ? t.dashboard.hideBalance : t.dashboard.showBalance}
                    title={showBalance ? t.dashboard.hideBalance : t.dashboard.showBalance}
                  >
                    {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                {/* Auto-Resizing Balance Display Container */}
                <div ref={balanceContainerRef} className="w-full min-w-0 overflow-hidden">
                  <div
                    ref={balanceTextRef}
                    style={{ fontSize: `${balanceFontPx}px` }}
                    className="font-extrabold font-mono text-[#173A52] tabular-nums tracking-tight leading-none whitespace-nowrap inline-block"
                  >
                    {displayBalanceText}
                  </div>
                </div>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#2166D5] shrink-0 rtl-flip transition-colors" />
          </div>
        </div>

        {/* My Accounts Section (Real Checking Account Record) */}
        <section className="space-y-2.5">
          <h2 className="text-base sm:text-lg font-bold text-[#173A52] tracking-tight px-0.5">
            {t.dashboard.myAccounts}
          </h2>

          <div
            role="button"
            tabIndex={0}
            onClick={() => setActivePage('account_details')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActivePage('account_details');
              }
            }}
            className="bg-white hover:bg-[#FAFCFF] rounded-2xl p-4 border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow transition-all flex items-center justify-between gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/20 text-[#2166D5] flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" strokeWidth={1.9} />
              </div>

              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-[#0F172A] truncate">
                  {t.dashboard.checkingAccount}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                  <span>{maskedAcc}</span>
                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="p-0.5 text-slate-400 hover:text-[#2166D5] transition-colors cursor-pointer"
                    title={t.dashboard.copyAccountNumber}
                    aria-label={t.dashboard.copyAccountNumber}
                  >
                    {copiedAcc ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono font-bold text-sm sm:text-base text-[#173A52] tabular-nums">
                {displayBalanceText}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2166D5] rtl-flip" />
            </div>
          </div>
        </section>

        {/* Quick Actions Bar */}
        <section className="grid grid-cols-4 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setActivePage('transfer')}
            className="bg-white hover:bg-[#F8FAFC] rounded-2xl p-3 border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#2166D5] text-white flex items-center justify-center shadow-xs group-hover:bg-[#1A54B5]">
              <Send className="w-4 h-4" strokeWidth={2.1} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#173A52] truncate w-full">
              {t.dashboard.sendMoney}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsReceiveModalOpen(true)}
            className="bg-white hover:bg-[#F8FAFC] rounded-2xl p-3 border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#EBF2FC] text-[#2166D5] flex items-center justify-center border border-[#2166D5]/20">
              <Download className="w-4 h-4" strokeWidth={2.1} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#173A52] truncate w-full">
              {t.dashboard.receiveMoney}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePage('withdrawal')}
            className="bg-white hover:bg-[#F8FAFC] rounded-2xl p-3 border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#EBF2FC] text-[#2166D5] flex items-center justify-center border border-[#2166D5]/20">
              <ArrowUpRight className="w-4 h-4" strokeWidth={2.1} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#173A52] truncate w-full">
              {t.dashboard.withdrawShort}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsPaymentStatusModalOpen(true)}
            className="bg-white hover:bg-[#F8FAFC] rounded-2xl p-3 border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#EBF2FC] text-[#2166D5] flex items-center justify-center border border-[#2166D5]/20">
              <Receipt className="w-4 h-4" strokeWidth={2.1} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#173A52] truncate w-full">
              {t.dashboard.trackReceipts}
            </span>
          </button>
        </section>

        {/* Notification Alert Banner */}
        <button
          type="button"
          onClick={() => setActivePage('notifications')}
          className="w-full text-left bg-white hover:bg-[#F8FAFC] border border-slate-200 hover:border-[#2166D5]/45 banking-card-shadow rounded-2xl p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-[#2166D5]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#0F172A] truncate">
                {localizedLatestNotif
                  ? localizedLatestNotif.title
                  : t.dashboard.notifBannerTitle}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {latestNotification
                  ? formatTransactionDateTime(latestNotification.createdAt, language, countryCode)
                  : t.dashboard.notifBannerSub}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 rtl-flip" />
        </button>

        {/* Active Multilingual Institutional Announcements Strip */}
        {announcements.length > 0 && (
          <div className="bg-white border border-slate-200 banking-card-shadow rounded-2xl p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#173A52]">
                <Megaphone className="w-4 h-4 text-[#2166D5] shrink-0" />
                <span>{t.dashboard.announcementsTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('notifications')}
                className="text-[11px] text-[#2166D5] hover:underline font-semibold cursor-pointer"
              >
                {t.dashboard.viewAll}
              </button>
            </div>
            <div className="space-y-2">
              {announcements.slice(0, 2).map((ann) => {
                const resolved = resolveAnnouncementContent(ann, language);
                const fallbackLang = getLanguageOption(resolved.resolvedLanguage);
                return (
                  <div
                    key={ann.id}
                    className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#0F172A]">{resolved.title}</span>
                      <div className="flex items-center gap-1.5">
                        {ann.priority !== 'info' && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              ann.priority === 'urgent'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {ann.priority}
                          </span>
                        )}
                        {resolved.isFallbackLanguage && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {t.common.fallbackLangBadge}: {fallbackLang.nativeName}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{resolved.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Transactions Section */}
        <section className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h2 className="text-base sm:text-lg font-bold text-[#173A52] tracking-tight">
              {t.dashboard.recentActivity}
            </h2>
            <button
              type="button"
              onClick={() => setActivePage('history')}
              className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-bold text-[#2166D5] hover:text-[#173A52] transition-colors cursor-pointer py-1"
            >
              <span>{t.dashboard.viewAll}</span>
              <ChevronRight className="w-4 h-4 rtl-flip" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 banking-card-shadow overflow-hidden">
            {loading ? (
              <div className="py-10 text-center text-xs text-slate-500">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-2" />
                {t.common.loading}
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-slate-500">
                {t.dashboard.noTransactions}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const incoming = isIncomingTransaction(tx);
                  const formattedAmount = formatCurrencyAmount(tx.amount, language, countryCode);
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => setSelectedTransactionId(tx.id)}
                      className="w-full text-left p-3.5 sm:p-4 hover:bg-[#F8FAFC] transition-colors flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                            incoming
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-[#EBF2FC] border-[#2166D5]/25 text-[#2166D5]'
                          }`}
                        >
                          {incoming ? (
                            <ArrowDown className="w-4 h-4" strokeWidth={2.4} />
                          ) : (
                            <Send className="w-4 h-4" strokeWidth={2.2} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-[#0F172A] truncate">
                              {incoming
                                ? t.dashboard.moneyReceived
                                : tx.type === 'withdrawal'
                                ? t.dashboard.withdrawalLabel
                                : t.dashboard.moneySent}
                            </span>
                            {tx.paymentStatus === 'awaiting_review' && (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                {t.dashboard.inReview}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {tx.senderOrRecipient} •{' '}
                            {formatTransactionDateTime(tx.createdAt, language, countryCode)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono font-bold text-xs sm:text-sm tabular-nums ${
                            incoming ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {incoming ? '+' : '-'}${formattedAmount}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {getStatusLabel(tx.status)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
