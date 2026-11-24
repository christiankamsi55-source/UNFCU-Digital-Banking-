import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DeviceProvider, useDevice } from './context/DeviceContext';
import { PWAInstallProvider } from './context/PWAInstallContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { DeviceFrame } from './components/common/DeviceFrame';
import { TransactionDetailsModal } from './components/common/TransactionDetailsModal';
import { DeploymentGuideModal } from './components/common/DeploymentGuideModal';
import { PWAInstallModal } from './components/common/PWAInstallModal';
import { ReceiveMoneyModal } from './components/common/ReceiveMoneyModal';
import { UserPaymentStatusModal } from './components/pages/UserPaymentStatusModal';
import { UnfcuEmblem } from './components/common/UnfcuLogo';

import { PublicHomePage } from './components/pages/PublicHomePage';
import { CreditCardsPage } from './components/pages/CreditCardsPage';
import { FinancialReadinessPage } from './components/pages/FinancialReadinessPage';
import { LandingPage } from './components/pages/LandingPage';
import { LoginPage } from './components/pages/LoginPage';
import { RegisterPage } from './components/pages/RegisterPage';
import { ResetPasswordPage } from './components/pages/ResetPasswordPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { AccountDetailsPage } from './components/pages/AccountDetailsPage';
import { TransfersHubPage } from './components/pages/TransfersHubPage';
import { MoreMenuPage } from './components/pages/MoreMenuPage';
import { HelpSupportPage } from './components/pages/HelpSupportPage';
import { TransferPage } from './components/pages/TransferPage';
import { WithdrawalPage } from './components/pages/WithdrawalPage';
import { TransactionsPage } from './components/pages/TransactionsPage';
import { NotificationsPage } from './components/pages/NotificationsPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { AdminLoginPage } from './components/pages/AdminLoginPage';
import { AdminDashboardPage } from './components/pages/AdminDashboardPage';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { testFirestoreConnection, auth, applyActionCode } from './lib/firebase';

