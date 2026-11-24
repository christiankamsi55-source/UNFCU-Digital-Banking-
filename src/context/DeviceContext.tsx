import React, { createContext, useContext, useState, useEffect } from 'react';

export type DeviceMode = 'desktop' | 'mobile_iphone' | 'mobile_android' | 'tablet';
export type AppNavPage =
  | 'public_home'
  | 'credit_cards'
  | 'financial_readiness'
  | 'landing'
  | 'login'
  | 'register'
  | 'reset_password'
  | 'verify_email'
  | 'dashboard'
  | 'account_details'
  | 'transfers'
  | 'more'
  | 'support'
  | 'transfer'
  | 'withdrawal'
  | 'history'
  | 'notifications'
  | 'profile'
  | 'admin_login'
  | 'admin_dashboard';

interface DeviceContextType {
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  activePage: AppNavPage;
  setActivePage: (page: AppNavPage) => void;
  pageHistory: AppNavPage[];
  goBack: (fallback?: AppNavPage) => void;
  canGoBack: boolean;
  selectedTransactionId: string | null;
  setSelectedTransactionId: (id: string | null) => void;
  isDeploymentGuideOpen: boolean;
  setIsDeploymentGuideOpen: (open: boolean) => void;
  isReceiveModalOpen: boolean;
  setIsReceiveModalOpen: (open: boolean) => void;
  isPaymentStatusModalOpen: boolean;
  setIsPaymentStatusModalOpen: (open: boolean) => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');

  const resolvePageFromUrl = (): AppNavPage | null => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');

    if (mode === 'verifyEmail' && params.get('oobCode')) {
      return 'verify_email';
    }
    if (
      path === '/reset-password' ||
      (mode === 'resetPassword' && params.get('oobCode'))
    ) {
      return 'reset_password';
    }
    if (
      hash === '#admin-portal' ||
      hash === '#admin' ||
      path === '/admin-portal' ||
      path === '/admin' ||
      params.get('portal') === 'admin'
    ) {
      return 'admin_login';
    }
    if (
      hash === '#digital-banking' ||
      hash === '#welcome' ||
      path === '/welcome' ||
      path === '/digital-banking'
    ) {
      return 'landing';
    }
    if (hash === '#credit-cards' || path === '/credit-cards') {
      return 'credit_cards';
    }
    if (hash === '#financial-readiness' || path === '/financial-readiness') {
      return 'financial_readiness';
    }
    return null;
  };

  // Detect initial route from URL (admin portal, digital banking welcome, password reset link, or email verification link)
  const getInitialPage = (): AppNavPage => {
    return resolvePageFromUrl() || 'public_home';
  };

  const [activePage, setActivePageState] = useState<AppNavPage>(getInitialPage);
  const [pageHistory, setPageHistory] = useState<AppNavPage[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [isDeploymentGuideOpen, setIsDeploymentGuideOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isPaymentStatusModalOpen, setIsPaymentStatusModalOpen] = useState(false);

  const setActivePage = (page: AppNavPage) => {
    if (page !== activePage) {
      setPageHistory((prev) => [...prev, activePage]);
    }
    setActivePageState(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (page === 'admin_login' || page === 'admin_dashboard') {
        if (window.location.hash !== '#admin-portal') {
          window.history.replaceState(null, '', '#admin-portal');
        }
      } else if (page === 'landing') {
        if (window.location.hash !== '#digital-banking') {
          window.history.replaceState(null, '', '#digital-banking');
        }
      } else if (page === 'credit_cards') {
        if (window.location.pathname !== '/credit-cards' || window.location.hash) {
          window.history.replaceState(null, '', '/credit-cards');
        }
      } else if (page === 'financial_readiness') {
        if (window.location.pathname !== '/financial-readiness' || window.location.hash) {
          window.history.replaceState(null, '', '/financial-readiness');
        }
      } else if (page === 'public_home') {
        if (
          window.location.hash ||
          window.location.pathname !== '/' ||
          window.location.search.includes('oobCode=') ||
          window.location.search.includes('portal=')
        ) {
          window.history.replaceState(null, '', '/');
        }
      } else if (
        window.location.hash === '#admin-portal' ||
        window.location.hash === '#admin' ||
        window.location.hash === '#digital-banking' ||
        window.location.hash === '#welcome' ||
        window.location.hash === '#credit-cards' ||
        window.location.hash === '#financial-readiness' ||
        window.location.pathname.toLowerCase() === '/credit-cards' ||
        window.location.pathname.toLowerCase() === '/financial-readiness' ||
        (page !== 'reset_password' && window.location.pathname.toLowerCase() === '/reset-password') ||
        (page !== 'reset_password' && page !== 'verify_email' && window.location.search.includes('oobCode='))
      ) {
        window.history.replaceState(null, '', '/');
      }
    }
  };

  const goBack = (fallback?: AppNavPage) => {
    if (pageHistory.length > 0) {
      const prevPage = pageHistory[pageHistory.length - 1];
      setPageHistory((prev) => prev.slice(0, -1));
      setActivePageState(prevPage);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (prevPage === 'admin_login' || prevPage === 'admin_dashboard') {
          window.history.replaceState(null, '', '#admin-portal');
        } else if (prevPage === 'landing') {
          window.history.replaceState(null, '', '#digital-banking');
        } else if (prevPage === 'credit_cards') {
          window.history.replaceState(null, '', '/credit-cards');
        } else if (prevPage === 'financial_readiness') {
          window.history.replaceState(null, '', '/financial-readiness');
        } else {
          window.history.replaceState(null, '', '/');
        }
      }
    } else {
      const target = fallback || 'public_home';
      setActivePageState(target);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (target === 'landing') {
          window.history.replaceState(null, '', '#digital-banking');
        } else if (target === 'credit_cards') {
          window.history.replaceState(null, '', '/credit-cards');
        } else if (target === 'financial_readiness') {
          window.history.replaceState(null, '', '/financial-readiness');
        } else if (window.location.pathname.toLowerCase() === '/reset-password' || window.location.search.includes('oobCode=')) {
          window.history.replaceState(null, '', '/');
        } else {
          window.history.replaceState(null, '', '/');
        }
      }
    }
  };

  useEffect(() => {
    const handleUrlChange = () => {
      const resolved = resolvePageFromUrl();
      if (resolved === 'reset_password' || resolved === 'verify_email') {
        setActivePageState(resolved);
      } else if (resolved === 'admin_login') {
        setActivePageState((prev) => (prev === 'admin_dashboard' ? 'admin_dashboard' : 'admin_login'));
      } else if (resolved === 'landing') {
        setActivePageState('landing');
      } else if (resolved === 'credit_cards') {
        setActivePageState('credit_cards');
      } else if (resolved === 'financial_readiness') {
        setActivePageState('financial_readiness');
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  return (
    <DeviceContext.Provider
      value={{
        deviceMode,
        setDeviceMode,
        activePage,
        setActivePage,
        pageHistory,
        goBack,
        canGoBack: pageHistory.length > 0,
        selectedTransactionId,
        setSelectedTransactionId,
        isDeploymentGuideOpen,
        setIsDeploymentGuideOpen,
        isReceiveModalOpen,
        setIsReceiveModalOpen,
        isPaymentStatusModalOpen,
        setIsPaymentStatusModalOpen,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used within DeviceProvider');
  return ctx;
}

