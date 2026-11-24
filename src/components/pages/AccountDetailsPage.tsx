import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { Transaction } from '../../types';
import { api } from '../../lib/api';
import { getUserTransactionsFromFirestore } from '../../lib/firebaseStore';
import {
  isIncomingTransaction,
  formatCurrencyAmount,
  formatTransactionDateTime,
} from '../../lib/formatters';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Copy,
  Check,
  Eye,
  EyeOff,
  Send,
  Download,
  ArrowUpRight,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';

export const AccountDetailsPage: React.FC = () => {
  const { user, wallet, language, countryCode, t, refreshUserData } = useAuth();
  const {
    goBack,
    setActivePage,
    setSelectedTransactionId,
    setIsReceiveModalOpen,
  } = useDevice();

  const [activeTab, setActiveTab] = useState<'transactions' | 'details'>('transactions');
  const [revealAccount, setRevealAccount] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fullAcc = wallet?.accountNumber || 'UNGB-0000-0000';
  const last4 = fullAcc.slice(-4);
  const maskedAcc = `******${last4}`;

  const fetchAccountTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const txRes = await api.getTransactions({ limit: 10 }).catch(() => ({ transactions: [] }));
      let txList: Transaction[] = txRes.transactions || [];
      if (user?.id) {
        try {
          const fsTx = await getUserTransactionsFromFirestore(user.id).catch(() => []);
          if (fsTx && fsTx.length > 0) {
            const map = new Map<string, Transaction>();
            txList.forEach((tx) => map.set(tx.id, tx));
            fsTx.forEach((tx) => map.set(tx.id, tx));
            txList = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }
        } catch {}
      }
      setTransactions(txList.slice(0, 8));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAccountTransactions();
  }, [fetchAccountTransactions]);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(fullAcc);
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  const handleRefresh = async () => {
    await Promise.all([refreshUserData().catch(() => {}), fetchAccountTransactions()]);
  };

  const availableBalance = wallet?.availableBalance ?? 0;

  return (
    <div className="flex-1 flex flex-col bg-[#E5EBF2] text-[#0F172A]">
      {/* UNFCU Deep Navy Sub-Header */}
      <div className="bg-[#173A52] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goBack('dashboard')}
            className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            aria-label={t.common.back}
          >
            <ChevronLeft className="w-5 h-5 rtl-flip" />
          </button>

          <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
            {t.unfcu.accountDetailsTitle}
          </h1>

          <button
            type="button"
            onClick={handleRefresh}
            className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label={t.common.refresh}
            title={t.common.refresh}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Account Header Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 banking-card-shadow space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/20 text-[#2166D5] flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-[#173A52] truncate">
                  {t.dashboard.checkingAccount}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-mono">
                  <span className="truncate">{revealAccount ? fullAcc : maskedAcc}</span>
                  <button
                    type="button"
                    onClick={() => setRevealAccount((prev) => !prev)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-[#2166D5] cursor-pointer"
                    title={
                      revealAccount
                        ? t.unfcu.maskAccountNumber
                        : t.unfcu.revealAccountNumber
                    }
                    aria-label={
                      revealAccount
                        ? t.unfcu.maskAccountNumber
                        : t.unfcu.revealAccountNumber
                    }
                  >
                    {revealAccount ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-[#2166D5] cursor-pointer"
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

            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
              {t.unfcu.activeStatus}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                {t.dashboard.availableBalance}
              </span>
              <div className="font-mono text-3xl sm:text-4xl font-bold text-[#173A52] tabular-nums tracking-tight mt-1">
                ${formatCurrencyAmount(availableBalance, language, countryCode)}
                <span className="text-xs font-sans font-semibold text-slate-500 ml-1.5">USD</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActivePage('transfer')}
                className="px-3.5 py-2 rounded-xl unfcu-blue-gradient unfcu-blue-gradient-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t.dashboard.sendMoney}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-[#173A52] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-[#2166D5]" />
                <span>{t.dashboard.receiveMoney}</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePage('withdrawal')}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-[#173A52] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-[#2166D5]" />
                <span>{t.dashboard.withdrawShort}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Segmented Tabs Card: Transactions | Details */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden banking-card-shadow">
          <div className="grid grid-cols-2 border-b border-slate-200 text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`py-3.5 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'transactions'
                  ? 'border-[#2166D5] text-[#2166D5] bg-[#F8FAFC]'
                  : 'border-transparent text-slate-500 hover:text-[#173A52]'
              }`}
            >
              {t.unfcu.transactionsTab}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-3.5 text-center border-b-2 transition-colors cursor-pointer ${
                activeTab === 'details'
                  ? 'border-[#2166D5] text-[#2166D5] bg-[#F8FAFC]'
                  : 'border-transparent text-slate-500 hover:text-[#173A52]'
              }`}
            >
              {t.unfcu.detailsTab}
            </button>
          </div>

          {activeTab === 'transactions' ? (
            <div>
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-2" />
                  {t.common.loading}
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-slate-500">
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
                        className="w-full text-left px-4 sm:px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                              incoming
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-[#EBF2FC] border-[#2166D5]/25 text-[#2166D5]'
                            }`}
                          >
                            {incoming ? (
                              <ArrowDown className="w-4 h-4" strokeWidth={2.2} />
                            ) : (
                              <Send className="w-4 h-4" strokeWidth={2.1} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-semibold text-[#0F172A] truncate">
                              {incoming
                                ? t.dashboard.moneyReceived
                                : tx.type === 'withdrawal'
                                ? t.dashboard.withdrawalLabel
                                : t.dashboard.moneySent}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {tx.senderOrRecipient} •{' '}
                              {formatTransactionDateTime(tx.createdAt, language, countryCode)}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            <div
                              className={`font-mono font-bold text-xs sm:text-sm tabular-nums ${
                                incoming ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {incoming ? '+' : '-'}${formattedAmount}
                            </div>
                            <div className="text-[10px] text-slate-500 capitalize">
                              {tx.status === 'completed'
                                ? t.history.statusCompleted
                                : tx.status === 'pending'
                                ? t.history.statusPending
                                : tx.status === 'failed'
                                ? t.history.statusFailed
                                : t.history.statusCancelled}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 rtl-flip" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="p-4 bg-[#F8FAFC] border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActivePage('history')}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-[#2166D5] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{t.unfcu.viewMoreTransactions}</span>
                  <ChevronRight className="w-4 h-4 rtl-flip" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6 divide-y divide-slate-100 text-xs">
              <div className="py-3 flex justify-between items-center gap-3">
                <span className="text-slate-500 font-medium">{t.dashboard.accountHolder}</span>
                <span className="font-bold text-[#0F172A] text-right">{user?.fullName}</span>
              </div>
              <div className="py-3 flex justify-between items-center gap-3">
                <span className="text-slate-500 font-medium">{t.dashboard.bankName}</span>
                <span className="font-bold text-[#173A52] text-right">{t.appName}</span>
              </div>
              <div className="py-3 flex justify-between items-center gap-3">
                <span className="text-slate-500 font-medium">{t.dashboard.accountNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#173A52] select-all">{fullAcc}</span>
                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="p-1.5 rounded-lg bg-[#EBF2FC] text-[#2166D5] hover:bg-blue-100 cursor-pointer"
                    title={t.dashboard.copyAccountNumber}
                  >
                    {copiedAcc ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="py-3 flex justify-between items-center gap-3">
                <span className="text-slate-500 font-medium">{t.dashboard.currencyLabel}</span>
                <span className="font-mono font-semibold text-[#0F172A]">USD ($)</span>
              </div>
              <div className="py-3 flex justify-between items-center gap-3">
                <span className="text-slate-500 font-medium">{t.auth.countryLabel}</span>
                <span className="font-semibold text-[#0F172A]">{user?.country}</span>
              </div>
              <div className="py-3 flex justify-between items-center gap-3">
                <span className="text-slate-500 font-medium">{t.unfcu.accountStatus}</span>
                <span className="font-bold text-emerald-700">{t.unfcu.activeStatus}</span>
              </div>
              <div className="py-3 flex justify-between items-center gap-3">
                <span className="text-slate-500 font-medium">{t.unfcu.lastUpdated}</span>
                <span className="font-mono text-slate-600">
                  {wallet?.lastUpdated
                    ? formatTransactionDateTime(wallet.lastUpdated, language, countryCode)
                    : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