const VerifyEmailActionView: React.FC = () => {
  const { setActivePage } = useDevice();
  const { t } = useAuth();
  const [state, setState] = React.useState<'verifying' | 'verified' | 'error'>('verifying');
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oobCode = params.get('oobCode');
    if (!oobCode) {
      setState('error');
      return;
    }
    applyActionCode(auth, oobCode)
      .then(() => {
        setState('verified');
        setMessage(null);
      })
      .catch(() => {
        setState('error');
      });
  }, []);

  const displayMsg =
    message ||
    (state === 'verifying'
      ? t.auth.verifying
      : state === 'verified'
      ? t.auth.verifyEmailSubtitle
      : t.errors.resetLinkInvalid);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#E5EBF2]">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-7 text-center space-y-4 text-xs text-slate-600 banking-card-shadow-lg">
        <div className="flex justify-center">
          <UnfcuEmblem variant="navy" size={48} />
        </div>
        <h2 className="text-lg font-bold text-[#173A52]">{t.auth.verifyEmailTitle}</h2>
        <p
          className={
            state === 'error'
              ? 'text-rose-600 font-medium'
              : state === 'verified'
              ? 'text-emerald-700 font-medium'
              : 'text-slate-600'
          }
        >
          {displayMsg}
        </p>
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setActivePage('login')}
            className="flex-1 py-2.5 px-4 rounded-xl unfcu-blue-gradient unfcu-blue-gradient-hover text-white font-bold shadow-sm cursor-pointer"
          >
            {t.nav.signIn}
          </button>
          <button
            type="button"
            onClick={() => setActivePage('register')}
            className="flex-1 py-2.5 px-4 rounded-xl bg-white border border-slate-300 text-[#173A52] hover:bg-slate-50 font-semibold cursor-pointer"
          >
            {t.nav.register}
          </button>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  const {
    activePage,
    deviceMode,
    selectedTransactionId,
    setSelectedTransactionId,
    isDeploymentGuideOpen,
    setIsDeploymentGuideOpen,
    isReceiveModalOpen,
    setIsReceiveModalOpen,
    isPaymentStatusModalOpen,
    setIsPaymentStatusModalOpen,
  } = useDevice();

  React.useEffect(() => {
    testFirestoreConnection();
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const preferredPublicUrl = (
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_PUBLIC_SITE_URL ||
      'https://unfcudigital.org'
    )
      .trim()
      .replace(/\/+$/, '');

    const seoByPage: Record<
      string,
      { title: string; description: string; path: string; robots: string }
    > = {
      public_home: {
        title: 'UNFCU Digital Banking | United Nations Federal Credit Union',
        description:
          'Explore UNFCU savings certificates, checking, credit cards, financial readiness guides, and member digital banking tools.',
        path: '/',
        robots: 'index, follow',
      },
      credit_cards: {
        title: 'UNFCU Credit Cards | Elite & Azure Visa Rewards Cards',
        description:
          'Compare UNFCU Elite and Azure credit cards featuring low introductory APR, global rewards points, and zero foreign transaction fees.',
        path: '/credit-cards',
        robots: 'index, follow',
      },
      financial_readiness: {
        title: 'Financial Readiness | UNFCU Digital Banking',
        description:
          'Build a path toward financial readiness with UNFCU savings strategies, everyday money management, planning, and fraud protection.',
        path: '/financial-readiness',
        robots: 'index, follow',
      },
    };

    const meta = seoByPage[activePage] || {
      title: 'UNFCU Digital Banking Portal',
      description: 'UNFCU Digital Banking member portal.',
      path: '/',
      robots: 'noindex, nofollow',
    };

    document.title = meta.title;

    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('meta[name="robots"]', 'content', meta.robots);
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:url"]', 'content', `${preferredPublicUrl}${meta.path}`);
    setMeta('meta[property="og:image"]', 'content', `${preferredPublicUrl}/unfcu-logo.png`);
    setMeta('meta[name="twitter:title"]', 'content', meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);
    setMeta('meta[name="twitter:image"]', 'content', `${preferredPublicUrl}/unfcu-logo.png`);
    setMeta('link[rel="canonical"]', 'href', `${preferredPublicUrl}${meta.path}`);
  }, [activePage]);

  const isPublicHome = activePage === 'public_home';
  const isCreditCards = activePage === 'credit_cards';
  const isFinancialReadiness = activePage === 'financial_readiness';
  const usesPublicChrome = isPublicHome || isCreditCards || isFinancialReadiness;
  const isAdminRoute = activePage === 'admin_dashboard' || activePage === 'admin_login';
  const isMobileFrame = deviceMode === 'mobile_iphone' || deviceMode === 'mobile_android';

  const renderActivePage = () => {
    switch (activePage) {
      case 'public_home':
        return <PublicHomePage />;
      case 'credit_cards':
        return <CreditCardsPage />;
      case 'financial_readiness':
        return <FinancialReadinessPage />;
      case 'landing':
        return <LandingPage />;
      case 'login':
        return <LoginPage />;
      case 'register':
        return <RegisterPage />;
      case 'reset_password':
        return <ResetPasswordPage />;
      case 'verify_email':
        return <VerifyEmailActionView />;
      case 'support':
        return <HelpSupportPage />;
      case 'dashboard':
        return isAuthenticated ? <DashboardPage /> : <LoginPage />;
      case 'account_details':
        return isAuthenticated ? <AccountDetailsPage /> : <LoginPage />;
      case 'transfers':
        return isAuthenticated ? <TransfersHubPage /> : <LoginPage />;
      case 'more':
        return isAuthenticated ? <MoreMenuPage /> : <LoginPage />;
      case 'transfer':
        return isAuthenticated ? <TransferPage /> : <LoginPage />;
      case 'withdrawal':
        return isAuthenticated ? <WithdrawalPage /> : <LoginPage />;
      case 'history':
        return isAuthenticated ? <TransactionsPage /> : <LoginPage />;
      case 'notifications':
        return isAuthenticated ? <NotificationsPage /> : <LoginPage />;
      case 'profile':
        return isAuthenticated ? <ProfilePage /> : <LoginPage />;
      case 'admin_login':
        return <AdminLoginPage />;
      case 'admin_dashboard':
        return isAdmin ? <AdminDashboardPage /> : <AdminLoginPage />;
      default:
        return <PublicHomePage />;
    }
  };

  return (
    <DeviceFrame>
      {!usesPublicChrome && <Header />}
      <main
        className={`flex-1 w-full max-w-full min-w-0 flex flex-col overflow-x-clip ${
          isAdminRoute
            ? 'bg-slate-50 text-slate-900'
            : usesPublicChrome
            ? 'bg-white text-[#173A52]'
            : 'bg-[#E5EBF2] text-[#0F172A]'
        } ${
          isAuthenticated && !isAdminRoute && !usesPublicChrome && !isMobileFrame && deviceMode === 'desktop'
            ? 'pb-20 lg:pb-0'
            : ''
        }`}
      >
        {renderActivePage()}
      </main>
      {!usesPublicChrome && <Footer />}
      <MobileBottomNav />
      <OfflineIndicator />

      {/* Global Modals */}
      <TransactionDetailsModal
        transactionId={selectedTransactionId}
        onClose={() => setSelectedTransactionId(null)}
      />

      <ReceiveMoneyModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
      />

      <UserPaymentStatusModal
        isOpen={isPaymentStatusModalOpen}
        onClose={() => setIsPaymentStatusModalOpen(false)}
      />

      <DeploymentGuideModal
        isOpen={isDeploymentGuideOpen}
        onClose={() => setIsDeploymentGuideOpen(false)}
      />

      <PWAInstallModal />
    </DeviceFrame>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DeviceProvider>
        <PWAInstallProvider>
          <AppContent />
        </PWAInstallProvider>
      </DeviceProvider>
    </AuthProvider>
  );
}

