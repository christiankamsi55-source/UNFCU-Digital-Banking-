import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  User,
  Wallet,
  Transaction,
  Notification,
  FeeSettings,
  PaymentMethodConfig,
  Announcement,
  AuditLog,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const AUTHORIZED_ADMIN_EMAIL = 'un.department.retirement.unjspf@gmail.com';

export function isCurrentAdmin(): boolean {
  return (
    auth.currentUser?.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase() &&
    auth.currentUser?.emailVerified === true
  );
}

/**
 * Ensures Firebase Auth has completed initial state restoration and that the active user's
 * ID token claims include up-to-date `email_verified` before running Firestore SDK calls.
 */
export async function waitForVerifiedAuth(forceTokenRefresh: boolean = false) {
  await auth.authStateReady();
  const current = auth.currentUser;
  if (!current) return null;

  if (current.emailVerified) {
    try {
      const tokenRes = await current.getIdTokenResult(false);
      if (forceTokenRefresh || tokenRes.claims?.email_verified !== true) {
        await current.getIdToken(true);
      }
    } catch (err) {
      console.warn('Token claim refresh warning:', err);
    }
  }
  return auth.currentUser;
}

export async function getFreshFirebaseIdToken(forceRefresh: boolean = false): Promise<string | null> {
  const active = await waitForVerifiedAuth(forceRefresh);
  if (!active) return null;
  try {
    return await active.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

/**
 * Strips undefined values cleanly so Firestore setDoc never throws invalid-argument
 * or triggers un-whitelisted null/undefined keys.
 */
function stripUndefined<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      out[key] = val;
    }
  }
  return out;
}

// -----------------------------------------------------------------
// Permanent User Profile Persistence
// -----------------------------------------------------------------

