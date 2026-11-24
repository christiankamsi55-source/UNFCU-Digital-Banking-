import React from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'banner' | 'compact' }> = ({
  variant = 'header',
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    openIOSInstallFlow,
    openAndroidInstallFlow,
  } = usePWAInstall();

  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow with active beforeinstallprompt
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          type="button"
          onClick={() => openAndroidInstallFlow()}
          title="Install UNFCU Digital Banking App"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white unfcu-blue-gradient unfcu-blue-gradient-hover rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => openAndroidInstallFlow()}
        title="Install UNFCU Digital Banking App"
        aria-label="Install UNFCU Digital Banking App"
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white unfcu-blue-gradient unfcu-blue-gradient-hover rounded-lg shadow-sm hover:shadow transition-all border border-white/15 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <button
        type="button"
        onClick={openIOSInstallFlow}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 rounded-lg transition-colors border border-white/15 cursor-pointer"
        title="Install on iPhone or iPad"
      >
        <Smartphone className="w-3.5 h-3.5 text-blue-200" />
        <span className="hidden sm:inline text-[11px]">Install on iOS</span>
      </button>
    );
  }

  // Desktop / fallback browser trigger
  return (
    <button
      type="button"
      onClick={() => openAndroidInstallFlow()}
      className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/15 rounded-lg transition-colors border border-white/15 cursor-pointer"
      title="Install UNFCU Digital Banking"
    >
      <Download className="w-3.5 h-3.5 text-blue-200" />
      <span className="text-[11px]">Install App</span>
    </button>
  );
};

