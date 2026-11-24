import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { CustomerInfoModal, InfoModalTopic } from '../common/CustomerInfoModal';
import { UnfcuSupportIllustration } from '../common/UnfcuLogo';
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Shield,
  CreditCard,
  DollarSign,
  AlertCircle,
  Mail,
  Lock,
  FileText,
} from 'lucide-react';

export const HelpSupportPage: React.FC = () => {
  const { isAuthenticated, t } = useAuth();
  const { goBack } = useDevice();
  const [activeTopic, setActiveTopic] = useState<InfoModalTopic | null>(null);

  const topics: { id: InfoModalTopic; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'faqs', label: t.footer.faqs, icon: HelpCircle },
    { id: 'contact_us', label: t.footer.contactUs, icon: Mail },
    { id: 'account_security', label: t.footer.accountSecurity, icon: Shield },
    { id: 'payment_information', label: t.footer.paymentInfo, icon: CreditCard },
    { id: 'transaction_fees', label: t.footer.transactionFees, icon: DollarSign },
    { id: 'dispute_resolution', label: t.footer.disputeResolution, icon: AlertCircle },
    { id: 'privacy_policy', label: t.footer.privacyPolicy, icon: Lock },
    { id: 'terms_conditions', label: t.footer.termsConditions, icon: FileText },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#E5EBF2] text-[#0F172A]">
      {/* UNFCU Deep Navy Sub-Header */}
      <div className="bg-[#173A52] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goBack(isAuthenticated ? 'more' : 'landing')}
            className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            aria-label={t.common.back}
          >
            <ChevronLeft className="w-5 h-5 rtl-flip" />
          </button>

          <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
            {t.nav.helpSupport}
          </h1>

          <div className="w-9 h-9 shrink-0" />
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-5 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 px-1">
            {t.unfcu.supportSubtitle}
          </p>

          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden banking-card-shadow">
            {topics.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTopic(item.id)}
                  className="w-full text-left px-4 sm:px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/20 text-[#2166D5] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" strokeWidth={1.9} />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm text-[#0F172A] truncate">
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2166D5] rtl-flip shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Support Illustration Card matching UNFCU Reference */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center banking-card-shadow flex flex-col items-center gap-2.5">
          <UnfcuSupportIllustration className="w-20 h-20" />
          <p className="text-xs sm:text-sm font-bold text-[#173A52]">
            {t.unfcu.supportBannerText}
          </p>
          <p className="text-[11px] text-slate-500 max-w-sm">
            {t.appName} · {t.common.digitalBanking}
          </p>
        </div>
      </div>

      <CustomerInfoModal
        topic={activeTopic}
        onClose={() => setActiveTopic(null)}
      />
    </div>
  );
};
