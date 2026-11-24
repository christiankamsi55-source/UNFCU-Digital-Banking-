import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Transaction } from '../../types';
import { CheckCircle2, Clock, ArrowRight, Wallet, Check } from 'lucide-react';
import { formatCurrencyAmount } from '../../lib/formatters';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onComplete: () => void;
}

export const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  isOpen,
  transaction,
  onComplete,
}) => {
  const { t, wallet, language, countryCode } = useAuth();

  if (!isOpen || !transaction) return null;

  const isCompleted = transaction.status === 'completed';
  const totalDeducted = transaction.amount + (transaction.fee || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Top Header Badge */}
        <div className="bg-[#173A52] text-white p-6 text-center border-b border-white/15 relative">
          <div
            className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-inner ${
              isCompleted
                ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                : 'bg-[#2166D5]/30 border border-blue-300/40 text-blue-200'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-300" />
            ) : (
              <Clock className="w-8 h-8 text-blue-200 animate-pulse" />
            )}
          </div>
          <h3 className="font-bold text-lg text-white tracking-tight">
            {isCompleted ? t.history.statusCompleted : t.paymentConfirmation.title}
          </h3>
          <p className="text-blue-200/80 text-xs mt-1 font-mono">
            {t.paymentConfirmation.reference}: {transaction.reference}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          <div
            className={`p-4 rounded-xl leading-relaxed font-medium text-xs ${
              isCompleted
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border border-slate-200 text-slate-800'
            }`}
          >
            {isCompleted ? t.history.statusCompleted : t.paymentConfirmation.message}
          </div>

          {!isCompleted && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
              {t.paymentConfirmation.notice24h}
            </div>
          )}

          {/* Details breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
            <div className="flex justify-between items-center p-3">
              <span className="text-slate-500 font-medium">{t.paymentConfirmation.reference}:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                {transaction.reference}
              </span>
            </div>

            <div className="flex justify-between items-center p-3">
              <span className="text-slate-500 font-medium">{t.history.colRecipient}:</span>
              <span className="font-semibold text-slate-900">
                {transaction.senderOrRecipient}
              </span>
            </div>

            <div className="flex justify-between items-center p-3">
              <span className="text-slate-500 font-medium">{t.transfer.principalLabel}:</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                ${formatCurrencyAmount(transaction.amount, language, countryCode)} USD
              </span>
            </div>

            <div className="flex justify-between items-center p-3">
              <span className="text-slate-500 font-medium">{t.paymentConfirmation.feeAmount}:</span>
              <span className="font-semibold text-[#2166D5] tabular-nums">
                ${formatCurrencyAmount(transaction.fee || 0, language, countryCode)} USD
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-50/70 font-bold text-slate-900">
              <span>{t.transfer.totalAmountLabel}:</span>
              <span className="font-mono text-base text-[#173A52] tabular-nums">
                ${formatCurrencyAmount(totalDeducted, language, countryCode)} USD
              </span>
            </div>

            <div className="flex justify-between items-center p-3">
              <span className="text-slate-500 font-medium">{t.paymentConfirmation.status}:</span>
              {isCompleted ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  {t.history.statusCompleted}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 text-[11px]">
                  <Clock className="w-3 h-3 text-amber-600" />
                  {t.history.statusAwaitingReview}
                </span>
              )}
            </div>
          </div>

          {wallet && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-slate-500" />
                <span>{t.dashboard.availableBalance}:</span>
              </span>
              <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
                ${formatCurrencyAmount(wallet.availableBalance, language, countryCode)} USD
              </span>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onComplete}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white unfcu-blue-gradient unfcu-blue-gradient-hover rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{t.paymentConfirmation.completeBtn}</span>
            <ArrowRight className="w-4 h-4 text-white rtl-flip" />
          </button>
        </div>
      </div>
    </div>
  );
};
