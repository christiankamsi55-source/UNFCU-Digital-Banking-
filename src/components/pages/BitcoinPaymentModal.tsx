import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Bitcoin,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  QrCode,
  ArrowRight,
} from 'lucide-react';
import { PaymentMethodConfig } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyAmount } from '../../lib/formatters';
import { compressReceiptFile } from '../../lib/storageService';

interface BitcoinPaymentModalProps {
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

export const BitcoinPaymentModal: React.FC<BitcoinPaymentModalProps> = ({
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
  const [showQR, setShowQR] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReceiptImages([]);
    setUserMessage('');
    setError(null);
  }, [reference]);

  if (!isOpen) return null;

  const providerName = config?.accountDetails?.providerName || 'BitPay & Coinbase Institutional Custody';
  const btcAddress = config?.accountDetails?.btcAddress || 'bc1qgoldchase92849un021948xkp9';
  const network = config?.accountDetails?.network || 'Bitcoin Native SegWit (Mainnet)';
  const bitcoinInstructions =
    config?.accountDetails?.bitcoinInstructions ||
    config?.instructions ||
    'Transfer the exact fee or settlement amount to the authorized receiving address on the Bitcoin Native SegWit network. Upload your transaction receipt for verification.';

  const btcEstimated = (total / 92500).toFixed(6);

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
              <Bitcoin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white tracking-tight">
                {t.feeDialog.bitcoinOption}
              </h2>
              <p className="text-blue-200/80 text-xs">{t.feeDialog.btcAddressHeading}</p>
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
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-2xl font-bold text-[#173A52] tabular-nums">
                  ${formatCurrencyAmount(total, language, countryCode)}{' '}
                  <span className="text-xs font-sans font-medium text-slate-500">USD</span>
                </span>
                <span className="font-mono text-xs text-[#2166D5] font-bold bg-[#EBF2FC] px-2 py-0.5 rounded">
                  ≈ {btcEstimated} BTC
                </span>
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

          {/* Verified Bitcoin Payment Provider & Receiving Address */}
          <div className="space-y-2">
            <span className="font-bold text-xs text-slate-900 block uppercase tracking-wider">
              {t.feeDialog.btcAddressHeading}
            </span>
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
              <div className="p-3 flex justify-between items-center gap-2">
                <span className="text-slate-500">{t.feeDialog.paymentMethodHeading}:</span>
                <span className="font-bold text-slate-900 text-right">{providerName}</span>
              </div>

              <div className="p-3 flex justify-between items-center gap-2">
                <span className="text-slate-500">BTC:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                  {network}
                </span>
              </div>

              {/* Authorized Receiving Address */}
              <div className="p-3 bg-[#EBF2FC]/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">{t.feeDialog.btcAddressHeading}:</span>
                  <button
                    type="button"
                    onClick={() => setShowQR(!showQR)}
                    className="text-[11px] font-bold text-[#173A52] hover:text-[#2166D5] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QR</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-300 shadow-xs">
                  <code className="text-xs font-mono font-bold text-slate-900 break-all select-all flex-1">
                    {btcAddress}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(btcAddress, 'wallet')}
                    className="px-3 py-1.5 rounded-lg bg-[#173A52] hover:bg-[#123047] text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'wallet' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.common.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-blue-200" />
                        <span>{t.common.copy}</span>
                      </>
                    )}
                  </button>
                </div>

                {showQR && (
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 animate-in fade-in duration-150">
                    <svg className="w-32 h-32 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                      <path d="M0 0h30v30H0zm5 5h20v20H5zM10 10h10v10H10zM70 0h30v30H70zm5 5h20v20H75zM80 10h10v10H80zM0 70h30v30H0zm5 5h20v20H5zM10 80h10v10H10zM40 10h10v10H40zm10 10h10v10H50zm-10 20h20v10H40zm30 10h10v10H70zm10 10h10v20H80zm-40 10h10v20H40zm10 10h20v10H50zm20 10h20v10H70z" />
                    </svg>
                    <span className="text-[10px] text-slate-500 mt-2 font-mono">{btcAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clear Payment Instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
            <p className="text-slate-600 text-xs leading-relaxed">{bitcoinInstructions}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  <span className="text-[11px] font-bold text-[#173A52]">+</span>
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

            <div className="p-3 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/25 text-[#173A52] text-[11px] leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2166D5] shrink-0 mt-0.5" />
              <span>{t.paymentConfirmation.notice24h}</span>
            </div>

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
