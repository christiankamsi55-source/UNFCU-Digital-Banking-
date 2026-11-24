import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Building2,
  Plus,
  Trash2,
  Check,
  Copy,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { PaymentMethodConfig } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyAmount } from '../../lib/formatters';
import { compressReceiptFile } from '../../lib/storageService';

interface BankTransferPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  fee: number;
  total: number;
  reference: string;
  transactionType: string;
  config?: PaymentMethodConfig;
  onSubmitPayment: (receiptImages: string[], userMessage: string) => Promise<void>;
  isSubmitting: boolean;
}

export const BankTransferPaymentModal: React.FC<BankTransferPaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  reference,
  config,
  onSubmitPayment,
  isSubmitting,
}) => {
  const { t, language, countryCode } = useAuth();
  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReceiptImages([]);
    setUserMessage('');
    setError(null);
  }, [reference]);

  if (!isOpen) return null;

  const bankName = config?.accountDetails?.bankName || 'Global International Trust Bank, N.A.';
  const accountHolder =
    config?.accountDetails?.accountHolderName ||
    config?.accountDetails?.beneficiary ||
    'United Nation Gold Chase Clearing Escrow LLC';
  const accountNumber = config?.accountDetails?.accountNumber || '9820019248';
  const routingNumber = config?.accountDetails?.routingNumber || '021000021';
  const swiftBic = config?.accountDetails?.swiftBic || 'GITBUS33NYC';
  const bankInstructions =
    config?.accountDetails?.bankInstructions ||
    config?.instructions ||
    'Initiate a domestic wire or ACH transfer to the institutional account details shown. Include your unique Payment Reference in the wire memo field.';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (receiptImages.length + selectedFiles.length > 5) {
      setError('You can attach up to 5 payment receipt screenshots per submission.');
      return;
    }

    setProcessingFiles(true);
    try {
      const targetMaxChars = receiptImages.length + selectedFiles.length > 1 ? 220_000 : 420_000;
      const compressedList: string[] = [];
      for (const file of selectedFiles) {
        if (file.size > 15 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds 15MB limit. Please select a smaller screenshot.`);
        }
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          throw new Error(`File "${file.name}" is not a supported image or PDF format.`);
        }
        const compressed = await compressReceiptFile(file, targetMaxChars);
        compressedList.push(compressed);
      }
      setReceiptImages((prev) => [...prev, ...compressedList].slice(0, 5));
    } catch (fileErr: any) {
      setError(fileErr?.message || 'Unable to process selected receipt image.');
    } finally {
      setProcessingFiles(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setReceiptImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (receiptImages.length === 0) {
      setError(t.errors.fillRequiredFields);
      return;
    }

    try {
      await onSubmitPayment(receiptImages, userMessage);
      setReceiptImages([]);
      setUserMessage('');
    } catch (err: any) {
      setError(err?.message || t.errors.networkError);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#173A52] text-white p-6 flex items-center justify-between border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white tracking-tight">
                {t.feeDialog.bankTransferOption}
              </h2>
              <p className="text-blue-200/80 text-xs">{t.feeDialog.bankDetailsHeading}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t.common.close}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount & Reference Header Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                {t.feeDialog.totalAmount}
              </span>
              <div className="font-mono text-2xl font-bold text-[#173A52] tabular-nums">
                ${formatCurrencyAmount(total, language, countryCode)}{' '}
                <span className="text-xs font-sans font-medium text-slate-500">USD</span>
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                {t.paymentConfirmation.reference}
              </span>
              <div className="flex items-center gap-1.5 sm:justify-end mt-0.5">
                <span className="font-mono font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-900 select-all">
                  {reference}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(reference, 'ref')}
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={t.common.copy}
                >
                  {copiedKey === 'ref' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Verified Business Bank Account Details */}
          <div className="space-y-2">
            <span className="font-bold text-xs text-slate-900 block uppercase tracking-wider">
              {t.feeDialog.bankDetailsHeading}
            </span>
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
              <div className="p-3 flex justify-between items-center gap-2">
                <span className="text-slate-500">{t.dashboard.bankName}:</span>
                <span className="font-bold text-slate-900 text-right">{bankName}</span>
              </div>

              <div className="p-3 flex justify-between items-center gap-2">
                <span className="text-slate-500">{t.dashboard.accountHolder}:</span>
                <span className="font-semibold text-slate-900 text-right">{accountHolder}</span>
              </div>

              <div className="p-3 flex justify-between items-center bg-[#EBF2FC]/50 gap-2">
                <span className="text-slate-500">{t.dashboard.accountNumber}:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-sm select-all">
                    {accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(accountNumber, 'acc')}
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={t.common.copy}
                  >
                    {copiedKey === 'acc' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {routingNumber && (
                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-slate-500">{t.withdrawal.routingNum}:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900 select-all">
                      {routingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(routingNumber, 'aba')}
                      className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title={t.common.copy}
                    >
                      {copiedKey === 'aba' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {swiftBic && (
                <div className="p-3 flex justify-between items-center gap-2">
                  <span className="text-slate-500">{t.transfer.swiftCode}:</span>
                  <span className="font-mono font-semibold text-slate-900 select-all">
                    {swiftBic}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bank Transfer Instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
            <p className="text-slate-600 text-xs leading-relaxed">{bankInstructions}</p>
            <p className="text-[11px] text-[#173A52] font-medium pt-1">
              {t.paymentConfirmation.reference}:{' '}
              <strong className="font-mono select-all">{reference}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload Functionality with Large PLUS Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-xs text-slate-900 block">
                  {t.feeDialog.uploadReceiptLabel} *
                </label>
                <span className="text-[11px] text-slate-500">({receiptImages.length})</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-[#2166D5]/45 hover:border-[#2166D5] bg-[#EBF2FC]/50 hover:bg-[#EBF2FC] flex flex-col items-center justify-center gap-1.5 text-[#173A52] transition-all cursor-pointer group shadow-xs"
                  title={t.feeDialog.uploadReceiptLabel}
                >
                  <div className="w-9 h-9 rounded-full bg-[#2166D5] text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-[11px] font-bold text-[#173A52] text-center px-1 truncate max-w-full">
                    +
                  </span>
                </button>

                {receiptImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-xs"
                  >
                    <img
                      src={img}
                      alt={`Receipt ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-md transition-colors cursor-pointer"
                      title={t.common.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Message Field */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                {t.feeDialog.receiptMessageLabel}
              </label>
              <textarea
                rows={3}
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder={t.feeDialog.txHashPlaceholder}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] focus:border-[#2166D5] text-xs text-slate-900"
              />
            </div>

            {/* Verification Notice */}
            <div className="p-3 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/25 text-[#173A52] text-[11px] leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2166D5] shrink-0 mt-0.5" />
              <span>{t.paymentConfirmation.notice24h}</span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {t.common.cancel}
              </button>

              <button
                type="submit"
                disabled={isSubmitting || processingFiles || receiptImages.length === 0}
                className="px-6 py-2.5 text-xs font-bold text-white unfcu-blue-gradient unfcu-blue-gradient-hover rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || processingFiles ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.common.saving}
                  </span>
                ) : (
                  <>
                    <span>{t.feeDialog.submitReceiptBtn}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white rtl-flip" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
