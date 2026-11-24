import React, { useState } from 'react';
import { Building2, X, Copy, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';

interface ReceiveMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveMoneyModal: React.FC<ReceiveMoneyModalProps> = ({ isOpen, onClose }) => {
  const { user, wallet, t } = useAuth();
  const { setActivePage } = useDevice();
  const [copiedAcc, setCopiedAcc] = useState(false);

  if (!isOpen) return null;

  const accountNumber = wallet?.accountNumber || 'UNGB-0000-0000';

  const handleCopyAccount = () => {
    if (accountNumber) {
      navigator.clipboard.writeText(accountNumber);
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-[#0F172A]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/25 flex items-center justify-center text-[#2166D5]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#173A52]">
                {t.dashboard.receiveModalTitle}
              </h3>
              <p className="text-[11px] text-slate-500">{t.dashboard.receiveModalSub}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs bg-[#F8FAFC] rounded-2xl p-4 border border-slate-200">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">{t.dashboard.accountHolder}</span>
            <span className="font-semibold text-[#0F172A] text-right">{user?.fullName}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">{t.dashboard.bankName}</span>
            <span className="font-semibold text-[#173A52] text-right">{t.appName}</span>
          </div>
          <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-200">
            <span className="text-slate-500">{t.dashboard.accountNumber}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[#173A52] select-all">
                {accountNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyAccount}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#2166D5] hover:bg-[#EBF2FC] transition-colors cursor-pointer"
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
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">{t.dashboard.currencyLabel}</span>
            <span className="font-mono font-semibold text-[#0F172A]">USD ($)</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">{t.dashboard.receiveNote}</p>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleCopyAccount}
            className="flex-1 py-2.5 px-4 rounded-xl unfcu-blue-gradient unfcu-blue-gradient-hover text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            {copiedAcc ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAcc ? t.common.copied : t.dashboard.copyAccountNumber}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              setActivePage('withdrawal');
            }}
            className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-[#173A52] font-semibold text-xs cursor-pointer"
          >
            {t.dashboard.withdrawShort}
          </button>
        </div>
      </div>
    </div>
  );
};
