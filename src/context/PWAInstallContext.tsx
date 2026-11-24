import React, { createContext, useContext, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallModalMode =
  | null
  | 'ios_guide'
  | 'android_guide'
  | 'already_installed'
  | 'prompt_accepted'
  | 'prompt_dismissed';

interface PWAInstallContextValue {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isIOSSafari: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isPrompting: boolean;
  modalMode: InstallModalMode;
  closeInstallModal: () => void;
  setModalMode: (mode: InstallModalMode) => void;
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  openIOSInstallFlow: () => void;
  openAndroidInstallFlow: () => Promise<void>;
}

const PWAInstallContext = createContext<PWAInstallContextValue | undefined>(undefined);

function detectDeviceEnvironment() {
  if (typeof window === 'undefined') {
    return {
      isStandalone: false,
      isIOS: false,
      isIOSSafari: false,
      isAndroid: false,
      isDesktop: true,
    };
  }

  const ua = window.navigator.userAgent || '';
  const uaLower = ua.toLowerCase();
  const isIPadOS =
    window.navigator.platform === 'MacIntel' && (window.navigator.maxTouchPoints || 0) > 1;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || isIPadOS;
  const isNonSafariIOSBrowser =
    /crios|fxios|edgios|opios|duckduckgo|gsa\/|fbav|fban|instagram|line\//i.test(uaLower);
  const isIOSSafari = isIOS && /safari/i.test(uaLower) && !isNonSafariIOSBrowser;
  const isAndroid = /android/i.test(uaLower);
  const isDesktop = !isIOS && !isAndroid;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  return {
    isStandalone,
    isIOS,
    isIOSSafari,
    isAndroid,
    isDesktop,
  };
}

export const PWAInstallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectDeviceEnvironment().isStandalone);
  const [env] = useState(() => detectDeviceEnvironment());
  const [modalMode, setModalMode] = useState<InstallModalMode>(null);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    const syncInstalledState = () => {
      const { isStandalone } = detectDeviceEnvironment();
      if (isStandalone) {
        setIsInstalled(true);
      }
    };

    syncInstalledState();

    // Check Web App Related Apps API when available (Chrome on Android)
    const navAny = window.navigator as unknown as {
      getInstalledRelatedApps?: () => Promise<Array<{ platform?: string; url?: string }>>;
    };
    if (typeof navAny.getInstalledRelatedApps === 'function') {
      navAny
        .getInstalledRelatedApps()
        .then((apps) => {
          if (Array.isArray(apps) && apps.length > 0) {
            setIsInstalled(true);
          }
        })
        .catch(() => {
          // Ignore unsupported environments
        });
    }

    const displayMedia = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setModalMode('prompt_accepted');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    displayMedia.addEventListener('change', handleDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      displayMedia.removeEventListener('change', handleDisplayChange);
    };
  }, []);

  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    try {
      setIsPrompting(true);
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return 'accepted';
      }
      setDeferredPrompt(null);
      return 'dismissed';
    } catch {
      return 'unavailable';
    } finally {
      setIsPrompting(false);
    }
  };

  const openIOSInstallFlow = () => {
    if (isInstalled) {
      setModalMode('already_installed');
      return;
    }
    setModalMode('ios_guide');
  };

  const openAndroidInstallFlow = async () => {
    if (isInstalled) {
      setModalMode('already_installed');
      return;
    }
    if (deferredPrompt) {
      const outcome = await install();
      if (outcome === 'accepted') {
        setModalMode('prompt_accepted');
      } else if (outcome === 'dismissed') {
        setModalMode('prompt_dismissed');
      } else {
        setModalMode('android_guide');
      }
      return;
    }
    setModalMode('android_guide');
  };

  return (
    <PWAInstallContext.Provider
      value={{
        isInstallable: !!deferredPrompt,
        isInstalled,
        isIOS: env.isIOS,
        isIOSSafari: env.isIOSSafari,
        isAndroid: env.isAndroid,
        isDesktop: env.isDesktop,
        isPrompting,
        modalMode,
        closeInstallModal: () => setModalMode(null),
        setModalMode,
        install,
        openIOSInstallFlow,
        openAndroidInstallFlow,
      }}
    >
      {children}
    </PWAInstallContext.Provider>
  );
};

export function usePWAInstallContext() {
  const ctx = useContext(PWAInstallContext);
  if (!ctx) {
    throw new Error('usePWAInstallContext must be used within PWAInstallProvider');
  }
  return ctx;
}
