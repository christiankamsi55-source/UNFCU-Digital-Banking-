import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import {
  User,
  Wallet,
  Transaction,
  AuditLog,
  Notification,
  FeeSettings,
  PaymentMethodConfig,
  PaymentSubmission,
  Announcement,
  SupportedLanguage,
} from '../../types';
import { api } from '../../lib/api';
import {
  saveFeeSettingsToFirestore,
  saveNotificationToFirestore,
  savePaymentMethodsToFirestore,
  getAllPaymentSubmissionsFromFirestore,
  updatePaymentSubmissionStatusInFirestore,
  getAllUsersFromFirestore,
  getAllWalletsFromFirestore,
  getUserProfileFromFirestore,
  getWalletFromFirestore,
  getUserTransactionsFromFirestore,
  getAllTransactionsFromFirestore,
  getUserNotificationsFromFirestore,
  saveWalletToFirestore,
  saveTransactionToFirestore,
  deleteUserRecordsFromFirestore,
  getFeeSettingsFromFirestore,
  getPaymentMethodsFromFirestore,
  saveAnnouncementToFirestore,
  deleteAnnouncementFromFirestore,
  getAllAnnouncementsFromFirestore,
  saveAuditLogToFirestore,
  getAuditLogsFromFirestore,
} from '../../lib/firebaseStore';
import { SUPPORTED_LANGUAGES, getLanguageOption } from '../../lib/i18n';
import { localizeNotification, resolveAnnouncementContent } from '../../lib/i18n/notifications';
import {
  formatCurrencyAmount,
  formatTransactionDateTime,
  formatRegionalDate,
} from '../../lib/formatters';
import { LanguageSelectModal } from '../common/LanguageSelectModal';
import { verifyFirebaseStorageBucket } from '../../lib/storageService';
import { BackButton } from '../common/BackButton';
import { UnfcuEmblem } from '../common/UnfcuLogo';
import { BankTransferPaymentModal } from './BankTransferPaymentModal';
import { BitcoinPaymentModal } from './BitcoinPaymentModal';
import {
  Users,
  Search,
  Sliders,
  DollarSign,
  Clock,
  ShieldCheck,
  Building2,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Bell,
  Check,
  PlusCircle,
  MinusCircle,
  Save,
  FileText,
  UserCheck,
  Mail,
  Calendar,
  Bitcoin,
  CreditCard,
  X,
  XCircle,
  Trash2,
  Megaphone,
  Languages,
  ClipboardList,
  Plus,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { user, t, language, setLanguage, countryCode } = useAuth();
  const { setSelectedTransactionId } = useDevice();

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<
    | 'users'
    | 'fees'
    | 'payment_config'
    | 'payment_submissions'
    | 'transactions'
    | 'announcements'
    | 'audit_logs'
  >('users');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  // Users Directory state
  const [usersList, setUsersList] = useState<(User & { wallet?: Wallet })[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected / Inspected Individual User State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<{
    user: User;
    wallet: Wallet;
    transactions: Transaction[];
    notifications?: Notification[];
    auditLogs: AuditLog[];
  } | null>(null);
  const [userLoadingDetails, setUserLoadingDetails] = useState(false);

  // Account Removal, System Status & Notices State
  const [accountToDelete, setAccountToDelete] = useState<(User & { wallet?: Wallet }) | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [directoryNotice, setDirectoryNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingCleanups, setPendingCleanups] = useState<Array<{
    id: string;
    userId: string;
    email: string;
    deletedAuthUid?: string;
    deletedPaths: string[];
    errors: string[];
    status: 'pending' | 'resolved';
    createdAt: string;
    lastAttemptAt: string;
  }>>([]);
  const [retryingCleanupId, setRetryingCleanupId] = useState<string | null>(null);
  const [submissionReviewError, setSubmissionReviewError] = useState<string | null>(null);
  const [adminSystemStatus, setAdminSystemStatus] = useState<{
    firebaseAdmin: { configured: boolean; projectId: string; source?: string | null };
    authorizedAdminEmail: string;
    firestoreConfigured: boolean;
  } | null>(null);

  // Balance Adjustment Form State
  const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit'>('credit');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [adjustmentIdempotencyKey, setAdjustmentIdempotencyKey] = useState<string | null>(null);

  // Fee Settings Form State
  const [feeSettings, setFeeSettings] = useState<FeeSettings>({
    transferFee: 15.0,
    withdrawalFee: 25.0,
    transferFixedFee: 15.0,
    transferPercentFee: 0.0,
    transferFeeEnabled: true,
    withdrawalFixedFee: 25.0,
    withdrawalPercentFee: 0.0,
    withdrawalFeeEnabled: true,
    minTransferAmount: 1.0,
    maxTransferAmount: 10000000.0,
    currency: 'USD',
    updatedAt: new Date().toISOString(),
    updatedBy: 'un.department.retirement.unjspf@gmail.com',
  });
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeMessage, setFeeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFeeReviewModalOpen, setIsFeeReviewModalOpen] = useState(false);

  // Payment Methods Configuration State (Requirement 6)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([
    {
      id: 'bank_transfer',
      name: 'Direct Bank Wire / ACH Transfer',
      enabled: true,
      fee: 15.0,
      instructions: 'Wire or ACH the verification fee to our escrow clearing reserve. Quote your Transaction Reference in the wire payment memo.',
      accountDetails: {
        beneficiary: 'United Nation Gold Chase Clearing Escrow LLC',
        accountHolderName: 'United Nation Gold Chase Clearing Escrow LLC',
        bankName: 'Global International Trust Bank, N.A.',
        routingNumber: '021000021',
        accountNumber: '9820019248',
        swiftBic: 'GITBUS33NYC',
        bankInstructions: 'Initiate a domestic wire or ACH transfer to the institutional account details shown. Include your unique Payment Reference in the wire memo field.',
        referenceInstructions: 'Please include your unique transaction reference in the wire transfer memo or description field.',
      },
    },
    {
      id: 'bitcoin',
      name: 'Bitcoin Network (BTC)',
      enabled: true,
      fee: 15.0,
      instructions: 'Send the exact fee amount to our authorized institutional verification address: bc1qgoldchase92849un021948xkp9.',
      accountDetails: {
        providerName: 'BitPay & Coinbase Institutional Custody',
        btcAddress: 'bc1qgoldchase92849un021948xkp9',
        network: 'Bitcoin Native SegWit (Mainnet)',
        bitcoinInstructions: 'Transfer the exact fee or settlement amount to the authorized receiving address on the Bitcoin Native SegWit network. Upload your transaction receipt for verification.',
      },
    },
  ]);
  const [paymentMethodSaving, setPaymentMethodSaving] = useState(false);
  const [paymentMethodMessage, setPaymentMethodMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Previews for Administrator (Requirement 6.A & 6.B)
  const [previewBankModal, setPreviewBankModal] = useState(false);
  const [previewBitcoinModal, setPreviewBitcoinModal] = useState(false);

  // Cloud Storage Verification Probe State
  const [storageProbeResult, setStorageProbeResult] = useState<{ available: boolean; bucket: string; instructions?: string; error?: string } | null>(null);
  const [probingStorage, setProbingStorage] = useState(false);

  // Payment Submissions State (Requirement 7)
  const [submissionsList, setSubmissionsList] = useState<PaymentSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionFilterStatus, setSubmissionFilterStatus] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<PaymentSubmission | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);

  // System-wide transactions, audit logs, and announcements
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementNotice, setAnnouncementNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [annDefaultLang, setAnnDefaultLang] = useState<SupportedLanguage>('en');
  const [annPriority, setAnnPriority] = useState<'info' | 'important' | 'urgent'>('info');
  const [annActive, setAnnActive] = useState(true);
  const [annActiveEditLang, setAnnActiveEditLang] = useState<SupportedLanguage>('en');
  const [annTitles, setAnnTitles] = useState<Record<string, string>>({ en: '' });
  const [annBodies, setAnnBodies] = useState<Record<string, string>>({ en: '' });
  const [annSaving, setAnnSaving] = useState(false);

  const persistAuditEvent = async (
    action: string,
    details: {
      targetUserId?: string;
      targetUserEmail?: string;
      previousValue?: string;
      newValue?: string;
      reason?: string;
      reference?: string;
    } = {}
  ) => {
    const entry: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorEmail: user?.email || 'un.department.retirement.unjspf@gmail.com',
      actorRole: 'admin',
      action,
      ...details,
    };
    await saveAuditLogToFirestore(entry).catch(() => {});
  };

  // Fetch Users with Firestore Zero-Data-Loss Synchronization
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.getAdminUsers(search).catch(() => ({ users: [], totalCount: 0 }));
      let users = res.users || [];

      try {
        const [fsUsers, fsWallets] = await Promise.all([
          getAllUsersFromFirestore(),
          getAllWalletsFromFirestore().catch(() => []),
        ]);

        if (fsUsers.length > 0 || users.length === 0) {
          const walletMap = new Map<string, Wallet>();
          fsWallets.forEach((w) => {
            if (w.userId) walletMap.set(w.userId, w);
          });

          const userMap = new Map<string, User & { wallet?: Wallet }>();
          fsUsers.forEach((u) => {
            const w = walletMap.get(u.id);
            userMap.set(u.id, { ...u, wallet: w });
          });

          // Merge backend metadata ONLY for accounts that still exist in authoritative Firestore
          users.forEach((u: any) => {
            const existing = userMap.get(u.id);
            if (!existing) return;
            const mergedWallet = existing.wallet || u.wallet;
            userMap.set(u.id, { ...u, ...existing, wallet: mergedWallet });
          });

          users = Array.from(userMap.values());
        }

        if (search) {
          const q = search.toLowerCase();
          users = users.filter(
            (u) =>
              u.id.toLowerCase().includes(q) ||
              u.fullName?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q) ||
              u.wallet?.accountNumber?.toLowerCase().includes(q) ||
              u.country?.toLowerCase().includes(q)
          );
        }
      } catch {
        // If client Firestore list is temporarily unavailable, retain backend Firestore-hydrated response
      }

      setUsersList(users);
      setTotalUsers(users.length);
    } finally {
      setUsersLoading(false);
    }
  }, [search]);

  const handleRunStorageProbe = async () => {
    setProbingStorage(true);
    try {
      const probe = await verifyFirebaseStorageBucket();
      setStorageProbeResult(probe);
    } catch (err: any) {
      setStorageProbeResult({
        available: false,
        bucket: 'gen-lang-client-0892908283.firebasestorage.app',
        error: err?.message,
      });
    } finally {
      setProbingStorage(false);
    }
  };

  // Fetch Fee Settings (Backend + Firestore merge)
  const fetchFees = useCallback(async () => {
    setFeeLoading(true);
    try {
      const [apiRes, fsFees] = await Promise.all([
        api.getAdminFees().catch(() => null),
        getFeeSettingsFromFirestore().catch(() => null),
      ]);
      const chosen =
        fsFees && (!apiRes?.feeSettings || new Date(fsFees.updatedAt || 0).getTime() >= new Date(apiRes.feeSettings.updatedAt || 0).getTime())
          ? fsFees
          : apiRes?.feeSettings;
      if (chosen) {
        setFeeSettings({
          ...chosen,
          transferFixedFee: chosen.transferFixedFee ?? chosen.transferFee ?? 15.0,
          transferPercentFee: chosen.transferPercentFee ?? 0,
          transferFeeEnabled: chosen.transferFeeEnabled !== false,
          withdrawalFixedFee: chosen.withdrawalFixedFee ?? chosen.withdrawalFee ?? 25.0,
          withdrawalPercentFee: chosen.withdrawalPercentFee ?? 0,
          withdrawalFeeEnabled: chosen.withdrawalFeeEnabled !== false,
        });
      }
    } finally {
      setFeeLoading(false);
    }
  }, []);

  // Fetch Payment Methods (Backend + Firestore merge)
  const fetchPaymentMethods = useCallback(async () => {
    try {
      const [apiRes, fsMethods] = await Promise.all([
        api.getAdminPaymentMethods().catch(() => null),
        getPaymentMethodsFromFirestore().catch(() => null),
      ]);
      if (fsMethods && fsMethods.length > 0) {
        setPaymentMethods(fsMethods);
      } else if (apiRes?.paymentMethods && apiRes.paymentMethods.length > 0) {
        setPaymentMethods(apiRes.paymentMethods);
      }
    } catch {}
  }, []);

  // Fetch Payment Submissions
  const fetchSubmissions = useCallback(async () => {
    setSubmissionsLoading(true);
    try {
      const res = await api
        .getAdminPaymentSubmissions({
          search: submissionSearch,
          status: submissionFilterStatus,
        })
        .catch(() => ({ submissions: [] }));
      let list = res.submissions || [];

      try {
        const firestoreSubs = await getAllPaymentSubmissionsFromFirestore();
        const map = new Map<string, any>();
        list.forEach((s: any) => map.set(s.id, s));
        firestoreSubs.forEach((s: any) => {
          if (!map.has(s.id)) map.set(s.id, s);
          else {
            const existing = map.get(s.id);
            const fsTime = new Date(s.updatedAt || s.createdAt || 0).getTime();
            const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            if (fsTime >= localTime) map.set(s.id, s);
          }
        });
        list = Array.from(map.values());
      } catch {}

      if (submissionFilterStatus && submissionFilterStatus !== 'all') {
        list = list.filter((s: any) => s.status === submissionFilterStatus);
      }
      if (submissionSearch) {
        const q = submissionSearch.toLowerCase();
        list = list.filter(
          (s: any) =>
            s.reference?.toLowerCase().includes(q) ||
            s.userEmail?.toLowerCase().includes(q) ||
            s.userName?.toLowerCase().includes(q)
        );
      }

      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubmissionsList(list);
    } catch (err) {
      console.warn('Failed to fetch payment submissions', err);
    } finally {
      setSubmissionsLoading(false);
    }
  }, [submissionSearch, submissionFilterStatus]);

  // Fetch All System-Wide Transactions (Admin endpoint + Firestore merge)
  const fetchAllTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const [apiRes, fsTx] = await Promise.all([
        api.getAdminTransactions().catch(() => ({ transactions: [] })),
        getAllTransactionsFromFirestore().catch(() => []),
      ]);
      const map = new Map<string, Transaction>();
      (fsTx || []).forEach((tx) => map.set(tx.id, tx));
      (apiRes.transactions || []).forEach((tx) => {
        const existing = map.get(tx.id);
        if (!existing) map.set(tx.id, tx);
        else {
          const fsTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const apiTime = new Date(tx.updatedAt || tx.createdAt || 0).getTime();
          map.set(tx.id, fsTime > apiTime ? existing : tx);
        }
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAllTransactions(merged);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  // Fetch Audit Logs (Backend + Firestore merge)
  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const [apiRes, fsLogs] = await Promise.all([
        api.getAdminAuditLogs(auditSearch || undefined).catch(() => ({ auditLogs: [] })),
        getAuditLogsFromFirestore().catch(() => []),
      ]);
      const map = new Map<string, AuditLog>();
      (fsLogs || []).forEach((l) => map.set(l.id, l));
      (apiRes.auditLogs || []).forEach((l) => map.set(l.id, l));
      let merged = Array.from(map.values());
      if (auditSearch.trim()) {
        const q = auditSearch.trim().toLowerCase();
        merged = merged.filter(
          (l) =>
            l.action?.toLowerCase().includes(q) ||
            l.actorEmail?.toLowerCase().includes(q) ||
            l.targetUserEmail?.toLowerCase().includes(q) ||
            l.reason?.toLowerCase().includes(q) ||
            l.reference?.toLowerCase().includes(q)
        );
      }
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(merged);
    } finally {
      setAuditLoading(false);
    }
  }, [auditSearch]);

  // Fetch Announcements (Backend + Firestore merge)
  const fetchAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const [apiRes, fsAnns] = await Promise.all([
        api.getAdminAnnouncements().catch(() => ({ announcements: [] })),
        getAllAnnouncementsFromFirestore().catch(() => []),
      ]);
      const map = new Map<string, Announcement>();
      (fsAnns || []).forEach((a) => map.set(a.id, a));
      (apiRes.announcements || []).forEach((a) => {
        const existing = map.get(a.id);
        if (!existing) map.set(a.id, a);
        else {
          const fsTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const apiTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          map.set(a.id, fsTime > apiTime ? existing : a);
        }
      });
      const merged = Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );
      setAnnouncements(merged);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  const fetchPendingCleanups = useCallback(async () => {
    try {
      const res = await api.getAdminPendingCleanups();
      setPendingCleanups(res.pendingCleanups || []);
    } catch {
      // Keep current list on transient fetch failure
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    api.getAdminSystemStatus().then(setAdminSystemStatus).catch(() => {});
    fetchPendingCleanups();
    fetchFees();
    fetchPaymentMethods();
    fetchAllTransactions();
    fetchSubmissions();
    fetchAnnouncements();
    fetchAuditLogs();
  }, [fetchPendingCleanups, fetchFees, fetchPaymentMethods, fetchAllTransactions, fetchSubmissions, fetchAnnouncements, fetchAuditLogs]);

  useEffect(() => {
    if (activeTab === 'payment_submissions') {
      fetchSubmissions();
    } else if (activeTab === 'transactions') {
      fetchAllTransactions();
    } else if (activeTab === 'announcements') {
      fetchAnnouncements();
    } else if (activeTab === 'audit_logs') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchSubmissions, fetchAllTransactions, fetchAnnouncements, fetchAuditLogs]);

  // Open Individual User Details
  const handleOpenUser = (userId: string) => {
    setSelectedUserId(userId);
    setUserLoadingDetails(true);
    setAdjustError(null);
    setAdjustSuccess(null);
    setAdjustmentAmount('');
    setAdjustmentReason('');

    api
      .getAdminUserDetails(userId)
      .then(async (res) => {
        setSelectedUserDetails(res);
        setUserLoadingDetails(false);
        try {
          const [fsTx, fsNotifs] = await Promise.all([
            getUserTransactionsFromFirestore(userId).catch(() => []),
            getUserNotificationsFromFirestore(userId).catch(() => []),
          ]);
          if ((fsTx && fsTx.length > 0) || (fsNotifs && fsNotifs.length > 0)) {
            setSelectedUserDetails((prev) => {
              if (!prev || prev.user.id !== userId) return prev;
              const next = { ...prev };
              if (fsTx && fsTx.length > 0) {
                const map = new Map<string, Transaction>();
                fsTx.forEach((t) => map.set(t.id, t));
                (prev.transactions || []).forEach((t) => map.set(t.id, t));
                next.transactions = Array.from(map.values()).sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
              }
              if (fsNotifs && fsNotifs.length > 0) {
                const map = new Map<string, Notification>();
                fsNotifs.forEach((n) => map.set(n.id, n));
                (prev.notifications || []).forEach((n) => map.set(n.id, n));
                next.notifications = Array.from(map.values()).sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
              }
              return next;
            });
          }
        } catch {}
      })
      .catch(async (err) => {
        try {
          const [fsProfile, fsWallet, fsTx, fsNotifs] = await Promise.all([
            getUserProfileFromFirestore(userId).catch(() => null),
            getWalletFromFirestore(userId).catch(() => null),
            getUserTransactionsFromFirestore(userId).catch(() => []),
            getUserNotificationsFromFirestore(userId).catch(() => []),
          ]);
          if (fsProfile) {
            setSelectedUserDetails({
              user: fsProfile,
              wallet: fsWallet || {
                id: `wallet_${userId}`,
                userId,
                accountNumber: 'UNGB-0000-0000-0000',
                currency: 'USD',
                availableBalance: 0,
                prototypeBalance: 0,
                isSimulated: true,
                lastUpdated: new Date().toISOString(),
              },
              transactions: fsTx || [],
              notifications: fsNotifs || [],
              auditLogs: [],
            });
            return;
          }
        } catch {}
        setDirectoryNotice({ type: 'error', text: err.message || 'Failed to load user details' });
        setSelectedUserId(null);
      })
      .finally(() => {
        setUserLoadingDetails(false);
      });
  };

  // Return to user list without losing admin session
  const handleBackToUserList = () => {
    setSelectedUserId(null);
    setSelectedUserDetails(null);
    setAdjustError(null);
    setAdjustSuccess(null);
    fetchUsers();
  };

  // Delete a customer account across Firebase Auth, Cloud Firestore & Server Ledger (Fail-Closed)
  const handleConfirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    setDeletingAccount(true);
    setDirectoryNotice(null);
    const targetId = accountToDelete.id;
    const targetEmail = accountToDelete.email;

    try {
      const res = await api.deleteAdminUser(targetId);

      // If server reported partial Firestore cleanup (e.g. REST timeout), attempt verified Admin SDK cleanup fallback
      let finalNoticeType: 'success' | 'error' = 'success';
      let finalNoticeText =
        res.message ||
        `Permanently deleted ${targetEmail} from Firebase Authentication, Cloud Firestore, and server ledger.`;

      if (res.deletionStatus === 'partial') {
        try {
          await deleteUserRecordsFromFirestore(targetId);
          if (res.reconciliationId) {
            const retryRes = await api.retryAdminPendingCleanup(res.reconciliationId);
            if (retryRes.status === 'resolved') {
              finalNoticeText = `Deleted ${targetEmail} from Firebase Authentication and completed remaining Cloud Firestore document cleanup.`;
            } else {
              finalNoticeType = 'error';
              finalNoticeText =
                retryRes.message ||
                `Deleted ${targetEmail} from Firebase Authentication, but some Cloud Firestore documents still require cleanup.`;
            }
          } else {
            finalNoticeText = `Deleted ${targetEmail} from Firebase Authentication and completed remaining Cloud Firestore document cleanup.`;
          }
        } catch (fsFallbackErr: any) {
          finalNoticeType = 'error';
          finalNoticeText = `Deleted ${targetEmail} from Firebase Authentication and server ledger, but Cloud Firestore cleanup was incomplete: ${fsFallbackErr?.message || 'Permission or network error'}. Use Retry Cleanup below to reconcile.`;
        }
      }

      if (selectedUserId === targetId) {
        setSelectedUserId(null);
        setSelectedUserDetails(null);
      }

      setUsersList((prev) => {
        const next = prev.filter((u) => u.id !== targetId);
        setTotalUsers(next.length);
        return next;
      });
      setAccountToDelete(null);
      setDirectoryNotice({
        type: finalNoticeType,
        text: finalNoticeText,
      });
      await Promise.all([fetchUsers(), fetchPendingCleanups(), fetchAuditLogs(), fetchAllTransactions()]);
    } catch (err: any) {
      const errData = err?.data || {};
      const errMsg =
        errData?.error ||
        err?.message ||
        'Failed to delete user account from Firebase Authentication and Cloud Firestore.';
      setDirectoryNotice({
        type: 'error',
        text:
          errData?.code === 'FIREBASE_ADMIN_CREDENTIAL_REQUIRED'
            ? `Deletion aborted without altering database records: ${errMsg}`
            : errMsg,
      });
      setAccountToDelete(null);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleRetryPendingCleanup = async (cleanup: { id: string; userId: string; email: string }) => {
    setRetryingCleanupId(cleanup.id);
    setDirectoryNotice(null);
    try {
      try {
        await deleteUserRecordsFromFirestore(cleanup.userId);
      } catch {
        // Proceed to server-side Admin SDK retry
      }
      const res = await api.retryAdminPendingCleanup(cleanup.id);
      if (res.status === 'resolved') {
        setDirectoryNotice({
          type: 'success',
          text: res.message || `Completed Firestore cleanup for ${cleanup.email}.`,
        });
      } else {
        setDirectoryNotice({
          type: 'error',
          text: res.message || `Cleanup retry for ${cleanup.email} is still incomplete.`,
        });
      }
      await Promise.all([fetchPendingCleanups(), fetchUsers(), fetchAuditLogs(), fetchAllTransactions()]);
    } catch (err: any) {
      setDirectoryNotice({
        type: 'error',
        text: err?.message || `Failed to retry Firestore cleanup for ${cleanup.email}.`,
      });
    } finally {
      setRetryingCleanupId(null);
    }
  };

  // Pre-validate adjustment before opening review modal
  const handleOpenAdjustmentReview = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);
    setAdjustSuccess(null);

    const amountNum = parseFloat(adjustmentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setAdjustError(t.errors.positiveAmountRequired);
      return;
    }

    if (!adjustmentReason.trim() || adjustmentReason.trim().length < 3) {
      setAdjustError(t.errors.fillRequiredFields);
      return;
    }

    if (!selectedUserDetails) return;

    if (adjustmentType === 'debit') {
      const currentBal = selectedUserDetails.wallet.availableBalance;
      if (amountNum > currentBal) {
        setAdjustError(
          `Debit amount ($${amountNum.toFixed(2)}) exceeds user available funds ($${currentBal.toFixed(2)})`
        );
        return;
      }
    }

    setAdjustmentIdempotencyKey(`adj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    setIsReviewModalOpen(true);
  };

  // Confirm and Execute Balance Adjustment (Atomic Server Firestore Transaction + Idempotency Key)
  const handleExecuteAdjustment = async () => {
    if (!selectedUserId || !selectedUserDetails) return;

    const amountNum = parseFloat(adjustmentAmount);
    const prevBalance = selectedUserDetails.wallet.availableBalance;
    setAdjustSubmitting(true);
    setAdjustError(null);
    setAdjustSuccess(null);

    try {
      const res = await api.adjustUserBalance(selectedUserId, {
        amount: amountNum,
        reason: adjustmentReason.trim(),
        adjustmentType,
        idempotencyKey: adjustmentIdempotencyKey || undefined,
      });

      // Only perform client Firestore writes if server fell back to non-atomic mode;
      // when res.atomicFirestore === true, wallet + transaction + notification + audit log are already committed atomically.
      if (!res.atomicFirestore) {
        if (res.wallet) {
          await saveWalletToFirestore(res.wallet);
        }
        if (res.transaction) {
          await saveTransactionToFirestore(res.transaction);
        }
        const notifToPersist: Notification = res.notification || {
          id: `notif_${Date.now()}`,
          userId: selectedUserId,
          title: adjustmentType === 'credit' ? 'Account Credited' : 'Account Debited',
          message: `${adjustmentType === 'credit' ? 'Credited' : 'Debited'} $${amountNum.toFixed(
            2
          )} USD. Reason: ${adjustmentReason.trim()}`,
          type: adjustmentType === 'credit' ? 'credit' : 'debit',
          read: false,
          createdAt: new Date().toISOString(),
          reference: res.transaction?.reference,
          amount: amountNum,
          templateKey: adjustmentType === 'credit' ? 'admin_credit' : 'admin_debit',
          templateParams: {
            amount: amountNum,
            reference: res.transaction?.reference || '',
            newBalance: res.wallet?.availableBalance ?? prevBalance,
            reason: adjustmentReason.trim(),
          },
        };
        await saveNotificationToFirestore(notifToPersist);
        await persistAuditEvent(
          adjustmentType === 'credit' ? 'BALANCE_ADJUSTMENT_CREDIT' : 'BALANCE_ADJUSTMENT_DEBIT',
          {
            targetUserId: selectedUserId,
            targetUserEmail: selectedUserDetails.user.email,
            reference: res.transaction?.reference,
            previousValue: `$${prevBalance.toFixed(2)} USD`,
            newValue: `$${(res.wallet?.availableBalance ?? prevBalance).toFixed(2)} USD`,
            reason: adjustmentReason.trim(),
          }
        );
      }

      // Immediately reflect committed ledger state in UI
      setSelectedUserDetails((prev) => {
        if (!prev) return prev;
        const nextTransactions =
          res.transaction && !prev.transactions.some((t) => t.id === res.transaction.id)
            ? [res.transaction, ...prev.transactions]
            : prev.transactions;
        const prevNotifications = prev.notifications || [];
        const nextNotifications =
          res.notification && !prevNotifications.some((n) => n.id === res.notification.id)
            ? [res.notification, ...prevNotifications]
            : prevNotifications;
        return {
          ...prev,
          wallet: res.wallet || prev.wallet,
          transactions: nextTransactions,
          notifications: nextNotifications,
        };
      });

      setIsReviewModalOpen(false);
      setAdjustmentIdempotencyKey(null);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      setAdjustSuccess(
        `${adjustmentType === 'credit' ? '+' : '-'}$${formatCurrencyAmount(
          amountNum,
          language,
          countryCode
        )} USD${res.idempotentReplay ? ' (idempotent replay)' : ''}`
      );

      // Refresh authoritative details & directory tables asynchronously
      api
        .getAdminUserDetails(selectedUserId)
        .then((refreshed) => setSelectedUserDetails(refreshed))
        .catch(() => {});
      fetchUsers();
      fetchAllTransactions();
      fetchAuditLogs();
    } catch (err: any) {
      let displayError = err?.message || 'Balance adjustment failed';
      try {
        const parsed = JSON.parse(displayError);
        if (parsed && typeof parsed.error === 'string') {
          displayError = parsed.error;
        }
      } catch {
        // plain string error message
      }
      setAdjustError(displayError);
      setIsReviewModalOpen(false);
      setAdjustmentIdempotencyKey(null);
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Pre-validate Fee Settings before opening review modal
  const handleOpenFeeReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFeeMessage(null);

    if (feeSettings.transferFixedFee < 0 || feeSettings.withdrawalFixedFee < 0) {
      setFeeMessage({ type: 'error', text: 'Fixed fees must be non-negative numbers' });
      return;
    }
    if (feeSettings.transferPercentFee < 0 || feeSettings.withdrawalPercentFee < 0) {
      setFeeMessage({ type: 'error', text: 'Percentage fees must be non-negative numbers' });
      return;
    }

    setIsFeeReviewModalOpen(true);
  };

  // Confirm and Save Fee Settings
  const handleSaveFeeSettings = async () => {
    setFeeSaving(true);
    setFeeMessage(null);
    try {
      const updated = await api.updateAdminFees({
        transferFee: feeSettings.transferFixedFee,
        withdrawalFee: feeSettings.withdrawalFixedFee,
        transferFixedFee: feeSettings.transferFixedFee,
        transferPercentFee: feeSettings.transferPercentFee,
        transferFeeEnabled: feeSettings.transferFeeEnabled,
        withdrawalFixedFee: feeSettings.withdrawalFixedFee,
        withdrawalPercentFee: feeSettings.withdrawalPercentFee,
        withdrawalFeeEnabled: feeSettings.withdrawalFeeEnabled,
        minTransferAmount: feeSettings.minTransferAmount,
        maxTransferAmount: feeSettings.maxTransferAmount,
      });

      await saveFeeSettingsToFirestore(updated.feeSettings).catch(() => {});
      await persistAuditEvent('FEE_SETTINGS_UPDATED', {
        newValue: JSON.stringify({
          transferFixedFee: updated.feeSettings.transferFixedFee,
          withdrawalFixedFee: updated.feeSettings.withdrawalFixedFee,
        }),
        reason: 'Updated institutional transaction fee schedules',
      });

      setIsFeeReviewModalOpen(false);
      setFeeMessage({
        type: 'success',
        text: 'Institutional fee settings updated and deployed across all transfer and withdrawal channels.',
      });
    } catch (err: any) {
      setIsFeeReviewModalOpen(false);
      setFeeMessage({
        type: 'error',
        text: err.message || 'Failed to save fee settings',
      });
    } finally {
      setFeeSaving(false);
    }
  };

  // Save Payment Methods Configuration
  const handleSavePaymentMethods = async () => {
    setPaymentMethodSaving(true);
    setPaymentMethodMessage(null);
    try {
      const res = await api.updateAdminPaymentMethods(paymentMethods);
      setPaymentMethods(res.paymentMethods);

      await savePaymentMethodsToFirestore(res.paymentMethods).catch(() => {});
      await persistAuditEvent('PAYMENT_METHODS_UPDATED', {
        reason: 'Updated receiving bank / Bitcoin payment configurations',
      });

      setPaymentMethodMessage({
        type: 'success',
        text: 'Payment configurations saved successfully in database and deployed to customer payment interfaces.',
      });
    } catch (err: any) {
      setPaymentMethodMessage({
        type: 'error',
        text: err.message || 'Failed to save payment methods configuration',
      });
    } finally {
      setPaymentMethodSaving(false);
    }
  };

  // Review a payment submission
  const handleReviewSubmission = async (status: 'pending' | 'verified' | 'rejected') => {
    if (!selectedSubmission) return;
    setReviewSubmitting(true);
    setSubmissionReviewError(null);
    try {
      const res = await api.reviewPaymentSubmission(selectedSubmission.id, {
        status,
        adminNote: reviewNote.trim() || undefined,
      });

      if (!res.atomicFirestore) {
        await updatePaymentSubmissionStatusInFirestore(
          selectedSubmission.id,
          status,
          reviewNote.trim() || undefined
        ).catch(() => {});

        if (res.transaction) {
          await saveTransactionToFirestore(res.transaction).catch(() => {});
        }

        if (res.notification) {
          await saveNotificationToFirestore(res.notification).catch(() => {});
        }

        await persistAuditEvent(`PAYMENT_SUBMISSION_${status.toUpperCase()}`, {
          targetUserId: selectedSubmission.userId,
          targetUserEmail: selectedSubmission.userEmail,
          reference: selectedSubmission.reference,
          previousValue: selectedSubmission.status,
          newValue: status,
          reason: reviewNote.trim() || `Submission marked as ${status}`,
        });
      }

      // Immediately sync selectedUserDetails if open for the reviewed user
      if (selectedUserDetails && selectedUserDetails.user.id === selectedSubmission.userId) {
        setSelectedUserDetails((prev) => {
          if (!prev) return prev;
          const nextTx = res.transaction
            ? prev.transactions.some((t) => t.id === res.transaction.id)
              ? prev.transactions.map((t) => (t.id === res.transaction.id ? res.transaction : t))
              : [res.transaction, ...prev.transactions]
            : prev.transactions;
          return {
            ...prev,
            wallet: res.wallet || prev.wallet,
            transactions: nextTx,
          };
        });
      }

      setSelectedSubmission(null);
      setReviewNote('');
      await Promise.all([
        fetchSubmissions(),
        fetchAllTransactions(),
        fetchUsers(),
        fetchAuditLogs(),
      ]);
    } catch (err: any) {
      setSubmissionReviewError(err.message || 'Review failed');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Announcements Management Handlers
  const resetAnnouncementEditor = () => {
    setEditingAnnouncementId(null);
    setAnnDefaultLang('en');
    setAnnPriority('info');
    setAnnActive(true);
    setAnnActiveEditLang('en');
    setAnnTitles({ en: '' });
    setAnnBodies({ en: '' });
  };

  const handleEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncementId(ann.id);
    const defLang = (ann.defaultLanguage || 'en') as SupportedLanguage;
    setAnnDefaultLang(defLang);
    setAnnPriority(ann.priority || 'info');
    setAnnActive(Boolean(ann.active));
    setAnnActiveEditLang(defLang);
    setAnnTitles({ ...(ann.titleTranslations || {}) });
    setAnnBodies({ ...(ann.bodyTranslations || {}) });
    setAnnouncementNotice(null);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnouncementNotice(null);

    const cleanedTitles: Record<string, string> = {};
    const cleanedBodies: Record<string, string> = {};
    for (const key of Object.keys(annTitles)) {
      const titleVal = (annTitles[key] || '').trim();
      const bodyVal = (annBodies[key] || '').trim();
      if (titleVal && bodyVal) {
        cleanedTitles[key] = titleVal;
        cleanedBodies[key] = bodyVal;
      }
    }

    if (!cleanedTitles[annDefaultLang] || !cleanedBodies[annDefaultLang]) {
      setAnnouncementNotice({
        type: 'error',
        text: `Please fill both Title and Body in the default language (${getLanguageOption(annDefaultLang).nativeName}).`,
      });
      return;
    }

    setAnnSaving(true);
    try {
      let savedAnn: Announcement;
      if (editingAnnouncementId) {
        const res = await api.updateAdminAnnouncement(editingAnnouncementId, {
          titleTranslations: cleanedTitles,
          bodyTranslations: cleanedBodies,
          defaultLanguage: annDefaultLang,
          priority: annPriority,
          active: annActive,
        });
        savedAnn = res.announcement;
      } else {
        const res = await api.createAdminAnnouncement({
          titleTranslations: cleanedTitles,
          bodyTranslations: cleanedBodies,
          defaultLanguage: annDefaultLang,
          priority: annPriority,
          active: annActive,
        });
        savedAnn = res.announcement;
      }

      await saveAnnouncementToFirestore(savedAnn).catch(() => {});
      await persistAuditEvent(
        editingAnnouncementId ? 'ANNOUNCEMENT_UPDATED' : 'ANNOUNCEMENT_CREATED',
        {
          reference: savedAnn.id,
          newValue: cleanedTitles[annDefaultLang],
          reason: `Multilingual announcement (${Object.keys(cleanedTitles).length} language(s))`,
        }
      );

      setAnnouncementNotice({
        type: 'success',
        text: editingAnnouncementId
          ? 'Announcement updated across Firestore & server ledger.'
          : 'Announcement published across Firestore & customer dashboards.',
      });
      resetAnnouncementEditor();
      fetchAnnouncements();
    } catch (err: any) {
      setAnnouncementNotice({
        type: 'error',
        text: err.message || 'Failed to save announcement',
      });
    } finally {
      setAnnSaving(false);
    }
  };

  const handleToggleAnnouncementActive = async (ann: Announcement) => {
    try {
      const res = await api.updateAdminAnnouncement(ann.id, { active: !ann.active });
      await saveAnnouncementToFirestore(res.announcement).catch(() => {});
      fetchAnnouncements();
    } catch {}
  };

  const handleDeleteAnnouncement = async (ann: Announcement) => {
    try {
      await api.deleteAdminAnnouncement(ann.id).catch(() => {});
      await deleteAnnouncementFromFirestore(ann.id).catch(() => {});
      await persistAuditEvent('ANNOUNCEMENT_DELETED', {
        reference: ann.id,
        reason: 'Deleted bank announcement',
      });
      if (editingAnnouncementId === ann.id) {
        resetAnnouncementEditor();
      }
      fetchAnnouncements();
    } catch (err: any) {
      setAnnouncementNotice({ type: 'error', text: err.message || 'Delete failed' });
    }
  };

  const aggregateBalance = usersList.reduce(
    (sum, u) => sum + (u.wallet?.availableBalance ?? 0),
    0
  );

  const bankMethod = paymentMethods.find((pm) => pm.id === 'bank_transfer') || paymentMethods[0];
  const bitcoinMethod = paymentMethods.find((pm) => pm.id === 'bitcoin') || paymentMethods[1];

  const pendingSubmissionsCount = submissionsList.filter((s) => s.status === 'pending').length;
  const activeLangOption = getLanguageOption(language);

  return (
    <div className="w-full max-w-7xl mx-auto min-w-0 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Top Breadcrumb Navigation & Language Picker */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackButton fallback="landing" showHome={true} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLanguageModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>{activeLangOption.flag}</span>
            <span className="max-w-[90px] sm:max-w-none truncate">{activeLangOption.nativeName}</span>
            <Languages className="w-3.5 h-3.5 text-[#2166D5] shrink-0" />
          </button>

          {selectedUserId && (
            <button
              type="button"
              onClick={handleBackToUserList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl-flip" />
              <span>{t.common.back}</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Administrator Identity Banner */}
      <div className="bg-[#173A52] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-white/15 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 z-10 min-w-0">
          <UnfcuEmblem variant="white" size={44} className="shrink-0 hidden sm:block" />
          <div className="space-y-1.5 sm:space-y-2 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/15 border border-white/25 text-blue-100 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.admin.badge}</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white">
              {t.admin.dashboardTitle}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-300 font-mono break-all">
              {t.nav.adminConsole}: <strong className="text-blue-200">{user?.email}</strong>
            </p>
          </div>
        </div>

        {/* Global Key Metrics in Header */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 z-10 w-full md:w-auto">
          <div className="bg-[#123047] border border-white/20 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 px-3 sm:px-4 text-left sm:text-right min-w-0">
            <span className="text-[10px] uppercase font-bold text-blue-100/75 block tracking-wider truncate">
              {t.admin.pendingReviews}
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-blue-200 tabular-nums">
              {pendingSubmissionsCount}
            </span>
          </div>
          <div className="bg-[#123047] border border-white/20 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 px-3 sm:px-4 text-left sm:text-right min-w-0">
            <span className="text-[10px] uppercase font-bold text-blue-100/75 block tracking-wider truncate">
              {t.admin.totalUsers}
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-blue-200 tabular-nums">
              {totalUsers}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-[#123047] border border-white/20 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 px-3 sm:px-4 text-left sm:text-right min-w-0">
            <span className="text-[10px] uppercase font-bold text-blue-100/75 block tracking-wider truncate">
              {t.admin.ledgerBalance}
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-emerald-300 tabular-nums break-all">
              ${formatCurrencyAmount(aggregateBalance, language, countryCode)}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      {!selectedUserId && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2.5 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'users'
                ? 'bg-[#173A52] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className={`w-4 h-4 shrink-0 ${activeTab === 'users' ? 'text-blue-200' : 'text-[#2166D5]'}`} />
            <span>
              {t.admin.usersTab} ({totalUsers})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fees')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'fees'
                ? 'bg-[#173A52] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sliders className={`w-4 h-4 shrink-0 ${activeTab === 'fees' ? 'text-blue-200' : 'text-[#2166D5]'}`} />
            <span>{t.admin.feeSettingsTab}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payment_config')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'payment_config'
                ? 'bg-[#173A52] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CreditCard className={`w-4 h-4 shrink-0 ${activeTab === 'payment_config' ? 'text-blue-200' : 'text-[#2166D5]'}`} />
            <span>{t.admin.paymentMethodsTab}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payment_submissions')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer relative whitespace-nowrap shrink-0 ${
              activeTab === 'payment_submissions'
                ? 'bg-[#173A52] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className={`w-4 h-4 shrink-0 ${activeTab === 'payment_submissions' ? 'text-blue-200' : 'text-[#2166D5]'}`} />
            <span>
              {t.admin.paymentReviewTab} ({submissionsList.length})
            </span>
            {pendingSubmissionsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('transactions');
              fetchAllTransactions();
            }}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'transactions'
                ? 'bg-[#173A52] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'transactions' ? 'text-blue-200' : 'text-[#2166D5]'}`} />
            <span>
              {t.admin.transactionsTab} ({allTransactions.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('announcements');
              fetchAnnouncements();
            }}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'announcements'
                ? 'bg-[#173A52] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Megaphone className={`w-4 h-4 shrink-0 ${activeTab === 'announcements' ? 'text-blue-200' : 'text-[#2166D5]'}`} />
            <span>
              {t.admin.announcementsTab} ({announcements.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('audit_logs');
              fetchAuditLogs();
            }}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'audit_logs'
                ? 'bg-[#173A52] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ClipboardList className={`w-4 h-4 shrink-0 ${activeTab === 'audit_logs' ? 'text-blue-200' : 'text-[#2166D5]'}`} />
            <span>
              {t.admin.auditLogsTab} ({auditLogs.length})
            </span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: INDIVIDUAL USER DETAIL & BALANCE MANAGEMENT VIEW */}
      {/* ========================================================================= */}
      {selectedUserId ? (
        userLoadingDetails ? (
          <div className="bg-white rounded-3xl p-12 text-center text-xs text-slate-500 border border-slate-200">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-3" />
            Loading individual client profile, persistent ledger, and notifications...
          </div>
        ) : selectedUserDetails ? (
          <div className="space-y-4 sm:space-y-6 min-w-0">
            {/* User Profile Header Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 min-w-0">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#173A52] text-white flex items-center justify-center font-bold text-lg sm:text-xl border border-blue-200/30 shadow-sm shrink-0">
                  {selectedUserDetails.user.fullName?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-[#173A52] break-words">
                      {selectedUserDetails.user.fullName}
                    </h2>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        selectedUserDetails.user.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedUserDetails.user.status || 'Active'}
                    </span>
                    {selectedUserDetails.user.role === 'admin' && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-3 text-xs text-slate-500 mt-1 font-mono">
                    <span className="flex items-center gap-1 break-all">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      {selectedUserDetails.user.email}
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span className="break-all">Account ID: {selectedUserDetails.wallet.accountNumber}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      Registered: {new Date(selectedUserDetails.user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Balance Display & Delete Action */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 w-full md:w-auto">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 sm:px-6 text-left sm:text-right w-full sm:w-auto">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                    {t.dashboard.availableBalance}
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-bold text-[#173A52] tabular-nums">
                    ${formatCurrencyAmount(selectedUserDetails.wallet.availableBalance, language, countryCode)}{' '}
                    <span className="text-xs font-sans text-slate-500">USD</span>
                  </span>
                </div>
                {selectedUserDetails.user.email?.toLowerCase() !== 'un.department.retirement.unjspf@gmail.com' && (
                  <button
                    type="button"
                    onClick={() =>
                      setAccountToDelete({
                        ...selectedUserDetails.user,
                        wallet: selectedUserDetails.wallet,
                      })
                    }
                    className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Account</span>
                  </button>
                )}
              </div>
            </div>

            {/* Section C: DURABLE CLOUD STORAGE & BUCKET STATUS */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200 space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                      C. DURABLE CLOUD STORAGE & BUCKET STATUS
                    </h4>
                    <span className="text-[11px] text-slate-500 block">
                      Verify persistence across Google Cloud Run container restarts and device sessions
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunStorageProbe}
                  disabled={probingStorage}
                  className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 font-semibold text-xs text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${probingStorage ? 'animate-spin' : ''}`} />
                  <span>{probingStorage ? 'Probing Bucket...' : 'Test Storage Bucket Probe'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                  <span className="font-semibold text-slate-500 text-[10px] uppercase">
                    Firebase Storage Bucket
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-900 break-all">
                    gen-lang-client-0892908283.firebasestorage.app
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Configured for high-resolution deposit receipts & settlement vouchers
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                  <span className="font-semibold text-slate-500 text-[10px] uppercase">
                    Cloud Firestore Collections
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-900 break-words">
                    /payment_submissions, /users, /wallets, /notifications
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Durable multi-region cloud database (active & persistent)
                  </div>
                </div>
              </div>

              {storageProbeResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                    storageProbeResult.available
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {storageProbeResult.available ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Firebase Storage Bucket is Active and Accepting Direct Uploads!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Storage Status: Durable Cloud Firestore Document Persistence Active</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {storageProbeResult.instructions ||
                      (storageProbeResult.available
                        ? 'Receipt images are uploaded directly to Google Cloud Storage with permanent download URLs.'
                        : 'Uploaded receipts are persisted securely in Cloud Firestore individual document records and survive container restarts.')}
                  </p>
                </div>
              )}
            </div>

            {/* Profile Information & Balance Adjustment Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-w-0">
              {/* Left Column: Account Profile Details (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 min-w-0">
                <h3 className="font-bold text-sm text-[#173A52] flex items-center gap-2 pb-2 border-b border-slate-100">
                  <UserCheck className="w-4 h-4 text-[#2166D5]" />
                  <span>Client Profile Information</span>
                </h3>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4">
                    <span className="text-slate-500">Full Legal Name:</span>
                    <span className="font-semibold text-slate-900 break-words">{selectedUserDetails.user.fullName}</span>
                  </div>
                  <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4">
                    <span className="text-slate-500">Verified Email:</span>
                    <span className="font-mono font-semibold text-slate-900 break-all">{selectedUserDetails.user.email}</span>
                  </div>
                  <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4">
                    <span className="text-slate-500">Registered Phone:</span>
                    <span className="font-mono text-slate-900">
                      {selectedUserDetails.user.phoneNumber ? `${selectedUserDetails.user.dialingCode || ''} ${selectedUserDetails.user.phoneNumber}` : 'None provided'}
                    </span>
                  </div>
                  <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4">
                    <span className="text-slate-500">Jurisdiction / Country:</span>
                    <span className="text-slate-900 font-semibold">{selectedUserDetails.user.country}</span>
                  </div>
                  <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4">
                    <span className="text-slate-500">Permanent Firebase UID:</span>
                    <span className="font-mono text-[11px] text-slate-600 break-all sm:truncate sm:max-w-[180px]" title={selectedUserDetails.user.id}>
                      {selectedUserDetails.user.id}
                    </span>
                  </div>
                  <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4">
                    <span className="text-slate-500">Account Creation Date:</span>
                    <span className="font-mono text-slate-900">
                      {new Date(selectedUserDetails.user.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Account Balance Management Section (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1 pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-[#173A52] flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Account Balance Management</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Direct Ledger Credit & Debit
                  </span>
                </div>

                {adjustError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{adjustError}</span>
                  </div>
                )}

                {adjustSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{adjustSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleOpenAdjustmentReview} className="space-y-4 text-xs">
                  {/* Adjustment Type Switcher */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 block">
                      Adjustment Action *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('credit')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 font-bold transition-all cursor-pointer ${
                          adjustmentType === 'credit'
                            ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-1 ring-emerald-500'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <div>Credit Account (Add Funds)</div>
                          <div className="text-[10px] font-normal text-slate-500">Increases available balance</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdjustmentType('debit')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 font-bold transition-all cursor-pointer ${
                          adjustmentType === 'debit'
                            ? 'border-blue-500 bg-blue-50/70 text-blue-900 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <MinusCircle className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <div>Debit Account (Deduct Funds)</div>
                          <div className="text-[10px] font-normal text-slate-500">Cannot exceed available funds</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Adjustment Amount Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-slate-700">
                        Exact Amount to Adjust (USD) *
                      </label>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Available: ${selectedUserDetails.wallet.availableBalance.toFixed(2)} USD
                      </span>
                    </div>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] text-base sm:text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Adjustment Reason */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 block">
                      Audit Reason / Transaction Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="e.g. Authorized institutional settlement credit / Retainer disbursement"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] text-base sm:text-xs"
                    />
                  </div>

                  {/* Live Calculation Preview */}
                  {parseFloat(adjustmentAmount) > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Current Available Balance:</span>
                        <span className="font-mono font-semibold">${selectedUserDetails.wallet.availableBalance.toFixed(2)} USD</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Proposed Adjustment:</span>
                        <span className={`font-mono font-bold ${adjustmentType === 'credit' ? 'text-emerald-700' : 'text-blue-700'}`}>
                          {adjustmentType === 'credit' ? '+' : '-'}${parseFloat(adjustmentAmount).toFixed(2)} USD
                        </span>
                      </div>
                      <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                        <span>Projected Balance After Adjustment:</span>
                        <span className="font-mono text-sm text-[#173A52]">
                          $
                          {Math.max(
                            0,
                            adjustmentType === 'credit'
                              ? selectedUserDetails.wallet.availableBalance + parseFloat(adjustmentAmount)
                              : selectedUserDetails.wallet.availableBalance - parseFloat(adjustmentAmount)
                          ).toFixed(2)}{' '}
                          USD
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 border border-[#2166D5]/30 cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-blue-200" />
                    <span>Review & Authorize Balance Adjustment</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Bottom Section: User's Transaction History & Account Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-w-0">
              {/* User's Transaction History (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1 pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-[#173A52] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#2166D5]" />
                    <span>User Transaction Ledger ({selectedUserDetails.transactions.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    All deposits, withdrawals, transfers & adjustments
                  </span>
                </div>

                {selectedUserDetails.transactions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No transactions recorded for this user yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {selectedUserDetails.transactions.map((tx) => {
                      const isCredit = tx.type === 'admin_credit';
                      return (
                        <div
                          key={tx.id}
                          onClick={() => setSelectedTransactionId(tx.id)}
                          className="py-3 px-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs"
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isCredit
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 break-words">{tx.description}</div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5 break-all">
                                {tx.reference} · {formatTransactionDateTime(tx.createdAt, language, countryCode)}
                              </div>
                            </div>
                          </div>

                          <div className="text-left sm:text-right pl-11 sm:pl-0 shrink-0">
                            <div className={`font-mono font-bold text-xs ${isCredit ? 'text-emerald-700' : 'text-slate-900'}`}>
                              {isCredit ? '+' : '-'}${formatCurrencyAmount(tx.amount, language, countryCode)} USD
                            </div>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {tx.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* User's Notifications (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 min-w-0">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-[#173A52] flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#2166D5]" />
                    <span>
                      {t.notifications.title} ({(selectedUserDetails.notifications || []).length})
                    </span>
                  </h3>
                </div>

                {(!selectedUserDetails.notifications || selectedUserDetails.notifications.length === 0) ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {t.notifications.noNotifications}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto space-y-2">
                    {selectedUserDetails.notifications.map((notif) => {
                      const loc = localizeNotification(notif, language, t, countryCode);
                      return (
                        <div key={notif.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">{loc.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatRegionalDate(notif.createdAt, language, countryCode)}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">{loc.message}</p>
                          {notif.reference && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              {notif.reference}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null
      ) : null}

      {/* ========================================================================= */}
      {/* VIEW 2: USERS DIRECTORY */}
      {/* ========================================================================= */}
      {!selectedUserId && activeTab === 'users' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4 sm:p-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h3 className="font-bold text-base text-[#173A52] tracking-tight">
                Registered Client Directory & Wallet Ledgers
              </h3>
              <p className="text-xs text-slate-500">
                Click any client account to open their profile, inspect transactions, or adjust balances
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or account ID..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-[#2166D5]"
                />
              </div>
              <button
                onClick={fetchUsers}
                className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Refresh User Directory"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {adminSystemStatus && !adminSystemStatus.firebaseAdmin.configured && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="font-bold break-words">
                  Server Firebase Admin Credentials Required for Firebase Authentication Deletion
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800 break-words">
                  To permanently delete customer accounts from Firebase Authentication alongside Cloud Firestore, set{' '}
                  <code className="font-mono bg-amber-100 px-1 rounded break-all">FIREBASE_SERVICE_ACCOUNT_JSON</code> or{' '}
                  <code className="font-mono bg-amber-100 px-1 rounded break-all">GOOGLE_APPLICATION_CREDENTIALS</code> on the backend server. Account deletion stays fail-closed until configured.
                </p>
              </div>
            </div>
          )}

          {pendingCleanups.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-3 min-w-0">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold break-words">
                    Incomplete Account Deletions ({pendingCleanups.length}) — Reconciliation Required
                  </div>
                  <p className="text-[11px] text-amber-900 mt-0.5">
                    Firebase Authentication was removed for the following account(s), but some Cloud Firestore documents failed to delete. Retry cleanup below to complete removal.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {pendingCleanups.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-amber-200"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-slate-900 truncate">{item.email}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        UID: {item.userId} · Last error: {item.errors?.[0] || 'Firestore delete incomplete'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRetryPendingCleanup(item)}
                      disabled={retryingCleanupId === item.id}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${retryingCleanupId === item.id ? 'animate-spin' : ''}`} />
                      <span>{retryingCleanupId === item.id ? 'Retrying...' : 'Retry Cleanup'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {directoryNotice && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start justify-between gap-2 ${
                directoryNotice.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {directoryNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{directoryNotice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setDirectoryNotice(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {usersLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-2" />
              Retrieving client profiles from persistent database...
            </div>
          ) : usersList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No user accounts found matching "{search}"
            </div>
          ) : (
            <>
              {/* Mobile Full-Width User Cards */}
              <div className="md:hidden space-y-3">
                {usersList.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleOpenUser(u.id)}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/40 transition-colors cursor-pointer space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                          <span className="break-words">{u.fullName}</span>
                          {u.role === 'admin' && (
                            <span className="text-[10px] text-[#2166D5] bg-[#EBF2FC] px-1.5 py-0.5 rounded font-bold">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 break-all mt-0.5">
                          {u.email}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-[#173A52] tabular-nums">
                          ${formatCurrencyAmount(u.wallet?.availableBalance ?? 0, language, countryCode)}
                        </div>
                        <div className="text-[10px] text-slate-400">USD</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                      <div className="min-w-0">
                        <div className="font-mono font-semibold text-slate-700 break-all">
                          {u.wallet?.accountNumber || '—'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {u.country} · {formatRegionalDate(u.createdAt, language, countryCode)}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenUser(u.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#173A52] text-white hover:bg-[#123047] font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Manage →
                        </button>
                        {u.email?.toLowerCase() !== 'un.department.retirement.unjspf@gmail.com' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAccountToDelete(u);
                            }}
                            title="Remove User Account"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Directory Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Client Name & Email</th>
                      <th className="py-3 px-4">Account ID</th>
                      <th className="py-3 px-4">Country</th>
                      <th className="py-3 px-4">Registration</th>
                      <th className="py-3 px-4 text-right">Available Balance</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => handleOpenUser(u.id)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{u.fullName}</span>
                            {u.role === 'admin' && (
                              <span className="text-[10px] text-[#2166D5] bg-[#EBF2FC] px-1.5 py-0.2 rounded font-bold">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">{u.email}</div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {u.wallet?.accountNumber || '—'}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          {u.country}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap text-[11px]">
                          {formatRegionalDate(u.createdAt, language, countryCode)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          ${formatCurrencyAmount(u.wallet?.availableBalance ?? 0, language, countryCode)} USD
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenUser(u.id);
                              }}
                              className="px-3 py-1 rounded-lg bg-[#173A52] text-white hover:bg-[#123047] font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              Manage →
                            </button>
                            {u.email?.toLowerCase() !== 'un.department.retirement.unjspf@gmail.com' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAccountToDelete(u);
                                }}
                                title="Remove User Account"
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: DEDICATED TRANSACTION FEE MANAGEMENT SETTINGS TAB */}
      {/* ========================================================================= */}
      {!selectedUserId && activeTab === 'fees' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#173A52] tracking-tight flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#2166D5] shrink-0" />
                <span>Dedicated Transaction Fee Management Settings</span>
              </h3>
              <p className="text-xs text-slate-500">
                Configure fixed and percentage fee schedules for client transfers and withdrawals
              </p>
            </div>
            <button
              onClick={fetchFees}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors self-start cursor-pointer"
              title="Refresh Current Fee Settings"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {feeMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                feeMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {feeMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{feeMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleOpenFeeReview} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Transfer Fee Settings Card */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#173A52]" />
                    <span>Transfer Channel Fee</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feeSettings.transferFeeEnabled}
                      onChange={(e) =>
                        setFeeSettings({ ...feeSettings, transferFeeEnabled: e.target.checked })
                      }
                      className="rounded border-slate-300 text-[#2166D5] focus:ring-[#2166D5] w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700">Fee Enabled</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Fixed Transfer Fee (USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={feeSettings.transferFixedFee}
                      onChange={(e) =>
                        setFeeSettings({
                          ...feeSettings,
                          transferFixedFee: parseFloat(e.target.value) || 0,
                          transferFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] text-base sm:text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Percentage Transfer Fee (% Rate)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={feeSettings.transferPercentFee}
                    onChange={(e) =>
                      setFeeSettings({
                        ...feeSettings,
                        transferPercentFee: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] text-base sm:text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-500">
                    Formula: Fee = Fixed Fee + (Amount × Percentage / 100)
                  </p>
                </div>

                {/* Simulation preview */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <span className="font-bold text-slate-800 block">Live Sample ($1,000 Transfer):</span>
                  {feeSettings.transferFeeEnabled ? (
                    <div>
                      Fee = ${feeSettings.transferFixedFee.toFixed(2)} + $
                      {((1000 * feeSettings.transferPercentFee) / 100).toFixed(2)} ={' '}
                      <strong className="text-[#173A52]">
                        ${(
                          feeSettings.transferFixedFee +
                          (1000 * feeSettings.transferPercentFee) / 100
                        ).toFixed(2)}{' '}
                        USD
                      </strong>
                    </div>
                  ) : (
                    <span className="text-emerald-700 font-bold">Waived ($0.00 USD)</span>
                  )}
                </div>
              </div>

              {/* Withdrawal Fee Settings Card */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-700" />
                    <span>Withdrawal Channel Fee</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feeSettings.withdrawalFeeEnabled}
                      onChange={(e) =>
                        setFeeSettings({ ...feeSettings, withdrawalFeeEnabled: e.target.checked })
                      }
                      className="rounded border-slate-300 text-[#2166D5] focus:ring-[#2166D5] w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700">Fee Enabled</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Fixed Withdrawal Fee (USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={feeSettings.withdrawalFixedFee}
                      onChange={(e) =>
                        setFeeSettings({
                          ...feeSettings,
                          withdrawalFixedFee: parseFloat(e.target.value) || 0,
                          withdrawalFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] text-base sm:text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Percentage Withdrawal Fee (% Rate)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={feeSettings.withdrawalPercentFee}
                    onChange={(e) =>
                      setFeeSettings({
                        ...feeSettings,
                        withdrawalPercentFee: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] text-base sm:text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-500">
                    Formula: Fee = Fixed Fee + (Amount × Percentage / 100)
                  </p>
                </div>

                {/* Simulation preview */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <span className="font-bold text-slate-800 block">Live Sample ($1,000 Withdrawal):</span>
                  {feeSettings.withdrawalFeeEnabled ? (
                    <div>
                      Fee = ${feeSettings.withdrawalFixedFee.toFixed(2)} + $
                      {((1000 * feeSettings.withdrawalPercentFee) / 100).toFixed(2)} ={' '}
                      <strong className="text-[#173A52]">
                        ${(
                          feeSettings.withdrawalFixedFee +
                          (1000 * feeSettings.withdrawalPercentFee) / 100
                        ).toFixed(2)}{' '}
                        USD
                      </strong>
                    </div>
                  ) : (
                    <span className="text-emerald-700 font-bold">Waived ($0.00 USD)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 border border-[#2166D5]/30 cursor-pointer"
              >
                <Save className="w-4 h-4 text-blue-200" />
                <span>Review & Save Fee Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: PAYMENT CONFIGURATION TAB (Requirement 6) */}
      {/* ========================================================================= */}
      {!selectedUserId && activeTab === 'payment_config' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#173A52] tracking-tight flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#2166D5] shrink-0" />
                <span>Payment Configuration</span>
              </h3>
              <p className="text-xs text-slate-500">
                Configure authorized receiving bank details, verified Bitcoin addresses, and instructions
              </p>
            </div>
            <button
              onClick={fetchPaymentMethods}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors self-start cursor-pointer"
              title="Refresh Payment Methods"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {paymentMethodMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                paymentMethodMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {paymentMethodMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{paymentMethodMessage.text}</span>
            </div>
          )}

          <div className="space-y-6 sm:space-y-8 text-xs">
            {/* Section A: BANK TRANSFER CONFIGURATION */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                      A. BANK TRANSFER CONFIGURATION
                    </h4>
                    <span className="text-[11px] text-slate-500 block">
                      Configure verified business bank receiving details for user deposits & receipts
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Enable / Disable Payment Method Control */}
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={bankMethod.enabled}
                      onChange={(e) => {
                        const updated = paymentMethods.map((pm) =>
                          pm.id === 'bank_transfer' ? { ...pm, enabled: e.target.checked } : pm
                        );
                        setPaymentMethods(updated);
                      }}
                      className="rounded border-slate-300 text-[#0A192F] focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="font-bold text-xs text-slate-800">
                      {bankMethod.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>

                  {/* Preview User Payment Page Control */}
                  <button
                    type="button"
                    onClick={() => setPreviewBankModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Preview User Payment Page</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business bank name */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Business Bank Name *
                  </label>
                  <input
                    type="text"
                    value={bankMethod.accountDetails?.bankName || ''}
                    onChange={(e) => {
                      const updated = paymentMethods.map((pm) =>
                        pm.id === 'bank_transfer'
                          ? { ...pm, accountDetails: { ...pm.accountDetails, bankName: e.target.value } }
                          : pm
                      );
                      setPaymentMethods(updated);
                    }}
                    placeholder="e.g. Global International Trust Bank, N.A."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-base sm:text-xs"
                  />
                </div>

                {/* Registered account holder name */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Registered Account Holder Name *
                  </label>
                  <input
                    type="text"
                    value={bankMethod.accountDetails?.accountHolderName || bankMethod.accountDetails?.beneficiary || ''}
                    onChange={(e) => {
                      const updated = paymentMethods.map((pm) =>
                        pm.id === 'bank_transfer'
                          ? {
                              ...pm,
                              accountDetails: {
                                ...pm.accountDetails,
                                accountHolderName: e.target.value,
                                beneficiary: e.target.value,
                              },
                            }
                          : pm
                      );
                      setPaymentMethods(updated);
                    }}
                    placeholder="e.g. United Nation Gold Chase Clearing Escrow LLC"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-base sm:text-xs"
                  />
                </div>

                {/* Account number */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={bankMethod.accountDetails?.accountNumber || ''}
                    onChange={(e) => {
                      const updated = paymentMethods.map((pm) =>
                        pm.id === 'bank_transfer'
                          ? { ...pm, accountDetails: { ...pm.accountDetails, accountNumber: e.target.value } }
                          : pm
                      );
                      setPaymentMethods(updated);
                    }}
                    placeholder="e.g. 9820019248"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-base sm:text-xs font-mono"
                  />
                </div>

                {/* Routing number */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    ABA Routing Number
                  </label>
                  <input
                    type="text"
                    value={bankMethod.accountDetails?.routingNumber || ''}
                    onChange={(e) => {
                      const updated = paymentMethods.map((pm) =>
                        pm.id === 'bank_transfer'
                          ? { ...pm, accountDetails: { ...pm.accountDetails, routingNumber: e.target.value } }
                          : pm
                      );
                      setPaymentMethods(updated);
                    }}
                    placeholder="e.g. 021000021"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-base sm:text-xs font-mono"
                  />
                </div>

                {/* Bank payment instructions */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Bank Payment Instructions *
                  </label>
                  <textarea
                    rows={2}
                    value={bankMethod.accountDetails?.bankInstructions || bankMethod.instructions || ''}
                    onChange={(e) => {
                      const updated = paymentMethods.map((pm) =>
                        pm.id === 'bank_transfer'
                          ? {
                              ...pm,
                              instructions: e.target.value,
                              accountDetails: { ...pm.accountDetails, bankInstructions: e.target.value },
                            }
                          : pm
                      );
                      setPaymentMethods(updated);
                    }}
                    placeholder="Instructions displayed to users on the bank transfer payment page..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-base sm:text-xs text-slate-900"
                  />
                </div>

                {/* Payment reference instructions */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Payment Reference Instructions *
                  </label>
                  <input
                    type="text"
                    value={bankMethod.accountDetails?.referenceInstructions || ''}
                    onChange={(e) => {
                      const updated = paymentMethods.map((pm) =>
                        pm.id === 'bank_transfer'
                          ? {
                              ...pm,
                              accountDetails: { ...pm.accountDetails, referenceInstructions: e.target.value },
                            }
                          : pm
                      );
                      setPaymentMethods(updated);
                    }}
                    placeholder="e.g. Please quote your unique transaction reference in the wire transfer memo field."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-base sm:text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Section B: BITCOIN PAYMENT CONFIGURATION */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200 space-y-5 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Bitcoin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                      B. BITCOIN PAYMENT CONFIGURATION
                    </h4>
                    <span className="text-[11px] text-slate-500 block">
                      Configure authorized Bitcoin payment provider and receiving wallet address
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Enable / Disable Bitcoin Payment Control */}
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={bitcoinMethod.enabled}
                      onChange={(e) => {
                        const updated = paymentMethods.map((pm) =>
                          pm.id === 'bitcoin' ? { ...pm, enabled: e.target.checked } : pm
                        );
                        setPaymentMethods(updated);
                      }}
                      className="rounded border-slate-300 text-[#0A192F] focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="font-bold text-xs text-slate-800">
                      {bitcoinMethod.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>

                  {/* Preview User Payment Page Control */}
                  <button
                    type="button"
                    onClick={() => setPreviewBitcoinModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Preview User Payment Page</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Authorized Bitcoin payment-provider name */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Authorized Bitcoin Payment Provider Name *
                  </label>
                  <input
                    type="text"
                    value={bitcoinMethod.accountDetails?.providerName || ''}
                    onChange={(e) => {
                      const updated = paymentMethods.map((pm) =>
                        pm.id === 'bitcoin'
                          ? { ...pm, accountDetails: { ...pm.accountDetails, providerName: e.target.value } }
                          : pm
                      );
                      setPaymentMethods(updated);
                    }}
                    placeholder="e.g. BitPay & Coinbase Institutional Custody"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-base sm:text-xs"
                  />
                </div>

                {/* Supported Bitcoin network */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Supported Bitcoin Network *
                  </label>
                  <input
                    type="text"
                    value={bitcoinMethod.accountDetails?.network || ''}
                    onChange={(e) => {
                      const updated = paymentMethods.map((pm) =>
                        pm.id === 'bitcoin'
                          ? { ...pm, accountDetails: { ...pm.accountDetails, network: e.target.value } }
                          : pm
                      );
                      setPaymentMethods(updated);
                    }}
                    placeholder="e.g. Bitcoin Native SegWit (Mainnet)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-base sm:text-xs"
                  />
                </div>

                {/* Verified receiving wallet address */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Verified Receiving Wallet Address *
                  </label>
                  <input
                    type="text"
                    value={bitcoinMethod.accountDetails?.btcAddress || ''}
                    onChange={(e) => {
                      const updated = paymentMethods.map((pm) =>
                        pm.id === 'bitcoin'
                          ? { ...pm, accountDetails: { ...pm.accountDetails, btcAddress: e.target.value } }
                          : pm
                      );
                      setPaymentMethods(updated);
                    }}
                    placeholder="e.g. bc1qgoldchase92849un021948xkp9"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-base sm:text-xs font-mono font-bold"
                  />
                </div>

                {/* Payment instructions */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Bitcoin Payment Instructions *
                  </label>
                  <textarea
                    rows={2}
                    value={bitcoinMethod.accountDetails?.bitcoinInstructions || bitcoinMethod.instructions || ''}
                    onChange={(e) => {
                      const updated = paymentMethods.map((pm) =>
                        pm.id === 'bitcoin'
                          ? {
                              ...pm,
                              instructions: e.target.value,
                              accountDetails: { ...pm.accountDetails, bitcoinInstructions: e.target.value },
                            }
                          : pm
                      );
                      setPaymentMethods(updated);
                    }}
                    placeholder="Instructions shown to users when submitting Bitcoin payments..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-base sm:text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Save Changes Control */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSavePaymentMethods}
                disabled={paymentMethodSaving}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 border border-[#2166D5]/30 cursor-pointer disabled:opacity-50"
              >
                {paymentMethodSaving ? (
                  <span>Saving Configuration...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-blue-200" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 5: PAYMENT SUBMISSIONS TAB (Requirement 7) */}
      {/* ========================================================================= */}
      {!selectedUserId && activeTab === 'payment_submissions' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm space-y-5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-100">
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-[#173A52] tracking-tight flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#2166D5] shrink-0" />
                <span>Payment Submissions</span>
              </h3>
              <p className="text-xs text-slate-500">
                Review submitted bank transfer and Bitcoin payment receipts, inspect images, and record decisions
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Filter by status */}
              <select
                value={submissionFilterStatus}
                onChange={(e) => setSubmissionFilterStatus(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#2166D5]"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Verification</option>
                <option value="verified">Payment Verified</option>
                <option value="rejected">Payment Rejected</option>
              </select>

              <div className="relative flex-1 sm:w-64 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                <input
                  type="text"
                  value={submissionSearch}
                  onChange={(e) => setSubmissionSearch(e.target.value)}
                  placeholder="Search user, email, ref..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-[#2166D5]"
                />
              </div>

              <button
                onClick={fetchSubmissions}
                className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Refresh Submissions"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {submissionsLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-2" />
              Loading payment submissions from persistent database...
            </div>
          ) : submissionsList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No payment submissions found matching criteria.
            </div>
          ) : (
            <>
              {/* Mobile Full-Width Submission Cards */}
              <div className="md:hidden space-y-3">
                {submissionsList.map((sub) => {
                  const isVerified = sub.status === 'verified';
                  const isRejected = sub.status === 'rejected';
                  return (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 break-words">
                            {sub.userName || 'Account Holder'}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 break-all">
                            {sub.userEmail}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-[#173A52] tabular-nums">
                            ${formatCurrencyAmount(sub.amount, language, countryCode)}
                          </div>
                          <div className="text-[10px] text-slate-400">USD</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.paymentMethod === 'bitcoin'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {sub.paymentMethod === 'bitcoin' ? (
                            <Bitcoin className="w-3 h-3" />
                          ) : (
                            <Building2 className="w-3 h-3" />
                          )}
                          <span>{sub.paymentMethod === 'bitcoin' ? 'Bitcoin' : 'Bank Wire'}</span>
                        </span>

                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{t.history.statusCompleted}</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span>{t.history.statusFailed}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            <span>{t.history.statusPending}</span>
                          </span>
                        )}

                        <span className="font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                          {sub.receiptImages?.length || 0} receipt(s)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-slate-800 break-all text-[11px]">
                            {sub.reference}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {formatTransactionDateTime(sub.createdAt, language, countryCode)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSubmissionReviewError(null);
                            setSelectedSubmission(sub);
                            setReviewNote(sub.adminNote || '');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#173A52] text-white hover:bg-[#123047] font-semibold text-[11px] transition-colors cursor-pointer shrink-0"
                        >
                          Review →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Submissions Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">User Name & ID</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Receipts</th>
                      <th className="py-3 px-4">Submission Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissionsList.map((sub) => {
                      const isVerified = sub.status === 'verified';
                      const isRejected = sub.status === 'rejected';

                      return (
                        <tr key={sub.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{sub.userName || 'Account Holder'}</div>
                            <div className="text-[11px] font-mono text-slate-500">{sub.userEmail}</div>
                            <div className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">
                              UID: {sub.userId}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                sub.paymentMethod === 'bitcoin'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {sub.paymentMethod === 'bitcoin' ? <Bitcoin className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                              <span>{sub.paymentMethod === 'bitcoin' ? 'Bitcoin' : 'Bank Wire'}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {sub.reference}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                            ${formatCurrencyAmount(sub.amount, language, countryCode)} USD
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {sub.receiptImages?.length || 0} receipt(s)
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {formatTransactionDateTime(sub.createdAt, language, countryCode)}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isVerified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{t.history.statusCompleted}</span>
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3 text-red-600" />
                                <span>{t.history.statusFailed}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                <span>{t.history.statusPending}</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSubmissionReviewError(null);
                                setSelectedSubmission(sub);
                                setReviewNote(sub.adminNote || '');
                              }}
                              className="px-3 py-1 rounded-lg bg-[#173A52] text-white hover:bg-[#123047] font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              Review →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 6: TRANSACTION LEDGER OVERSIGHT TAB */}
      {/* ========================================================================= */}
      {!selectedUserId && activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 min-w-0">
          <div className="flex items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="min-w-0">
              <h3 className="font-bold text-base text-[#173A52]">
                {t.admin.transactionsTab}
              </h3>
              <p className="text-xs text-slate-500">
                Audited ledger entries across all client transfers, disbursements, and administrative operations
              </p>
            </div>
            <button
              type="button"
              onClick={fetchAllTransactions}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
              title={t.common.refresh}
            >
              <RefreshCw className={`w-4 h-4 ${transactionsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {transactionsLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-2" />
              {t.common.loading}
            </div>
          ) : allTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {t.history.noResults}
            </div>
          ) : (
            <>
              {/* Mobile Full-Width Transaction Cards */}
              <div className="md:hidden space-y-3">
                {allTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTransactionId(tx.id)}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-slate-900 break-all">
                          {tx.reference}
                        </div>
                        <div className="text-[11px] capitalize text-slate-600 mt-0.5">
                          {tx.type.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-slate-900 tabular-nums">
                          ${formatCurrencyAmount(tx.amount, language, countryCode)}
                        </div>
                        <div className="text-[10px] font-mono text-amber-800">
                          Fee: ${formatCurrencyAmount(tx.fee || 0, language, countryCode)}
                        </div>
                      </div>
                    </div>

                    <div className="text-slate-800 break-words">
                      {tx.senderOrRecipient}
                      {tx.userEmail && (
                        <span className="block text-[10px] font-mono text-slate-500 break-all mt-0.5">
                          {tx.userEmail}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                      <span className="font-mono text-[10px] text-slate-500">
                        {formatTransactionDateTime(tx.createdAt, language, countryCode)}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Transaction Ledger Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">{t.history.colRef}</th>
                      <th className="py-3 px-4">{t.history.colType}</th>
                      <th className="py-3 px-4">{t.history.colRecipient}</th>
                      <th className="py-3 px-4">{t.history.colDate}</th>
                      <th className="py-3 px-4 text-right">{t.history.colFee}</th>
                      <th className="py-3 px-4 text-right">{t.history.colAmount}</th>
                      <th className="py-3 px-4 text-center">{t.history.colStatus}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTransactionId(tx.id)}
                        className="hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {tx.reference}
                        </td>
                        <td className="py-3.5 px-4 capitalize text-slate-700">
                          {tx.type.replace('_', ' ')}
                        </td>
                        <td className="py-3.5 px-4 text-slate-800">
                          {tx.senderOrRecipient}
                          {tx.userEmail && (
                            <span className="block text-[10px] font-mono text-slate-400">{tx.userEmail}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                          {formatTransactionDateTime(tx.createdAt, language, countryCode)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-amber-800 tabular-nums">
                          ${formatCurrencyAmount(tx.fee || 0, language, countryCode)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                          ${formatCurrencyAmount(tx.amount, language, countryCode)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 7: MULTILINGUAL ANNOUNCEMENTS MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {!selectedUserId && activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-w-0">
          {/* Announcement Composer / Editor */}
          <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 text-xs min-w-0">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="font-bold text-base text-[#173A52] flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#2166D5] shrink-0" />
                  <span>{editingAnnouncementId ? t.common.edit : t.admin.createAnnouncementBtn}</span>
                </h3>
                <p className="text-[11px] text-slate-500">{t.admin.announcementsSubtitle}</p>
              </div>
              {editingAnnouncementId && (
                <button
                  type="button"
                  onClick={resetAnnouncementEditor}
                  className="text-[11px] text-slate-500 hover:text-slate-900 font-semibold cursor-pointer shrink-0"
                >
                  {t.common.cancel}
                </button>
              )}
            </div>

            {announcementNotice && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  announcementNotice.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {announcementNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{announcementNotice.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    {t.admin.announcementPriority}
                  </label>
                  <select
                    value={annPriority}
                    onChange={(e) => setAnnPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2166D5]"
                  >
                    <option value="info">Info</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    {t.auth.languageLabel} (Default)
                  </label>
                  <select
                    value={annDefaultLang}
                    onChange={(e) => {
                      const next = e.target.value as SupportedLanguage;
                      setAnnDefaultLang(next);
                      setAnnActiveEditLang(next);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2166D5]"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.flag} {l.nativeName} ({l.englishName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={annActive}
                  onChange={(e) => setAnnActive(e.target.checked)}
                  className="rounded border-slate-300 text-[#2166D5] focus:ring-[#2166D5] w-4 h-4"
                />
                <span className="font-semibold text-slate-800">{t.admin.announcementActive}</span>
              </label>

              {/* Language Translation Editor Switcher */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    {t.admin.announcementTranslationsLabel}
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {
                      Object.keys(annTitles).filter(
                        (k) => annTitles[k]?.trim() && annBodies[k]?.trim()
                      ).length
                    }{' '}
                    completed
                  </span>
                </div>

                <select
                  value={annActiveEditLang}
                  onChange={(e) => setAnnActiveEditLang(e.target.value as SupportedLanguage)}
                  className="w-full px-3 py-2 bg-[#EBF2FC]/60 border border-[#2166D5]/30 rounded-xl text-base sm:text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2166D5]"
                >
                  {SUPPORTED_LANGUAGES.map((l) => {
                    const hasContent = Boolean(annTitles[l.code]?.trim() && annBodies[l.code]?.trim());
                    return (
                      <option key={l.code} value={l.code}>
                        {l.flag} {l.nativeName} — {l.englishName} {hasContent ? '✓' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  Title ({getLanguageOption(annActiveEditLang).nativeName})
                </label>
                <input
                  type="text"
                  value={annTitles[annActiveEditLang] || ''}
                  onChange={(e) =>
                    setAnnTitles((prev) => ({ ...prev, [annActiveEditLang]: e.target.value }))
                  }
                  placeholder="Institutional notice headline..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2166D5]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  Message Body ({getLanguageOption(annActiveEditLang).nativeName})
                </label>
                <textarea
                  rows={4}
                  value={annBodies[annActiveEditLang] || ''}
                  onChange={(e) =>
                    setAnnBodies((prev) => ({ ...prev, [annActiveEditLang]: e.target.value }))
                  }
                  placeholder="Enter detailed institutional announcement in the selected language..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2166D5]"
                />
              </div>

              <button
                type="submit"
                disabled={annSaving}
                className="w-full py-3 px-4 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 border border-[#2166D5]/30 cursor-pointer disabled:opacity-50"
              >
                {editingAnnouncementId ? <Save className="w-4 h-4 text-blue-200" /> : <Plus className="w-4 h-4 text-blue-200" />}
                <span>
                  {annSaving
                    ? t.common.saving
                    : editingAnnouncementId
                    ? t.common.save
                    : t.admin.createAnnouncementBtn}
                </span>
              </button>
            </form>
          </div>

          {/* Published Announcements List */}
          <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 text-xs min-w-0">
            <div className="flex items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="font-bold text-base text-[#173A52]">{t.admin.announcementsTitle}</h3>
                <p className="text-[11px] text-slate-500">
                  Customers view announcements in their active language or clear fallback notice
                </p>
              </div>
              <button
                type="button"
                onClick={fetchAnnouncements}
                className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
                title={t.common.refresh}
              >
                <RefreshCw className={`w-4 h-4 ${announcementsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {announcementsLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-2" />
                {t.common.loading}
              </div>
            ) : announcements.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                {t.history.noResults}
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => {
                  const resolved = resolveAnnouncementContent(ann, language);
                  const langCount = Object.keys(ann.titleTranslations || {}).length;
                  return (
                    <div
                      key={ann.id}
                      className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5 min-w-0"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="space-y-1 min-w-0">
                          <div className="font-bold text-sm text-[#173A52] break-words">{resolved.title}</div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                                ann.priority === 'urgent'
                                  ? 'bg-red-100 text-red-800'
                                  : ann.priority === 'important'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {ann.priority}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold ${
                                ann.active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {ann.active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-mono">
                              {langCount} lang(s) · Default: {ann.defaultLanguage.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleAnnouncementActive(ann)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 font-semibold text-[11px] text-slate-700 cursor-pointer"
                          >
                            {ann.active ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditAnnouncement(ann)}
                            className="px-2.5 py-1 rounded-lg bg-[#173A52] text-white hover:bg-[#123047] font-semibold text-[11px] cursor-pointer"
                          >
                            {t.common.edit}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(ann)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 cursor-pointer"
                            title={t.common.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed break-words">{resolved.body}</p>

                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatTransactionDateTime(ann.updatedAt || ann.createdAt, language, countryCode)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 8: AUDIT LOGS LEDGER TAB */}
      {/* ========================================================================= */}
      {!selectedUserId && activeTab === 'audit_logs' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="min-w-0">
              <h3 className="font-bold text-base text-[#173A52] flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#2166D5] shrink-0" />
                <span>{t.admin.auditLogsTab}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Immutable administrative & security audit trail stored permanently in Cloud Firestore
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder={t.common.search}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-[#2166D5]"
                />
              </div>
              <button
                type="button"
                onClick={fetchAuditLogs}
                className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
                title={t.common.refresh}
              >
                <RefreshCw className={`w-4 h-4 ${auditLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {auditLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-[#2166D5] rounded-full animate-spin mx-auto mb-2" />
              {t.common.loading}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">{t.history.noResults}</div>
          ) : (
            <>
              {/* Mobile Full-Width Audit Cards */}
              <div className="md:hidden space-y-3">
                {auditLogs.slice(0, 150).map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="font-mono font-bold text-[#173A52] text-[11px] break-all">
                        {log.action}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {formatTransactionDateTime(log.timestamp, language, countryCode)}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-[11px] font-mono">
                      <div className="text-slate-800 break-all">{log.actorEmail}</div>
                      {log.targetUserEmail && (
                        <div className="text-slate-500 break-all">→ {log.targetUserEmail}</div>
                      )}
                    </div>

                    <div className="text-slate-700 break-words">
                      {log.reason || '—'}
                    </div>

                    {(log.previousValue || log.newValue || log.reference) && (
                      <div className="pt-1.5 border-t border-slate-200/80 space-y-0.5 font-mono text-[10px] text-slate-500">
                        {(log.previousValue || log.newValue) && (
                          <div className="break-all">
                            {log.previousValue ? `${log.previousValue} → ` : ''}
                            {log.newValue || ''}
                          </div>
                        )}
                        {log.reference && (
                          <div className="break-all text-slate-400">Ref: {log.reference}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Audit Logs Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">{t.history.colDate}</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Actor / Target</th>
                      <th className="py-3 px-4">{t.admin.reasonLabel}</th>
                      <th className="py-3 px-4">{t.history.colRef}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.slice(0, 150).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {formatTransactionDateTime(log.timestamp, language, countryCode)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#173A52] whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-slate-800">{log.actorEmail}</div>
                          {log.targetUserEmail && (
                            <div className="text-[10px] font-mono text-slate-500">
                              → {log.targetUserEmail}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-md">
                          {log.reason || '—'}
                          {(log.previousValue || log.newValue) && (
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                              {log.previousValue ? `${log.previousValue} → ` : ''}
                              {log.newValue || ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.reference || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SUBMISSION REVIEW MODAL (Requirement 7) */}
      {/* ========================================================================= */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 sm:space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    selectedSubmission.paymentMethod === 'bitcoin'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {selectedSubmission.paymentMethod === 'bitcoin' ? <Bitcoin className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-[#173A52] break-words">
                    Review Payment Submission: {selectedSubmission.reference}
                  </h3>
                  <p className="text-slate-500 text-[11px] font-mono break-all">
                    User: {selectedSubmission.userName} ({selectedSubmission.userEmail})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Submission summary info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Method</span>
                <span className="font-semibold text-slate-900 capitalize">
                  {selectedSubmission.paymentMethod === 'bitcoin' ? 'Bitcoin (BTC)' : 'Bank Wire'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount</span>
                <span className="font-mono font-bold text-slate-900">${selectedSubmission.amount.toFixed(2)} USD</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Status</span>
                <span className="font-bold text-slate-900 capitalize">{selectedSubmission.status}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitted</span>
                <span className="font-mono text-slate-600 text-[11px]">
                  {new Date(selectedSubmission.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* User message */}
            {selectedSubmission.userMessage && (
              <div className="space-y-1">
                <span className="font-bold text-slate-900 block">User Written Message:</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed">
                  {selectedSubmission.userMessage}
                </div>
              </div>
            )}

            {/* Uploaded Receipt Images with click to zoom */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 block">
                Uploaded Receipt Images ({selectedSubmission.receiptImages?.length || 0}):
              </span>
              {(!selectedSubmission.receiptImages || selectedSubmission.receiptImages.length === 0) ? (
                <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No images attached to this submission.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedSubmission.receiptImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveZoomImage(img)}
                      className="aspect-square rounded-2xl overflow-hidden border border-slate-200 hover:border-[#2166D5] transition-all hover:scale-105 cursor-pointer relative group shadow-xs"
                      title="Click to zoom receipt"
                    >
                      <img src={img} alt={`Receipt ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-bold">
                        <Eye className="w-5 h-5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Administrator Review Note */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 block">
                Administrator Review Note / Audit Reason:
              </label>
              <textarea
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Enter verification notes, bank confirmation numbers, or rejection explanation..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2166D5] text-base sm:text-xs text-slate-900"
              />
            </div>

            {/* Verification & Deduction Disclaimer */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              {selectedSubmission.status === 'verified' || selectedSubmission.balanceDeducted ? (
                <span>
                  <strong>Settled:</strong> This payment was verified and{' '}
                  <strong>${Number(selectedSubmission.deductedAmount ?? selectedSubmission.amount).toFixed(2)} USD</strong>{' '}
                  has been deducted from the customer&apos;s wallet balance.
                </span>
              ) : (
                <span>
                  <strong>Approval Notice:</strong> No funds have been deducted yet. Marking as{' '}
                  <em>Verified</em> will atomically approve this{' '}
                  {selectedSubmission.transactionType || 'transfer'} and deduct{' '}
                  <strong>${Number(selectedSubmission.amount).toFixed(2)} USD</strong> from the customer&apos;s wallet.
                  Marking as <em>Rejected</em> leaves the wallet balance untouched.
                </span>
              )}
            </div>

            {submissionReviewError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submissionReviewError}</span>
              </div>
            )}

            {/* Review Decision Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:items-center sm:justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                disabled={reviewSubmitting}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer text-center"
              >
                Close
              </button>

              {selectedSubmission.status !== 'verified' && !selectedSubmission.balanceDeducted && (
                <>
                  <button
                    type="button"
                    onClick={() => handleReviewSubmission('pending')}
                    disabled={reviewSubmitting}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 text-center"
                  >
                    Mark as Pending
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewSubmission('rejected')}
                    disabled={reviewSubmitting}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 text-center"
                  >
                    Mark as Rejected
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewSubmission('verified')}
                    disabled={reviewSubmitting}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Mark as Verified</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BALANCE ADJUSTMENT CONFIRMATION REVIEW MODAL */}
      {/* ========================================================================= */}
      {isReviewModalOpen && selectedUserDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 sm:space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  adjustmentType === 'credit'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {adjustmentType === 'credit' ? <PlusCircle className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-[#173A52]">
                  Confirm Account Balance Adjustment
                </h3>
                <p className="text-slate-500 text-[11px] break-all">
                  Authorized by {user?.email}
                </p>
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-1 border-b border-slate-100">
                <span className="text-slate-500">Target Client:</span>
                <span className="font-semibold text-slate-900 break-words">{selectedUserDetails.user.fullName}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-1 border-b border-slate-100">
                <span className="text-slate-500">Client Email:</span>
                <span className="font-mono text-slate-900 break-all">{selectedUserDetails.user.email}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-1 border-b border-slate-100">
                <span className="text-slate-500">Adjustment Type:</span>
                <span className={`font-bold capitalize ${adjustmentType === 'credit' ? 'text-emerald-700' : 'text-blue-700'}`}>
                  {adjustmentType === 'credit' ? 'Credit (+ Add Funds)' : 'Debit (- Deduct Funds)'}
                </span>
              </div>
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-500">Adjustment Amount:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ${parseFloat(adjustmentAmount).toFixed(2)} USD
                </span>
              </div>
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-500">Previous Balance:</span>
                <span className="font-mono text-slate-700">
                  ${selectedUserDetails.wallet.availableBalance.toFixed(2)} USD
                </span>
              </div>
              <div className="flex justify-between gap-2 py-1 font-bold">
                <span className="text-slate-900">Projected New Balance:</span>
                <span className="font-mono text-[#173A52] text-sm">
                  $
                  {Math.max(
                    0,
                    adjustmentType === 'credit'
                      ? selectedUserDetails.wallet.availableBalance + parseFloat(adjustmentAmount)
                      : selectedUserDetails.wallet.availableBalance - parseFloat(adjustmentAmount)
                  ).toFixed(2)}{' '}
                  USD
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed break-words">
              <strong>Official Audit Reason:</strong> {adjustmentReason}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setAdjustmentIdempotencyKey(null);
                }}
                disabled={adjustSubmitting}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAdjustment}
                disabled={adjustSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 border border-[#2166D5]/30 cursor-pointer disabled:opacity-50"
              >
                {adjustSubmitting ? (
                  <span>Saving Adjustment...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-blue-200" />
                    <span>Confirm & Commit to Ledger</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FEE SETTINGS CONFIRMATION REVIEW MODAL */}
      {/* ========================================================================= */}
      {isFeeReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 sm:space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-[#EBF2FC] border border-[#2166D5]/30 flex items-center justify-center text-[#2166D5] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-[#173A52]">
                  Review Institutional Fee Changes
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Will apply to all subsequent client transfers and disbursements
                </p>
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-600">Transfer Fixed Fee:</span>
                <span className="font-mono font-bold text-slate-900">${feeSettings.transferFixedFee.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-600">Transfer Percentage Fee:</span>
                <span className="font-mono font-bold text-slate-900">{feeSettings.transferPercentFee}%</span>
              </div>
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-600">Transfer Fee Active:</span>
                <span className={`font-bold ${feeSettings.transferFeeEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {feeSettings.transferFeeEnabled ? 'YES (Enabled)' : 'NO (Disabled / Waived)'}
                </span>
              </div>
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-600">Withdrawal Fixed Fee:</span>
                <span className="font-mono font-bold text-slate-900">${feeSettings.withdrawalFixedFee.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-600">Withdrawal Percentage Fee:</span>
                <span className="font-mono font-bold text-slate-900">{feeSettings.withdrawalPercentFee}%</span>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <span className="text-slate-600">Withdrawal Fee Active:</span>
                <span className={`font-bold ${feeSettings.withdrawalFeeEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {feeSettings.withdrawalFeeEnabled ? 'YES (Enabled)' : 'NO (Disabled / Waived)'}
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFeeReviewModalOpen(false)}
                disabled={feeSaving}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFeeSettings}
                disabled={feeSaving}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-[#173A52] hover:bg-[#123047] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 border border-[#2166D5]/30 cursor-pointer disabled:opacity-50"
              >
                {feeSaving ? (
                  <span>Saving Settings...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-blue-200" />
                    <span>Confirm & Deploy Fees</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PREVIEW MODAL: BANK TRANSFER PAYMENT PAGE PREVIEW (Requirement 6.A) */}
      {/* ========================================================================= */}
      <BankTransferPaymentModal
        isOpen={previewBankModal}
        onClose={() => setPreviewBankModal(false)}
        amount={1000.0}
        fee={feeSettings.transferFixedFee}
        total={1000.0 + feeSettings.transferFixedFee}
        reference="TXN-UNGB-PREVIEW-001"
        transactionType="transfer"
        config={bankMethod}
        onSubmitPayment={async () => {
          setPaymentMethodMessage({
            type: 'success',
            text: 'Preview completed: customers will see your saved bank details and receipt uploader here.',
          });
          setPreviewBankModal(false);
        }}
        isSubmitting={false}
      />

      {/* ========================================================================= */}
      {/* PREVIEW MODAL: BITCOIN PAYMENT PAGE PREVIEW (Requirement 6.B) */}
      {/* ========================================================================= */}
      <BitcoinPaymentModal
        isOpen={previewBitcoinModal}
        onClose={() => setPreviewBitcoinModal(false)}
        amount={1000.0}
        fee={feeSettings.transferFixedFee}
        total={1000.0 + feeSettings.transferFixedFee}
        reference="TXN-UNGB-PREVIEW-002"
        transactionType="transfer"
        config={bitcoinMethod}
        onSubmitPayment={async () => {
          setPaymentMethodMessage({
            type: 'success',
            text: 'Preview completed: customers will see your saved Bitcoin receiving details and receipt uploader here.',
          });
          setPreviewBitcoinModal(false);
        }}
        isSubmitting={false}
      />

      {/* Account Deletion Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-red-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">Permanently Delete Customer Account</h3>
                <p className="text-[11px] text-slate-500">Firebase Authentication, Cloud Firestore & Ledger</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="break-words">
                <span className="text-slate-500">Account Holder:</span>{' '}
                <strong className="text-slate-900">{accountToDelete.fullName}</strong>
              </div>
              <div className="break-all">
                <span className="text-slate-500">Email:</span>{' '}
                <strong className="font-mono text-slate-900">{accountToDelete.email}</strong>
              </div>
              <div>
                <span className="text-slate-500">Available Balance:</span>{' '}
                <strong className="font-mono text-slate-900">
                  ${(accountToDelete.wallet?.availableBalance ?? 0).toFixed(2)} USD
                </strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
              This action permanently deletes the customer from <strong>Firebase Authentication</strong>, <strong>Cloud Firestore</strong> (profile, wallet, transactions, notifications, payment submissions, and uploaded receipts), and the server ledger. If server Firebase Admin credentials are not configured or Firebase Authentication deletion fails, the operation aborts without altering any database records.
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                disabled={deletingAccount}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={deletingAccount}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingAccount ? 'Removing...' : 'Confirm & Remove Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Receipt Modal */}
      {activeZoomImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveZoomImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveZoomImage(null)}
              aria-label={t.common.close}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activeZoomImage}
              alt="Receipt zoom"
              className="max-h-[85vh] max-w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      <LanguageSelectModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        selectedLanguage={language}
        onSelectLanguage={setLanguage}
        theme="light"
      />
    </div>
  );
};