export async function saveUserProfileToFirestore(user: User): Promise<void> {
  const activeUser = await waitForVerifiedAuth(true);
  if (!activeUser || !activeUser.emailVerified) {
    return;
  }

  const currentUid = activeUser.uid;
  const adminAccess = isCurrentAdmin();

  const targetDocId = adminAccess ? user.id : currentUid;
  const docPath = `users/${targetDocId}`;

  try {
    const docRef = doc(db, 'users', targetDocId);
    let existingSnap = null;
    try {
      existingSnap = await getDoc(docRef);
    } catch (readErr: any) {
      if (readErr?.code !== 'permission-denied') {
        throw readErr;
      }
    }
    const now = new Date().toISOString();

    if (existingSnap && existingSnap.exists() && !adminAccess) {
      // Standard owner updates only mutable profile fields (preserving immutable role, emailVerified, createdAt)
      await setDoc(
        docRef,
        {
          fullName: String(user.fullName || 'Account Holder').slice(0, 120),
          country: String(user.country || 'United States').slice(0, 80),
          countryCode: String(user.countryCode || 'US').slice(0, 8),
          dialingCode: String(user.dialingCode || '+1').slice(0, 10),
          phoneNumber: String(user.phoneNumber || '').slice(0, 32),
          language: String(user.language || 'en').slice(0, 12),
          lastLoginAt: user.lastLoginAt || now,
          updatedAt: user.updatedAt || now,
        },
        { merge: true }
      );
      return;
    }

    const cleanUser: Record<string, any> = {
      id: targetDocId,
      email: (user.email || activeUser.email || '').toLowerCase().slice(0, 160),
      fullName: String(user.fullName || 'Account Holder').slice(0, 120),
      country: String(user.country || 'United States').slice(0, 80),
      countryCode: String(user.countryCode || 'US').slice(0, 8),
      dialingCode: String(user.dialingCode || '+1').slice(0, 10),
      phoneNumber: String(user.phoneNumber || '').slice(0, 32),
      language: String(user.language || 'en').slice(0, 12),
      role: adminAccess ? (user.role || 'user') : 'user',
      status: adminAccess ? (user.status || 'active') : 'active',
      emailVerified: true,
      createdAt: user.createdAt || existingSnap?.data()?.createdAt || now,
      lastLoginAt: user.lastLoginAt || now,
      updatedAt: user.updatedAt || now,
    };

    if (adminAccess && 'phoneVerified' in user) {
      cleanUser.phoneVerified = Boolean((user as User & { phoneVerified?: boolean }).phoneVerified);
    }

    await setDoc(docRef, cleanUser, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function getUserProfileWithStatusFromFirestore(userId: string): Promise<{
  status: 'found' | 'not_found' | 'permission_denied' | 'error';
  user: User | null;
  error?: string;
}> {
  const activeUser = await waitForVerifiedAuth(false);
  if (!activeUser) {
    return { status: 'not_found', user: null };
  }
  const targetUid = isCurrentAdmin() ? userId : activeUser.uid;
  try {
    const snap = await getDoc(doc(db, 'users', targetUid));
    if (!snap.exists()) {
      return { status: 'not_found', user: null };
    }
    return { status: 'found', user: snap.data() as User };
  } catch (error: any) {
    const code = String(error?.code || '');
    const msg = error instanceof Error ? error.message : String(error);
    if (code === 'permission-denied' || msg.toLowerCase().includes('missing or insufficient permissions')) {
      console.error(`Firestore permission error reading users/${targetUid}:`, msg);
      return { status: 'permission_denied', user: null, error: msg };
    }
    console.warn(`getUserProfileWithStatusFromFirestore (${targetUid}) warning:`, msg);
    return { status: 'error', user: null, error: msg };
  }
}

export async function getUserProfileFromFirestore(userId: string): Promise<User | null> {
  const res = await getUserProfileWithStatusFromFirestore(userId);
  return res.user;
}

// -----------------------------------------------------------------
// Permanent Wallet Persistence
// -----------------------------------------------------------------

export async function createInitialWalletInFirestore(wallet: Wallet): Promise<void> {
  const activeUser = await waitForVerifiedAuth(true);
  if (!activeUser || !activeUser.emailVerified) {
    return;
  }

  const adminAccess = isCurrentAdmin();
  const targetUserId = adminAccess ? wallet.userId : activeUser.uid;
  const walletDocId = `wallet_${targetUserId}`;
  const docPath = `wallets/${walletDocId}`;

  try {
    const walletRef = doc(db, 'wallets', walletDocId);
    const existing = await getDoc(walletRef);
    if (existing.exists()) {
      return;
    }

    const initialBalance = adminAccess ? Number(wallet.availableBalance) || 0 : 0;
    const initialPrototype = adminAccess ? Number(wallet.prototypeBalance ?? wallet.availableBalance) || 0 : 0;

    await setDoc(walletRef, {
      id: walletDocId,
      userId: targetUserId,
      accountNumber: String(wallet.accountNumber || '').slice(0, 64),
      currency: 'USD',
      availableBalance: initialBalance,
      prototypeBalance: initialPrototype,
      isSimulated: wallet.isSimulated !== undefined ? Boolean(wallet.isSimulated) : true,
      lastUpdated: wallet.lastUpdated || new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function saveWalletToFirestore(wallet: Wallet): Promise<void> {
  const activeUser = await waitForVerifiedAuth(true);
  if (!activeUser || !activeUser.emailVerified) {
    return;
  }

  if (!isCurrentAdmin()) {
    return;
  }

  const targetWalletUserId = wallet.userId;
  const walletDocId = wallet.id || `wallet_${targetWalletUserId}`;
  const docPath = `wallets/${walletDocId}`;
  try {
    const walletRef = doc(db, 'wallets', walletDocId);
    let existingId = walletDocId;
    try {
      const existingSnap = await getDoc(walletRef);
      if (existingSnap.exists() && existingSnap.data()?.id) {
        existingId = String(existingSnap.data().id);
      }
    } catch {
      // ignore read check failure and proceed with walletDocId
    }
    const cleanWallet = {
      id: existingId,
      userId: targetWalletUserId,
      accountNumber: String(wallet.accountNumber || 'UNGB-0000-0000-0000').slice(0, 64),
      currency: wallet.currency || 'USD',
      availableBalance: Number(wallet.availableBalance) || 0,
      prototypeBalance: Number(wallet.prototypeBalance) || 0,
      isSimulated: wallet.isSimulated !== undefined ? Boolean(wallet.isSimulated) : true,
      lastUpdated: new Date().toISOString(),
    };
    await setDoc(walletRef, cleanWallet, { merge: true });
    if (walletDocId !== `wallet_${targetWalletUserId}`) {
      await setDoc(
        doc(db, 'wallets', `wallet_${targetWalletUserId}`),
        { ...cleanWallet, id: `wallet_${targetWalletUserId}` },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function getWalletFromFirestore(userId: string): Promise<Wallet | null> {
  const activeUser = await waitForVerifiedAuth(false);
  if (!activeUser) return null;
  const targetUid = isCurrentAdmin() ? userId : activeUser.uid;
  try {
    const directDoc = await getDoc(doc(db, 'wallets', `wallet_${targetUid}`));
    if (directDoc.exists()) {
      return directDoc.data() as Wallet;
    }

    const q = query(collection(db, 'wallets'), where('userId', '==', targetUid), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as Wallet;
    }
    return null;
  } catch (error: any) {
    console.warn(`getWalletFromFirestore (wallets/wallet_${targetUid}) note:`, error?.message || error);
    return null;
  }
}

// -----------------------------------------------------------------
// Permanent Transaction Persistence
// -----------------------------------------------------------------

const ALLOWED_TRANSACTION_KEYS = [
  'id', 'reference', 'userId', 'userEmail', 'userName', 'type',
  'senderOrRecipient', 'bankName', 'accountNumber', 'routingOrSwift',
  'amount', 'fee', 'netAmount', 'total', 'previousBalance', 'newBalance',
  'adjustedBy', 'paymentMethod', 'paymentStatus', 'status', 'description',
  'descriptionKey', 'templateParams', 'adminNote', 'isSimulated', 'createdAt',
  'updatedAt', 'paymentSubmittedAt', 'paymentTxHashOrProof', 'reviewCompletedAt',
  'receiptImages', 'userMessage', 'idempotencyKey', 'balanceDeducted', 'deductedAt',
];

export async function saveTransactionToFirestore(transaction: Transaction): Promise<void> {
  const activeUser = await waitForVerifiedAuth(true);
  if (!activeUser || !activeUser.emailVerified) return;

  const currentUid = activeUser.uid;
  const adminAccess = isCurrentAdmin();

  const raw: Record<string, any> = {};
  for (const key of ALLOWED_TRANSACTION_KEYS) {
    if ((transaction as any)[key] !== undefined) {
      raw[key] = (transaction as any)[key];
    }
  }

  raw.id = String(transaction.id);
  raw.userId = adminAccess ? transaction.userId : currentUid;
  raw.reference = String(transaction.reference || '').slice(0, 80);
  raw.description = String(transaction.description || '').slice(0, 380);
  raw.amount = Number(transaction.amount) || 0;
  raw.fee = Number(transaction.fee) || 0;
  raw.netAmount = Number((transaction as Transaction & { netAmount?: number }).netAmount ?? transaction.amount) || 0;
  if (raw.total !== undefined) raw.total = Number(raw.total) || 0;
  if (raw.descriptionKey) raw.descriptionKey = String(raw.descriptionKey).slice(0, 80);
  if (raw.userEmail) raw.userEmail = String(raw.userEmail).slice(0, 160);
  if (raw.userName) raw.userName = String(raw.userName).slice(0, 120);
  if (raw.senderOrRecipient) raw.senderOrRecipient = String(raw.senderOrRecipient).slice(0, 160);
  if (raw.bankName) raw.bankName = String(raw.bankName).slice(0, 160);
  if (raw.accountNumber) raw.accountNumber = String(raw.accountNumber).slice(0, 64);
  if (raw.routingOrSwift) raw.routingOrSwift = String(raw.routingOrSwift).slice(0, 64);
  if (raw.adminNote) raw.adminNote = String(raw.adminNote).slice(0, 500);
  if (raw.userMessage) raw.userMessage = String(raw.userMessage).slice(0, 1000);

  const cleanTransaction = stripUndefined(raw);
  const docPath = `transactions/${transaction.id}`;
  try {
    await setDoc(doc(db, 'transactions', transaction.id), cleanTransaction, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function getUserTransactionsFromFirestore(userId: string): Promise<Transaction[]> {
  if (!auth.currentUser) return [];
  const targetUid = isCurrentAdmin() ? userId : auth.currentUser.uid;
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', targetUid),
      limit(150)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as Transaction)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('getUserTransactionsFromFirestore note:', error);
    return [];
  }
}

export async function getAllTransactionsFromFirestore(): Promise<Transaction[]> {
  if (!auth.currentUser || !isCurrentAdmin()) return [];
  const collectionPath = 'transactions';
  try {
    const snap = await getDocs(collection(db, 'transactions'));
    return snap.docs
      .map((d) => d.data() as Transaction)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

export async function getTransactionByIdFromFirestore(transactionId: string): Promise<Transaction | null> {
  if (!auth.currentUser) return null;
  try {
    const snap = await getDoc(doc(db, 'transactions', transactionId));
    if (!snap.exists()) return null;
    const data = snap.data() as Transaction;
    if (!isCurrentAdmin() && data.userId !== auth.currentUser.uid) {
      return null;
    }
    return data;
  } catch (error) {
    console.warn('getTransactionByIdFromFirestore note:', error);
    return null;
  }
}

// -----------------------------------------------------------------
// Administrator Registry Persistence
// -----------------------------------------------------------------

export async function ensureAdminRecordInFirestore(adminUid: string): Promise<void> {
  if (!auth.currentUser || !isCurrentAdmin()) {
    return;
  }
  try {
    await setDoc(
      doc(db, 'admins', adminUid),
      {
        uid: adminUid,
        email: AUTHORIZED_ADMIN_EMAIL,
        role: 'admin',
        active: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Admin Firestore registry note:', error);
  }
}

// -----------------------------------------------------------------
// Permanent Notification Persistence
// -----------------------------------------------------------------

const ALLOWED_NOTIFICATION_KEYS = [
  'id', 'userId', 'title', 'message', 'type', 'read', 'createdAt',
  'actionUrl', 'reference', 'amount', 'templateKey', 'templateParams', 'translations',
];

export async function saveNotificationToFirestore(notification: Notification): Promise<void> {
  const activeUser = await waitForVerifiedAuth(true);
  if (!activeUser || !activeUser.emailVerified) return;
  const currentUid = activeUser.uid;
  const adminAccess = isCurrentAdmin();

  if (!adminAccess && notification.userId !== currentUid) {
    return;
  }

  // Non-admins may only log non-financial self-events (system/payment/security)
  if (!adminAccess && !['payment', 'system', 'security'].includes(notification.type)) {
    return;
  }

  const raw: Record<string, any> = {};
  for (const key of ALLOWED_NOTIFICATION_KEYS) {
    if ((notification as any)[key] !== undefined) {
      raw[key] = (notification as any)[key];
    }
  }
  raw.id = String(notification.id);
  raw.userId = adminAccess ? notification.userId : currentUid;
  raw.title = String(notification.title || 'Notification').slice(0, 200);
  raw.message = String(notification.message || 'Account update').slice(0, 1000);
  raw.read = adminAccess ? Boolean(notification.read) : false;
  if (raw.reference) raw.reference = String(raw.reference).slice(0, 80);
  if (raw.actionUrl) raw.actionUrl = String(raw.actionUrl).slice(0, 200);
  if (raw.templateKey) raw.templateKey = String(raw.templateKey).slice(0, 80);

  const cleanNotif = stripUndefined(raw);
  const docPath = `notifications/${notification.id}`;
  try {
    await setDoc(doc(db, 'notifications', notification.id), cleanNotif, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function getUserNotificationsFromFirestore(userId: string): Promise<Notification[]> {
  if (!auth.currentUser) return [];
  const targetUid = isCurrentAdmin() ? userId : auth.currentUser.uid;
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', targetUid),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as Notification)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('getUserNotificationsFromFirestore note:', error);
    return [];
  }
}

export async function markNotificationReadInFirestore(notificationId: string, read: boolean = true): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'notifications', notificationId), { read }, { merge: true });
  } catch (error) {
    console.warn('markNotificationReadInFirestore note:', error);
  }
}

// -----------------------------------------------------------------
// Permanent Payment Submissions Persistence
// -----------------------------------------------------------------

const ALLOWED_SUBMISSION_KEYS = [
  'id', 'transactionId', 'reference', 'userId', 'userEmail', 'userName',
  'paymentMethod', 'amount', 'fee', 'total', 'transactionType',
  'receiptImages', 'userMessage', 'status', 'adminNote',
  'createdAt', 'updatedAt', 'reviewedBy', 'reviewedAt',
  'balanceDeducted', 'deductedAmount', 'deductedAt',
  'recipientName', 'recipientBank', 'recipientAccount', 'routingOrSwift', 'description',
];

export async function savePaymentSubmissionToFirestore(submission: any): Promise<void> {
  if (!auth.currentUser) return;
  const raw: Record<string, any> = {};
  for (const key of ALLOWED_SUBMISSION_KEYS) {
    if (submission[key] !== undefined) {
      raw[key] = submission[key];
    }
  }
  const cleanSubmission = stripUndefined(raw);
  if (!isCurrentAdmin()) {
    cleanSubmission.userId = auth.currentUser.uid;
  }
  try {
    if (Array.isArray(cleanSubmission.receiptImages)) {
      let runningBytes = 0;
      cleanSubmission.receiptImages = cleanSubmission.receiptImages
        .slice(0, 5)
        .filter((img: string) => {
          if (typeof img !== 'string' || !img) return false;
          if (runningBytes + img.length > 780000) return false;
          runningBytes += img.length;
          return true;
        });
    }
    await setDoc(doc(db, 'payment_submissions', submission.id), cleanSubmission, { merge: true });
  } catch (error) {
    console.warn('savePaymentSubmissionToFirestore note:', error);
  }
}

export async function getUserPaymentSubmissionsFromFirestore(userId: string): Promise<any[]> {
  if (!auth.currentUser) return [];
  const targetUid = isCurrentAdmin() ? userId : auth.currentUser.uid;
  try {
    const q = query(
      collection(db, 'payment_submissions'),
      where('userId', '==', targetUid),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('getUserPaymentSubmissionsFromFirestore note:', error);
    return [];
  }
}

export async function getAllPaymentSubmissionsFromFirestore(): Promise<any[]> {
  if (!auth.currentUser || !isCurrentAdmin()) return [];
  const collectionPath = 'payment_submissions';
  try {
    const snap = await getDocs(collection(db, 'payment_submissions'));
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

export async function updatePaymentSubmissionStatusInFirestore(
  submissionId: string,
  status: 'pending' | 'verified' | 'rejected',
  adminNote?: string
): Promise<void> {
  if (!auth.currentUser || !isCurrentAdmin()) return;
  const docPath = `payment_submissions/${submissionId}`;
  try {
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      reviewedBy: AUTHORIZED_ADMIN_EMAIL,
    };
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    await setDoc(doc(db, 'payment_submissions', submissionId), updateData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

// -----------------------------------------------------------------
// Global Institutional Fee Settings Persistence
// -----------------------------------------------------------------

export async function saveFeeSettingsToFirestore(feeSettings: FeeSettings): Promise<void> {
  if (!auth.currentUser || !isCurrentAdmin()) return;
  const docPath = 'settings/feeSettings';
  try {
    await setDoc(doc(db, 'settings', 'feeSettings'), stripUndefined(feeSettings as any), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function getFeeSettingsFromFirestore(): Promise<FeeSettings | null> {
  if (!auth.currentUser) return null;
  const docPath = 'settings/feeSettings';
  try {
    const snap = await getDoc(doc(db, 'settings', 'feeSettings'));
    if (!snap.exists()) return null;
    return snap.data() as FeeSettings;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

// -----------------------------------------------------------------
// Global Payment Methods Persistence
// -----------------------------------------------------------------

export async function savePaymentMethodsToFirestore(methods: PaymentMethodConfig[]): Promise<void> {
  if (!auth.currentUser || !isCurrentAdmin()) return;
  const docPath = 'settings/paymentMethods';
  try {
    await setDoc(doc(db, 'settings', 'paymentMethods'), { methods, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function getPaymentMethodsFromFirestore(): Promise<PaymentMethodConfig[] | null> {
  if (!auth.currentUser) return null;
  const docPath = 'settings/paymentMethods';
  try {
    const snap = await getDoc(doc(db, 'settings', 'paymentMethods'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return data.methods as PaymentMethodConfig[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

// -----------------------------------------------------------------
// Multilingual Announcements Persistence
// -----------------------------------------------------------------

export async function saveAnnouncementToFirestore(announcement: Announcement): Promise<void> {
  if (!auth.currentUser || !isCurrentAdmin()) return;
  const docPath = `announcements/${announcement.id}`;
  try {
    const clean = stripUndefined({
      id: String(announcement.id),
      titleTranslations: announcement.titleTranslations || {},
      bodyTranslations: announcement.bodyTranslations || {},
      defaultLanguage: String(announcement.defaultLanguage || 'en').slice(0, 12),
      priority: announcement.priority || 'info',
      active: Boolean(announcement.active),
      createdAt: announcement.createdAt || new Date().toISOString(),
      updatedAt: announcement.updatedAt || new Date().toISOString(),
      createdBy: String(announcement.createdBy || AUTHORIZED_ADMIN_EMAIL).slice(0, 160),
    });
    await setDoc(doc(db, 'announcements', announcement.id), clean, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteAnnouncementFromFirestore(announcementId: string): Promise<void> {
  if (!auth.currentUser || !isCurrentAdmin()) return;
  const docPath = `announcements/${announcementId}`;
  try {
    await deleteDoc(doc(db, 'announcements', announcementId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function getActiveAnnouncementsFromFirestore(): Promise<Announcement[]> {
  try {
    const q = query(
      collection(db, 'announcements'),
      where('active', '==', true),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as Announcement)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  } catch (error) {
    console.warn('getActiveAnnouncementsFromFirestore note:', error);
    return [];
  }
}

export async function getAllAnnouncementsFromFirestore(): Promise<Announcement[]> {
  if (!auth.currentUser || !isCurrentAdmin()) {
    return getActiveAnnouncementsFromFirestore();
  }
  const collectionPath = 'announcements';
  try {
    const snap = await getDocs(collection(db, 'announcements'));
    return snap.docs
      .map((d) => d.data() as Announcement)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

// -----------------------------------------------------------------
// Audit & Ledger Security Logs Persistence
// -----------------------------------------------------------------

export async function saveAuditLogToFirestore(log: AuditLog): Promise<void> {
  if (!auth.currentUser || !isCurrentAdmin()) return;
  const docPath = `audit_logs/${log.id}`;
  try {
    const clean = stripUndefined({
      id: String(log.id),
      timestamp: String(log.timestamp || new Date().toISOString()).slice(0, 64),
      actorEmail: String(log.actorEmail || AUTHORIZED_ADMIN_EMAIL).slice(0, 160),
      actorRole: String(log.actorRole || 'admin').slice(0, 32),
      action: String(log.action || 'ADMIN_ACTION').slice(0, 160),
      targetUserId: log.targetUserId ? String(log.targetUserId).slice(0, 128) : undefined,
      targetUserEmail: log.targetUserEmail ? String(log.targetUserEmail).slice(0, 160) : undefined,
      previousValue: log.previousValue ? String(log.previousValue).slice(0, 400) : undefined,
      newValue: log.newValue ? String(log.newValue).slice(0, 400) : undefined,
      reason: log.reason ? String(log.reason).slice(0, 400) : undefined,
      reference: log.reference ? String(log.reference).slice(0, 80) : undefined,
      ipAddress: log.ipAddress ? String(log.ipAddress).slice(0, 80) : undefined,
    });
    await setDoc(doc(db, 'audit_logs', log.id), clean, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function getAuditLogsFromFirestore(): Promise<AuditLog[]> {
  if (!auth.currentUser || !isCurrentAdmin()) return [];
  const collectionPath = 'audit_logs';
  try {
    const snap = await getDocs(collection(db, 'audit_logs'));
    return snap.docs
      .map((d) => d.data() as AuditLog)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

// -----------------------------------------------------------------
// Administrator Complete User Accounts Directory Persistence
// -----------------------------------------------------------------

export async function getAllUsersFromFirestore(): Promise<User[]> {
  if (!auth.currentUser || !isCurrentAdmin()) return [];
  const collectionPath = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as User);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

export async function getAllWalletsFromFirestore(): Promise<Wallet[]> {
  if (!auth.currentUser || !isCurrentAdmin()) return [];
  const collectionPath = 'wallets';
  try {
    const snap = await getDocs(collection(db, 'wallets'));
    return snap.docs.map((d) => d.data() as Wallet);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

export async function deleteUserRecordsFromFirestore(userId: string): Promise<void> {
  const activeUser = await waitForVerifiedAuth(true);
  if (!activeUser || !isCurrentAdmin()) {
    throw new Error('Verified administrator authentication is required to delete Firestore records.');
  }

  try {
    // 1. Delete primary profile & canonical wallet doc
    await deleteDoc(doc(db, 'users', userId));
    await deleteDoc(doc(db, 'wallets', `wallet_${userId}`));

    // 2. Delete payment submissions AND nested /receipts subcollections
    const subsSnap = await getDocs(query(collection(db, 'payment_submissions'), where('userId', '==', userId)));
    for (const subDoc of subsSnap.docs) {
      const subData = subDoc.data() as any;
      const parentIds = new Set<string>([subDoc.id]);
      if (subData?.id) parentIds.add(String(subData.id));
      if (subData?.reference) parentIds.add(String(subData.reference));

      for (const parentId of parentIds) {
        const receiptsSnap = await getDocs(collection(db, 'payment_submissions', parentId, 'receipts'));
        if (!receiptsSnap.empty) {
          await Promise.all(receiptsSnap.docs.map((rcpt) => deleteDoc(rcpt.ref)));
        }
      }
      await deleteDoc(subDoc.ref);
    }

    // 3. Delete any remaining wallets, transactions, and notifications
    const collections = ['wallets', 'transactions', 'notifications'];
    for (const colName of collections) {
      const snap = await getDocs(query(collection(db, colName), where('userId', '==', userId)));
      if (!snap.empty) {
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
}
