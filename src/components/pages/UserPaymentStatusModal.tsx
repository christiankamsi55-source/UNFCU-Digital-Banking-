import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Bitcoin,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { getUserPaymentSubmissionsFromFirestore } from '../../lib/firebaseStore';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyAmount, formatTransactionDateTime } from '../../lib/formatters';
import { PaymentSubmission } from '../../types';

interface UserPaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserPaymentStatusModal: React.FC<UserPaymentStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, t, language, countryCode } = useAuth();
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getMyPaymentSubmissions().catch(() => ({ submissions: [] }));
      let list = res.submissions || [];

      try {
        const firestoreSubs = await getUserPaymentSubmissionsFromFirestore(user.id);
        const map = new Map<string, any>();
        list.forEach((s: any) => map.set(s.id, s));
        firestoreSubs.forEach((s: any) => {
          if (!map.has(s.id)) map.set(s.id, s);
          else map.set(s.id, { ...map.get(s.id), ...s });
        });
        list = Array.from(map.values());
      } catch {}

      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubmissions(list);
    } catch (err) {
      console.warn('Failed to load user submissions', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchSubmissions();
    }
  }, [isOpen, fetchSubmissions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#173A52] text-white p-6 flex items-center justify-between border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white tracking-tight">
                {t.dashboard.paymentStatus}
              </h2>
              <p className="text-blue-200/80 text-xs">{t.dashboard.trackReceipts}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          <div className="flex items-center justify-between pb-1">
            <span className="text-slate-500 text-xs font-mono">
              ({submissions.length})
            </span>
            <button
              type="button"
              onClick={fetchSubmissions}
              className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title={t.common.refresh}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">{t.common.refresh}</span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-2" />
              {t.common.loading}
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 px-4">
              {t.history.noResults}
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => {
                const isVerified = sub.status === 'verified';
                const isRejected = sub.status === 'rejected';

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            sub.paymentMethod === 'bitcoin'
                              ? 'bg-amber-50 text-amber-600 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {sub.paymentMethod === 'bitcoin' ? (
                            <Bitcoin className="w-5 h-5" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-2 flex-wrap">
                            <span>
                              {sub.paymentMethod === 'bitcoin'
                                ? t.feeDialog.bitcoinOption
                                : t.feeDialog.bankTransferOption}
                            </span>
                            <span className="font-mono text-slate-500 font-normal">
                              {sub.reference}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {formatTransactionDateTime(sub.createdAt, language, countryCode)}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t.history.statusCompleted}</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>{t.history.statusFailed}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                            <span>{t.feeDialog.statusAwaiting}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Breakdown Strip */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs flex-wrap gap-2">
                      <div className="text-slate-600">
                        <span>{t.history.colAmount}: </span>
                        <strong className="font-mono text-slate-900">
                          ${formatCurrencyAmount(sub.amount, language, countryCode)} USD
                        </strong>
                      </div>
                      <div className="text-slate-600">
                        <span>{t.feeDialog.uploadReceiptLabel}: </span>
                        <strong className="text-slate-900">{sub.receiptImages?.length || 0}</strong>
                      </div>
                      {sub.reviewedAt && (
                        <div className="text-slate-500 text-[11px] font-mono">
                          {formatTransactionDateTime(sub.reviewedAt, language, countryCode)}
                        </div>
                      )}
                    </div>

                    {sub.userMessage && (
                      <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-700">
                          {t.feeDialog.receiptMessageLabel}:{' '}
                        </span>
                        <span>{sub.userMessage}</span>
                      </div>
                    )}

                    {sub.adminNote && (
                      <div
                        className={`p-2.5 rounded-xl text-xs border ${
                          isVerified
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : isRejected
                            ? 'bg-red-50/70 border-red-200 text-red-900'
                            : 'bg-amber-50/70 border-amber-200 text-amber-900'
                        }`}
                      >
                        <span className="font-bold">{t.admin.notesLabel}: </span>
                        <span>{sub.adminNote}</span>
                      </div>
                    )}

                    {sub.receiptImages && sub.receiptImages.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          {t.feeDialog.uploadReceiptLabel}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {sub.receiptImages.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveImage(img)}
                              className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 hover:border-amber-500 transition-all hover:scale-105 cursor-pointer relative group"
                              title={t.dashboard.viewDetails}
                            >
                              <img
                                src={img}
                                alt={`Receipt ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Eye className="w-4 h-4" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#173A52] text-white hover:bg-[#123047] font-bold text-xs transition-colors cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      </div>

      {/* Zoom Receipt Modal */}
      {activeImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              aria-label={t.common.close}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activeImage}
              alt="Receipt zoom"
              className="max-h-[85vh] max-w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
