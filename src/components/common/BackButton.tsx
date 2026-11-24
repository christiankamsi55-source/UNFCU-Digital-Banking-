import React from 'react';
import { ArrowLeft, Home, Wallet } from 'lucide-react';
import { useDevice, AppNavPage } from '../../context/DeviceContext';
import { useAuth } from '../../context/AuthContext';

interface BackButtonProps {
  label?: string;
  fallback?: AppNavPage;
  showHome?: boolean;
  showWallet?: boolean;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  label,
  fallback,
  showHome = false,
  showWallet = false,
  className = '',
}) => {
  const { goBack, setActivePage } = useDevice();
  const { isAuthenticated, t } = useAuth();

  const resolvedLabel = label || t.common.back;

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <button
        type="button"
        onClick={() => goBack(fallback)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white shadow-xs text-[#173A52] hover:text-[#2166D5] hover:border-[#2166D5]/50 hover:bg-[#EBF2FC]/50 transition-all font-semibold text-xs cursor-pointer group"
        title={resolvedLabel}
      >
        <ArrowLeft className="w-4 h-4 text-[#2166D5] group-hover:-translate-x-0.5 transition-all rtl-flip" />
        <span>{resolvedLabel}</span>
      </button>

      {showHome && (
        <button
          type="button"
          onClick={() => setActivePage('public_home')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-[#173A52] hover:bg-slate-50 transition-colors text-xs cursor-pointer"
          title={t.common.home}
        >
          <Home className="w-3.5 h-3.5 text-[#2166D5]" />
          <span className="hidden sm:inline">{t.common.home}</span>
        </button>
      )}

      {showWallet && isAuthenticated && (
        <button
          type="button"
          onClick={() => setActivePage('dashboard')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-[#173A52] hover:bg-slate-50 transition-colors text-xs cursor-pointer"
          title={t.nav.dashboard}
        >
          <Wallet className="w-3.5 h-3.5 text-[#2166D5]" />
          <span className="hidden sm:inline">{t.nav.dashboard}</span>
        </button>
      )}
    </div>
  );
};

