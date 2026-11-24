import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  ArrowUpRight,
  Download,
  Receipt,
  Clock,
} from 'lucide-react';

export const TransfersHubPage: React.FC = () => {
  const { t } = useAuth();
  const {
    goBack,
    setActivePage,
    setIsReceiveModalOpen,
    setIsPaymentStatusModalOpen,
  } = useDevice();

  const items = [
    {
      id: 'send',
      icon: Send,
      title: t.unfcu.sendExternalTransfer,
      sub: t.unfcu.sendExternalTransferSub,
      onClick: () => setActivePage('transfer'),
    },
    {
      id: 'withdraw',
      icon: ArrowUpRight,
      title: t.unfcu.withdrawCommercialBank,
      sub: t.unfcu.withdrawCommercialBankSub,
      onClick: () => setActivePage('withdrawal'),
    },
    {
      id: 'receive',
      icon: Download,
      title: t.unfcu.receiveInstructions,
      sub: t.unfcu.receiveInstructionsSub,
      onClick: () => setIsReceiveModalOpen(true),
    },
    {
      id: 'receipts',
      icon: Receipt,
      title: t.unfcu.trackPaymentReceipts,
      sub: t.unfcu.trackPaymentReceiptsSub,
      onClick: () => setIsPaymentStatusModalOpen(true),
    },
    {
      id: 'history',
      icon: Clock,
      title: t.unfcu.viewTransactionHistory,
      sub: t.unfcu.viewTransactionHistorySub,
      onClick: () => setActivePage('history'),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#E5EBF2] text-[#0F172A]">
      {/* UNFCU Deep Navy Top Sub-Header */}
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
            {t.unfcu.transfersHubTitle}
          </h1>

          <div className="w-9 h-9 shrink-0" />
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <p className="text-xs sm:text-sm text-slate-600 px-1">
          {t.unfcu.transfersHubSub}
        </p>

        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden banking-card-shadow">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="w-full text-left px-4 sm:px-5 py-4 hover:bg-[#F8FAFC] transition-colors flex items-center justify-between gap-3.5 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/20 text-[#2166D5] flex items-center justify-center shrink-0 group-hover:bg-[#2166D5] group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-[#0F172A] truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {item.sub}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2166D5] shrink-0 rtl-flip transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
