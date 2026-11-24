import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { FeeDialogModal } from '../common/FeeDialogModal';
import { BankTransferPaymentModal } from './BankTransferPaymentModal';
import { BitcoinPaymentModal } from './BitcoinPaymentModal';
import { PaymentConfirmationModal } from '../common/PaymentConfirmationModal';
import { Transaction, PaymentMethodConfig } from '../../types';
import { api } from '../../lib/api';
import {
  savePaymentSubmissionToFirestore,
  saveTransactionToFirestore,
  saveNotificationToFirestore,
} from '../../lib/firebaseStore';
import { formatCurrencyAmount } from '../../lib/formatters';
import { uploadReceiptFile } from '../../lib/storageService';
import { BackButton } from '../common/BackButton';
import { Send, Building2, User, DollarSign, AlertCircle } from 'lucide-react';

export const TransferPage: React.FC = () => {
  const { wallet, t, language, countryCode, refreshUserData } = useAuth();
  const { setActivePage } = useDevice();

  const [recipientName, setRecipientName] = useState('');
  const [recipientBank, setRecipientBank] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dynamic Fee settings & payment methods
  const [transferFixedFee, setTransferFixedFee] = useState(15.0);
  const [transferPercentFee, setTransferPercentFee] = useState(0.0);
  const [transferFeeEnabled, setTransferFeeEnabled] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);

  // Fee Dialog & Payment Modals states
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isBitcoinModalOpen, setIsBitcoinModalOpen] = useState(false);
  const [transferRef, setTransferRef] = useState('');
  const [submittedTxn, setSubmittedTxn] = useState<Transaction | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  // Load fee settings & payment methods from backend
  useEffect(() => {
    api
      .getPublicSettings()
      .then((res) => {
        if (res.feeSettings) {
          setTransferFixedFee(
            typeof res.feeSettings.transferFixedFee === 'number'
              ? res.feeSettings.transferFixedFee
              : res.feeSettings.transferFee ?? 15.0
          );
          setTransferPercentFee(
            typeof res.feeSettings.transferPercentFee === 'number'
              ? res.feeSettings.transferPercentFee
              : 0
          );
          setTransferFeeEnabled(res.feeSettings.transferFeeEnabled !== false);
        }
        if (res.paymentMethods) {
          setPaymentMethods(res.paymentMethods);
        }
      })
      .catch(() => {});
  }, []);

  const parsedAmount = parseFloat(amount) || 0;

  // Dynamic fee calculation
  const computedFee =
    parsedAmount > 0 && transferFeeEnabled
      ? Number((transferFixedFee + (parsedAmount * transferPercentFee) / 100).toFixed(2))
      : 0;

  const totalDeducted = Number((parsedAmount + computedFee).toFixed(2));
  const availableBalance = wallet?.availableBalance ?? 0;

  const handleInitiateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recipientName.trim() || !recipientBank.trim() || !recipientAccount.trim()) {
      setError(t.errors.fillRequiredFields);
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t.errors.positiveAmountRequired);
      return;
    }

    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    setTransferRef(`TXN-UNGB-${datePart}-${randPart}`);

    setIsFeeModalOpen(true);
  };

  const handleConfirmDirectSettlement = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.submitTransfer({
        recipientName: recipientName.trim(),
        recipientBank: recipientBank.trim(),
        recipientAccount: recipientAccount.trim(),
        amount: parsedAmount,
        description: description.trim() || undefined,
      });

      setIsFeeModalOpen(false);
      setSubmittedTxn(res.transaction);
      if (res.notification) {
        await saveNotificationToFirestore(res.notification).catch((err) =>
          console.warn('Transfer notification sync note:', err)
        );
      }
      setIsConfirmationOpen(true);
      await refreshUserData();
    } catch (err: any) {
      setError(err.message || t.errors.networkError);
      setIsFeeModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPaymentOption = (option: 'bank_transfer' | 'bitcoin') => {
    setIsFeeModalOpen(false);
    if (option === 'bank_transfer') {
      setIsBankModalOpen(true);
    } else {
      setIsBitcoinModalOpen(true);
    }
  };

  const handleSubmitPaymentReceipt = async (
    method: 'bank_transfer' | 'bitcoin',
    images: string[],
    message: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const uploadedResults = await Promise.all(
        images.map((img, idx) => uploadReceiptFile(img, wallet?.userId || 'client', transferRef, idx))
      );
      const secureReceiptUrls = uploadedResults.map((r) => r.url);

      const res = await api.submitPaymentReceipt({
        paymentMethod: method,
        amount: parsedAmount,
        fee: computedFee,
        total: totalDeducted,
        reference: transferRef,
        transactionType: 'transfer',
        receiptImages: secureReceiptUrls,
        userMessage: message,
        recipientName: recipientName.trim(),
        recipientBank: recipientBank.trim(),
        recipientAccount: recipientAccount.trim(),
        description: description.trim() || undefined,
      });

      // Non-blocking secondary client Firestore mirror (server already persists via Admin token)
      void Promise.all([
        savePaymentSubmissionToFirestore(res.submission).catch((err) =>
          console.warn('Payment submission sync note:', err)
        ),
        res.transaction && res.transaction.status === 'pending'
          ? saveTransactionToFirestore(res.transaction).catch((err) =>
              console.warn('Pending transfer transaction sync note:', err)
            )
          : Promise.resolve(),
        res.notification
          ? saveNotificationToFirestore(res.notification).catch((err) =>
              console.warn('Transfer notification sync note:', err)
            )
          : Promise.resolve(),
      ]);

      setIsBankModalOpen(false);
      setIsBitcoinModalOpen(false);
      setSubmittedTxn(res.transaction);
      setIsConfirmationOpen(true);
      await refreshUserData().catch(() => {});
    } catch (err: any) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationComplete = () => {
    setIsConfirmationOpen(false);
    setActivePage('dashboard');
  };

  const bankConfig = paymentMethods.find((pm) => pm.id === 'bank_transfer');
  const bitcoinConfig = paymentMethods.find((pm) => pm.id === 'bitcoin');

  return (
    <div className="flex-1 flex flex-col bg-[#E5EBF2] text-[#0F172A]">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-8 space-y-5">
        {/* Top Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <BackButton fallback="transfers" showHome={true} showWallet={true} />
          <div className="sm:text-right">
            <h1 className="text-xl font-bold text-[#173A52] tracking-tight">
              {t.transfer.title}
            </h1>
            <p className="text-xs text-slate-600">{t.transfer.subtitle}</p>
          </div>
        </div>

        {/* Main Transfer Form Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 banking-card-shadow-lg space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleInitiateTransfer} className="space-y-4 text-xs">
            {/* Recipient Full Name */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#173A52] block">
                {t.transfer.recipientName} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Recipient Bank Name */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#173A52] block">
                {t.transfer.recipientBank} *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={recipientBank}
                  onChange={(e) => setRecipientBank(e.target.value)}
                  placeholder="e.g. UBS Wealth Management Zurich"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Recipient Account Number */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#173A52] block">
                {t.transfer.recipientAccount} *
              </label>
              <input
                type="text"
                required
                value={recipientAccount}
                onChange={(e) => setRecipientAccount(e.target.value)}
                placeholder="e.g. CH93-0024-8812-9912 or 89201948201"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs font-mono text-[#0F172A] placeholder:text-slate-400"
              />
            </div>

            {/* Amount in USD */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center gap-2">
                <label className="font-semibold text-[#173A52]">
                  {t.transfer.amountLabel} *
                </label>
                <span className="text-[11px] text-slate-500">
                  {t.transfer.availableLabel}:{' '}
                  <strong className="text-[#173A52] font-mono tabular-nums">
                    ${formatCurrencyAmount(availableBalance, language, countryCode)} USD
                  </strong>
                </span>
              </div>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-[#2166D5] absolute left-3 top-2.5" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs font-mono font-bold text-[#0F172A] placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Optional Description */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[#173A52] block">
                {t.transfer.descriptionLabel} ({t.common.optional})
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Contract retainer disbursement"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2166D5] focus:bg-white text-xs text-[#0F172A] placeholder:text-slate-400"
              />
            </div>

            {/* Transparent Live Fee Preview */}
            {parsedAmount > 0 && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>{t.transfer.principalLabel}:</span>
                  <span className="font-semibold font-mono text-[#0F172A] tabular-nums">
                    ${formatCurrencyAmount(parsedAmount, language, countryCode)} USD
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span>{t.transfer.applicableFeeLabel}:</span>
                    {transferFeeEnabled ? (
                      <span className="text-[10px] text-[#2166D5] bg-[#EBF2FC] border border-[#2166D5]/25 px-1.5 py-0.2 rounded font-semibold">
                        ${formatCurrencyAmount(transferFixedFee, language, countryCode)} + {transferPercentFee}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                        {t.transfer.waivedLabel}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold font-mono text-[#2166D5] tabular-nums">
                    ${formatCurrencyAmount(computedFee, language, countryCode)} USD
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-[#173A52]">
                  <span>{t.transfer.totalAmountLabel}:</span>
                  <span className="font-mono text-sm text-[#173A52] tabular-nums">
                    ${formatCurrencyAmount(totalDeducted, language, countryCode)} USD
                  </span>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-full unfcu-blue-gradient unfcu-blue-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-white" />
              <span>{t.transfer.continueBtn}</span>
            </button>
          </form>
        </div>

        {/* Transaction Fee and Payment Information Modal */}
        <FeeDialogModal
          isOpen={isFeeModalOpen}
          onClose={() => setIsFeeModalOpen(false)}
          amount={parsedAmount}
          fee={computedFee}
          total={totalDeducted}
          reference={transferRef}
          transactionType="transfer"
          recipientOrDestination={`${recipientName} (${recipientBank})`}
          accountNumber={recipientAccount}
          availableBalance={availableBalance}
          paymentMethods={paymentMethods}
          feeBreakdown={{
            fixedFee: transferFixedFee,
            percentFee: transferPercentFee,
            isEnabled: transferFeeEnabled,
          }}
          onConfirmDirectSettlement={handleConfirmDirectSettlement}
          onSelectPaymentOption={handleSelectPaymentOption}
          isSubmitting={loading}
        />

        {/* Dedicated Bank Transfer Payment Modal */}
        <BankTransferPaymentModal
          isOpen={isBankModalOpen}
          onClose={() => setIsBankModalOpen(false)}
          amount={parsedAmount}
          fee={computedFee}
          total={totalDeducted}
          reference={transferRef}
          transactionType="transfer"
          config={bankConfig}
          onSubmitPayment={(images, msg) => handleSubmitPaymentReceipt('bank_transfer', images, msg)}
          isSubmitting={loading}
        />

        {/* Dedicated Bitcoin Payment Modal */}
        <BitcoinPaymentModal
          isOpen={isBitcoinModalOpen}
          onClose={() => setIsBitcoinModalOpen(false)}
          amount={parsedAmount}
          fee={computedFee}
          total={totalDeducted}
          reference={transferRef}
          transactionType="transfer"
          config={bitcoinConfig}
          onSubmitPayment={(images, msg) => handleSubmitPaymentReceipt('bitcoin', images, msg)}
          isSubmitting={loading}
        />

        {/* Confirmation & Settlement Receipt Modal */}
        <PaymentConfirmationModal
          isOpen={isConfirmationOpen}
          transaction={submittedTxn}
          onComplete={handleConfirmationComplete}
        />
      </div>
    </div>
  );
};
