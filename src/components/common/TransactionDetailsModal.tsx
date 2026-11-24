import React, { useEffect, useState } from 'react';
import { Transaction } from '../../types';
import { api } from '../../lib/api';
import { getTransactionByIdFromFirestore } from '../../lib/firebaseStore';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyAmount, formatTransactionDateTime } from '../../lib/formatters';
import {
  X,
  FileText,
  Printer,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface TransactionDetailsModalProps {
  transactionId: string | null;
  onClose: () => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  transactionId,
  onClose,
}) => {
  const { t, language, countryCode } = useAuth();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setTransaction(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getTransactionById(transactionId)
      .then(async (res) => {
        if (cancelled) return;
        if (res?.transaction) {
          setTransaction(res.transaction);
        } else {
          const fsTx = await getTransactionByIdFromFirestore(transactionId).catch(() => null);
          if (!cancelled) {
            if (fsTx) setTransaction(fsTx);
            else setError(t.errors.networkError);
          }
        }
      })
      .catch(async (err) => {
        const fsTx = await getTransactionByIdFromFirestore(transactionId).catch(() => null);
        if (cancelled) return;
        if (fsTx) {
          setTransaction(fsTx);
        } else {
          setError(err?.message || t.errors.networkError);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [transactionId, t.errors.networkError]);

  if (!transactionId) return null;

  const handlePrint = () => {
    window.print();
  };

  const statusLabel = (status: Transaction['status']) => {
    if (status === 'completed') return t.history.statusCompleted;
    if (status === 'pending') return t.history.statusPending;
    if (status === 'cancelled') return t.history.statusCancelled;
    return t.history.statusFailed;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#173A52] text-white p-5 flex items-center justify-between border-b border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-blue-200">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">
                {t.history.receiptTitle}
              </h3>
              <p className="text-blue-200/80 text-[10px] font-mono">
                {transaction ? transaction.reference : t.common.loading}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={t.history.printReceipt}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {loading && (
            <div className="py-12 text-center text-slate-500">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-2" />
              <span>{t.common.loading}</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {transaction && (
            <>
              {/* Receipt Top Hero */}
              <div className="text-center pb-4 border-b border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                  {transaction.type.replace('_', ' ').toUpperCase()}
                </span>
                <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  ${formatCurrencyAmount(transaction.amount, language, countryCode)}{' '}
                  <span className="text-sm font-sans font-normal text-slate-500">USD</span>
                </div>
                <div className="mt-2 flex items-center justify-center gap-2">
                  {transaction.status === 'completed' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      {statusLabel(transaction.status)}
                    </span>
                  )}
                  {transaction.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3 h-3" />
                      {t.history.statusAwaitingReview}
                    </span>
                  )}
                  {(transaction.status === 'failed' || transaction.status === 'cancelled') && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                      <XCircle className="w-3 h-3" />
                      {statusLabel(transaction.status)}
                    </span>
                  )}
                  {transaction.isSimulated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                      {t.dashboard.simulatedTag}
                    </span>
                  )}
                </div>
              </div>

              {/* Receipt Details Table */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200/80 text-xs">
                <div className="p-3 flex flex-wrap justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">{t.history.colRef}:</span>
                  <span className="font-mono font-semibold text-slate-900 select-all break-all text-right">
                    {transaction.reference}
                  </span>
                </div>

                <div className="p-3 flex flex-wrap justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">{t.history.colDate}:</span>
                  <span className="font-mono text-slate-800 text-right">
                    {formatTransactionDateTime(transaction.createdAt, language, countryCode)}
                  </span>
                </div>

                <div className="p-3 flex flex-wrap justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">{t.history.colRecipient}:</span>
                  <span className="font-semibold text-slate-900 break-words text-right">{transaction.senderOrRecipient}</span>
                </div>

                <div className="p-3 flex flex-wrap justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">{t.transfer.recipientBank}:</span>
                  <span className="font-mono text-slate-800 text-right break-all">
                    {transaction.bankName}
                    <br />
                    <span className="text-[11px] text-slate-500">{transaction.accountNumber}</span>
                  </span>
                </div>

                <div className="p-3 flex flex-wrap justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">{t.paymentConfirmation.selectedMethod}:</span>
                  <span className="font-medium text-slate-900 text-right">
                    {transaction.paymentMethod === 'bitcoin'
                      ? t.feeDialog.bitcoinOption
                      : transaction.paymentMethod === 'bank_transfer'
                      ? t.feeDialog.bankTransferOption
                      : t.appName}
                  </span>
                </div>

                <div className="p-3 flex flex-wrap justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">{t.history.colStatus}:</span>
                  <span className="capitalize font-semibold text-slate-900 text-right">
                    {transaction.paymentStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3 flex flex-wrap justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">{t.history.colFee}:</span>
                  <span className="font-semibold text-[#2166D5] tabular-nums text-right">
                    ${formatCurrencyAmount(transaction.fee || 0, language, countryCode)} USD
                  </span>
                </div>

                <div className="p-3 flex flex-wrap justify-between items-center gap-2 font-bold text-slate-900 bg-white rounded-b-xl">
                  <span>{t.transfer.totalAmountLabel}:</span>
                  <span className="tabular-nums text-sm text-[#173A52] text-right">
                    ${formatCurrencyAmount(transaction.total, language, countryCode)} USD
                  </span>
                </div>
              </div>

              {/* Description & Administrative Notes */}
              <div className="space-y-2">
                <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  {t.transfer.descriptionLabel}:
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs">
                  {transaction.description || '—'}
                </div>
              </div>

              {transaction.adminNote && (
                <div className="space-y-1 bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-[11px]">
                  <span className="font-bold text-amber-950 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    {t.admin.notesLabel}:
                  </span>
                  <p className="text-amber-900 mt-0.5">{transaction.adminNote}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {t.history.printReceipt}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#173A52] hover:bg-[#123047] rounded-lg transition-colors cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
