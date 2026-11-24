import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { Transaction } from '../../types';
import { api } from '../../lib/api';
import { getUserTransactionsFromFirestore } from '../../lib/firebaseStore';
import {
  isIncomingTransaction,
  formatTransactionDateTime,
  formatCurrencyAmount,
} from '../../lib/formatters';
import {
  Search,
  ChevronLeft,
  Calendar,
  ArrowDown,
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  SlidersHorizontal,
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { user, t, language, countryCode } = useAuth();
  const { goBack, setSelectedTransactionId } = useDevice();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'incoming' | 'transfer' | 'withdrawal'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api
        .getTransactions({ search: search || undefined })
        .catch(() => ({ transactions: [] }));
      let txList: Transaction[] = res.transactions || [];

      if (user?.id) {
        try {
          const fsTx = await getUserTransactionsFromFirestore(user.id);
          if (fsTx && fsTx.length > 0) {
            const map = new Map<string, Transaction>();
            fsTx.forEach((tx) => map.set(tx.id, tx));
            txList.forEach((tx) => map.set(tx.id, tx));
            txList = Array.from(map.values());
          }
        } catch {}
      }

      if (typeFilter === 'incoming') {
        txList = txList.filter((tx) => isIncomingTransaction(tx));
      } else if (typeFilter === 'transfer') {
        txList = txList.filter((tx) => tx.type === 'transfer' || tx.type === 'admin_debit');
      } else if (typeFilter === 'withdrawal') {
        txList = txList.filter((tx) => tx.type === 'withdrawal');
      }

      if (dateFilter !== 'all') {
        const now = Date.now();
        const cutoffMs =
          dateFilter === 'today'
            ? 24 * 60 * 60 * 1000
            : dateFilter === '7d'
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000;
        txList = txList.filter((tx) => now - new Date(tx.createdAt).getTime() <= cutoffMs);
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        txList = txList.filter(
          (tx) =>
            tx.description?.toLowerCase().includes(q) ||
            tx.reference?.toLowerCase().includes(q) ||
            tx.senderOrRecipient?.toLowerCase().includes(q) ||
            tx.bankName?.toLowerCase().includes(q) ||
            tx.accountNumber?.toLowerCase().includes(q)
        );
      }

      txList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTransactions(txList);
    } finally {
      setLoading(false);
    }
  }, [user?.id, search, typeFilter, dateFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="flex-1 flex flex-col bg-[#E5EBF2] text-[#0F172A]">
      {/* UNFCU Deep Navy Sub-Header */}
      <div className="bg-[#173A52] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goBack('dashboard')}
            className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            aria-label={t.common.back}
          >
            <ChevronLeft className="w-5 h-5 rtl-flip" />
          </button>

          <h1 className="text-sm sm:text-base font-bold tracking-tight text-center truncate">
            {t.history.title}
          </h1>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                showFilters || dateFilter !== 'all' || typeFilter !== 'all'
                  ? 'bg-[#2166D5] text-white'
                  : 'hover:bg-white/10 text-white/90 hover:text-white'
              }`}
              title={t.history.allDates}
              aria-label={t.history.allDates}
            >
              <Calendar className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={fetchTransactions}
              className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer"
              title={t.common.refresh}
              aria-label={t.common.refresh}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        {/* Expandable Search & Filter Drawer */}
        <div
          className={`${
            showFilters ? 'block' : 'hidden md:block'
          } space-y-3 bg-white border border-slate-200 banking-card-shadow rounded-2xl p-3.5 sm:p-4`}
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.history.searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#2166D5] focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['all', 'today', '7d', '30d'] as const).map((df) => (
                <button
                  key={df}
                  type="button"
                  onClick={() => setDateFilter(df)}
                  className={`px-2.5 py-2 rounded-xl text-[11px] whitespace-nowrap border transition-colors cursor-pointer ${
                    dateFilter === df
                      ? 'bg-[#EBF2FC] border-[#2166D5]/50 text-[#2166D5] font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-[#173A52] font-medium'
                  }`}
                >
                  {df === 'all'
                    ? t.history.allDates
                    : df === 'today'
                    ? t.history.last24h
                    : df === '7d'
                    ? t.history.last7d
                    : t.history.last30d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
            {[
              { id: 'all', label: t.history.filterAll },
              { id: 'incoming', label: t.history.filterIncoming },
              { id: 'transfer', label: t.history.filterTransfers },
              { id: 'withdrawal', label: t.history.filterWithdrawals },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-[#2166D5] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="bg-white rounded-2xl border border-slate-200 banking-card-shadow overflow-hidden">
          {loading ? (
            <div className="py-14 text-center text-xs text-slate-500">
              <div className="w-7 h-7 border-2 border-slate-200 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-2" />
              {t.common.loading}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-14 px-4 text-center text-xs text-slate-500">
              {t.history.noResults}
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
                    className="w-full text-left p-4 hover:bg-[#F8FAFC] transition-colors flex items-center justify-between gap-3 cursor-pointer"
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

                      <div className="min-w-0 space-y-0.5">
                        <div className="font-bold text-xs sm:text-sm text-[#0F172A] truncate">
                          {incoming
                            ? t.dashboard.moneyReceived
                            : tx.type === 'withdrawal'
                            ? t.dashboard.withdrawalLabel
                            : t.dashboard.moneySent}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          {tx.senderOrRecipient}
                          {tx.reference ? ` • ${tx.reference}` : ''}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatTransactionDateTime(tx.createdAt, language, countryCode)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div
                        className={`font-mono font-bold text-xs sm:text-sm tabular-nums ${
                          incoming ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {incoming ? '+' : '-'}${formattedAmount}
                      </div>

                      <div className="flex justify-end">
                        {tx.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{t.history.statusCompleted}</span>
                          </span>
                        )}
                        {tx.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                            <Clock className="w-3 h-3" />
                            <span>
                              {tx.paymentStatus === 'awaiting_review'
                                ? t.history.statusAwaitingReview
                                : t.history.statusPending}
                            </span>
                          </span>
                        )}
                        {tx.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600">
                            <XCircle className="w-3 h-3" />
                            <span>{t.history.statusFailed}</span>
                          </span>
                        )}
                        {tx.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                            <span>{t.history.statusCancelled}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
