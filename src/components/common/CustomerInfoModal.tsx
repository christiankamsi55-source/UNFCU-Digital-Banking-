import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { WHATSAPP_MODAL_CTA_LABEL, WHATSAPP_CONTACT_URL } from '../../lib/contact';
import { X, Shield, HelpCircle, FileText, AlertCircle, DollarSign, CreditCard, Mail, Lock, MessageCircle } from 'lucide-react';

export type InfoModalTopic =
  | 'account_security'
  | 'payment_information'
  | 'transaction_fees'
  | 'dispute_resolution'
  | 'faqs'
  | 'about_us'
  | 'contact_us'
  | 'privacy_policy'
  | 'terms_conditions'
  | 'security'
  | 'help_support'
  | 'transaction_info';

interface CustomerInfoModalProps {
  topic: InfoModalTopic | null;
  onClose: () => void;
}

const TOPIC_ICONS: Record<InfoModalTopic, React.ReactNode> = {
  account_security: <Shield className="w-5 h-5 text-blue-200" />,
  payment_information: <CreditCard className="w-5 h-5 text-blue-200" />,
  transaction_fees: <DollarSign className="w-5 h-5 text-blue-200" />,
  dispute_resolution: <AlertCircle className="w-5 h-5 text-blue-200" />,
  faqs: <HelpCircle className="w-5 h-5 text-blue-200" />,
  about_us: <FileText className="w-5 h-5 text-blue-200" />,
  contact_us: <Mail className="w-5 h-5 text-blue-200" />,
  privacy_policy: <Lock className="w-5 h-5 text-blue-200" />,
  terms_conditions: <FileText className="w-5 h-5 text-blue-200" />,
  security: <Shield className="w-5 h-5 text-blue-200" />,
  help_support: <HelpCircle className="w-5 h-5 text-blue-200" />,
  transaction_info: <FileText className="w-5 h-5 text-blue-200" />,
};

export const CustomerInfoModal: React.FC<CustomerInfoModalProps> = ({ topic, onClose }) => {
  const { t } = useAuth();
  if (!topic) return null;

  const topicContent = t.infoTopics[topic];
  const icon = TOPIC_ICONS[topic] || <FileText className="w-5 h-5 text-blue-200" />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#173A52] text-white p-5 flex items-center justify-between border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">{topicContent.title}</h3>
              <p className="text-blue-200/80 text-[11px]">{t.appName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          {topicContent.sections.map((sec, idx) => (
            <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
              <h4 className="font-bold text-[#173A52] text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2166D5]" />
                {sec.heading}
              </h4>
              <p className="text-slate-600 text-xs leading-relaxed">{sec.body}</p>
            </div>
          ))}

          {topic === 'contact_us' && (
            <a
              href={WHATSAPP_CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-2xl bg-[#173A52] hover:bg-[#123047] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{WHATSAPP_MODAL_CTA_LABEL}</span>
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#173A52] hover:bg-[#123047] rounded-xl transition-colors cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};

