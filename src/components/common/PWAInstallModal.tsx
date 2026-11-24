import React, { useState } from 'react';
import { usePWAInstallContext } from '../../context/PWAInstallContext';
import { UnfcuEmblem } from './UnfcuLogo';
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Info,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from 'lucide-react';

export const PWAInstallModal: React.FC = () => {
  const {
    modalMode,
    closeInstallModal,
    setModalMode,
    isIOS,
    isIOSSafari,
    isAndroid,
    isDesktop,
    isInstallable,
    install,
  } = usePWAInstallContext();

  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!modalMode) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyUrl = async () => {
    if (!currentUrl || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Clipboard permission unavailable
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Install UNFCU Mobile Web App"
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-[#173A52] text-white px-5 py-4 flex items-center justify-between border-b border-white/15">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <UnfcuEmblem variant="white" size={26} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {modalMode === 'ios_guide' && 'Install on iPhone & iPad (Safari)'}
                {modalMode === 'android_guide' && 'Install on Android (Chrome)'}
                {modalMode === 'already_installed' && 'App Already Installed'}
                {modalMode === 'prompt_accepted' && 'App Installation Started'}
                {modalMode === 'prompt_dismissed' && 'Installation Cancelled'}
              </h3>
              <p className="text-[11px] text-blue-200/85 truncate">
                UNFCU Mobile Web App · Standalone Experience
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeInstallModal}
            aria-label="Close"
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs leading-relaxed text-slate-600 max-h-[75vh] overflow-y-auto">
          {modalMode === 'already_installed' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950 text-xs">
                    UNFCU is already installed on this device.
                  </p>
                  <p className="text-emerald-800 text-[11px]">
                    You can launch UNFCU directly from your phone&apos;s Home Screen or App Drawer
                    in standalone app mode without extra browser navigation bars.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeInstallModal}
                className="w-full py-2.5 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold cursor-pointer transition-colors"
              >
                Continue Using App
              </button>
            </div>
          )}

          {modalMode === 'prompt_accepted' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950 text-xs">
                    Installation confirmed in your browser.
                  </p>
                  <p className="text-emerald-800 text-[11px]">
                    Your device is adding the UNFCU icon to your Home Screen / app launcher. Once
                    completed, open the app from your Home Screen for standalone access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeInstallModal}
                className="w-full py-2.5 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {modalMode === 'prompt_dismissed' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-[#2166D5] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 text-xs">
                    Installation prompt was cancelled.
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    The app was not installed. You can tap <strong>Android Chrome Install</strong>{' '}
                    again anytime or use Chrome&apos;s <strong>⋮ menu &gt; Install app</strong>.
                  </p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalMode('android_guide')}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-[#173A52] hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  View Manual Steps
                </button>
                <button
                  type="button"
                  onClick={closeInstallModal}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {modalMode === 'ios_guide' && (
            <div className="space-y-3.5">
              {isIOS && !isIOSSafari && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium">
                      You are viewing this page in an iOS browser other than <strong>Safari</strong>.
                      Apple only allows adding web apps to your Home Screen from{' '}
                      <strong>Safari</strong>. Copy this link and open it in Safari first:
                    </p>
                  </div>
                  {currentUrl && (
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="w-full py-2 px-3 rounded-xl bg-white border border-amber-300 text-amber-900 font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:bg-amber-100/50 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedUrl ? 'Link Copied — Open in Safari' : 'Copy Website Link'}</span>
                    </button>
                  )}
                </div>
              )}

              {!isIOS && (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-[#173A52] space-y-2">
                  <p className="text-[11px]">
                    <strong>iPhone / iPad Safari Flow:</strong>{' '}
                    {isAndroid
                      ? 'You appear to be on an Android device. For Android automatic Chrome installation, switch to Android Chrome Install, or follow these Safari steps on an iPhone/iPad.'
                      : 'Apple Safari on iPhone or iPad installs Home Screen apps through the Safari Share menu below.'}
                  </p>
                  {isAndroid && (
                    <button
                      type="button"
                      onClick={() => setModalMode('android_guide')}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2166D5] hover:underline cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Switch to Android Chrome Install</span>
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-7 h-7 rounded-xl bg-[#EBF2FC] text-[#2166D5] flex items-center justify-center shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#173A52] text-xs flex items-center gap-1.5">
                      <span>Tap the Share button in Safari</span>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white border border-slate-300 text-[#2166D5]">
                        <Share className="w-3 h-3" />
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Look for the square icon with an upward arrow at the bottom toolbar on iPhone
                      (or top bar on iPad).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-7 h-7 rounded-xl bg-[#EBF2FC] text-[#2166D5] flex items-center justify-center shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#173A52] text-xs">
                      Scroll through the options
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Swipe up on the Share menu list until you see the Home Screen action.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-7 h-7 rounded-xl bg-[#EBF2FC] text-[#2166D5] flex items-center justify-center shrink-0 font-bold text-xs">
                    3
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#173A52] text-xs flex items-center gap-1.5">
                      <span>Select &quot;Add to Home Screen&quot;</span>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white border border-slate-300 text-[#173A52]">
                        <PlusSquare className="w-3 h-3" />
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Tap the <strong>Add to Home Screen</strong> option with the square plus icon.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    4
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-emerald-950 text-xs">
                      Confirm by tapping &quot;Add&quot;
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Tap <strong>Add</strong> in the top-right corner. You can now open the UNFCU
                      app directly from your iPhone or iPad Home Screen.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeInstallModal}
                className="w-full py-2.5 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold cursor-pointer transition-colors"
              >
                Got It
              </button>
            </div>
          )}

          {modalMode === 'android_guide' && (
            <div className="space-y-3.5">
              {isInstallable && (
                <div className="p-4 rounded-2xl bg-[#EBF2FC] border border-[#2166D5]/25 space-y-2.5">
                  <p className="text-xs font-bold text-[#173A52]">
                    Instant Browser Installation Available
                  </p>
                  <p className="text-[11px] text-slate-700">
                    Your browser supports one-tap app installation. Tap below to open the native
                    installation dialog.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      const outcome = await install();
                      if (outcome === 'accepted') setModalMode('prompt_accepted');
                      else if (outcome === 'dismissed') setModalMode('prompt_dismissed');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#2166D5] hover:bg-[#1A54B5] text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App Now</span>
                  </button>
                </div>
              )}

              {isIOS && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                  <p className="text-[11px]">
                    <strong>iPhone / iPad Detected:</strong> Android Chrome&apos;s native installer
                    does not run on iOS. Use <strong>Safari Share &gt; Add to Home Screen</strong>{' '}
                    instead.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalMode('ios_guide')}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2166D5] hover:underline cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Open iOS Safari Install Guide</span>
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-7 h-7 rounded-xl bg-[#EBF2FC] text-[#2166D5] flex items-center justify-center shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#173A52] text-xs flex items-center gap-1.5">
                      <span>Open Chrome&apos;s browser menu</span>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white border border-slate-300 text-[#173A52]">
                        <MoreVertical className="w-3 h-3" />
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {isDesktop
                        ? 'In Chrome or Edge on desktop, look for the Install icon inside the right side of the address bar or click the three-dot menu (⋮).'
                        : 'Tap the three-dot menu (⋮) in the top-right corner of Google Chrome on your Android phone or tablet.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-7 h-7 rounded-xl bg-[#EBF2FC] text-[#2166D5] flex items-center justify-center shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#173A52] text-xs">
                      Select &quot;Install app&quot; or &quot;Add to Home screen&quot;
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {isDesktop
                        ? 'Choose Save and Share > Install UNFCU Digital Banking (or Install App in Edge).'
                        : 'Tap Install app (recommended for full standalone app mode) or Add to Home screen.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    3
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-emerald-950 text-xs">
                      Confirm &quot;Install&quot;
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Confirm the prompt. The approved UNFCU app icon will be added to your Home
                      Screen and App Drawer.
                    </p>
                  </div>
                </div>
              </div>

              {currentUrl && (
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-[#173A52] font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#2166D5]" />
                  <span>{copiedUrl ? 'Website URL Copied' : 'Copy Website URL for Chrome'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={closeInstallModal}
                className="w-full py-2.5 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
