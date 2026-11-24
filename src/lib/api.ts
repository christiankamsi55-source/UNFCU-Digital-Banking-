import {
  User,
  Wallet,
  Transaction,
  FeeSettings,
  PaymentMethodConfig,
  Notification,
  AuditLog,
  Announcement,
} from '../types';
import { auth } from './firebase';

const TOKEN_KEY = 'ungb_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('X-Firebase-Id-Token') && auth.currentUser) {
    try {
      const tokenPromise = (async () => {
        let forceRefresh = false;
        if (auth.currentUser?.emailVerified) {
          const tokenRes = await auth.currentUser.getIdTokenResult(false);
          if (tokenRes.claims?.email_verified !== true) {
            forceRefresh = true;
          }
        }
        return auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : '';
      })();
      const fbToken = await Promise.race([
        tokenPromise,
        new Promise<string>((resolve) => setTimeout(() => resolve(''), 4000)),
      ]);
      if (fbToken) {
        headers.set('X-Firebase-Id-Token', fbToken);
      }
    } catch {
      // ignore token read failure; backend relies on session token or returns explicit error
    }
  }

  const controller = new AbortController();
  const requestTimeout = setTimeout(() => controller.abort(), 25000);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
  } catch (fetchErr: any) {
    if (fetchErr?.name === 'AbortError') {
      throw new Error('Request timed out while contacting the bank server. Please try again.');
    }
    throw fetchErr;
  } finally {
    clearTimeout(requestTimeout);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || data.message || `Request failed with status ${response.status}`);
    if (data.code) {
      (err as any).code = data.code;
    }
    (err as any).data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  // Public
  getPublicSettings: () =>
    request<{ feeSettings: FeeSettings; paymentMethods: PaymentMethodConfig[]; prototypeNotice: string }>(
      '/api/settings/public'
    ),

  getPublicAnnouncements: () =>
    request<{ announcements: Announcement[] }>('/api/announcements'),

  // Auth
  checkRegistrationEmail: (email: string) =>
    request<{
      registered: boolean;
      reason?: string;
      hasFirebaseAuth?: boolean | null;
      hasFirestoreProfile?: boolean;
      emailVerified?: boolean;
      incompleteSignup?: boolean;
      error?: string;
    }>('/api/auth/register/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    country: string;
    countryCode: string;
    dialingCode: string;
    phoneNumber?: string;
    language: string;
    uid?: string;
    firebaseIdToken: string;
  }) => request<{ token: string; user: User; wallet: Wallet; notification?: Notification }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  firebaseSync: (payload: {
    firebaseIdToken: string;
    uid: string;
    email: string;
    fullName?: string;
    country?: string;
    countryCode?: string;
    dialingCode?: string;
    phoneNumber?: string;
    language?: string;
    firestoreProfile?: any;
    firestoreWallet?: any;
  }) =>
    request<{ token: string; user: User; wallet: Wallet; unreadNotifications: number }>(
      '/api/auth/firebase-sync',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  // Verification API
  getVerificationStatus: () =>
    request<{
      email: {
        configured: boolean;
        provider: string;
        from: string;
        instructions: string;
      };
      sms: {
        configured: boolean;
        provider: string;
        fromNumber: string;
        instructions: string;
      };
      firebase?: {
        projectId: string;
        authDomain: string;
        emailAuthEnabled: boolean;
        phoneAuthEnabled: boolean;
      };
    }>('/api/auth/verify/status'),

  sendEmailVerification: (email: string) =>
    request<{ success: boolean; message: string; cooldownSeconds: number }>('/api/auth/verify/send-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  checkEmailVerification: (email: string, code: string) =>
    request<{ success: boolean; message: string }>('/api/auth/verify/check-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  sendPhoneVerification: (dialingCode: string, phoneNumber: string) =>
    request<{ success: boolean; message: string; cooldownSeconds: number }>('/api/auth/verify/send-phone', {
      method: 'POST',
      body: JSON.stringify({ dialingCode, phoneNumber }),
    }),

  checkPhoneVerification: (dialingCode: string, phoneNumber: string, code: string) =>
    request<{ success: boolean; message: string }>('/api/auth/verify/check-phone', {
      method: 'POST',
      body: JSON.stringify({ dialingCode, phoneNumber, code }),
    }),

  confirmFirebasePhone: (dialingCode: string, phoneNumber: string) =>
    request<{ success: boolean; message: string }>('/api/auth/verify/firebase-phone-confirm', {
      method: 'POST',
      body: JSON.stringify({ dialingCode, phoneNumber }),
    }),

  confirmFirebaseEmail: (email: string, firebaseIdToken: string) =>
    request<{ success: boolean; message: string }>('/api/auth/verify/firebase-email-confirm', {
      method: 'POST',
      body: JSON.stringify({ email, firebaseIdToken }),
    }),

  login: (payload: {
    email: string;
    password: string;
    uid?: string;
    firebaseIdToken?: string;
    fullName?: string;
    firestoreProfile?: any;
    firestoreWallet?: any;
  }) =>
    request<{ token: string; user: User; wallet: Wallet }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminLogin: (payload: {
    email: string;
    password: string;
    uid?: string;
    firebaseIdToken?: string;
    fullName?: string;
    firestoreProfile?: any;
    firestoreWallet?: any;
  }) =>
    request<{ token: string; user: User; wallet: Wallet }>('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminRegister: (payload: {
    fullName?: string;
    email: string;
    password: string;
    uid?: string;
    firebaseIdToken: string;
  }) =>
    request<{ message: string; token: string; user: User; wallet: Wallet }>('/api/auth/admin-register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCurrentUser: () =>
    request<{ user: User; wallet: Wallet; unreadNotifications: number }>('/api/auth/me'),

  updateProfile: (payload: Partial<User>) =>
    request<{ user: User; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    }),

  // Wallet & Transfers
  getWalletData: () =>
    request<{ wallet: Wallet; transactions: Transaction[]; feeSettings: FeeSettings }>('/api/wallet'),

  getTransferQuote: (amount: number) =>
    request<{
      amount: number;
      applicableFee: number;
      total: number;
      currency: string;
      paymentMethods: PaymentMethodConfig[];
    }>('/api/wallet/transfer/quote', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  submitTransfer: (payload: {
    recipientName: string;
    recipientBank: string;
    recipientAccount: string;
    routingOrSwift?: string;
    amount: number;
    description?: string;
    paymentMethod?: 'internal' | 'bitcoin' | 'bank_transfer';
    paymentTxHashOrProof?: string;
  }) =>
    request<{
      message: string;
      transaction: Transaction;
      wallet: Wallet;
      notification?: Notification;
    }>('/api/wallet/transfer/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getWithdrawalQuote: (amount: number) =>
    request<{
      amount: number;
      applicableFee: number;
      total: number;
      currency: string;
      fixedFee: number;
      percentFee: number;
      feeEnabled: boolean;
      paymentMethods: PaymentMethodConfig[];
    }>('/api/wallet/withdraw/quote', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  submitWithdrawal: (payload: {
    destinationBank: string;
    accountHolderName: string;
    accountNumber: string;
    routingNumber?: string;
    amount: number;
    paymentMethod?: 'internal' | 'bitcoin' | 'bank_transfer';
    paymentTxHashOrProof?: string;
  }) =>
    request<{
      message: string;
      transaction: Transaction;
      wallet: Wallet;
      notification?: Notification;
    }>('/api/wallet/withdraw/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTransactions: (params?: { search?: string; type?: string; status?: string; limit?: string | number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<{ transactions: Transaction[] }>(`/api/wallet/transactions?${query.toString()}`);
  },

  getTransactionById: (id: string) =>
    request<{ transaction: Transaction }>(`/api/wallet/transactions/${id}`),

  getNotifications: () =>
    request<{ notifications: Notification[] }>('/api/notifications'),

  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' }),

  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/api/notifications/read-all', { method: 'PUT' }),

  // Administrator Operations
  getAdminSystemStatus: () =>
    request<{
      firebaseAdmin: { configured: boolean; projectId: string; source?: string | null };
      authorizedAdminEmail: string;
      firestoreConfigured: boolean;
    }>('/api/admin/system-status'),

  getAdminUsers: (search?: string) => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    return request<{ users: (User & { wallet?: Wallet })[]; totalCount: number }>(
      `/api/admin/users?${query.toString()}`
    );
  },

  deleteAdminUser: (userId: string) =>
    request<{
      message: string;
      deletedUserId: string;
      deletionStatus: 'completed' | 'partial' | 'failed';
      code?: string;
      reconciliationId?: string;
      pendingCleanup?: {
        id: string;
        userId: string;
        email: string;
        errors: string[];
        createdAt: string;
        lastAttemptAt: string;
        status: 'pending' | 'resolved';
      };
      steps?: {
        firebaseAuth?: { status: string; credentialMissing?: boolean; error?: string; userExisted?: boolean; deletedUid?: string };
        firestore?: { status: string; deletedPaths?: string[]; errors?: string[] };
        localLedger?: { status: string };
      };
    }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }),

  getAdminPendingCleanups: () =>
    request<{
      pendingCleanups: Array<{
        id: string;
        userId: string;
        email: string;
        deletedAuthUid?: string;
        deletedPaths: string[];
        errors: string[];
        status: 'pending' | 'resolved';
        createdAt: string;
        lastAttemptAt: string;
      }>;
    }>('/api/admin/pending-cleanups'),

  retryAdminPendingCleanup: (cleanupId: string) =>
    request<{
      success: boolean;
      status: 'resolved' | 'pending';
      message: string;
      deletedPaths?: string[];
      errors?: string[];
      pendingCleanup?: any;
    }>(`/api/admin/pending-cleanups/${encodeURIComponent(cleanupId)}/retry`, {
      method: 'POST',
    }),

  getAdminUserDetails: (userId: string) =>
    request<{
      user: User;
      wallet: Wallet;
      transactions: Transaction[];
      auditLogs: AuditLog[];
      notifications: Notification[];
    }>(`/api/admin/users/${userId}/details`),

  adjustUserBalance: (
    userId: string,
    payload: {
      adjustmentType: 'credit' | 'debit';
      amount: number;
      reason: string;
      notes?: string;
      idempotencyKey?: string;
    }
  ) =>
    request<{
      message: string;
      wallet: Wallet;
      transaction: Transaction;
      notification: Notification;
      atomicFirestore?: boolean;
      idempotentReplay?: boolean;
    }>(
      `/api/admin/users/${userId}/balance-adjustment`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getAdminPaymentReview: (params?: { search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    return request<{ payments: Transaction[] }>(`/api/admin/payments/review?${query.toString()}`);
  },

  reviewPayment: (
    id: string,
    payload: { action: 'confirm' | 'reject' | 'cancel'; adminNote?: string }
  ) =>
    request<{ message: string; transaction: Transaction }>(`/api/admin/payments/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAdminFees: () => request<{ feeSettings: FeeSettings }>('/api/admin/fees'),

  updateAdminFees: (payload: {
    transferFixedFee?: number;
    transferPercentFee?: number;
    transferFeeEnabled?: boolean;
    withdrawalFixedFee?: number;
    withdrawalPercentFee?: number;
    withdrawalFeeEnabled?: boolean;
    minTransferAmount?: number;
    maxTransferAmount?: number;
    transferFee?: number;
    withdrawalFee?: number;
    reason?: string;
  }) =>
    request<{ message: string; feeSettings: FeeSettings }>('/api/admin/fees', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getAdminPaymentMethods: () =>
    request<{ paymentMethods: PaymentMethodConfig[] }>('/api/admin/payment-methods'),

  updateAdminPaymentMethods: (methods: PaymentMethodConfig[]) =>
    request<{ message: string; paymentMethods: PaymentMethodConfig[] }>('/api/admin/payment-methods', {
      method: 'PUT',
      body: JSON.stringify({ methods }),
    }),

  resetDemoTransactions: () =>
    request<{ message: string; transactions: Transaction[] }>('/api/admin/transactions/reset-demo', {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'RESET_DEMONSTRATION_DATA' }),
    }),

  getAdminTransactions: (params?: { search?: string; type?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);
    return request<{ transactions: Transaction[] }>(`/api/admin/transactions?${query.toString()}`);
  },

  getAdminAuditLogs: (search?: string) => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    return request<{ auditLogs: AuditLog[] }>(`/api/admin/audit-logs?${query.toString()}`);
  },

  // Announcements Management
  getAdminAnnouncements: () =>
    request<{ announcements: Announcement[] }>('/api/admin/announcements'),

  createAdminAnnouncement: (payload: {
    titleTranslations: Record<string, string>;
    bodyTranslations: Record<string, string>;
    defaultLanguage: string;
    priority: 'info' | 'important' | 'urgent';
    active: boolean;
  }) =>
    request<{ message: string; announcement: Announcement }>('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdminAnnouncement: (
    id: string,
    payload: {
      titleTranslations?: Record<string, string>;
      bodyTranslations?: Record<string, string>;
      defaultLanguage?: string;
      priority?: 'info' | 'important' | 'urgent';
      active?: boolean;
    }
  ) =>
    request<{ message: string; announcement: Announcement }>(`/api/admin/announcements/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteAdminAnnouncement: (id: string) =>
    request<{ message: string; deletedId: string }>(`/api/admin/announcements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Payment Submissions API
  submitPaymentReceipt: (payload: {
    paymentMethod: 'bank_transfer' | 'bitcoin';
    amount: number;
    fee?: number;
    total?: number;
    reference: string;
    transactionType?: string;
    receiptImages: string[];
    userMessage: string;
    recipientName?: string;
    recipientBank?: string;
    recipientAccount?: string;
    routingOrSwift?: string;
    description?: string;
  }) =>
    request<{ message: string; submission: any; transaction: Transaction; notification?: Notification }>('/api/payments/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyPaymentSubmissions: () =>
    request<{ submissions: any[] }>('/api/payments/my-submissions'),

  getAdminPaymentSubmissions: (params?: { search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    return request<{ submissions: any[] }>(`/api/admin/payment-submissions?${query.toString()}`);
  },

  reviewPaymentSubmission: (id: string, payload: { status: 'pending' | 'verified' | 'rejected'; adminNote?: string }) =>
    request<{
      message: string;
      submission: any;
      transaction: Transaction;
      wallet?: Wallet;
      notification?: Notification;
      atomicFirestore?: boolean;
      alreadyProcessed?: boolean;
    }>(`/api/admin/payment-submissions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
