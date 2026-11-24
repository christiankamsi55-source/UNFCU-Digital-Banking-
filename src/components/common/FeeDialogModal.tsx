import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  ArrowRight,
  Building2,
  Bitcoin,
  Check,
  Info,
} from 'lucide-react';
import { PaymentMethodConfig } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyAmount } from '../../lib/formatters';

interface FeeDialogModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  fee: number;
  total: number;
  reference: string;
  transactionType: 'transfer' | 'withdrawal';
  recipientOrDestination?: string;
  accountNumber?: string;
  availableBalance: number;
  paymentMethods?: PaymentMethodConfig[];
  feeBreakdown?: {
    fixedFee: number;
    percentFee: number;
    isEnabled: boolean;
  };
  onConfirmDirectSettlement: () => Promise<void>;
  onSelectPaymentOption?: (option: 'bank_transfer' | 'bitcoin') => void;
  isSubmitting: boolean;
}

export const FeeDialogModal: React.FC<FeeDialogModalProps> = ({
  isOpen,
  onClose,
  amount,
  fee,
  total,
  reference,
  transactionType,
  recipientOrDestination,
  accountNumber,
  feeBreakdown,
  onSelectPaymentOption,
  isSubmitting,
}) => {
  const { t, language, countryCode } = useAuth();
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'bank_transfer' | 'bitcoin'>('bank_transfer');

  if (!isOpen) return null;

  const handleContinue = () => {
    if (onSelectPaymentOption) {
      onSelectPaymentOption(selectedPaymentMode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#173A52] text-white p-6 flex items-center justify-between border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white tracking-tight">
                {t.feeDialog.modalTitle}
              </h2>
              <p className="text-blue-200/80 text-xs">
                {transactionType === 'transfer' ? t.transfer.title : t.withdrawal.title} · {t.paymentConfirmation.reference}:{' '}
                <span className="font-mono text-white font-semibold">{reference}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          <div className="bg-[#EBF2FC] border border-[#2166D5]/25 rounded-2xl p-4 text-[#173A52] text-xs leading-relaxed font-medium flex items-start gap-3">
            <Info className="w-4 h-4 text-[#2166D5] shrink-0 mt-0.5" />
            <span>{t.feeDialog.modalSubtitle}</span>
          </div>

          {/* Breakdown Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-xs">
            <div className="p-3.5 flex justify-between items-center text-slate-600">
              <span className="font-medium">{t.history.colType}:</span>
              <span className="font-bold text-slate-900">
                {transactionType === 'transfer' ? t.transfer.title : t.withdrawal.title}
              </span>
            </div>

            <div className="p-3.5 flex justify-between items-center text-slate-600">
              <span className="font-medium">{t.paymentConfirmation.reference}:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] select-all">
                {reference}
              </span>
            </div>

            {recipientOrDestination && (
              <div className="p-3.5 flex justify-between items-center text-slate-600">
                <span className="font-medium">{t.history.colRecipient}:</span>
                <span className="font-semibold text-slate-900 text-right">
                  {recipientOrDestination} {accountNumber ? `(${accountNumber})` : ''}
                </span>
              </div>
            )}

            <div className="p-3.5 flex justify-between items-center text-slate-600">
              <span className="font-medium">{t.feeDialog.transferAmount}:</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums text-xs">
                ${formatCurrencyAmount(amount, language, countryCode)} USD
              </span>
            </div>

            <div className="p-3.5 flex justify-between items-center text-slate-600 bg-[#EBF2FC]/50">
              <div>
                <span className="font-medium text-[#173A52] flex items-center gap-1.5">
                  <span>{t.feeDialog.applicableFee}:</span>
                  {feeBreakdown?.isEnabled === false && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                      {t.transfer.waivedLabel}
                    </span>
                  )}
                </span>
                {feeBreakdown && feeBreakdown.isEnabled && (
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    ${formatCurrencyAmount(feeBreakdown.fixedFee, language, countryCode)} + {feeBreakdown.percentFee}%
                  </div>
                )}
              </div>
              <span className="font-mono font-bold text-[#2166D5] tabular-nums text-xs">
                ${formatCurrencyAmount(fee, language, countryCode)} USD
              </span>
            </div>

            <div className="p-3.5 flex justify-between items-center font-bold text-slate-900 bg-slate-50/80">
              <span>{t.feeDialog.totalAmount}:</span>
              <span className="font-mono text-base text-[#173A52] tabular-nums">
                ${formatCurrencyAmount(total, language, countryCode)} USD
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs text-slate-600">
            <p className="leading-relaxed">
              {transactionType === 'transfer' ? t.transfer.feeNotice : t.withdrawal.feeNotice}
            </p>
          </div>

          {/* Payment Options Selection */}
          <div className="space-y-3 pt-1">
            <span className="font-bold text-xs text-slate-900 block uppercase tracking-wider">
              {t.feeDialog.paymentMethodHeading}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPaymentMode('bank_transfer')}
                className={`p-4 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all cursor-pointer ${
                  selectedPaymentMode === 'bank_transfer'
                    ? 'border-[#2166D5] bg-[#EBF2FC] ring-1 ring-[#2166D5]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2166D5] border border-blue-200 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">{t.feeDialog.bankTransferOption}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {t.feeDialog.uploadReceiptLabel}
                    </div>
                  </div>
                </div>
                {selectedPaymentMode === 'bank_transfer' && (
                  <div className="w-4 h-4 rounded-full bg-[#2166D5] text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMode('bitcoin')}
                className={`p-4 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all cursor-pointer ${
                  selectedPaymentMode === 'bitcoin'
                    ? 'border-[#2166D5] bg-[#EBF2FC] ring-1 ring-[#2166D5]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2166D5] border border-blue-200 flex items-center justify-center shrink-0">
                    <Bitcoin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">{t.feeDialog.bitcoinOption}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {t.feeDialog.txProofLabel}
                    </div>
                  </div>
                </div>
                {selectedPaymentMode === 'bitcoin' && (
                  <div className="w-4 h-4 rounded-full bg-[#2166D5] text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {t.feeDialog.cancelBtn}
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-bold text-white unfcu-blue-gradient unfcu-blue-gradient-hover rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.common.loading}
              </span>
            ) : (
              <>
                <span>
                  {t.transfer.continueBtn} —{' '}
                  {selectedPaymentMode === 'bank_transfer'
                    ? t.feeDialog.bankTransferOption
                    : t.feeDialog.bitcoinOption}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-white rtl-flip" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
