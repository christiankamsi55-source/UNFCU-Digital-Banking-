import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  getDb,
  saveDatabase,
  recordAuditLog,
  createNotification,
  hashPassword,
  generateSalt,
  generateReference,
  generateAccountNumber,
  AUTHORIZED_ADMIN_EMAIL,
  isAuthorizedAdminEmail
} from './db';
import { User, Wallet, Transaction, PaymentStatus, FeeSettings, Announcement, PendingCleanupRecord } from './types';
import {
  sendEmailVerification,
  checkEmailVerification,
  sendPhoneVerification,
  checkPhoneVerification,
  consumeVerifications,
  getVerificationConfigStatus,
  markEmailAsVerified,
  markPhoneAsVerified,
} from './verification';
import { verifyFirebaseIdToken, VerifiedFirebaseToken } from './firebaseToken';
import {
  getFirebaseAdminCredentialStatus,
  deleteFirebaseAuthUser,
  checkFirebaseAuthAccountByEmail,
  hasFirebaseAdminCredentials,
  getFirebaseAdminAccessToken,
  verifyFirebaseAdminLiveCapabilities,
} from './firebaseAdmin';
import {
  fsGetDoc,
  fsListCollection,
  fsQueryByField,
  fsSetDoc,
  fsDeleteDoc,
  fsDeleteUserAndRelatedDocs,
  fsIsAccountNumberTaken,
  fsExecuteAtomicBalanceAdjustment,
  fsExecuteAtomicPaymentSubmissionReview,
} from './firebaseFirestoreRest';

export const apiRouter = Router();

// Persistent session storage (30 days validity)
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const inFlightRegistrations = new Set<string>();

function purgeLocalUserRecords(userIds: string[], email?: string): boolean {
  const db = getDb();
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const idSet = new Set(userIds.map((v) => String(v || '').trim()).filter(Boolean));

  const matchedUsers = db.users.filter(
    (u) => idSet.has(u.id) || (cleanEmail && u.email.toLowerCase() === cleanEmail)
  );
  matchedUsers.forEach((u) => {
    idSet.add(u.id);
    if (cleanEmail) {
      consumeVerifications(cleanEmail, u.dialingCode || '', u.phoneNumber || '');
    }
  });
  if (cleanEmail) {
    consumeVerifications(cleanEmail, '', '');
  }

  const prevCounts = {
    users: db.users.length,
    wallets: db.wallets.length,
    transactions: db.transactions.length,
    notifications: db.notifications.length,
    submissions: db.paymentSubmissions?.length || 0,
    sessions: db.sessions?.length || 0,
    codes: db.recoveryCodes?.length || 0,
  };

  db.users = db.users.filter(
    (u) => !idSet.has(u.id) && (!cleanEmail || u.email.toLowerCase() !== cleanEmail)
  );
  db.wallets = db.wallets.filter((w) => !idSet.has(w.userId));
  db.transactions = db.transactions.filter(
    (t) => !idSet.has(t.userId) && (!cleanEmail || t.userEmail?.toLowerCase() !== cleanEmail)
  );
  db.notifications = db.notifications.filter((n) => !idSet.has(n.userId));
  if (db.paymentSubmissions) {
    db.paymentSubmissions = db.paymentSubmissions.filter(
      (s) => !idSet.has(s.userId) && (!cleanEmail || s.userEmail?.toLowerCase() !== cleanEmail)
    );
  }
  if (db.sessions) {
    db.sessions = db.sessions.filter(
      (s) => !idSet.has(s.userId) && (!cleanEmail || s.email?.toLowerCase() !== cleanEmail)
    );
  }
  if (db.recoveryCodes && cleanEmail) {
    db.recoveryCodes = db.recoveryCodes.filter((c) => c.email.toLowerCase() !== cleanEmail);
  }

  const changed =
    db.users.length !== prevCounts.users ||
    db.wallets.length !== prevCounts.wallets ||
    db.transactions.length !== prevCounts.transactions ||
    db.notifications.length !== prevCounts.notifications ||
    (db.paymentSubmissions?.length || 0) !== prevCounts.submissions ||
    (db.sessions?.length || 0) !== prevCounts.sessions ||
    (db.recoveryCodes?.length || 0) !== prevCounts.codes;

  if (changed) {
    saveDatabase();
  }
  return changed;
}

async function generateUniqueAccountNumber(bearerToken?: string | null): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = generateAccountNumber();
    const localTaken = db.wallets.some((w) => w.accountNumber === candidate);
    if (localTaken) continue;
    if (bearerToken) {
      const fsTaken = await fsIsAccountNumberTaken(candidate, bearerToken);
      if (fsTaken) continue;
    }
    return candidate;
  }
  return generateAccountNumber();
}

async function persistPendingCleanup(record: PendingCleanupRecord, adminToken?: string | null): Promise<void> {
  const db = getDb();
  if (!db.pendingCleanups) db.pendingCleanups = [];
  const idx = db.pendingCleanups.findIndex((p) => p.id === record.id);
  if (idx >= 0) {
    db.pendingCleanups[idx] = record;
  } else {
    db.pendingCleanups.unshift(record);
  }
  saveDatabase();
  if (adminToken) {
    await fsSetDoc('pending_cleanups', record.id, { ...record }, adminToken).catch(() => {});
  }
}

async function clearPendingCleanup(cleanupId: string, adminToken?: string | null): Promise<void> {
  const db = getDb();
  if (db.pendingCleanups) {
    db.pendingCleanups = db.pendingCleanups.filter((p) => p.id !== cleanupId);
    saveDatabase();
  }
  if (adminToken) {
    await fsDeleteDoc('pending_cleanups', cleanupId, adminToken).catch(() => {});
  }
}

async function getMergedPendingCleanups(adminToken?: string | null): Promise<PendingCleanupRecord[]> {
  const db = getDb();
  const map = new Map<string, PendingCleanupRecord>();
  (db.pendingCleanups || [])
    .filter((p) => p.status === 'pending')
    .forEach((p) => map.set(p.id, p));

  if (adminToken) {
    const fsRes = await fsListCollection<PendingCleanupRecord>('pending_cleanups', adminToken);
    if (!fsRes.error) {
      fsRes.items
        .filter((p) => p.status === 'pending')
        .forEach((p) => {
          const existing = map.get(p.id);
          if (!existing || new Date(p.lastAttemptAt).getTime() >= new Date(existing.lastAttemptAt).getTime()) {
            map.set(p.id, p);
          }
        });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function reconcilePendingCleanupsForEmailOrUid(
  cleanEmail: string,
  excludeUid?: string,
  adminToken?: string | null
): Promise<{ reconciledCount: number; remainingPending: PendingCleanupRecord[] }> {
  const pending = await getMergedPendingCleanups(adminToken);
  const matching = pending.filter(
    (p) =>
      p.email?.toLowerCase() === cleanEmail ||
      (excludeUid && (p.userId === excludeUid || p.deletedAuthUid === excludeUid))
  );

  let reconciledCount = 0;
  const remainingPending: PendingCleanupRecord[] = [];
  const token = adminToken || (await getFirebaseAdminAccessToken());

  for (const record of matching) {
    if (!token) {
      remainingPending.push(record);
      continue;
    }
    const extraUids = [record.deletedAuthUid, ...(record.extraUserIds || [])]
      .filter((id): id is string => Boolean(id) && id !== excludeUid);
    const fsDelete = await fsDeleteUserAndRelatedDocs(record.userId, token, {
      extraUserIds: extraUids,
      email: record.email,
    });
    purgeLocalUserRecords([record.userId, ...extraUids].filter((id) => id !== excludeUid), record.email);

    if (fsDelete.completed) {
      reconciledCount++;
      await clearPendingCleanup(record.id, token);
    } else {
      const updated: PendingCleanupRecord = {
        ...record,
        deletedPaths: Array.from(new Set([...(record.deletedPaths || []), ...fsDelete.deletedPaths])),
        errors: fsDelete.errors,
        lastAttemptAt: new Date().toISOString(),
      };
      await persistPendingCleanup(updated, token);
      remainingPending.push(updated);
    }
  }

  return { reconciledCount, remainingPending };
}

async function getCallerFirestoreToken(
  req: Request,
  expectedUser?: { id?: string; email?: string; role?: string }
): Promise<string | null> {
  const rawHeader = req.headers['x-firebase-id-token'];
  const headerToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const bodyToken = typeof (req.body as any)?.firebaseIdToken === 'string' ? (req.body as any).firebaseIdToken : undefined;
  const candidate = (headerToken || bodyToken || '').trim();
  if (candidate) {
    try {
      const decoded: VerifiedFirebaseToken = await verifyFirebaseIdToken(candidate);
      if (decoded.emailVerified) {
        if (
          !expectedUser ||
          decoded.uid === expectedUser.id ||
          isAuthorizedAdminEmail(decoded.email)
        ) {
          return candidate;
        }
      }
    } catch {
      // Fall through to admin token if configured
    }
  }
  return getFirebaseAdminAccessToken();
}

async function getAdminFirestoreToken(
  req: Request,
  expectedAdmin?: { id?: string; email?: string; role?: string }
): Promise<string | null> {
  const adminToken = await getFirebaseAdminAccessToken();
  if (adminToken) {
    return adminToken;
  }
  return getCallerFirestoreToken(req, expectedAdmin);
}

function buildCleanFirestoreUser(u: User): Record<string, any> {
  const out: Record<string, any> = {
    id: u.id,
    email: String(u.email || '').toLowerCase().slice(0, 160),
    fullName: String(u.fullName || 'Account Holder').slice(0, 120),
    country: String(u.country || 'United States').slice(0, 80),
    countryCode: String(u.countryCode || 'US').slice(0, 8),
    dialingCode: String(u.dialingCode || '+1').slice(0, 10),
    phoneNumber: String(u.phoneNumber || '').slice(0, 32),
    language: String(u.language || 'en').slice(0, 12),
    role: u.role === 'admin' ? 'admin' : 'user',
    status: u.status || 'active',
    emailVerified: Boolean(u.emailVerified),
    createdAt: String(u.createdAt || new Date().toISOString()).slice(0, 64),
    lastLoginAt: u.lastLoginAt ? String(u.lastLoginAt).slice(0, 64) : new Date().toISOString(),
    updatedAt: String(u.updatedAt || u.createdAt || new Date().toISOString()).slice(0, 64),
  };
  return out;
}

function buildCleanFirestoreWallet(w: Wallet): Record<string, any> {
  return {
    id: w.id,
    userId: w.userId,
    accountNumber: String(w.accountNumber || '').slice(0, 64),
    currency: 'USD',
    availableBalance: Number(w.availableBalance) || 0,
    prototypeBalance: Number(w.prototypeBalance ?? w.availableBalance) || 0,
    isSimulated: w.isSimulated !== undefined ? Boolean(w.isSimulated) : true,
    lastUpdated: String(w.lastUpdated || new Date().toISOString()).slice(0, 64),
  };
}

async function hydrateUserAndWalletFromFirestore(
  uid: string,
  bearerToken: string
): Promise<{
  fsUser: any | null;
  fsWallet: any | null;
  userExistsInFirestore: boolean | null;
  permissionDenied: boolean;
  error?: string;
}> {
  const userRead = await fsGetDoc<any>('users', uid, bearerToken);
  if (userRead.permissionDenied) {
    return {
      fsUser: null,
      fsWallet: null,
      userExistsInFirestore: null,
      permissionDenied: true,
      error: userRead.error,
    };
  }

  let fsWallet: any | null = null;
  if (userRead.exists) {
    const walletRead = await fsGetDoc<any>('wallets', `wallet_${uid}`, bearerToken);
    if (walletRead.exists && walletRead.data) {
      fsWallet = walletRead.data;
    } else if (!walletRead.permissionDenied) {
      const qWallet = await fsQueryByField<any>('wallets', 'userId', uid, bearerToken, 1);
      if (qWallet.items.length > 0) {
        fsWallet = qWallet.items[0];
      }
    }
  }

  return {
    fsUser: userRead.exists ? userRead.data : null,
    fsWallet,
    userExistsInFirestore: userRead.exists,
    permissionDenied: false,
  };
}

function mergeFirestoreProfileIntoLocal(user: User, firestoreProfile: any): void {
  if (!firestoreProfile || firestoreProfile.id !== user.id) return;
  if (firestoreProfile.fullName) user.fullName = firestoreProfile.fullName;
  if (firestoreProfile.country) user.country = firestoreProfile.country;
  if (firestoreProfile.countryCode) user.countryCode = firestoreProfile.countryCode;
  if (firestoreProfile.dialingCode) user.dialingCode = firestoreProfile.dialingCode;
  if (firestoreProfile.phoneNumber !== undefined) user.phoneNumber = firestoreProfile.phoneNumber;
  if (firestoreProfile.language) user.language = firestoreProfile.language;
  if (firestoreProfile.status) user.status = firestoreProfile.status;
  if (firestoreProfile.createdAt) user.createdAt = firestoreProfile.createdAt;
  if (firestoreProfile.updatedAt) user.updatedAt = firestoreProfile.updatedAt;
}

function mergeFirestoreWalletIntoLocal(wallet: Wallet, firestoreWallet: any): void {
  if (!firestoreWallet) return;
  if (firestoreWallet.availableBalance !== undefined) {
    wallet.availableBalance = Number(firestoreWallet.availableBalance);
    wallet.prototypeBalance = Number(firestoreWallet.prototypeBalance ?? firestoreWallet.availableBalance);
  }
  if (firestoreWallet.accountNumber) wallet.accountNumber = firestoreWallet.accountNumber;
  if (firestoreWallet.lastUpdated) wallet.lastUpdated = firestoreWallet.lastUpdated;
}

function getSession(token: string): { userId: string; role: 'user' | 'admin'; email: string; expiresAt: number } | undefined {
  const db = getDb();
  if (!db.sessions) db.sessions = [];
  return db.sessions.find((s) => s.token === token);
}

function saveSession(token: string, data: { userId: string; role: 'user' | 'admin'; email: string; expiresAt: number }): void {
  const db = getDb();
  if (!db.sessions) db.sessions = [];
  const existingIdx = db.sessions.findIndex((s) => s.token === token);
  const entry = { token, ...data };
  if (existingIdx >= 0) {
    db.sessions[existingIdx] = entry;
  } else {
    db.sessions.push(entry);
  }
  saveDatabase();
}

function deleteSession(token: string): void {
  const db = getDb();
  if (!db.sessions) db.sessions = [];
  db.sessions = db.sessions.filter((s) => s.token !== token);
  saveDatabase();
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Authentication Middleware - verifies persistent session token
function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }
  const token = authHeader.substring(7);
  const session = getSession(token);

  if (!session || session.expiresAt < Date.now()) {
    if (session) deleteSession(token);
    res.status(401).json({ error: 'Session expired or invalid, please sign in again' });
    return;
  }

  // Slide persistent session window (30 days)
  session.expiresAt = Date.now() + SESSION_DURATION_MS;
  saveDatabase();

  const db = getDb();
  const user = db.users.find(
    (u) => u.id === session.userId || u.email.toLowerCase() === session.email.toLowerCase()
  );
  if (!user || user.status === 'suspended') {
    res.status(403).json({ error: 'Account not found or suspended' });
    return;
  }

  (req as any).user = user;
  next();
}

// Administrator Middleware - strictly checks role AND authorized Gmail
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user: User | undefined = (req as any).user;
  if (!user || user.role !== 'admin' || user.email.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
    res.status(403).json({
      error: `Access Denied: Only the authorized administrator (${AUTHORIZED_ADMIN_EMAIL}) has access to administrative services.`,
    });
    return;
  }
  next();
}

// -------------------------------------------------------------
// Public & Health
// -------------------------------------------------------------
apiRouter.get('/health', async (req: Request, res: Response) => {
  const fbAdminStatus = getFirebaseAdminCredentialStatus();
  const basePayload = {
    status: 'healthy',
    institution: 'United Nations Federal Credit Union (UNFCU)',
    version: '1.0.0-prototype',
    serverTime: new Date().toISOString(),
    firebaseAdminConfigured: fbAdminStatus.configured,
    firebaseAdminSource: fbAdminStatus.source,
    firebaseAdminStatus: fbAdminStatus.configured ? 'configured' : 'missing_or_invalid',
  };

  if (req.query.probe === 'firebase' && fbAdminStatus.configured) {
    const liveVerification = await verifyFirebaseAdminLiveCapabilities();
    res.json({
      ...basePayload,
      liveVerification,
    });
    return;
  }

  res.json(basePayload);
});

apiRouter.get('/settings/public', (_req: Request, res: Response) => {
  const db = getDb();
  res.json({
    feeSettings: db.feeSettings,
    paymentMethods: db.paymentMethods.filter((pm) => pm.enabled),
    prototypeNotice: 'United Nations Federal Credit Union (UNFCU) — UNFCU Digital Banking platform.',
  });
});

// -------------------------------------------------------------
// Authentication & Verification Endpoints
// -------------------------------------------------------------

apiRouter.get('/auth/verify/status', (_req: Request, res: Response) => {
  res.json(getVerificationConfigStatus());
});

apiRouter.post('/auth/register/check-email', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Valid email address is required' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  if (isAuthorizedAdminEmail(cleanEmail)) {
    res.json({
      registered: true,
      reason: 'ADMIN_RESERVED',
      error: 'This email address is reserved for institutional administration. Please use the Administrator Portal.',
    });
    return;
  }

  const adminToken = await getFirebaseAdminAccessToken();
  const authCheck = await checkFirebaseAuthAccountByEmail(cleanEmail);

  // If authoritative Firebase Auth confirms no Auth user exists for this email,
  // clean up any pending deletions / stale local cache so re-registration succeeds cleanly.
  if (authCheck.checked && !authCheck.exists) {
    await reconcilePendingCleanupsForEmailOrUid(cleanEmail, undefined, adminToken);
    const staleLocalPurged = purgeLocalUserRecords([], cleanEmail);
    res.json({
      registered: false,
      hasFirebaseAuth: false,
      hasFirestoreProfile: false,
      staleLocalPurged,
    });
    return;
  }

  // If Firebase Auth has a user for this email, check authoritative Cloud Firestore profile
  if (authCheck.checked && authCheck.exists && authCheck.uid) {
    let hasFirestoreProfile = false;
    if (adminToken) {
      const [fsByUid, fsByEmail] = await Promise.all([
        fsGetDoc<User>('users', authCheck.uid, adminToken),
        fsQueryByField<User>('users', 'email', cleanEmail, adminToken, 5),
      ]);
      hasFirestoreProfile = fsByUid.exists || fsByEmail.items.length > 0;
    } else {
      const db = getDb();
      hasFirestoreProfile = db.users.some(
        (u) => u.id === authCheck.uid || u.email.toLowerCase() === cleanEmail
      );
    }

    if (hasFirestoreProfile) {
      res.json({
        registered: true,
        reason: 'ACTIVE_ACCOUNT_EXISTS',
        hasFirebaseAuth: true,
        hasFirestoreProfile: true,
        emailVerified: Boolean(authCheck.emailVerified),
        error: 'An account with this email address already exists. Please sign in.',
      });
      return;
    }

    // Auth user exists without a Firestore profile (e.g., incomplete signup awaiting email verification)
    res.json({
      registered: false,
      hasFirebaseAuth: true,
      hasFirestoreProfile: false,
      emailVerified: Boolean(authCheck.emailVerified),
      incompleteSignup: true,
    });
    return;
  }

  // Fallback if Firebase Admin Auth lookup wasn't available
  if (adminToken) {
    const fsByEmail = await fsQueryByField<User>('users', 'email', cleanEmail, adminToken, 5);
    if (!fsByEmail.error && fsByEmail.items.length > 0) {
      res.json({
        registered: true,
        reason: 'ACTIVE_ACCOUNT_EXISTS',
        hasFirebaseAuth: null,
        hasFirestoreProfile: true,
        error: 'An account with this email address already exists. Please sign in.',
      });
      return;
    }
  }

  res.json({
    registered: false,
    hasFirebaseAuth: null,
    hasFirestoreProfile: false,
  });
});

apiRouter.post('/auth/verify/send-email', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Valid email address is required' });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  const adminToken = await getFirebaseAdminAccessToken();
  const authCheck = await checkFirebaseAuthAccountByEmail(cleanEmail);

  if (authCheck.checked && !authCheck.exists) {
    await reconcilePendingCleanupsForEmailOrUid(cleanEmail, undefined, adminToken);
    purgeLocalUserRecords([], cleanEmail);
  } else if (authCheck.checked && authCheck.exists && authCheck.uid && adminToken) {
    const [fsByUid, fsByEmail] = await Promise.all([
      fsGetDoc<User>('users', authCheck.uid, adminToken),
      fsQueryByField<User>('users', 'email', cleanEmail, adminToken, 5),
    ]);
    if (fsByUid.exists || fsByEmail.items.length > 0) {
      res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
      return;
    }
  } else if (!authCheck.checked) {
    const db = getDb();
    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
      return;
    }
  }

  const result = await sendEmailVerification(cleanEmail);
  if (!result.success) {
    res.status(result.deliveryConfigured ? 400 : 503).json(result);
    return;
  }

  res.json({
    success: true,
    message: `A verification code has been sent to ${cleanEmail}. Please check your inbox.`,
    cooldownSeconds: result.cooldownSeconds,
  });
});

apiRouter.post('/auth/verify/check-email', (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: 'Email address and verification code are required' });
    return;
  }
  const result = checkEmailVerification(email, code);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  res.json({ success: true, message: 'Email address verified successfully.' });
});

apiRouter.post('/auth/verify/send-phone', async (req: Request, res: Response) => {
  const { dialingCode, phoneNumber } = req.body;
  if (!dialingCode || !phoneNumber || typeof phoneNumber !== 'string') {
    res.status(400).json({ error: 'International dialing code and valid phone number are required' });
    return;
  }

  const result = await sendPhoneVerification(dialingCode, phoneNumber);
  if (!result.success) {
    res.status(result.deliveryConfigured ? 400 : 503).json(result);
    return;
  }

  res.json({
    success: true,
    message: 'A verification code has been sent to your phone via SMS.',
    cooldownSeconds: result.cooldownSeconds,
  });
});

apiRouter.post('/auth/verify/check-phone', (req: Request, res: Response) => {
  const { dialingCode, phoneNumber, code } = req.body;
  if (!dialingCode || !phoneNumber || !code) {
    res.status(400).json({ error: 'Dialing code, phone number, and verification code are required' });
    return;
  }
  const result = checkPhoneVerification(dialingCode, phoneNumber, code);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  res.json({ success: true, message: 'Phone number verified successfully.' });
});

apiRouter.post('/auth/verify/firebase-phone-confirm', (req: Request, res: Response) => {
  const { dialingCode, phoneNumber } = req.body;
  if (!dialingCode || !phoneNumber) {
    res.status(400).json({ error: 'Dialing code and phone number are required' });
    return;
  }
  markPhoneAsVerified(dialingCode, phoneNumber);
  res.json({ success: true, message: 'Phone number verified via Firebase Authentication.' });
});

apiRouter.post('/auth/verify/firebase-email-confirm', async (req: Request, res: Response) => {
  const { email, firebaseIdToken } = req.body;
  if (!email || !firebaseIdToken) {
    res.status(400).json({ error: 'Email address and Firebase authentication token are required' });
    return;
  }

  try {
    const decoded = await verifyFirebaseIdToken(firebaseIdToken);
    const cleanEmail = String(email).trim().toLowerCase();
    if (decoded.email !== cleanEmail) {
      res.status(403).json({ error: 'Firebase token email does not match the registration email address.' });
      return;
    }
    if (!decoded.emailVerified) {
      res.status(403).json({
        error: 'Email address is not yet verified in Firebase Authentication. Please click the verification link in your inbox first.',
        code: 'EMAIL_NOT_VERIFIED',
      });
      return;
    }

    markEmailAsVerified(cleanEmail);
    res.json({ success: true, message: 'Email address verified via Firebase Authentication.' });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Unable to verify Firebase authentication token.' });
  }
});

apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  const { fullName, email, password, country, countryCode, dialingCode, phoneNumber, language, firebaseIdToken } = req.body;

  if (!fullName || !email || !password) {
    res.status(400).json({ error: 'Full name, email address, and password are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (isAuthorizedAdminEmail(cleanEmail)) {
    res.status(403).json({
      error: 'This email address is reserved for institutional administration. Please use the Administrator Portal.',
    });
    return;
  }

  if (!firebaseIdToken) {
    res.status(401).json({
      error: 'Verified Firebase Authentication token is required. Please complete email verification before registering.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  let decodedToken;
  try {
    decodedToken = await verifyFirebaseIdToken(firebaseIdToken);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid Firebase authentication token.' });
    return;
  }

  if (decodedToken.email !== cleanEmail) {
    res.status(403).json({ error: 'Authenticated email does not match registration email.' });
    return;
  }

  if (!decodedToken.emailVerified) {
    res.status(403).json({
      error: 'Email address has not been verified yet. Please click the verification link sent to your inbox before completing registration.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  if (inFlightRegistrations.has(cleanEmail)) {
    res.status(409).json({ error: 'Registration for this email address is already in progress. Please wait a moment.' });
    return;
  }
  inFlightRegistrations.add(cleanEmail);

  try {
    const db = getDb();
    const adminTokenForReg = await getFirebaseAdminAccessToken();
    const fsCheckToken = adminTokenForReg || firebaseIdToken;
    const fsExisting = await hydrateUserAndWalletFromFirestore(decodedToken.uid, fsCheckToken);

    if (fsExisting.permissionDenied) {
      res.status(503).json({
        error: fsExisting.error || 'Unable to verify existing account state in Cloud Firestore.',
        code: 'FIRESTORE_PERMISSION_ERROR',
      });
      return;
    }

    if (fsExisting.userExistsInFirestore === true) {
      res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' });
      return;
    }

    // Reconcile any leftover partial deletions for this email (always excluding the newly verified Auth UID)
    await reconcilePendingCleanupsForEmailOrUid(cleanEmail, decodedToken.uid, adminTokenForReg);

    // Inspect Firestore for any other UID documents carrying this email
    if (adminTokenForReg) {
      const fsByEmail = await fsQueryByField<User>('users', 'email', cleanEmail, adminTokenForReg, 10);
      if (!fsByEmail.error && fsByEmail.items.length > 0) {
        const otherDocs = fsByEmail.items.filter((u) => (u.__docId || u.id) !== decodedToken.uid);
        for (const oldDoc of otherDocs) {
          const oldUid = String(oldDoc.__docId || oldDoc.id || '').trim();
          // Since Firebase Auth guarantees 1 UID per email and decodedToken.uid owns cleanEmail now,
          // any other UID doc with cleanEmail is an orphaned remnant from a deleted Auth account.
          if (oldUid) {
            await fsDeleteUserAndRelatedDocs(oldUid, adminTokenForReg, { email: cleanEmail });
          }
        }
      }
    }

    // Authoritative Firestore & Auth confirmed no active account owns this UID/email:
    // Purge any stale local JSON entries (from prior deleted accounts) so the new registration starts 100% clean.
    purgeLocalUserRecords([decodedToken.uid], cleanEmail);

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const userId = decodedToken.uid;

    const writeToken = adminTokenForReg || firebaseIdToken;
    const newAccountNumber = await generateUniqueAccountNumber(writeToken);

    const newUser: User = {
      id: userId,
      email: cleanEmail,
      passwordHash,
      salt,
      fullName: fullName.trim(),
      country: country || 'United States',
      countryCode: countryCode || 'US',
      dialingCode: dialingCode || '+1',
      phoneNumber: phoneNumber || '',
      language: language || 'en',
      role: 'user',
      status: 'active',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      resetAttempts: 0,
    };

    // Zero starting balance: new users receive NO promotional welcome deposit or free money
    const initialBalance = 0.00;
    const newWallet: Wallet = {
      id: `wallet_${userId}`,
      userId: newUser.id,
      accountNumber: newAccountNumber,
      currency: 'USD' as const,
      availableBalance: initialBalance,
      prototypeBalance: initialBalance,
      isSimulated: true,
      lastUpdated: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.wallets.push(newWallet);

    // Consume verification records so they cannot be reused
    consumeVerifications(cleanEmail, dialingCode || '+1', phoneNumber || '');

    // Welcome notification with zero promotional credit
    const welcomeNotif = createNotification(
      newUser.id,
      'Welcome to United Nations Federal Credit Union (UNFCU)',
      `Your digital wallet ${newWallet.accountNumber} has been activated.`,
      'system',
      undefined,
      undefined,
      undefined,
      {
        templateKey: 'welcome',
        templateParams: { accountNumber: newWallet.accountNumber },
      }
    );

    recordAuditLog(cleanEmail, 'user', 'USER_REGISTRATION', {
      targetUserId: newUser.id,
      targetUserEmail: cleanEmail,
      reason: 'New permanent account registered with verified Firebase email',
    });

    saveDatabase();

    // Persist user profile, wallet, and welcome notification directly to Cloud Firestore
    const firestorePersistWarnings: string[] = [];
    try {
      await fsSetDoc('users', newUser.id, buildCleanFirestoreUser(newUser), writeToken);
    } catch (err: any) {
      firestorePersistWarnings.push(`users/${newUser.id}: ${err?.message || 'write failed'}`);
    }
    try {
      await fsSetDoc('wallets', newWallet.id, buildCleanFirestoreWallet(newWallet), writeToken);
    } catch (err: any) {
      firestorePersistWarnings.push(`wallets/${newWallet.id}: ${err?.message || 'write failed'}`);
    }
    try {
      await fsSetDoc('notifications', welcomeNotif.id, { ...welcomeNotif }, writeToken);
    } catch (err: any) {
      firestorePersistWarnings.push(`notifications/${welcomeNotif.id}: ${err?.message || 'write failed'}`);
    }

    const token = generateToken();
    saveSession(token, {
      userId: newUser.id,
      role: 'user',
      email: cleanEmail,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    const { passwordHash: _, salt: __, ...userPublic } = newUser;
    res.status(201).json({
      token,
      user: userPublic,
      wallet: newWallet,
      notification: welcomeNotif,
      ...(firestorePersistWarnings.length > 0 ? { firestoreWarnings: firestorePersistWarnings } : {}),
    });
  } finally {
    inFlightRegistrations.delete(cleanEmail);
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password, firebaseIdToken, firestoreProfile, firestoreWallet } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email address is required' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const db = getDb();

  // Never authenticate or create accounts without a verified Firebase ID token
  if (!firebaseIdToken) {
    const authCheck = await checkFirebaseAuthAccountByEmail(cleanEmail);
    if (authCheck.checked && !authCheck.exists) {
      purgeLocalUserRecords([], cleanEmail);
      res.status(404).json({
        error: 'No registered account was found. Please create an account first.',
        code: 'ACCOUNT_NOT_FOUND',
      });
      return;
    }

    const existingAccount = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!existingAccount && !(authCheck.checked && authCheck.exists)) {
      res.status(404).json({
        error: 'No registered account was found. Please create an account first.',
        code: 'ACCOUNT_NOT_FOUND',
      });
      return;
    }
    recordAuditLog(cleanEmail, existingAccount?.role || 'user', 'LOGIN_FAILED', {
      ...(existingAccount ? { targetUserId: existingAccount.id } : {}),
      reason: 'Firebase authentication failed during login attempt',
    });
    res.status(401).json({
      error: 'Invalid email address or password.',
      code: 'INVALID_CREDENTIALS',
    });
    return;
  }

  let decodedToken: Awaited<ReturnType<typeof verifyFirebaseIdToken>>;
  try {
    decodedToken = await verifyFirebaseIdToken(firebaseIdToken);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid Firebase authentication token.' });
    return;
  }

  if (decodedToken.email !== cleanEmail) {
    res.status(403).json({ error: 'Firebase session email does not match login email.' });
    return;
  }

  if (!decodedToken.emailVerified) {
    res.status(403).json({
      error: 'Your email address has not been verified. Please verify your email before signing in.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  const uid = decodedToken.uid;
  const serverFs = await hydrateUserAndWalletFromFirestore(uid, firebaseIdToken);

  // If live Firestore server confirms this UID does not exist, purge any stale local cache and reject
  if (serverFs.userExistsInFirestore === false) {
    purgeLocalUserRecords([uid], cleanEmail);
    res.status(404).json({
      error: 'No registered account was found. Please complete account registration first.',
      code: 'PROFILE_MISSING_FOR_AUTH_USER',
    });
    return;
  }

  const resolvedFsProfile =
    serverFs.fsUser && serverFs.fsUser.id === uid
      ? serverFs.fsUser
      : serverFs.permissionDenied && firestoreProfile && firestoreProfile.id === uid
      ? firestoreProfile
      : null;
  const resolvedFsWallet = serverFs.fsWallet || (serverFs.permissionDenied ? firestoreWallet : null) || null;

  // Purge any old-UID stale local record with the same email so deleted records never leak onto a new UID
  const staleOtherIds = db.users
    .filter((u) => u.email.toLowerCase() === cleanEmail && u.id !== uid)
    .map((u) => u.id);
  if (staleOtherIds.length > 0) {
    purgeLocalUserRecords(staleOtherIds);
  }

  let user = db.users.find((u) => u.id === uid);

  if (!user) {
    if (serverFs.permissionDenied && !firestoreProfile) {
      res.status(503).json({
        error: serverFs.error || 'Unable to verify your profile in Cloud Firestore due to permissions.',
        code: 'FIRESTORE_PERMISSION_ERROR',
      });
      return;
    }

    if (resolvedFsProfile && resolvedFsProfile.id === uid) {
      const salt = generateSalt();
      const passwordHash = hashPassword(password || crypto.randomBytes(24).toString('hex'), salt);
      const canRestoreAdmin =
        isAuthorizedAdminEmail(cleanEmail) && resolvedFsProfile.role === 'admin';

      user = {
        id: uid,
        email: cleanEmail,
        passwordHash,
        salt,
        fullName: resolvedFsProfile.fullName || (canRestoreAdmin ? 'UN Senior Retirement Administrator' : 'Account Holder'),
        country: resolvedFsProfile.country || 'United States',
        countryCode: resolvedFsProfile.countryCode || 'US',
        dialingCode: resolvedFsProfile.dialingCode || '+1',
        phoneNumber: resolvedFsProfile.phoneNumber || '',
        language: resolvedFsProfile.language || 'en',
        role: canRestoreAdmin ? 'admin' : 'user',
        status: resolvedFsProfile.status || 'active',
        emailVerified: true,
        createdAt: resolvedFsProfile.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        updatedAt: resolvedFsProfile.updatedAt || resolvedFsProfile.createdAt || new Date().toISOString(),
        resetAttempts: 0,
      };
      db.users.push(user);

      let wallet = db.wallets.find((w) => w.userId === uid);
      if (!wallet) {
        wallet = {
          id: resolvedFsWallet?.id || `wallet_${uid}`,
          userId: uid,
          accountNumber: resolvedFsWallet?.accountNumber || generateAccountNumber(),
          currency: 'USD',
          availableBalance: resolvedFsWallet?.availableBalance !== undefined ? Number(resolvedFsWallet.availableBalance) : 0.00,
          prototypeBalance: resolvedFsWallet?.prototypeBalance !== undefined ? Number(resolvedFsWallet.prototypeBalance) : 0.00,
          isSimulated: true,
          lastUpdated: resolvedFsWallet?.lastUpdated || new Date().toISOString(),
        };
        db.wallets.push(wallet);
      }
      saveDatabase();
    } else {
      res.status(404).json({
        error: 'No registered account was found. Please complete account registration first.',
        code: 'PROFILE_MISSING_FOR_AUTH_USER',
      });
      return;
    }
  }

  if (password) {
    const computedHash = hashPassword(password, user.salt);
    if (computedHash !== user.passwordHash) {
      user.salt = generateSalt();
      user.passwordHash = hashPassword(password, user.salt);
      saveDatabase();
    }
  }

  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Account has been suspended. Please contact institutional support.' });
    return;
  }

  user.emailVerified = true;

  user.lastLoginAt = new Date().toISOString();
  mergeFirestoreProfileIntoLocal(user, resolvedFsProfile);

  let wallet = db.wallets.find((w) => w.userId === user!.id);
  if (!wallet && resolvedFsWallet) {
    wallet = {
      id: resolvedFsWallet.id || `wallet_${user.id}`,
      userId: user.id,
      accountNumber: resolvedFsWallet.accountNumber || generateAccountNumber(),
      currency: 'USD',
      availableBalance: Number(resolvedFsWallet.availableBalance) || 0.00,
      prototypeBalance: Number(resolvedFsWallet.prototypeBalance ?? resolvedFsWallet.availableBalance) || 0.00,
      isSimulated: true,
      lastUpdated: resolvedFsWallet.lastUpdated || new Date().toISOString(),
    };
    db.wallets.push(wallet);
  } else if (wallet && resolvedFsWallet) {
    mergeFirestoreWalletIntoLocal(wallet, resolvedFsWallet);
  } else if (!wallet) {
    wallet = {
      id: `wallet_${user.id}`,
      userId: user.id,
      accountNumber: generateAccountNumber(),
      currency: 'USD',
      availableBalance: 0.00,
      prototypeBalance: 0.00,
      isSimulated: true,
      lastUpdated: new Date().toISOString(),
    };
    db.wallets.push(wallet);
  }

  saveDatabase();

  const token = generateToken();
  saveSession(token, {
    userId: user.id,
    role: user.role,
    email: user.email,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  });

  const { passwordHash: _, salt: __, ...userPublic } = user;

  res.json({
    token,
    user: userPublic,
    wallet,
  });
});

// Firebase Permanent Session Sync Endpoint (requires cryptographically verified Firebase ID Token + emailVerified)
apiRouter.post('/auth/firebase-sync', async (req: Request, res: Response) => {
  const { firebaseIdToken, fullName, country, countryCode, dialingCode, phoneNumber, language, firestoreWallet, firestoreProfile } = req.body;
  if (!firebaseIdToken) {
    res.status(401).json({ error: 'Firebase authentication token is required for session synchronization' });
    return;
  }

  let decodedToken;
  try {
    decodedToken = await verifyFirebaseIdToken(firebaseIdToken);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid Firebase authentication token' });
    return;
  }

  if (!decodedToken.emailVerified) {
    res.status(403).json({
      error: 'Email verification is required before accessing your account.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  const uid = decodedToken.uid;
  const cleanEmail = decodedToken.email;
  const db = getDb();

  // Authoritatively look up profile and wallet directly in Cloud Firestore via verified Firebase ID token
  const serverFs = await hydrateUserAndWalletFromFirestore(uid, firebaseIdToken);

  // If live Firestore server confirmed account was deleted/absent, purge stale local cache and reject
  if (serverFs.userExistsInFirestore === false) {
    purgeLocalUserRecords([uid], cleanEmail);
    res.status(404).json({
      error: 'No registered account was found. Please complete account registration first.',
      code: 'PROFILE_MISSING_FOR_AUTH_USER',
    });
    return;
  }

  const resolvedFsProfile =
    serverFs.fsUser && serverFs.fsUser.id === uid
      ? serverFs.fsUser
      : serverFs.permissionDenied && firestoreProfile && firestoreProfile.id === uid
      ? firestoreProfile
      : null;
  const resolvedFsWallet = serverFs.fsWallet || (serverFs.permissionDenied ? firestoreWallet : null) || null;

  // Purge any old-UID local cache sharing this email so deleted history never merges into a new UID
  const staleOtherIds = db.users
    .filter((u) => u.email.toLowerCase() === cleanEmail && u.id !== uid)
    .map((u) => u.id);
  if (staleOtherIds.length > 0) {
    purgeLocalUserRecords(staleOtherIds);
  }

  let user = db.users.find((u) => u.id === uid);

  if (user) {
    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Account has been suspended. Please contact institutional support.' });
      return;
    }

    user.email = cleanEmail;
    user.emailVerified = true;
    user.lastLoginAt = new Date().toISOString();
    mergeFirestoreProfileIntoLocal(user, resolvedFsProfile);
    if (fullName && fullName.trim()) {
      user.fullName = fullName.trim();
      user.updatedAt = new Date().toISOString();
    }
    if (country) {
      user.country = country;
      user.updatedAt = new Date().toISOString();
    }
    if (countryCode) {
      user.countryCode = countryCode;
      user.updatedAt = new Date().toISOString();
    }
    if (dialingCode) {
      user.dialingCode = dialingCode;
      user.updatedAt = new Date().toISOString();
    }
    if (phoneNumber !== undefined) {
      user.phoneNumber = phoneNumber;
      user.updatedAt = new Date().toISOString();
    }
    if (language) {
      user.language = language;
      user.updatedAt = new Date().toISOString();
    }

    let wallet = db.wallets.find((w) => w.userId === uid);
    if (wallet) {
      mergeFirestoreWalletIntoLocal(wallet, resolvedFsWallet);
    } else if (resolvedFsWallet && resolvedFsWallet.availableBalance !== undefined) {
      wallet = {
        id: resolvedFsWallet.id || `wallet_${uid}`,
        userId: uid,
        accountNumber: resolvedFsWallet.accountNumber || generateAccountNumber(),
        currency: resolvedFsWallet.currency || 'USD',
        availableBalance: Number(resolvedFsWallet.availableBalance) || 0.00,
        prototypeBalance: Number(resolvedFsWallet.prototypeBalance ?? resolvedFsWallet.availableBalance) || 0.00,
        isSimulated: resolvedFsWallet.isSimulated !== undefined ? resolvedFsWallet.isSimulated : true,
        lastUpdated: resolvedFsWallet.lastUpdated || new Date().toISOString(),
      };
      db.wallets.push(wallet);
    } else {
      wallet = {
        id: `wallet_${uid}`,
        userId: uid,
        accountNumber: generateAccountNumber(),
        currency: 'USD',
        availableBalance: 0.00,
        prototypeBalance: 0.00,
        isSimulated: true,
        lastUpdated: new Date().toISOString(),
      };
      db.wallets.push(wallet);
    }

    saveDatabase();

    const token = generateToken();
    saveSession(token, {
      userId: user.id,
      role: user.role,
      email: user.email,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    const fsNotifRes = await fsQueryByField<any>('notifications', 'userId', user.id, firebaseIdToken, 100);
    const mergedNotifs = new Map<string, boolean>();
    db.notifications.filter((n) => n.userId === user!.id).forEach((n) => mergedNotifs.set(n.id, Boolean(n.read)));
    fsNotifRes.items.forEach((n) => mergedNotifs.set(n.id, Boolean(n.read)));
    const unreadCount = Array.from(mergedNotifs.values()).filter((read) => !read).length;

    const { passwordHash: _, salt: __, ...userPublic } = user;

    res.json({
      token,
      user: userPublic,
      wallet,
      unreadNotifications: unreadCount,
    });
    return;
  }

  if (serverFs.permissionDenied && !resolvedFsProfile) {
    res.status(503).json({
      error: serverFs.error || 'Unable to synchronize profile with Cloud Firestore due to permissions.',
      code: 'FIRESTORE_PERMISSION_ERROR',
    });
    return;
  }

  // Only restore an existing permanently stored Firestore profile; never silently register on login/sync
  if (!resolvedFsProfile || resolvedFsProfile.id !== uid) {
    res.status(404).json({
      error: 'No registered account was found. Please complete account registration first.',
      code: 'PROFILE_MISSING_FOR_AUTH_USER',
    });
    return;
  }

  const isAdminUser =
    isAuthorizedAdminEmail(cleanEmail) && resolvedFsProfile.role === 'admin';
  const salt = generateSalt();
  const passwordHash = hashPassword(crypto.randomBytes(24).toString('hex'), salt);
  const restoredUser: User = {
    id: uid,
    email: cleanEmail,
    passwordHash,
    salt,
    fullName: resolvedFsProfile.fullName || (fullName && fullName.trim() ? fullName.trim() : decodedToken.name || (isAdminUser ? 'UN Senior Retirement Administrator' : 'Account Holder')),
    country: resolvedFsProfile.country || country || 'United States',
    countryCode: resolvedFsProfile.countryCode || countryCode || 'US',
    dialingCode: resolvedFsProfile.dialingCode || dialingCode || '+1',
    phoneNumber: resolvedFsProfile.phoneNumber || phoneNumber || '',
    language: resolvedFsProfile.language || language || 'en',
    role: isAdminUser ? 'admin' : 'user',
    status: resolvedFsProfile.status || 'active',
    emailVerified: true,
    createdAt: resolvedFsProfile.createdAt || new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    updatedAt: resolvedFsProfile.updatedAt || resolvedFsProfile.createdAt || new Date().toISOString(),
    resetAttempts: 0,
  };
  db.users.push(restoredUser);

  const restoredWallet: Wallet = {
    id: resolvedFsWallet?.id || `wallet_${uid}`,
    userId: uid,
    accountNumber: resolvedFsWallet?.accountNumber || generateAccountNumber(),
    currency: resolvedFsWallet?.currency || 'USD',
    availableBalance: resolvedFsWallet?.availableBalance !== undefined ? Number(resolvedFsWallet.availableBalance) : 0.00,
    prototypeBalance: resolvedFsWallet?.prototypeBalance !== undefined ? Number(resolvedFsWallet.prototypeBalance) : 0.00,
    isSimulated: true,
    lastUpdated: resolvedFsWallet?.lastUpdated || new Date().toISOString(),
  };
  db.wallets.push(restoredWallet);
  saveDatabase();

  const token = generateToken();
  saveSession(token, {
    userId: restoredUser.id,
    role: restoredUser.role,
    email: restoredUser.email,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  });

  const fsNotifRes = await fsQueryByField<any>('notifications', 'userId', restoredUser.id, firebaseIdToken, 100);
  const unreadCount = fsNotifRes.items.filter((n) => !n.read).length;

  const { passwordHash: _, salt: __, ...userPublic } = restoredUser;
  res.json({
    token,
    user: userPublic,
    wallet: restoredWallet,
    unreadNotifications: unreadCount,
  });
});

// Dedicated Administrator Login - strictly enforced email restriction
apiRouter.post('/auth/admin-login', async (req: Request, res: Response) => {
  const { email, password, firebaseIdToken, firestoreProfile, firestoreWallet } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Administrator email and password are required' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();

  // Enforce: Only the authorized administrator Gmail is permitted
  if (!isAuthorizedAdminEmail(cleanEmail)) {
    recordAuditLog(cleanEmail, 'unknown', 'UNAUTHORIZED_ADMIN_LOGIN_ATTEMPT', {
      reason: `Unauthorized email address tried to access administrator sign-in. Authorized Gmail required: ${AUTHORIZED_ADMIN_EMAIL}`,
    });
    res.status(403).json({
      error: `Access denied. Administrator privileges are restricted exclusively to ${AUTHORIZED_ADMIN_EMAIL}. No other Gmail or email account is permitted.`,
    });
    return;
  }

  const db = getDb();
  let adminUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!firebaseIdToken) {
    if (!adminUser) {
      res.status(404).json({
        error: 'Administrator account not registered yet. Please complete Administrator Sign Up and email verification first.',
        code: 'ACCOUNT_NOT_FOUND',
      });
      return;
    }
    recordAuditLog(cleanEmail, 'admin', 'ADMIN_LOGIN_FAILED', {
      reason: 'Firebase administrator authentication failed during login attempt',
    });
    res.status(401).json({
      error: 'Invalid administrator credentials.',
      code: 'INVALID_CREDENTIALS',
    });
    return;
  }

  let decodedToken: Awaited<ReturnType<typeof verifyFirebaseIdToken>>;
  try {
    decodedToken = await verifyFirebaseIdToken(firebaseIdToken);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid Firebase authentication token.' });
    return;
  }

  if (decodedToken.email !== cleanEmail) {
    res.status(403).json({ error: 'Firebase session email does not match administrator email.' });
    return;
  }

  if (!decodedToken.emailVerified) {
    res.status(403).json({
      error: 'Administrator email address is not yet verified. Please verify your email link first.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  const serverFs = await hydrateUserAndWalletFromFirestore(decodedToken.uid, firebaseIdToken);
  const resolvedFsProfile =
    serverFs.fsUser && serverFs.fsUser.id === decodedToken.uid
      ? serverFs.fsUser
      : firestoreProfile && firestoreProfile.id === decodedToken.uid
      ? firestoreProfile
      : null;
  const resolvedFsWallet = serverFs.fsWallet || firestoreWallet || null;

  if (!adminUser) {
    // Only restore if an existing Firestore admin profile already exists; never silently create on login
    if (!resolvedFsProfile || resolvedFsProfile.id !== decodedToken.uid) {
      res.status(404).json({
        error: 'Administrator account not registered yet. Please complete Administrator Sign Up first.',
        code: 'ACCOUNT_NOT_FOUND',
      });
      return;
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password || crypto.randomBytes(24).toString('hex'), salt);
    const adminId = decodedToken.uid;
    adminUser = {
      id: adminId,
      email: cleanEmail,
      passwordHash,
      salt,
      fullName: req.body.fullName || resolvedFsProfile.fullName || 'UN Senior Retirement Administrator',
      country: resolvedFsProfile.country || 'United States',
      countryCode: resolvedFsProfile.countryCode || 'US',
      dialingCode: resolvedFsProfile.dialingCode || '+1',
      phoneNumber: resolvedFsProfile.phoneNumber || '',
      language: resolvedFsProfile.language || 'en',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      createdAt: resolvedFsProfile.createdAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      resetAttempts: 0,
    };
    db.users.push(adminUser);

    let wallet = db.wallets.find((w) => w.userId === adminId);
    if (!wallet) {
      wallet = {
        id: resolvedFsWallet?.id || `wallet_${adminId}`,
        userId: adminId,
        accountNumber: resolvedFsWallet?.accountNumber || 'UNGB-0001-0000-0001',
        currency: 'USD',
        availableBalance: resolvedFsWallet?.availableBalance !== undefined ? Number(resolvedFsWallet.availableBalance) : 0.00,
        prototypeBalance: resolvedFsWallet?.prototypeBalance !== undefined ? Number(resolvedFsWallet.prototypeBalance) : 0.00,
        isSimulated: true,
        lastUpdated: resolvedFsWallet?.lastUpdated || new Date().toISOString(),
      };
      db.wallets.push(wallet);
    }
    saveDatabase();
  }

  // Ensure role is admin for whitelisted email
  if (adminUser.role !== 'admin') {
    adminUser.role = 'admin';
    saveDatabase();
  }

  adminUser.emailVerified = true;
  const newUid = decodedToken.uid;
  if (adminUser.id !== newUid) {
    const oldId = adminUser.id;
    adminUser.id = newUid;
    const adminWallet = db.wallets.find((w) => w.userId === oldId || w.userId === newUid);
    if (adminWallet) adminWallet.userId = newUid;
    db.transactions.forEach((tx) => {
      if (tx.userId === oldId || tx.userEmail?.toLowerCase() === cleanEmail) tx.userId = newUid;
    });
    if (db.notifications) {
      db.notifications.forEach((n) => {
        if (n.userId === oldId) n.userId = newUid;
      });
    }
    if (db.paymentSubmissions) {
      db.paymentSubmissions.forEach((p) => {
        if (p.userId === oldId || p.userEmail?.toLowerCase() === cleanEmail) p.userId = newUid;
      });
    }
  }

  if (password) {
    const computedHash = hashPassword(password, adminUser.salt);
    if (computedHash !== adminUser.passwordHash) {
      adminUser.salt = generateSalt();
      adminUser.passwordHash = hashPassword(password, adminUser.salt);
      saveDatabase();
    }
  }

  adminUser.lastLoginAt = new Date().toISOString();
  mergeFirestoreProfileIntoLocal(adminUser, resolvedFsProfile);
  recordAuditLog(cleanEmail, 'admin', 'ADMIN_LOGIN_SUCCESS', {
    reason: 'Authorized administrator successfully signed in',
  });

  let wallet = db.wallets.find((w) => w.userId === adminUser!.id);
  if (!wallet) {
    wallet = {
      id: resolvedFsWallet?.id || `wallet_${adminUser.id}`,
      userId: adminUser.id,
      accountNumber: resolvedFsWallet?.accountNumber || 'UNGB-0001-0000-0001',
      currency: 'USD',
      availableBalance: resolvedFsWallet?.availableBalance !== undefined ? Number(resolvedFsWallet.availableBalance) : 0.00,
      prototypeBalance: resolvedFsWallet?.prototypeBalance !== undefined ? Number(resolvedFsWallet.prototypeBalance) : 0.00,
      isSimulated: true,
      lastUpdated: resolvedFsWallet?.lastUpdated || new Date().toISOString(),
    };
    db.wallets.push(wallet);
  } else if (resolvedFsWallet) {
    mergeFirestoreWalletIntoLocal(wallet, resolvedFsWallet);
  }
  saveDatabase();

  const token = generateToken();
  saveSession(token, {
    userId: adminUser.id,
    role: 'admin',
    email: adminUser.email,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  });

  const { passwordHash: _, salt: __, ...userPublic } = adminUser;

  res.json({
    token,
    user: userPublic,
    wallet,
  });
});

// Dedicated Administrator Sign Up - strictly enforced email restriction + Firebase verification
apiRouter.post('/auth/admin-register', async (req: Request, res: Response) => {
  const { fullName, email, password, firebaseIdToken } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Administrator email and password are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Administrator password must be at least 8 characters long' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();

  // Enforce: Only authorized admin Gmail can sign up as admin
  if (!isAuthorizedAdminEmail(cleanEmail)) {
    recordAuditLog(cleanEmail, 'unknown', 'UNAUTHORIZED_ADMIN_REGISTER_ATTEMPT', {
      reason: `Unauthorized email address tried to register for administrator access. Authorized Gmail required: ${AUTHORIZED_ADMIN_EMAIL}`,
    });
    res.status(403).json({
      error: `Access denied. Administrator registration is restricted exclusively to ${AUTHORIZED_ADMIN_EMAIL}. No other Gmail or email account is permitted.`,
    });
    return;
  }

  if (!firebaseIdToken) {
    res.status(401).json({
      error: 'Administrator email verification via Firebase Authentication is required before provisioning access.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  let decodedToken;
  try {
    decodedToken = await verifyFirebaseIdToken(firebaseIdToken);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid Firebase authentication token.' });
    return;
  }

  if (decodedToken.email !== cleanEmail || !decodedToken.emailVerified) {
    res.status(403).json({
      error: 'Administrator email address is not yet verified in Firebase Authentication.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  const db = getDb();
  let adminUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail || u.id === decodedToken.uid);

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  if (adminUser) {
    adminUser.id = decodedToken.uid;
    adminUser.role = 'admin';
    adminUser.emailVerified = true;
    adminUser.passwordHash = passwordHash;
    adminUser.salt = salt;
    if (fullName && fullName.trim()) {
      adminUser.fullName = fullName.trim();
    }
    adminUser.lastLoginAt = new Date().toISOString();
  } else {
    const userId = decodedToken.uid;
    adminUser = {
      id: userId,
      email: cleanEmail,
      passwordHash,
      salt,
      fullName: fullName && fullName.trim() ? fullName.trim() : 'UN Senior Retirement Administrator',
      country: 'United States',
      countryCode: 'US',
      dialingCode: '+1',
      phoneNumber: '',
      language: 'en',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      resetAttempts: 0,
    };
    db.users.push(adminUser);
  }

  let wallet = db.wallets.find((w) => w.userId === adminUser!.id);
  if (!wallet) {
    wallet = {
      id: `wallet_${adminUser.id}`,
      userId: adminUser.id,
      accountNumber: 'UNGB-0001-0000-0001',
      currency: 'USD',
      availableBalance: 0.00,
      prototypeBalance: 0.00,
      isSimulated: true,
      lastUpdated: new Date().toISOString(),
    };
    db.wallets.push(wallet);
  }

  saveDatabase();

  // Persist admin registry, user profile, and wallet directly to Cloud Firestore
  await Promise.all([
    fsSetDoc(
      'admins',
      adminUser.id,
      {
        uid: adminUser.id,
        email: cleanEmail,
        role: 'admin',
        active: true,
        updatedAt: new Date().toISOString(),
      },
      firebaseIdToken
    ).catch(() => {}),
    fsSetDoc('users', adminUser.id, buildCleanFirestoreUser(adminUser), firebaseIdToken).catch(() => {}),
    fsSetDoc('wallets', wallet.id, buildCleanFirestoreWallet(wallet), firebaseIdToken).catch(() => {}),
  ]);

  recordAuditLog(cleanEmail, 'admin', 'ADMIN_ACCOUNT_PROVISIONED', {
    reason: `Administrator account successfully registered and activated for ${cleanEmail}`,
  });

  const token = generateToken();
  saveSession(token, {
    userId: adminUser.id,
    role: 'admin',
    email: adminUser.email,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  });

  const { passwordHash: _, salt: __, ...userPublic } = adminUser;

  res.json({
    message: 'Administrator account provisioned successfully',
    token,
    user: userPublic,
    wallet,
  });
});



apiRouter.get('/auth/me', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const db = getDb();
  const callerToken = await getCallerFirestoreToken(req, user);

  if (callerToken) {
    const serverFs = await hydrateUserAndWalletFromFirestore(user.id, callerToken);
    if (serverFs.userExistsInFirestore === false) {
      db.users = db.users.filter((u) => u.id !== user.id && u.email.toLowerCase() !== user.email.toLowerCase());
      db.wallets = db.wallets.filter((w) => w.userId !== user.id);
      if (db.sessions) {
        db.sessions = db.sessions.filter((s) => s.userId !== user.id);
      }
      saveDatabase();
      res.status(404).json({
        error: 'No registered account was found. Please complete account registration first.',
        code: 'PROFILE_MISSING_FOR_AUTH_USER',
      });
      return;
    }
    if (serverFs.fsUser) {
      mergeFirestoreProfileIntoLocal(user, serverFs.fsUser);
    }
    if (serverFs.fsWallet) {
      let existingWallet = db.wallets.find((w) => w.userId === user.id);
      if (!existingWallet) {
        existingWallet = {
          id: serverFs.fsWallet.id || `wallet_${user.id}`,
          userId: user.id,
          accountNumber: serverFs.fsWallet.accountNumber || generateAccountNumber(),
          currency: 'USD',
          availableBalance: Number(serverFs.fsWallet.availableBalance) || 0,
          prototypeBalance: Number(serverFs.fsWallet.prototypeBalance ?? serverFs.fsWallet.availableBalance) || 0,
          isSimulated: serverFs.fsWallet.isSimulated !== undefined ? Boolean(serverFs.fsWallet.isSimulated) : true,
          lastUpdated: serverFs.fsWallet.lastUpdated || new Date().toISOString(),
        };
        db.wallets.push(existingWallet);
      } else {
        mergeFirestoreWalletIntoLocal(existingWallet, serverFs.fsWallet);
      }
      saveDatabase();
    }
  }

  let wallet = db.wallets.find((w) => w.userId === user.id);
  if (!wallet && isAuthorizedAdminEmail(user.email)) {
    wallet = db.wallets.find((w) => w.accountNumber === 'UNGB-0001-0000-0001');
    if (wallet) {
      wallet.userId = user.id;
      saveDatabase();
    }
  }

  const unreadSet = new Map<string, boolean>();
  db.notifications.filter((n) => n.userId === user.id).forEach((n) => unreadSet.set(n.id, Boolean(n.read)));
  if (callerToken) {
    const fsNotifs = await fsQueryByField<any>('notifications', 'userId', user.id, callerToken, 100);
    fsNotifs.items.forEach((n) => unreadSet.set(n.id, Boolean(n.read)));
  }
  const unreadCount = Array.from(unreadSet.values()).filter((r) => !r).length;

  const { passwordHash: _, salt: __, ...userPublic } = user;
  res.json({
    user: userPublic,
    wallet,
    unreadNotifications: unreadCount,
  });
});

apiRouter.put('/auth/profile', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { fullName, country, countryCode, dialingCode, phoneNumber, language } = req.body;

  if (fullName) user.fullName = fullName.trim();
  if (country) user.country = country;
  if (countryCode) user.countryCode = countryCode;
  if (dialingCode) user.dialingCode = dialingCode;
  if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
  if (language) user.language = language;
  user.updatedAt = new Date().toISOString();

  saveDatabase();

  const adminAccessToken = await getFirebaseAdminAccessToken();
  const callerToken = adminAccessToken || (await getCallerFirestoreToken(req, user));
  if (callerToken) {
    try {
      await fsSetDoc('users', user.id, buildCleanFirestoreUser(user), callerToken);
    } catch (err: any) {
      console.warn('Firestore profile update sync warning:', err?.message || err);
    }
  }

  const { passwordHash: _, salt: __, ...userPublic } = user;
  res.json({
    user: userPublic,
    message: 'Profile updated successfully',
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    deleteSession(token);
  }
  res.json({ message: 'Logged out successfully' });
});

// -------------------------------------------------------------
// User Wallet & Financial Operations
// -------------------------------------------------------------

apiRouter.get('/wallet', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const db = getDb();
  const callerToken = await getCallerFirestoreToken(req, user);

  let wallet = db.wallets.find((w) => w.userId === user.id);
  const txMap = new Map<string, Transaction>();
  db.transactions.filter((t) => t.userId === user.id).forEach((t) => txMap.set(t.id, t));
  let feeSettings = db.feeSettings;

  if (callerToken) {
    const [fsWalletRes, fsTxRes, fsFeeRes] = await Promise.all([
      fsGetDoc<Wallet>('wallets', `wallet_${user.id}`, callerToken),
      fsQueryByField<Transaction>('transactions', 'userId', user.id, callerToken, 150),
      fsGetDoc<FeeSettings>('settings', 'feeSettings', callerToken),
    ]);

    let resolvedFsWallet = fsWalletRes.exists ? fsWalletRes.data : null;
    if (!resolvedFsWallet && !fsWalletRes.permissionDenied) {
      const qW = await fsQueryByField<Wallet>('wallets', 'userId', user.id, callerToken, 1);
      if (qW.items.length > 0) resolvedFsWallet = qW.items[0];
    }

    if (resolvedFsWallet) {
      if (!wallet) {
        wallet = {
          id: resolvedFsWallet.id || `wallet_${user.id}`,
          userId: user.id,
          accountNumber: resolvedFsWallet.accountNumber || generateAccountNumber(),
          currency: 'USD',
          availableBalance: Number(resolvedFsWallet.availableBalance) || 0,
          prototypeBalance: Number(resolvedFsWallet.prototypeBalance ?? resolvedFsWallet.availableBalance) || 0,
          isSimulated: resolvedFsWallet.isSimulated !== undefined ? Boolean(resolvedFsWallet.isSimulated) : true,
          lastUpdated: resolvedFsWallet.lastUpdated || new Date().toISOString(),
        };
        db.wallets.push(wallet);
      } else {
        mergeFirestoreWalletIntoLocal(wallet, resolvedFsWallet);
      }
    }

    if (fsTxRes.items.length > 0) {
      fsTxRes.items.forEach((ftx) => {
        const existing = txMap.get(ftx.id);
        if (!existing) {
          txMap.set(ftx.id, ftx);
          db.transactions.push(ftx);
        } else {
          const fsTime = new Date(ftx.updatedAt || ftx.createdAt || 0).getTime();
          const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          if (fsTime >= localTime) {
            txMap.set(ftx.id, ftx);
          }
        }
      });
    }

    if (fsFeeRes.exists && fsFeeRes.data) {
      feeSettings = { ...db.feeSettings, ...fsFeeRes.data };
    }
    saveDatabase();
  }

  const transactions = Array.from(txMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json({
    wallet,
    transactions,
    feeSettings,
  });
});

function computeFee(amount: number, type: 'transfer' | 'withdrawal', settings: FeeSettings): number {
  if (type === 'transfer') {
    if (!settings.transferFeeEnabled) return 0;
    const fixed = settings.transferFixedFee ?? settings.transferFee ?? 0;
    const pct = ((settings.transferPercentFee ?? 0) / 100) * amount;
    return Math.round((fixed + pct) * 100) / 100;
  } else {
    if (!settings.withdrawalFeeEnabled) return 0;
    const fixed = settings.withdrawalFixedFee ?? settings.withdrawalFee ?? 0;
    const pct = ((settings.withdrawalPercentFee ?? 0) / 100) * amount;
    return Math.round((fixed + pct) * 100) / 100;
  }
}

// Transfer Quote
apiRouter.post('/wallet/transfer/quote', authenticateUser, (req: Request, res: Response) => {
  const { amount } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Please enter a valid positive transfer amount' });
    return;
  }

  const db = getDb();
  const fee = computeFee(numAmount, 'transfer', db.feeSettings);
  const total = Math.round((numAmount + fee) * 100) / 100;

  res.json({
    amount: numAmount,
    applicableFee: fee,
    total,
    currency: 'USD',
    fixedFee: db.feeSettings.transferFixedFee ?? db.feeSettings.transferFee ?? 0,
    percentFee: db.feeSettings.transferPercentFee ?? 0,
    feeEnabled: db.feeSettings.transferFeeEnabled ?? true,
    paymentMethods: db.paymentMethods.filter((pm) => pm.enabled),
  });
});

// Transfer Submission - Direct ledger settlement
apiRouter.post('/wallet/transfer/submit', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const {
    recipientName,
    recipientBank,
    recipientAccount,
    routingOrSwift,
    amount,
    description,
  } = req.body;

  const numAmount = Math.round(parseFloat(amount) * 100) / 100;
  if (!recipientName || !recipientBank || !recipientAccount || isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'All recipient fields and a valid transfer amount are required' });
    return;
  }

  const db = getDb();
  const callerToken = await getCallerFirestoreToken(req, user);
  let wallet = db.wallets.find((w) => w.userId === user.id);

  if (callerToken) {
    const fsWallet = await fsGetDoc<Wallet>('wallets', `wallet_${user.id}`, callerToken);
    if (fsWallet.exists && fsWallet.data) {
      if (!wallet) {
        wallet = { ...fsWallet.data };
        db.wallets.push(wallet);
      } else {
        mergeFirestoreWalletIntoLocal(wallet, fsWallet.data);
      }
    }
  }

  if (!wallet) {
    res.status(404).json({ error: 'Wallet not found' });
    return;
  }

  const fee = computeFee(numAmount, 'transfer', db.feeSettings);
  const total = Math.round((numAmount + fee) * 100) / 100;

  // Duplicate request protection (within 4 seconds)
  const isDuplicate = db.transactions.find(
    (t) =>
      t.userId === user.id &&
      t.type === 'transfer' &&
      t.amount === numAmount &&
      t.accountNumber === recipientAccount.trim() &&
      Date.now() - new Date(t.createdAt).getTime() < 4000
  );
  if (isDuplicate) {
    res.status(409).json({ error: 'Duplicate transaction request detected. Please wait a few moments.' });
    return;
  }

  if (wallet.availableBalance < total) {
    res.status(400).json({
      error: `Insufficient available funds ($${wallet.availableBalance.toFixed(2)} USD). Transfer total of $${total.toFixed(2)} USD (Principal: $${numAmount.toFixed(2)} + Applicable Fee: $${fee.toFixed(2)}) exceeds your available balance.`,
    });
    return;
  }

  // Deduct principal + fee directly from ledger
  const previousBalance = wallet.availableBalance;
  wallet.availableBalance = Math.round((previousBalance - total) * 100) / 100;
  wallet.prototypeBalance = wallet.availableBalance;
  wallet.lastUpdated = new Date().toISOString();

  const reference = generateReference('TXN-UNGB');
  const now = new Date().toISOString();

  const transaction: Transaction = {
    id: `txn_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    reference,
    userId: user.id,
    userEmail: user.email,
    userName: user.fullName,
    type: 'transfer',
    senderOrRecipient: recipientName.trim(),
    bankName: recipientBank.trim(),
    accountNumber: recipientAccount.trim(),
    routingOrSwift: routingOrSwift ? routingOrSwift.trim() : undefined,
    amount: numAmount,
    fee,
    total,
    previousBalance,
    newBalance: wallet.availableBalance,
    paymentMethod: 'internal',
    paymentStatus: 'confirmed',
    status: 'completed',
    description: description?.trim() || `Transfer to ${recipientName.trim()} (${recipientBank.trim()})`,
    isSimulated: true,
    createdAt: now,
    updatedAt: now,
    reviewCompletedAt: now,
  };

  db.transactions.unshift(transaction);

  const transferNotif = createNotification(
    user.id,
    'Transfer Completed',
    `A transfer of $${numAmount.toFixed(2)} USD to ${recipientName.trim()} (${recipientBank.trim()}) with an applicable transaction fee of $${fee.toFixed(2)} USD (Total deducted: $${total.toFixed(2)} USD) has been successfully recorded in your account. Reference: ${reference}. Date: ${new Date().toLocaleString()}.`,
    'payment',
    undefined,
    reference,
    numAmount,
    {
      templateKey: 'transfer_completed',
      templateParams: {
        amount: numAmount,
        recipient: recipientName.trim(),
        bank: recipientBank.trim(),
        fee,
        total,
        reference,
      },
    }
  );

  recordAuditLog(user.email, user.role, 'TRANSFER_COMPLETED', {
    targetUserId: user.id,
    targetUserEmail: user.email,
    reference,
    previousValue: `$${previousBalance.toFixed(2)}`,
    newValue: `$${wallet.availableBalance.toFixed(2)}`,
    reason: `Transfer to ${recipientBank.trim()} - ${recipientAccount.trim()} (Principal: $${numAmount.toFixed(2)}, Fee: $${fee.toFixed(2)})`,
  });

  saveDatabase();

  const adminAccessToken = await getFirebaseAdminAccessToken();
  if (adminAccessToken) {
    await Promise.all([
      fsSetDoc('wallets', wallet.id, buildCleanFirestoreWallet(wallet), adminAccessToken).catch(() => {}),
      fsSetDoc('transactions', transaction.id, { ...transaction }, adminAccessToken).catch(() => {}),
      fsSetDoc('notifications', transferNotif.id, { ...transferNotif }, adminAccessToken).catch(() => {}),
    ]);
  } else if (callerToken) {
    await fsSetDoc('notifications', transferNotif.id, { ...transferNotif }, callerToken).catch(() => {});
  }

  res.status(201).json({
    message: 'Transfer processed and settled successfully.',
    transaction,
    wallet,
    notification: transferNotif,
  });
});

// Withdrawal Quote
apiRouter.post('/wallet/withdraw/quote', authenticateUser, (req: Request, res: Response) => {
  const { amount } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Please enter a valid positive withdrawal amount' });
    return;
  }

  const db = getDb();
  const fee = computeFee(numAmount, 'withdrawal', db.feeSettings);
  const total = Math.round((numAmount + fee) * 100) / 100;

  res.json({
    amount: numAmount,
    applicableFee: fee,
    total,
    currency: 'USD',
    fixedFee: db.feeSettings.withdrawalFixedFee ?? db.feeSettings.withdrawalFee ?? 0,
    percentFee: db.feeSettings.withdrawalPercentFee ?? 0,
    feeEnabled: db.feeSettings.withdrawalFeeEnabled ?? true,
    paymentMethods: db.paymentMethods.filter((pm) => pm.enabled),
  });
});

// Withdrawal Submission - Direct ledger settlement
apiRouter.post('/wallet/withdraw/submit', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const {
    destinationBank,
    accountHolderName,
    accountNumber,
    routingNumber,
    amount,
  } = req.body;

  const numAmount = Math.round(parseFloat(amount) * 100) / 100;
  if (!destinationBank || !accountHolderName || !accountNumber || isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'All destination fields and a valid withdrawal amount are required' });
    return;
  }

  const db = getDb();
  const callerToken = await getCallerFirestoreToken(req, user);
  let wallet = db.wallets.find((w) => w.userId === user.id);

  if (callerToken) {
    const fsWallet = await fsGetDoc<Wallet>('wallets', `wallet_${user.id}`, callerToken);
    if (fsWallet.exists && fsWallet.data) {
      if (!wallet) {
        wallet = { ...fsWallet.data };
        db.wallets.push(wallet);
      } else {
        mergeFirestoreWalletIntoLocal(wallet, fsWallet.data);
      }
    }
  }

  if (!wallet) {
    res.status(404).json({ error: 'Wallet not found' });
    return;
  }

  const fee = computeFee(numAmount, 'withdrawal', db.feeSettings);
  const total = Math.round((numAmount + fee) * 100) / 100;

  // Duplicate request protection (within 4 seconds)
  const isDuplicate = db.transactions.find(
    (t) =>
      t.userId === user.id &&
      t.type === 'withdrawal' &&
      t.amount === numAmount &&
      t.accountNumber === accountNumber.trim() &&
      Date.now() - new Date(t.createdAt).getTime() < 4000
  );
  if (isDuplicate) {
    res.status(409).json({ error: 'Duplicate withdrawal request detected. Please wait a few moments.' });
    return;
  }

  if (wallet.availableBalance < total) {
    res.status(400).json({
      error: `Insufficient available funds ($${wallet.availableBalance.toFixed(2)} USD). Withdrawal total of $${total.toFixed(2)} USD (Principal: $${numAmount.toFixed(2)} + Applicable Fee: $${fee.toFixed(2)}) exceeds your available balance.`,
    });
    return;
  }

  // Deduct principal + fee directly from ledger
  const previousBalance = wallet.availableBalance;
  wallet.availableBalance = Math.round((previousBalance - total) * 100) / 100;
  wallet.prototypeBalance = wallet.availableBalance;
  wallet.lastUpdated = new Date().toISOString();

  const reference = generateReference('WDL-UNGB');
  const now = new Date().toISOString();

  const transaction: Transaction = {
    id: `txn_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    reference,
    userId: user.id,
    userEmail: user.email,
    userName: user.fullName,
    type: 'withdrawal',
    senderOrRecipient: accountHolderName.trim(),
    bankName: destinationBank.trim(),
    accountNumber: accountNumber.trim(),
    routingOrSwift: routingNumber?.trim(),
    amount: numAmount,
    fee,
    total,
    previousBalance,
    newBalance: wallet.availableBalance,
    paymentMethod: 'internal',
    paymentStatus: 'confirmed',
    status: 'completed',
    description: `Funds Withdrawal to ${destinationBank.trim()} (${accountNumber.trim()})`,
    isSimulated: true,
    createdAt: now,
    updatedAt: now,
    reviewCompletedAt: now,
  };

  db.transactions.unshift(transaction);

  const withdrawalNotif = createNotification(
    user.id,
    'Withdrawal Completed',
    `A withdrawal of $${numAmount.toFixed(2)} USD to ${destinationBank.trim()} (${accountNumber.trim()}) with an applicable transaction fee of $${fee.toFixed(2)} USD (Total deducted: $${total.toFixed(2)} USD) has been successfully recorded in your account. Reference: ${reference}. Date: ${new Date().toLocaleString()}.`,
    'payment',
    undefined,
    reference,
    numAmount,
    {
      templateKey: 'withdrawal_completed',
      templateParams: {
        amount: numAmount,
        bank: destinationBank.trim(),
        account: accountNumber.trim(),
        fee,
        total,
        reference,
      },
    }
  );

  recordAuditLog(user.email, user.role, 'WITHDRAWAL_COMPLETED', {
    targetUserId: user.id,
    targetUserEmail: user.email,
    reference,
    previousValue: `$${previousBalance.toFixed(2)}`,
    newValue: `$${wallet.availableBalance.toFixed(2)}`,
    reason: `Withdrawal to ${destinationBank.trim()} - ${accountNumber.trim()} (Principal: $${numAmount.toFixed(2)}, Fee: $${fee.toFixed(2)})`,
  });

  saveDatabase();

  const adminAccessToken = await getFirebaseAdminAccessToken();
  if (adminAccessToken) {
    await Promise.all([
      fsSetDoc('wallets', wallet.id, buildCleanFirestoreWallet(wallet), adminAccessToken).catch(() => {}),
      fsSetDoc('transactions', transaction.id, { ...transaction }, adminAccessToken).catch(() => {}),
      fsSetDoc('notifications', withdrawalNotif.id, { ...withdrawalNotif }, adminAccessToken).catch(() => {}),
    ]);
  } else if (callerToken) {
    await fsSetDoc('notifications', withdrawalNotif.id, { ...withdrawalNotif }, callerToken).catch(() => {});
  }

  res.status(201).json({
    message: 'Withdrawal processed and settled successfully.',
    transaction,
    wallet,
    notification: withdrawalNotif,
  });
});

// User Transactions Search & Details
apiRouter.get('/wallet/transactions', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const db = getDb();
  const search = ((req.query.search as string) || '').toLowerCase();
  const type = req.query.type as string;
  const status = req.query.status as string;
  const callerToken = await getCallerFirestoreToken(req, user);

  const txMap = new Map<string, Transaction>();
  db.transactions.filter((t) => t.userId === user.id).forEach((t) => txMap.set(t.id, t));

  if (callerToken) {
    const fsTx = await fsQueryByField<Transaction>('transactions', 'userId', user.id, callerToken, 150);
    fsTx.items.forEach((ftx) => {
      const existing = txMap.get(ftx.id);
      if (!existing) {
        txMap.set(ftx.id, ftx);
      } else {
        const fsTime = new Date(ftx.updatedAt || ftx.createdAt || 0).getTime();
        const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (fsTime >= localTime) txMap.set(ftx.id, ftx);
      }
    });
  }

  let txs = Array.from(txMap.values());

  if (search) {
    txs = txs.filter(
      (t) =>
        t.reference.toLowerCase().includes(search) ||
        (t.senderOrRecipient || '').toLowerCase().includes(search) ||
        (t.bankName || '').toLowerCase().includes(search) ||
        (t.description || '').toLowerCase().includes(search)
    );
  }

  if (type && type !== 'all') {
    txs = txs.filter((t) => t.type === type);
  }

  if (status && status !== 'all') {
    txs = txs.filter((t) => t.paymentStatus === status || t.status === status);
  }

  txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ transactions: txs });
});

apiRouter.get('/wallet/transactions/:id', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const db = getDb();
  let txn = db.transactions.find((t) => t.id === req.params.id || t.reference === req.params.id);

  if (!txn) {
    const callerToken = await getCallerFirestoreToken(req, user);
    if (callerToken) {
      const fsDoc = await fsGetDoc<Transaction>('transactions', req.params.id, callerToken);
      if (fsDoc.exists && fsDoc.data) {
        txn = fsDoc.data;
      } else {
        const byRef = await fsQueryByField<Transaction>('transactions', 'reference', req.params.id, callerToken, 1);
        if (byRef.items.length > 0) txn = byRef.items[0];
      }
    }
  }

  if (!txn) {
    res.status(404).json({ error: 'Transaction record not found' });
    return;
  }

  if (txn.userId !== user.id && user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied: You can only view your own transactions' });
    return;
  }

  res.json({ transaction: txn });
});

// Notifications
apiRouter.get('/notifications', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const db = getDb();
  const notifMap = new Map<string, any>();
  db.notifications.filter((n) => n.userId === user.id).forEach((n) => notifMap.set(n.id, n));

  const callerToken = await getCallerFirestoreToken(req, user);
  if (callerToken) {
    const fsNotifs = await fsQueryByField<any>('notifications', 'userId', user.id, callerToken, 100);
    fsNotifs.items.forEach((n) => {
      const existing = notifMap.get(n.id);
      if (!existing || n.read === true) {
        notifMap.set(n.id, n);
      }
    });
  }

  const notifs = Array.from(notifMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json({ notifications: notifs });
});

apiRouter.put('/notifications/:id/read', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const db = getDb();
  const notif = db.notifications.find((n) => n.id === req.params.id && n.userId === user.id);

  if (notif) {
    notif.read = true;
    saveDatabase();
  }
  const callerToken = await getCallerFirestoreToken(req, user);
  if (callerToken) {
    const fsN = await fsGetDoc<any>('notifications', req.params.id, callerToken);
    if (fsN.exists && fsN.data && fsN.data.userId === user.id) {
      await fsSetDoc('notifications', req.params.id, { ...fsN.data, read: true }, callerToken).catch(() => {});
    }
  }
  res.json({ success: true });
});

apiRouter.put('/notifications/read-all', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const db = getDb();
  db.notifications.forEach((n) => {
    if (n.userId === user.id) n.read = true;
  });
  saveDatabase();
  const callerToken = await getCallerFirestoreToken(req, user);
  if (callerToken) {
    const fsNotifs = await fsQueryByField<any>('notifications', 'userId', user.id, callerToken, 100);
    await Promise.all(
      fsNotifs.items
        .filter((n) => !n.read)
        .map((n) => fsSetDoc('notifications', n.id, { ...n, read: true }, callerToken).catch(() => {}))
    );
  }
  res.json({ success: true });
});

// -------------------------------------------------------------
// ADMINISTRATOR SERVICES (Sections 9, 14, 15, 18)
// -------------------------------------------------------------

apiRouter.get('/admin/system-status', authenticateUser, requireAdmin, async (_req: Request, res: Response) => {
  const firebaseAdmin = getFirebaseAdminCredentialStatus();
  const liveVerification = firebaseAdmin.configured
    ? await verifyFirebaseAdminLiveCapabilities()
    : {
        tokenAcquired: false,
        authAdminVerified: false,
        firestoreAdminVerified: false,
      };
  res.json({
    firebaseAdmin,
    liveVerification,
    authorizedAdminEmail: AUTHORIZED_ADMIN_EMAIL,
    firestoreConfigured: true,
  });
});

// List Users with Wallets (Hydrated from Cloud Firestore + Local Ledger)
apiRouter.get('/admin/users', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  const currentAdmin: User = (req as any).user;
  const search = ((req.query.search as string) || '').toLowerCase();
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  const userMap = new Map<string, any>();
  db.users.forEach((u) => {
    const wallet = db.wallets.find((w) => w.userId === u.id);
    const { passwordHash: _, salt: __, ...publicU } = u;
    userMap.set(u.id, { ...publicU, wallet });
  });

  if (callerToken) {
    const [fsUsersRes, fsWalletsRes] = await Promise.all([
      fsListCollection<User>('users', callerToken),
      fsListCollection<Wallet>('wallets', callerToken),
    ]);

    if (!fsUsersRes.error) {
      const fsUserIds = new Set(fsUsersRes.items.map((u) => u.id));
      // Prune stale local users/wallets that no longer exist in authoritative Firestore
      for (const localId of Array.from(userMap.keys())) {
        if (!fsUserIds.has(localId)) {
          userMap.delete(localId);
        }
      }
      const hadStaleLocal = db.users.some((u) => !fsUserIds.has(u.id));
      if (hadStaleLocal) {
        db.users = db.users.filter((u) => fsUserIds.has(u.id));
        db.wallets = db.wallets.filter((w) => fsUserIds.has(w.userId));
        if (db.sessions) {
          db.sessions = db.sessions.filter((s) => fsUserIds.has(s.userId));
        }
        saveDatabase();
      }

      const fsWalletByUser = new Map<string, Wallet>();
      (fsWalletsRes.items || []).forEach((w) => {
        if (w.userId) fsWalletByUser.set(w.userId, w);
      });

      fsUsersRes.items.forEach((fsU) => {
        const fsW = fsWalletByUser.get(fsU.id);
        const existing = userMap.get(fsU.id);
        if (!existing) {
          userMap.set(fsU.id, { ...fsU, wallet: fsW });
        } else {
          const fsUUpdated = new Date(fsU.updatedAt || fsU.createdAt || 0).getTime();
          const localUUpdated = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const mergedUser = fsUUpdated >= localUUpdated ? { ...existing, ...fsU } : existing;

          let mergedWallet = existing.wallet || fsW;
          if (fsW && existing.wallet) {
            const fsWT = new Date(fsW.lastUpdated || 0).getTime();
            const localWT = new Date(existing.wallet.lastUpdated || 0).getTime();
            mergedWallet = fsWT >= localWT ? fsW : existing.wallet;
          } else if (fsW) {
            mergedWallet = fsW;
          }
          userMap.set(fsU.id, { ...mergedUser, wallet: mergedWallet });
        }
      });
    }
  }

  let userList = Array.from(userMap.values());

  if (search) {
    userList = userList.filter(
      (u) =>
        u.id.toLowerCase().includes(search) ||
        (u.fullName || '').toLowerCase().includes(search) ||
        (u.email || '').toLowerCase().includes(search) ||
        (u.wallet?.accountNumber || '').toLowerCase().includes(search) ||
        (u.country || '').toLowerCase().includes(search)
    );
  }

  res.json({
    users: userList,
    totalCount: userList.length,
  });
});

// List Pending Incomplete Deletions for Admin Reconciliation
apiRouter.get('/admin/pending-cleanups', authenticateUser, requireAdmin, async (_req: Request, res: Response) => {
  const adminToken = await getFirebaseAdminAccessToken();
  const pendingCleanups = await getMergedPendingCleanups(adminToken);
  res.json({ pendingCleanups });
});

// Retry / Reconcile an Incomplete Account Cleanup
apiRouter.post('/admin/pending-cleanups/:cleanupId/retry', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const { cleanupId } = req.params;
  const currentAdmin: User = (req as any).user;
  const adminToken = await getFirebaseAdminAccessToken();
  const callerToken = adminToken || (await getCallerFirestoreToken(req, currentAdmin));

  const pendingList = await getMergedPendingCleanups(adminToken);
  const record = pendingList.find((p) => p.id === cleanupId);
  if (!record) {
    res.status(404).json({ error: 'Pending cleanup record not found or already resolved.' });
    return;
  }

  // Re-verify Firebase Authentication account is removed
  const authDelete = await deleteFirebaseAuthUser(record.userId, record.email);
  if (!authDelete.deleted) {
    res.status(authDelete.credentialMissing ? 503 : 502).json({
      success: false,
      status: 'pending',
      error: authDelete.error || 'Unable to verify Firebase Authentication deletion.',
    });
    return;
  }

  const allUids = Array.from(
    new Set([record.userId, record.deletedAuthUid, ...(record.extraUserIds || []), ...(authDelete.deletedUids || [])].filter(Boolean) as string[])
  );

  const fsDelete = await fsDeleteUserAndRelatedDocs(record.userId, callerToken, {
    extraUserIds: allUids,
    email: record.email,
  });

  purgeLocalUserRecords(allUids, record.email);

  if (fsDelete.completed) {
    await clearPendingCleanup(record.id, adminToken);
    const auditEntry = recordAuditLog(currentAdmin.email, 'admin', 'USER_CLEANUP_RECONCILED', {
      targetUserId: record.userId,
      targetUserEmail: record.email,
      reason: `Administrator completed pending Cloud Firestore cleanup for ${record.email} (${fsDelete.deletedPaths.length} additional docs removed).`,
    });
    if (callerToken) {
      await fsSetDoc('audit_logs', auditEntry.id, { ...auditEntry }, callerToken).catch(() => {});
    }
    res.json({
      success: true,
      status: 'resolved',
      message: `Completed Cloud Firestore cleanup for ${record.email}. Email address is completely clear for fresh registration.`,
      deletedPaths: fsDelete.deletedPaths,
    });
    return;
  }

  const updated: PendingCleanupRecord = {
    ...record,
    deletedPaths: Array.from(new Set([...(record.deletedPaths || []), ...fsDelete.deletedPaths])),
    errors: fsDelete.errors,
    lastAttemptAt: new Date().toISOString(),
  };
  await persistPendingCleanup(updated, adminToken);

  res.status(207).json({
    success: false,
    status: 'pending',
    message: `Cleanup retry for ${record.email} still encountered Firestore errors: ${fsDelete.errors.join('; ')}`,
    pendingCleanup: updated,
    errors: fsDelete.errors,
  });
});

// Delete User Account across Firebase Auth, Cloud Firestore & Local Ledger (Fail-Closed Safeguard)
apiRouter.delete('/admin/users/:userId', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const currentAdmin: User = (req as any).user;
  const db = getDb();
  const adminToken = await getFirebaseAdminAccessToken();
  const callerToken = adminToken || (await getCallerFirestoreToken(req, currentAdmin));

  let targetUser: any = db.users.find((u) => u.id === userId);
  if (!targetUser && callerToken) {
    const fsUser = await fsGetDoc<User>('users', userId, callerToken);
    if (fsUser.exists && fsUser.data) {
      targetUser = fsUser.data;
    }
  }

  if (!targetUser) {
    res.status(404).json({ error: 'User account not found in server ledger or Cloud Firestore.' });
    return;
  }

  if (targetUser.id === currentAdmin.id || isAuthorizedAdminEmail(targetUser.email)) {
    res.status(400).json({ error: 'Cannot delete the currently active primary administrator account.' });
    return;
  }

  // Step 1: Delete Firebase Authentication user FIRST (fail-closed: never wipe DB if Auth delete cannot run/fails)
  const authDelete = await deleteFirebaseAuthUser(userId, targetUser.email);
  if (!authDelete.deleted) {
    const code = authDelete.credentialMissing
      ? 'FIREBASE_ADMIN_CREDENTIAL_REQUIRED'
      : 'FIREBASE_AUTH_DELETE_FAILED';
    const failAudit = recordAuditLog(currentAdmin.email, 'admin', 'USER_DELETION_FAILED', {
      targetUserId: targetUser.id,
      targetUserEmail: targetUser.email,
      reason: authDelete.error || 'Firebase Authentication user deletion failed; account retained.',
    });
    saveDatabase();
    if (callerToken) {
      await fsSetDoc('audit_logs', failAudit.id, { ...failAudit }, callerToken).catch(() => {});
    }

    res.status(authDelete.credentialMissing ? 503 : 502).json({
      error:
        authDelete.error ||
        'Failed to delete user from Firebase Authentication. No database records were altered.',
      code,
      deletionStatus: 'failed',
      deletedUserId: userId,
      steps: {
        firebaseAuth: {
          status: 'failed',
          credentialMissing: authDelete.credentialMissing,
          error: authDelete.error,
        },
        firestore: { status: 'skipped' },
        localLedger: { status: 'skipped' },
      },
    });
    return;
  }

  // Step 2: Delete all Cloud Firestore records (profile, wallets, transactions, notifications, payment_submissions & nested /receipts)
  const cleanTargetEmail = String(targetUser.email || '').trim().toLowerCase();
  const extraUids = (authDelete.deletedUids || []).filter((id) => id !== userId);
  const fsDelete = await fsDeleteUserAndRelatedDocs(userId, callerToken, {
    extraUserIds: extraUids,
    email: cleanTargetEmail,
  });

  // Step 3: Remove from local JSON database, active sessions & verification caches
  purgeLocalUserRecords([userId, ...extraUids], cleanTargetEmail);

  // Step 4: Handle partial Firestore cleanup persistence & reconciliation tracking
  let pendingCleanup: PendingCleanupRecord | undefined;
  if (!fsDelete.completed) {
    pendingCleanup = {
      id: `cleanup_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      userId,
      ...(extraUids.length > 0 ? { extraUserIds: extraUids } : {}),
      email: cleanTargetEmail,
      ...(authDelete.deletedUid ? { deletedAuthUid: authDelete.deletedUid } : {}),
      deletedPaths: fsDelete.deletedPaths,
      errors: fsDelete.errors,
      status: 'pending',
      createdAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      actorEmail: currentAdmin.email,
    };
    await persistPendingCleanup(pendingCleanup, adminToken);
  } else {
    // Clear any older pending cleanup records for this user/email
    const existingPending = await getMergedPendingCleanups(adminToken);
    for (const p of existingPending) {
      if (p.userId === userId || p.email.toLowerCase() === cleanTargetEmail) {
        await clearPendingCleanup(p.id, adminToken);
      }
    }
  }

  // Step 5: Record verified audit log
  const deletionStatus = fsDelete.completed ? 'completed' : 'partial';
  const auditEntry = recordAuditLog(
    currentAdmin.email,
    'admin',
    fsDelete.completed ? 'USER_ACCOUNT_DELETED' : 'USER_ACCOUNT_PARTIAL_DELETED',
    {
      targetUserId: targetUser.id,
      targetUserEmail: targetUser.email,
      reason: fsDelete.completed
        ? `Administrator permanently deleted ${targetUser.email} from Firebase Auth, Cloud Firestore (${fsDelete.deletedPaths.length} docs), and Server Ledger.`
        : `Deleted ${targetUser.email} from Firebase Auth and local ledger, but Cloud Firestore cleanup had errors (${pendingCleanup?.id}): ${fsDelete.errors.join('; ')}`,
    }
  );
  saveDatabase();

  if (callerToken) {
    await fsSetDoc('audit_logs', auditEntry.id, { ...auditEntry }, callerToken).catch(() => {});
  }

  res.status(fsDelete.completed ? 200 : 207).json({
    message: fsDelete.completed
      ? `Account ${targetUser.email} permanently deleted from Firebase Authentication, Cloud Firestore, and server ledger.`
      : `Account ${targetUser.email} deleted from Firebase Authentication and server ledger, but some Cloud Firestore documents failed to delete. Use Retry Cleanup to finish removal.`,
    deletionStatus,
    deletedUserId: userId,
    ...(pendingCleanup ? { reconciliationId: pendingCleanup.id, pendingCleanup } : {}),
    steps: {
      firebaseAuth: {
        status: 'deleted',
        userExisted: authDelete.userExisted,
        deletedUid: authDelete.deletedUid,
        deletedUids: authDelete.deletedUids,
      },
      firestore: {
        status: fsDelete.completed ? 'deleted' : 'partial',
        deletedPaths: fsDelete.deletedPaths,
        errors: fsDelete.errors,
      },
      localLedger: {
        status: 'deleted',
      },
    },
  });
});

// User Details, Balance Ledger, Transactions, and Notifications (Firestore-authoritative merge)
apiRouter.get('/admin/users/:userId/details', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  const currentAdmin: User = (req as any).user;
  const userId = req.params.userId;
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  let user: any = db.users.find((u) => u.id === userId);
  let wallet = db.wallets.find((w) => w.userId === userId);

  const txMap = new Map<string, Transaction>();
  db.transactions.filter((t) => t.userId === userId).forEach((t) => txMap.set(t.id, t));

  const notifMap = new Map<string, any>();
  db.notifications.filter((n) => n.userId === userId).forEach((n) => notifMap.set(n.id, n));

  const auditMap = new Map<string, any>();
  db.auditLogs.filter((a) => a.targetUserId === userId).forEach((a) => auditMap.set(a.id, a));

  if (callerToken) {
    const [fsUserRes, fsWalletRes, fsTxRes, fsNotifRes, fsAuditRes] = await Promise.all([
      fsGetDoc<User>('users', userId, callerToken),
      fsGetDoc<Wallet>('wallets', `wallet_${userId}`, callerToken),
      fsQueryByField<Transaction>('transactions', 'userId', userId, callerToken, 150),
      fsQueryByField<any>('notifications', 'userId', userId, callerToken, 100),
      fsQueryByField<any>('audit_logs', 'targetUserId', userId, callerToken, 100),
    ]);

    if (fsUserRes.exists === false && !fsUserRes.permissionDenied) {
      db.users = db.users.filter((u) => u.id !== userId);
      db.wallets = db.wallets.filter((w) => w.userId !== userId);
      db.transactions = db.transactions.filter((t) => t.userId !== userId);
      db.notifications = db.notifications.filter((n) => n.userId !== userId);
      if (db.sessions) {
        db.sessions = db.sessions.filter((s) => s.userId !== userId);
      }
      saveDatabase();
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (fsUserRes.exists && fsUserRes.data) {
      if (!user) {
        user = fsUserRes.data;
      } else {
        mergeFirestoreProfileIntoLocal(user, fsUserRes.data);
      }
    }

    let resolvedFsWallet = fsWalletRes.exists ? fsWalletRes.data : null;
    if (!resolvedFsWallet && !fsWalletRes.permissionDenied) {
      const qW = await fsQueryByField<Wallet>('wallets', 'userId', userId, callerToken, 1);
      if (qW.items.length > 0) resolvedFsWallet = qW.items[0];
    }

    if (resolvedFsWallet) {
      if (!wallet) {
        wallet = {
          id: resolvedFsWallet.id || `wallet_${userId}`,
          userId,
          accountNumber: resolvedFsWallet.accountNumber || generateAccountNumber(),
          currency: 'USD',
          availableBalance: Number(resolvedFsWallet.availableBalance) || 0,
          prototypeBalance: Number(resolvedFsWallet.prototypeBalance ?? resolvedFsWallet.availableBalance) || 0,
          isSimulated: resolvedFsWallet.isSimulated !== undefined ? Boolean(resolvedFsWallet.isSimulated) : true,
          lastUpdated: resolvedFsWallet.lastUpdated || new Date().toISOString(),
        };
      } else {
        mergeFirestoreWalletIntoLocal(wallet, resolvedFsWallet);
      }
    } else if (fsUserRes.exists && !fsWalletRes.permissionDenied) {
      wallet = {
        id: `wallet_${userId}`,
        userId,
        accountNumber: wallet?.accountNumber || generateAccountNumber(),
        currency: 'USD',
        availableBalance: wallet?.availableBalance ?? 0,
        prototypeBalance: wallet?.prototypeBalance ?? 0,
        isSimulated: true,
        lastUpdated: new Date().toISOString(),
      };
      await fsSetDoc('wallets', wallet.id, buildCleanFirestoreWallet(wallet), callerToken).catch(() => {});
      if (!db.wallets.some((w) => w.userId === userId)) {
        db.wallets.push(wallet);
        saveDatabase();
      }
    }

    fsTxRes.items.forEach((ftx) => {
      const existing = txMap.get(ftx.id);
      if (!existing) txMap.set(ftx.id, ftx);
      else {
        const fsT = new Date(ftx.updatedAt || ftx.createdAt || 0).getTime();
        const locT = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (fsT >= locT) txMap.set(ftx.id, ftx);
      }
    });

    fsNotifRes.items.forEach((fn) => notifMap.set(fn.id, fn));
    fsAuditRes.items.forEach((fa) => auditMap.set(fa.id, fa));
  }

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (!wallet) {
    wallet = {
      id: `wallet_${user.id}`,
      userId: user.id,
      accountNumber: generateAccountNumber(),
      currency: 'USD',
      availableBalance: 0,
      prototypeBalance: 0,
      isSimulated: true,
      lastUpdated: new Date().toISOString(),
    };
  }

  const transactions = Array.from(txMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const auditLogs = Array.from(auditMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const notifications = Array.from(notifMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const { passwordHash: _, salt: __, ...publicU } = user;
  res.json({
    user: publicU,
    wallet,
    transactions,
    auditLogs,
    notifications,
  });
});

// Balance Adjustment (Credit / Debit) — Atomic Cloud Firestore Transaction with Idempotency
apiRouter.post(
  '/admin/users/:userId/balance-adjustment',
  authenticateUser,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { adjustmentType, amount, reason, notes, idempotencyKey } = req.body;
    const numAmount = Math.round(parseFloat(amount) * 100) / 100;

    if (!adjustmentType || (adjustmentType !== 'credit' && adjustmentType !== 'debit')) {
      res.status(400).json({ error: 'Adjustment type must be either credit or debit' });
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Please enter a valid positive adjustment amount' });
      return;
    }

    if (!reason || reason.trim().length < 3) {
      res.status(400).json({ error: 'A documented administrative reason is required' });
      return;
    }

    const db = getDb();
    const currentAdmin: User = (req as any).user;
    const targetUserId = req.params.userId;
    const callerToken = await getAdminFirestoreToken(req, currentAdmin);
    const reference = generateReference('ADJ-UNGB');

    // Execute directly inside an atomic Cloud Firestore ReadWrite transaction when bearer token is present
    if (callerToken) {
      try {
        const atomicResult = await fsExecuteAtomicBalanceAdjustment({
          userId: targetUserId,
          adjustmentType,
          amount: numAmount,
          reason: reason.trim(),
          notes: notes?.trim(),
          idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
          actorEmail: currentAdmin.email || AUTHORIZED_ADMIN_EMAIL,
          reference,
          bearerToken: callerToken,
        });

        // Synchronize local cache without duplicating idempotent replays
        let localUser = db.users.find((u) => u.id === atomicResult.user.id);
        if (!localUser) {
          const salt = generateSalt();
          localUser = {
            ...atomicResult.user,
            passwordHash: hashPassword(crypto.randomBytes(24).toString('hex'), salt),
            salt,
          };
          db.users.push(localUser);
        }

        let localWallet = db.wallets.find(
          (w) => w.userId === atomicResult.user.id || w.id === atomicResult.wallet.id
        );
        if (!localWallet) {
          db.wallets.push({ ...atomicResult.wallet });
        } else {
          Object.assign(localWallet, atomicResult.wallet);
        }

        if (!db.transactions.some((t) => t.id === atomicResult.transaction.id)) {
          db.transactions.unshift(atomicResult.transaction);
        }
        if (!db.notifications.some((n) => n.id === atomicResult.notification.id)) {
          db.notifications.unshift(atomicResult.notification);
        }
        if (!db.auditLogs.some((a) => a.id === atomicResult.auditLog.id)) {
          db.auditLogs.unshift(atomicResult.auditLog);
        }
        saveDatabase();

        res.json({
          message: `Account successfully ${adjustmentType === 'credit' ? 'credited' : 'debited'} with $${numAmount.toFixed(2)} USD.`,
          wallet: atomicResult.wallet,
          transaction: atomicResult.transaction,
          notification: atomicResult.notification,
          atomicFirestore: true,
          idempotentReplay: atomicResult.idempotentReplay,
        });
        return;
      } catch (err: any) {
        const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
        res.status(statusCode).json({
          error: err?.message || 'Atomic Cloud Firestore balance adjustment failed.',
        });
        return;
      }
    }

    // Local fallback (only when server operates without any Firebase token)
    const user = db.users.find((u) => u.id === targetUserId);
    const wallet = db.wallets.find((w) => w.userId === targetUserId);

    if (!user || !wallet) {
      res.status(404).json({ error: 'User or wallet record not found' });
      return;
    }

    if (typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      const existingTx = db.transactions.find(
        (t) => (t as any).idempotencyKey === idempotencyKey.trim() || t.id === `txn_adj_${idempotencyKey.trim()}`
      );
      if (existingTx) {
        res.json({
          message: `Account successfully ${adjustmentType === 'credit' ? 'credited' : 'debited'} with $${numAmount.toFixed(2)} USD.`,
          wallet,
          transaction: existingTx,
          notification: db.notifications.find((n) => n.reference === existingTx.reference),
          atomicFirestore: false,
          idempotentReplay: true,
        });
        return;
      }
    }

    const previousBalance = wallet.availableBalance;
    let newBalance = previousBalance;

    if (adjustmentType === 'credit') {
      newBalance = Math.round((previousBalance + numAmount) * 100) / 100;
    } else {
      if (previousBalance < numAmount) {
        res.status(400).json({
          error: `Cannot debit $${numAmount.toFixed(2)} USD. Available funds in this account are only $${previousBalance.toFixed(2)} USD.`,
        });
        return;
      }
      newBalance = Math.round((previousBalance - numAmount) * 100) / 100;
    }

    wallet.availableBalance = newBalance;
    wallet.prototypeBalance = newBalance;
    wallet.lastUpdated = new Date().toISOString();

    const now = new Date().toISOString();
    const adminIdentity = currentAdmin.email || AUTHORIZED_ADMIN_EMAIL;

    const transaction: Transaction & { idempotencyKey?: string } = {
      id: idempotencyKey?.trim()
        ? `txn_adj_${idempotencyKey.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}`
        : `txn_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      reference,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      type: adjustmentType === 'credit' ? 'admin_credit' : 'admin_debit',
      senderOrRecipient: 'UNFCU Treasury Ledger',
      bankName: 'United Nations Federal Credit Union (UNFCU) — Administrator Console',
      accountNumber: 'UNGB-ADMIN-LEDGER',
      amount: numAmount,
      fee: 0,
      total: numAmount,
      previousBalance,
      newBalance,
      adjustedBy: adminIdentity,
      paymentMethod: 'internal',
      paymentStatus: 'confirmed',
      status: 'completed',
      description: `${adjustmentType === 'credit' ? 'Credit' : 'Debit'} Adjustment: ${reason.trim()}`,
      adminNote: `Authorized by ${adminIdentity}. ${notes ? 'Notes: ' + notes.trim() : ''}`,
      isSimulated: true,
      createdAt: now,
      updatedAt: now,
      reviewCompletedAt: now,
      ...(idempotencyKey?.trim() ? { idempotencyKey: idempotencyKey.trim().slice(0, 80) } : {}),
    };

    db.transactions.unshift(transaction);

    const notif = createNotification(
      user.id,
      adjustmentType === 'credit'
        ? `Account Credited — $${numAmount.toFixed(2)} USD`
        : `Account Debited — $${numAmount.toFixed(2)} USD`,
      `A ${adjustmentType} transaction of $${numAmount.toFixed(2)} USD has been successfully recorded in your account. Reference: ${reference}. Previous balance: $${previousBalance.toFixed(2)} USD, New balance: $${newBalance.toFixed(2)} USD. Date: ${new Date().toLocaleString()}. Reason: ${reason.trim()}.`,
      adjustmentType === 'credit' ? 'credit' : 'debit',
      undefined,
      reference,
      numAmount,
      {
        templateKey: adjustmentType === 'credit' ? 'admin_credit' : 'admin_debit',
        templateParams: {
          amount: numAmount,
          reference,
          previousBalance,
          newBalance,
          reason: reason.trim(),
        },
      }
    );

    recordAuditLog(adminIdentity, 'admin', `BALANCE_${adjustmentType.toUpperCase()}`, {
      targetUserId: user.id,
      targetUserEmail: user.email,
      reference,
      previousValue: `$${previousBalance.toFixed(2)}`,
      newValue: `$${newBalance.toFixed(2)}`,
      reason: reason.trim(),
    });

    saveDatabase();

    res.json({
      message: `Account successfully ${adjustmentType === 'credit' ? 'credited' : 'debited'} with $${numAmount.toFixed(2)} USD.`,
      wallet,
      transaction,
      notification: notif,
      atomicFirestore: false,
      idempotentReplay: false,
    });
  }
);

// Payment Review List (Section 15.B)
apiRouter.get('/admin/payments/review', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  const currentAdmin: User = (req as any).user;
  const search = ((req.query.search as string) || '').toLowerCase();
  const status = req.query.status as string;
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  const txMap = new Map<string, Transaction>();
  db.transactions
    .filter((t) => t.paymentMethod === 'bitcoin' || t.paymentMethod === 'bank_transfer')
    .forEach((t) => txMap.set(t.id, t));

  if (callerToken) {
    const fsTxRes = await fsListCollection<Transaction>('transactions', callerToken);
    if (!fsTxRes.error) {
      fsTxRes.items
        .filter((t) => t.paymentMethod === 'bitcoin' || t.paymentMethod === 'bank_transfer')
        .forEach((t) => {
          const existing = txMap.get(t.id);
          if (!existing) {
            txMap.set(t.id, t);
          } else {
            const fsT = new Date(t.updatedAt || t.createdAt || 0).getTime();
            const locT = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            if (fsT >= locT) txMap.set(t.id, t);
          }
        });
    }
  }

  let list = Array.from(txMap.values());

  if (status && status !== 'all') {
    list = list.filter((t) => t.paymentStatus === status);
  }

  if (search) {
    list = list.filter(
      (t) =>
        t.reference.toLowerCase().includes(search) ||
        t.userEmail.toLowerCase().includes(search) ||
        t.userName.toLowerCase().includes(search) ||
        t.senderOrRecipient.toLowerCase().includes(search)
    );
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ payments: list });
});

// Update Payment Review Status (Confirm or Reject) (Section 15.B & 15.C)
apiRouter.post(
  '/admin/payments/:id/review',
  authenticateUser,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { action, adminNote } = req.body;
    if (action !== 'confirm' && action !== 'reject' && action !== 'cancel') {
      res.status(400).json({ error: 'Action must be confirm, reject, or cancel' });
      return;
    }

    const db = getDb();
    const currentAdmin: User = (req as any).user;
    const callerToken = await getAdminFirestoreToken(req, currentAdmin);

    let txn = db.transactions.find((t) => t.id === req.params.id || t.reference === req.params.id);
    if (!txn && callerToken) {
      const fsTxn = await fsGetDoc<Transaction>('transactions', req.params.id, callerToken);
      if (fsTxn.exists && fsTxn.data) {
        txn = fsTxn.data;
        db.transactions.unshift(txn);
      } else {
        const byRef = await fsQueryByField<Transaction>('transactions', 'reference', req.params.id, callerToken, 1);
        if (byRef.items.length > 0) {
          txn = byRef.items[0];
          db.transactions.unshift(txn);
        }
      }
    }

    if (!txn) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const previousStatus = txn.paymentStatus;
    const now = new Date().toISOString();
    txn.updatedAt = now;
    txn.reviewCompletedAt = now;
    if (adminNote) txn.adminNote = adminNote.trim();

    let reviewNotif: any;
    let reviewAudit: any;
    let updatedWallet: Wallet | undefined;

    if (action === 'confirm') {
      txn.paymentStatus = 'confirmed';
      txn.status = 'completed';

      reviewNotif = createNotification(
        txn.userId,
        'Payment Confirmed',
        'Your payment has been reviewed and confirmed. Your transaction reference ' + txn.reference + ' is now completed.',
        'payment',
        undefined,
        txn.reference,
        txn.amount,
        {
          templateKey: 'payment_verified',
          templateParams: {
            method: txn.paymentMethod || 'bank_transfer',
            reference: txn.reference,
            amount: txn.amount,
          },
        }
      );

      reviewAudit = recordAuditLog(AUTHORIZED_ADMIN_EMAIL, 'admin', 'PAYMENT_CONFIRMED', {
        targetUserId: txn.userId,
        targetUserEmail: txn.userEmail,
        reference: txn.reference,
        previousValue: previousStatus,
        newValue: 'confirmed',
        reason: adminNote || 'Administrative verification succeeded',
      });
    } else if (action === 'reject') {
      txn.paymentStatus = 'rejected';
      txn.status = 'failed';

      // Only refund if funds were previously deducted on submission
      if ((txn as any).balanceDeducted === true) {
        let wallet = db.wallets.find((w) => w.userId === txn.userId);
        if (!wallet && callerToken) {
          const fsW = await fsGetDoc<Wallet>('wallets', `wallet_${txn.userId}`, callerToken);
          if (fsW.exists && fsW.data) {
            wallet = fsW.data;
            db.wallets.push(wallet);
          }
        }
        if (wallet) {
          wallet.availableBalance = Math.round((wallet.availableBalance + txn.amount) * 100) / 100;
          wallet.prototypeBalance = wallet.availableBalance;
          wallet.lastUpdated = now;
          updatedWallet = wallet;
        }
      }

      reviewNotif = createNotification(
        txn.userId,
        'Payment Verification Unsuccessful',
        'Your payment could not be verified. Please review the payment instructions or contact support.',
        'payment',
        undefined,
        txn.reference,
        txn.amount,
        {
          templateKey: 'payment_rejected',
          templateParams: {
            method: txn.paymentMethod || 'bank_transfer',
            reference: txn.reference,
            reason: adminNote || 'Payment verification unsuccessful',
          },
        }
      );

      reviewAudit = recordAuditLog(AUTHORIZED_ADMIN_EMAIL, 'admin', 'PAYMENT_REJECTED', {
        targetUserId: txn.userId,
        targetUserEmail: txn.userEmail,
        reference: txn.reference,
        previousValue: previousStatus,
        newValue: 'rejected',
        reason: adminNote || 'Payment verification failed',
      });
    } else if (action === 'cancel') {
      txn.paymentStatus = 'cancelled';
      txn.status = 'cancelled';

      if ((txn as any).balanceDeducted === true) {
        let wallet = db.wallets.find((w) => w.userId === txn.userId);
        if (!wallet && callerToken) {
          const fsW = await fsGetDoc<Wallet>('wallets', `wallet_${txn.userId}`, callerToken);
          if (fsW.exists && fsW.data) {
            wallet = fsW.data;
            db.wallets.push(wallet);
          }
        }
        if (wallet) {
          wallet.availableBalance = Math.round((wallet.availableBalance + txn.amount) * 100) / 100;
          wallet.prototypeBalance = wallet.availableBalance;
          wallet.lastUpdated = now;
          updatedWallet = wallet;
        }
      }

      reviewNotif = createNotification(
        txn.userId,
        'Transaction Cancelled',
        `Transaction ${txn.reference} has been cancelled. Funds have been returned to your wallet.`,
        'payment',
        undefined,
        txn.reference,
        txn.amount,
        {
          templateKey: 'payment_cancelled',
          templateParams: { reference: txn.reference },
        }
      );

      reviewAudit = recordAuditLog(AUTHORIZED_ADMIN_EMAIL, 'admin', 'PAYMENT_CANCELLED', {
        targetUserId: txn.userId,
        targetUserEmail: txn.userEmail,
        reference: txn.reference,
        previousValue: previousStatus,
        newValue: 'cancelled',
        reason: adminNote || 'Cancelled by administrator',
      });
    }

    saveDatabase();

    if (callerToken) {
      await Promise.all([
        fsSetDoc('transactions', txn.id, { ...txn }, callerToken).catch(() => {}),
        updatedWallet
          ? fsSetDoc('wallets', updatedWallet.id, buildCleanFirestoreWallet(updatedWallet), callerToken).catch(() => {})
          : Promise.resolve(),
        reviewNotif ? fsSetDoc('notifications', reviewNotif.id, { ...reviewNotif }, callerToken).catch(() => {}) : Promise.resolve(),
        reviewAudit ? fsSetDoc('audit_logs', reviewAudit.id, { ...reviewAudit }, callerToken).catch(() => {}) : Promise.resolve(),
      ]);
    }

    res.json({
      message: `Transaction ${txn.reference} marked as ${txn.paymentStatus}.`,
      transaction: txn,
    });
  }
);

// Fee Configuration (Section 9.FEE MANAGEMENT & 14.C & Requirement 4)
apiRouter.get('/admin/fees', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  const currentAdmin: User = (req as any).user;
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  if (callerToken) {
    const fsFees = await fsGetDoc<FeeSettings>('settings', 'feeSettings', callerToken);
    if (fsFees.exists && fsFees.data) {
      const fsT = new Date(fsFees.data.updatedAt || 0).getTime();
      const locT = new Date(db.feeSettings.updatedAt || 0).getTime();
      if (fsT >= locT) {
        db.feeSettings = { ...db.feeSettings, ...fsFees.data };
        saveDatabase();
      }
    }
  }

  res.json({ feeSettings: db.feeSettings });
});

apiRouter.put(
  '/admin/fees',
  authenticateUser,
  requireAdmin,
  async (req: Request, res: Response) => {
    const {
      transferFixedFee,
      transferPercentFee,
      transferFeeEnabled,
      withdrawalFixedFee,
      withdrawalPercentFee,
      withdrawalFeeEnabled,
      minTransferAmount,
      maxTransferAmount,
      transferFee,
      withdrawalFee,
      reason,
    } = req.body;

    const db = getDb();
    const currentAdmin: User = (req as any).user;
    const callerToken = await getAdminFirestoreToken(req, currentAdmin);
    const previousFees = { ...db.feeSettings };

    const newTransferFixed = transferFixedFee !== undefined
      ? parseFloat(transferFixedFee)
      : (transferFee !== undefined ? parseFloat(transferFee) : (db.feeSettings.transferFixedFee ?? db.feeSettings.transferFee ?? 15));
    const newTransferPercent = transferPercentFee !== undefined
      ? parseFloat(transferPercentFee)
      : (db.feeSettings.transferPercentFee ?? 0);
    const newTransferEnabled = transferFeeEnabled !== undefined
      ? Boolean(transferFeeEnabled)
      : (db.feeSettings.transferFeeEnabled ?? true);

    const newWithdrawalFixed = withdrawalFixedFee !== undefined
      ? parseFloat(withdrawalFixedFee)
      : (withdrawalFee !== undefined ? parseFloat(withdrawalFee) : (db.feeSettings.withdrawalFixedFee ?? db.feeSettings.withdrawalFee ?? 25));
    const newWithdrawalPercent = withdrawalPercentFee !== undefined
      ? parseFloat(withdrawalPercentFee)
      : (db.feeSettings.withdrawalPercentFee ?? 0);
    const newWithdrawalEnabled = withdrawalFeeEnabled !== undefined
      ? Boolean(withdrawalFeeEnabled)
      : (db.feeSettings.withdrawalFeeEnabled ?? true);

    if (
      isNaN(newTransferFixed) || newTransferFixed < 0 ||
      isNaN(newTransferPercent) || newTransferPercent < 0 ||
      isNaN(newWithdrawalFixed) || newWithdrawalFixed < 0 ||
      isNaN(newWithdrawalPercent) || newWithdrawalPercent < 0
    ) {
      res.status(400).json({ error: 'All fee amounts and percentages must be non-negative numbers' });
      return;
    }

    db.feeSettings.transferFixedFee = newTransferFixed;
    db.feeSettings.transferPercentFee = newTransferPercent;
    db.feeSettings.transferFeeEnabled = newTransferEnabled;
    db.feeSettings.transferFee = newTransferFixed;

    db.feeSettings.withdrawalFixedFee = newWithdrawalFixed;
    db.feeSettings.withdrawalPercentFee = newWithdrawalPercent;
    db.feeSettings.withdrawalFeeEnabled = newWithdrawalEnabled;
    db.feeSettings.withdrawalFee = newWithdrawalFixed;

    if (minTransferAmount !== undefined && !isNaN(parseFloat(minTransferAmount))) {
      db.feeSettings.minTransferAmount = parseFloat(minTransferAmount);
    }
    if (maxTransferAmount !== undefined && !isNaN(parseFloat(maxTransferAmount))) {
      db.feeSettings.maxTransferAmount = parseFloat(maxTransferAmount);
    }

    db.feeSettings.updatedAt = new Date().toISOString();
    db.feeSettings.updatedBy = AUTHORIZED_ADMIN_EMAIL;

    // Synchronize default payment methods fee
    db.paymentMethods.forEach((pm) => {
      pm.fee = newTransferFixed;
    });

    const auditEntry = recordAuditLog(AUTHORIZED_ADMIN_EMAIL, 'admin', 'FEE_SETTINGS_UPDATED', {
      previousValue: JSON.stringify(previousFees),
      newValue: JSON.stringify(db.feeSettings),
      reason: reason?.trim() || 'Administrator updated transaction fee schedules',
    });

    saveDatabase();

    if (callerToken) {
      await Promise.all([
        fsSetDoc('settings', 'feeSettings', { ...db.feeSettings }, callerToken).catch(() => {}),
        fsSetDoc('audit_logs', auditEntry.id, { ...auditEntry }, callerToken).catch(() => {}),
      ]);
    }

    res.json({
      message: 'Fee schedules updated successfully.',
      feeSettings: db.feeSettings,
    });
  }
);

// Payment Method Reset & Settings (Section 14.C)
apiRouter.get('/admin/payment-methods', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  const currentAdmin: User = (req as any).user;
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  if (callerToken) {
    const fsMethods = await fsGetDoc<{ methods?: any[]; updatedAt?: string }>('settings', 'paymentMethods', callerToken);
    if (fsMethods.exists && fsMethods.data && Array.isArray(fsMethods.data.methods) && fsMethods.data.methods.length > 0) {
      db.paymentMethods = fsMethods.data.methods;
      saveDatabase();
    }
  }

  res.json({ paymentMethods: db.paymentMethods });
});

apiRouter.put(
  '/admin/payment-methods',
  authenticateUser,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { methods } = req.body;
    if (!Array.isArray(methods)) {
      res.status(400).json({ error: 'Expected an array of payment methods' });
      return;
    }

    const db = getDb();
    const currentAdmin: User = (req as any).user;
    const callerToken = await getAdminFirestoreToken(req, currentAdmin);
    const previous = JSON.stringify(db.paymentMethods);

    // Update payment methods
    methods.forEach((incoming: any) => {
      const existing = db.paymentMethods.find((pm) => pm.id === incoming.id);
      if (existing) {
        if (incoming.name) existing.name = incoming.name.trim();
        if (incoming.enabled !== undefined) existing.enabled = Boolean(incoming.enabled);
        if (incoming.fee !== undefined) existing.fee = parseFloat(incoming.fee);
        if (incoming.instructions) existing.instructions = incoming.instructions.trim();
        if (incoming.accountDetails) existing.accountDetails = { ...existing.accountDetails, ...incoming.accountDetails };
      }
    });

    const auditEntry = recordAuditLog(AUTHORIZED_ADMIN_EMAIL, 'admin', 'PAYMENT_METHODS_UPDATED', {
      previousValue: previous,
      newValue: JSON.stringify(db.paymentMethods),
      reason: 'Administrator reconfigured available payment methods and verification instructions',
    });

    saveDatabase();

    if (callerToken) {
      await Promise.all([
        fsSetDoc('settings', 'paymentMethods', { methods: db.paymentMethods, updatedAt: new Date().toISOString() }, callerToken).catch(() => {}),
        fsSetDoc('audit_logs', auditEntry.id, { ...auditEntry }, callerToken).catch(() => {}),
      ]);
    }

    res.json({
      message: 'Payment methods configuration updated successfully.',
      paymentMethods: db.paymentMethods,
    });
  }
);

// Reset Demonstration Transactions (Section 9.TRANSACTION MANAGEMENT)
apiRouter.post(
  '/admin/transactions/reset-demo',
  authenticateUser,
  requireAdmin,
  (req: Request, res: Response) => {
    const { confirmation } = req.body;
    if (confirmation !== 'RESET_DEMONSTRATION_DATA') {
      res.status(400).json({
        error: 'Confirmation string mismatch. Please confirm by entering "RESET_DEMONSTRATION_DATA".',
      });
      return;
    }

    const db = getDb();
    db.transactions = [];

    recordAuditLog(AUTHORIZED_ADMIN_EMAIL, 'admin', 'DEMO_TRANSACTIONS_RESET', {
      reason: 'Administrator cleared demonstration transactions',
    });

    saveDatabase();

    res.json({
      message: 'Demonstration transactions have been cleared.',
      transactions: db.transactions,
    });
  }
);

// All Transactions (Admin View — Firestore-authoritative merge)
apiRouter.get('/admin/transactions', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  const currentAdmin: User = (req as any).user;
  const search = ((req.query.search as string) || '').toLowerCase();
  const type = req.query.type as string;
  const status = req.query.status as string;
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  const txMap = new Map<string, Transaction>();
  db.transactions.forEach((t) => txMap.set(t.id, t));

  if (callerToken) {
    const fsTxRes = await fsListCollection<Transaction>('transactions', callerToken);
    if (!fsTxRes.error) {
      fsTxRes.items.forEach((t) => {
        const existing = txMap.get(t.id);
        if (!existing) {
          txMap.set(t.id, t);
        } else {
          const fsT = new Date(t.updatedAt || t.createdAt || 0).getTime();
          const locT = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          if (fsT >= locT) txMap.set(t.id, t);
        }
      });
    }
  }

  let txs = Array.from(txMap.values());

  if (search) {
    txs = txs.filter(
      (t) =>
        t.reference.toLowerCase().includes(search) ||
        t.userName.toLowerCase().includes(search) ||
        t.userEmail.toLowerCase().includes(search) ||
        t.senderOrRecipient.toLowerCase().includes(search) ||
        t.bankName.toLowerCase().includes(search)
    );
  }

  if (type && type !== 'all') {
    txs = txs.filter((t) => t.type === type);
  }

  if (status && status !== 'all') {
    txs = txs.filter((t) => t.status === status || t.paymentStatus === status);
  }

  txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ transactions: txs });
});

// Audit Logs (Section 9 & 18.F — Firestore-authoritative merge)
apiRouter.get('/admin/audit-logs', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  const currentAdmin: User = (req as any).user;
  const search = ((req.query.search as string) || '').toLowerCase();
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  const logMap = new Map<string, any>();
  db.auditLogs.forEach((l) => logMap.set(l.id, l));

  if (callerToken) {
    const fsLogsRes = await fsListCollection<any>('audit_logs', callerToken);
    if (!fsLogsRes.error) {
      fsLogsRes.items.forEach((l) => logMap.set(l.id, l));
    }
  }

  let logs = Array.from(logMap.values());
  if (search) {
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(search) ||
        l.actorEmail.toLowerCase().includes(search) ||
        (l.reason && l.reason.toLowerCase().includes(search)) ||
        (l.reference && l.reference.toLowerCase().includes(search))
    );
  }

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json({ auditLogs: logs });
});

// -------------------------------------------------------------
// Payment Submissions & Verification Endpoints (Requirements 4, 5, 7, 8)
// -------------------------------------------------------------

// User: Submit Bank Transfer or Bitcoin Payment Information & Receipts
// Wallet balance is NEVER deducted here; deduction occurs strictly upon Admin verification/approval.
apiRouter.post('/payments/submit', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const callerToken = await getCallerFirestoreToken(req, user);
  const adminToken = await getFirebaseAdminAccessToken();
  const writeToken = adminToken || callerToken;

  const {
    paymentMethod,
    amount,
    fee,
    total,
    reference,
    transactionType,
    receiptImages,
    userMessage,
    recipientName,
    recipientBank,
    recipientAccount,
    routingOrSwift,
    description,
  } = req.body;

  if (paymentMethod !== 'bank_transfer' && paymentMethod !== 'bitcoin') {
    res.status(400).json({ error: 'Payment method must be bank_transfer or bitcoin' });
    return;
  }

  const numAmount = Math.round(parseFloat(amount) * 100) / 100;
  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Valid positive payment amount is required' });
    return;
  }

  const numFee = Math.round(((typeof fee === 'number' ? fee : parseFloat(fee)) || 0) * 100) / 100;
  const numTotal = Math.round(((typeof total === 'number' ? total : numAmount + numFee) || numAmount) * 100) / 100;
  const cleanRef = String(reference || generateReference('TXN-UNGB')).trim().slice(0, 80);
  const cleanMsg = String(userMessage || '').trim().slice(0, 1000);
  const cleanTxType: 'transfer' | 'withdrawal' | 'fee_payment' =
    transactionType === 'withdrawal' || transactionType === 'fee_payment'
      ? transactionType
      : 'transfer';

  const cleanRecipientName = recipientName ? String(recipientName).trim().slice(0, 160) : undefined;
  const cleanRecipientBank = recipientBank ? String(recipientBank).trim().slice(0, 160) : undefined;
  const cleanRecipientAccount = recipientAccount ? String(recipientAccount).trim().slice(0, 64) : undefined;
  const cleanRouting = routingOrSwift ? String(routingOrSwift).trim().slice(0, 64) : undefined;
  const cleanDescription = description ? String(description).trim().slice(0, 380) : undefined;

  const rawImages: string[] = Array.isArray(receiptImages)
    ? receiptImages.filter((img) => typeof img === 'string' && img.length > 0).slice(0, 5)
    : [];

  if (rawImages.length === 0) {
    res.status(400).json({ error: 'Please attach at least one payment receipt screenshot.' });
    return;
  }

  // Keep inline arrays safely under Firestore's 1MB document limit while persisting full images in /receipts subcollection
  const inlineSubmissionImages: string[] = [];
  let runningSubBytes = 0;
  for (const img of rawImages) {
    if (runningSubBytes + img.length <= 740_000) {
      inlineSubmissionImages.push(img);
      runningSubBytes += img.length;
    }
  }

  const inlineTxnImages: string[] = [];
  let runningTxnBytes = 0;
  for (const img of rawImages) {
    if (runningTxnBytes + img.length <= 360_000) {
      inlineTxnImages.push(img);
      runningTxnBytes += img.length;
    }
  }

  const db = getDb();
  if (!db.paymentSubmissions) db.paymentSubmissions = [];

  // Duplicate submission protection (within 4 seconds)
  const isDuplicateSubmission = db.paymentSubmissions.find(
    (s) =>
      s.userId === user.id &&
      s.reference === cleanRef &&
      Date.now() - new Date(s.createdAt).getTime() < 4000
  );
  if (isDuplicateSubmission) {
    res.status(409).json({ error: 'Duplicate payment submission detected. Your receipt is already being processed.' });
    return;
  }

  const now = new Date().toISOString();
  const submissionId = `sub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const resolvedCounterparty =
    cleanRecipientName ||
    (paymentMethod === 'bitcoin' ? 'Bitcoin Institutional Custody' : 'Bank Clearing Escrow');
  const resolvedBank =
    cleanRecipientBank ||
    (paymentMethod === 'bitcoin' ? 'Bitcoin Network' : 'Global International Trust Bank, N.A.');
  const resolvedAccount =
    cleanRecipientAccount ||
    (paymentMethod === 'bitcoin' ? 'bc1qgoldchase92849un021948xkp9' : '9820019248');
  const resolvedDescription = (
    cleanDescription ||
    cleanMsg ||
    `${cleanTxType === 'withdrawal' ? 'Withdrawal' : 'Transfer'} to ${resolvedCounterparty} (${resolvedBank}) — Awaiting Payment Approval`
  ).slice(0, 380);

  // Find or create associated pending Transaction (NO wallet balance deduction occurs here)
  let txn = db.transactions.find((t) => t.reference === cleanRef || t.id === cleanRef);
  if (txn) {
    txn.paymentMethod = paymentMethod;
    txn.paymentStatus = 'awaiting_review';
    txn.status = 'pending';
    txn.balanceDeducted = false;
    txn.paymentSubmittedAt = now;
    txn.receiptImages = inlineTxnImages;
    txn.userMessage = cleanMsg;
    txn.senderOrRecipient = resolvedCounterparty;
    txn.bankName = resolvedBank;
    txn.accountNumber = resolvedAccount;
    if (cleanRouting) txn.routingOrSwift = cleanRouting;
    txn.description = resolvedDescription;
    txn.updatedAt = now;
  } else {
    txn = {
      id: `txn_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      reference: cleanRef,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      type: cleanTxType as any,
      senderOrRecipient: resolvedCounterparty,
      bankName: resolvedBank,
      accountNumber: resolvedAccount,
      ...(cleanRouting ? { routingOrSwift: cleanRouting } : {}),
      amount: numAmount,
      fee: numFee,
      total: numTotal,
      paymentMethod,
      paymentStatus: 'awaiting_review',
      status: 'pending',
      balanceDeducted: false,
      description: resolvedDescription,
      isSimulated: true,
      receiptImages: inlineTxnImages,
      userMessage: cleanMsg,
      createdAt: now,
      updatedAt: now,
      paymentSubmittedAt: now,
    };
    db.transactions.unshift(txn);
  }

  const submission: any = {
    id: submissionId,
    transactionId: txn.id,
    reference: cleanRef,
    userId: user.id,
    userEmail: user.email,
    userName: user.fullName,
    paymentMethod,
    amount: numAmount,
    fee: numFee,
    total: numTotal,
    transactionType: cleanTxType,
    receiptImages: inlineSubmissionImages.length > 0 ? inlineSubmissionImages : rawImages.slice(0, 1),
    userMessage: cleanMsg,
    status: 'pending',
    balanceDeducted: false,
    ...(cleanRecipientName ? { recipientName: cleanRecipientName } : {}),
    ...(cleanRecipientBank ? { recipientBank: cleanRecipientBank } : {}),
    ...(cleanRecipientAccount ? { recipientAccount: cleanRecipientAccount } : {}),
    ...(cleanRouting ? { routingOrSwift: cleanRouting } : {}),
    ...(cleanDescription ? { description: cleanDescription } : {}),
    createdAt: now,
    updatedAt: now,
  };

  // Store full in-memory copy including all images
  const localSubmission = { ...submission, receiptImages: rawImages };
  db.paymentSubmissions.unshift(localSubmission);

  const submitNotif = createNotification(
    user.id,
    'Payment Submitted for Verification',
    `Your ${paymentMethod === 'bitcoin' ? 'Bitcoin' : 'Bank Transfer'} payment receipt for $${numAmount.toFixed(2)} USD has been submitted and is awaiting approval. No funds have been deducted from your wallet yet. Reference: ${cleanRef}.`,
    'payment',
    undefined,
    cleanRef,
    numAmount,
    {
      templateKey: 'payment_submitted',
      templateParams: {
        method: paymentMethod,
        amount: numAmount,
        reference: cleanRef,
      },
    }
  );

  const submitAudit = recordAuditLog(user.email, 'user', 'PAYMENT_RECEIPT_SUBMITTED', {
    targetUserId: user.id,
    targetUserEmail: user.email,
    reference: cleanRef,
    newValue: JSON.stringify({ paymentMethod, amount: numAmount, transactionType: cleanTxType, imageCount: rawImages.length }),
    reason: cleanMsg || 'User submitted receipt for administrative payment verification',
  });

  saveDatabase();

  if (writeToken) {
    const receiptWrites = rawImages
      .filter((img) => img.length <= 890_000)
      .map((img, idx) =>
        fsSetDoc(
          `payment_submissions/${encodeURIComponent(submissionId)}/receipts`,
          `${idx}`,
          {
            id: `receipt_${idx}`,
            submissionId,
            userId: user.id,
            imageData: img,
            createdAt: now,
            storageType: 'firestore_cloud_document',
          },
          writeToken
        ).catch(() => {})
      );

    await Promise.all([
      fsSetDoc('transactions', txn.id, { ...txn }, writeToken).catch(() => {}),
      fsSetDoc('payment_submissions', submission.id, { ...submission }, writeToken).catch(() => {}),
      fsSetDoc('notifications', submitNotif.id, { ...submitNotif }, writeToken).catch(() => {}),
      adminToken
        ? fsSetDoc('audit_logs', submitAudit.id, { ...submitAudit }, adminToken).catch(() => {})
        : Promise.resolve(),
      ...receiptWrites,
    ]);
  }

  res.json({
    message: 'Payment information and receipt submitted successfully. Awaiting administrator approval.',
    submission: localSubmission,
    transaction: txn,
    notification: submitNotif,
  });
});

// Helper: hydrate missing/offloaded receipt images from /payment_submissions/{id}/receipts
async function hydrateSubmissionReceipts(sub: any, token: string | null): Promise<any> {
  if (!token || !sub || !sub.id) return sub;
  const existingImages: string[] = Array.isArray(sub.receiptImages) ? sub.receiptImages : [];
  const needsHydration =
    existingImages.length === 0 ||
    existingImages.some((img) => typeof img === 'string' && img.startsWith('[STORED_IN_'));
  if (!needsHydration) return sub;

  try {
    const rcpts = await fsListCollection<any>(
      `payment_submissions/${encodeURIComponent(sub.id)}/receipts`,
      token
    );
    if (!rcpts.error && rcpts.items.length > 0) {
      const sorted = [...rcpts.items].sort((a, b) =>
        String(a.id || '').localeCompare(String(b.id || ''))
      );
      const imgs = sorted
        .map((r) => r.imageData)
        .filter((d): d is string => typeof d === 'string' && d.length > 0);
      if (imgs.length > 0) {
        return { ...sub, receiptImages: imgs };
      }
    }
  } catch {}
  return sub;
}

// User: Get personal payment submission status
apiRouter.get('/payments/my-submissions', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const db = getDb();
  if (!db.paymentSubmissions) db.paymentSubmissions = [];
  const callerToken = await getCallerFirestoreToken(req, user);

  const subMap = new Map<string, any>();
  db.paymentSubmissions
    .filter((s) => s.userId === user.id)
    .forEach((s) => subMap.set(s.id, s));

  if (callerToken) {
    const fsSubs = await fsQueryByField<any>('payment_submissions', 'userId', user.id, callerToken, 100);
    fsSubs.items.forEach((s) => {
      const existing = subMap.get(s.id);
      if (!existing) subMap.set(s.id, s);
      else {
        const fsT = new Date(s.updatedAt || s.createdAt || 0).getTime();
        const locT = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (fsT >= locT) subMap.set(s.id, s);
      }
    });
  }

  let userSubmissions = Array.from(subMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (callerToken) {
    userSubmissions = await Promise.all(
      userSubmissions.map((s) => hydrateSubmissionReceipts(s, callerToken))
    );
  }

  res.json({ submissions: userSubmissions });
});

// Admin: Get all payment submissions for review
apiRouter.get('/admin/payment-submissions', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  if (!db.paymentSubmissions) db.paymentSubmissions = [];
  const currentAdmin: User = (req as any).user;
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  const search = ((req.query.search as string) || '').toLowerCase();
  const status = req.query.status as string;

  const subMap = new Map<string, any>();
  db.paymentSubmissions.forEach((s) => subMap.set(s.id, s));

  if (callerToken) {
    const fsSubsRes = await fsListCollection<any>('payment_submissions', callerToken);
    if (!fsSubsRes.error) {
      fsSubsRes.items.forEach((s) => {
        const existing = subMap.get(s.id);
        if (!existing) subMap.set(s.id, s);
        else {
          const fsT = new Date(s.updatedAt || s.createdAt || 0).getTime();
          const locT = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          if (fsT >= locT) subMap.set(s.id, s);
        }
      });
    }
  }

  let list = Array.from(subMap.values());

  if (status && status !== 'all') {
    list = list.filter((s) => s.status === status);
  }

  if (search) {
    list = list.filter(
      (s) =>
        s.reference.toLowerCase().includes(search) ||
        s.userEmail.toLowerCase().includes(search) ||
        s.userName.toLowerCase().includes(search) ||
        (s.userMessage && s.userMessage.toLowerCase().includes(search))
    );
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (callerToken) {
    list = await Promise.all(list.map((s) => hydrateSubmissionReceipts(s, callerToken)));
  }

  res.json({ submissions: list });
});

// Admin: Review payment submission (Mark Pending, Verified, or Rejected)
// When Verified, atomically deducts the principal transfer/withdrawal amount from customer's wallet.
apiRouter.post(
  '/admin/payment-submissions/:id/review',
  authenticateUser,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { status, adminNote } = req.body;
    if (status !== 'pending' && status !== 'verified' && status !== 'rejected') {
      res.status(400).json({ error: 'Status must be pending, verified, or rejected' });
      return;
    }

    const db = getDb();
    if (!db.paymentSubmissions) db.paymentSubmissions = [];
    const currentAdmin: User = (req as any).user;
    const callerToken = await getAdminFirestoreToken(req, currentAdmin);

    let submission: any = db.paymentSubmissions.find(
      (s) => s.id === req.params.id || s.reference === req.params.id
    );
    if (!submission && callerToken) {
      const fsSub = await fsGetDoc<any>('payment_submissions', req.params.id, callerToken);
      if (fsSub.exists && fsSub.data) {
        submission = fsSub.data;
        db.paymentSubmissions.unshift(fsSub.data);
      } else {
        const byRef = await fsQueryByField<any>(
          'payment_submissions',
          'reference',
          req.params.id,
          callerToken,
          1
        );
        if (byRef.items.length > 0) {
          submission = byRef.items[0];
          db.paymentSubmissions.unshift(byRef.items[0]);
        }
      }
    }

    if (!submission) {
      res.status(404).json({ error: 'Payment submission not found' });
      return;
    }

    let txn = db.transactions.find(
      (t) => t.id === submission.transactionId || t.reference === submission.reference
    );
    if (!txn && callerToken) {
      if (submission.transactionId) {
        const fsTxn = await fsGetDoc<Transaction>('transactions', submission.transactionId, callerToken);
        if (fsTxn.exists && fsTxn.data) {
          txn = fsTxn.data;
          db.transactions.unshift(txn);
        }
      } else if (submission.reference) {
        const byRefTx = await fsQueryByField<Transaction>(
          'transactions',
          'reference',
          submission.reference,
          callerToken,
          1
        );
        if (byRefTx.items.length > 0) {
          txn = byRefTx.items[0];
          db.transactions.unshift(txn);
        }
      }
    }

    if (callerToken) {
      try {
        const atomicResult = await fsExecuteAtomicPaymentSubmissionReview({
          submissionId: submission.id,
          targetStatus: status,
          adminNote: typeof adminNote === 'string' ? adminNote : undefined,
          actorEmail: currentAdmin.email || AUTHORIZED_ADMIN_EMAIL,
          bearerToken: callerToken,
          fallbackSubmission: submission,
          fallbackTransaction: txn || null,
        });

        // Synchronize local in-memory ledger with committed Firestore state
        const subIdx = db.paymentSubmissions.findIndex((s) => s.id === atomicResult.submission.id);
        if (subIdx >= 0) db.paymentSubmissions[subIdx] = atomicResult.submission;
        else db.paymentSubmissions.unshift(atomicResult.submission);

        if (atomicResult.transaction) {
          const txIdx = db.transactions.findIndex((t) => t.id === atomicResult.transaction!.id);
          if (txIdx >= 0) db.transactions[txIdx] = atomicResult.transaction;
          else db.transactions.unshift(atomicResult.transaction);
        }

        if (atomicResult.wallet) {
          const wIdx = db.wallets.findIndex((w) => w.userId === atomicResult.wallet!.userId);
          if (wIdx >= 0) db.wallets[wIdx] = atomicResult.wallet;
          else db.wallets.push(atomicResult.wallet);
        }

        if (atomicResult.notification) {
          db.notifications.unshift(atomicResult.notification);
        }
        if (atomicResult.auditLog) {
          db.auditLogs.unshift(atomicResult.auditLog);
        }

        saveDatabase();

        res.json({
          message: atomicResult.alreadyProcessed
            ? `Payment submission ${atomicResult.submission.reference} was already verified and settled.`
            : `Payment submission ${atomicResult.submission.reference} updated to ${status}.`,
          submission: atomicResult.submission,
          transaction: atomicResult.transaction,
          wallet: atomicResult.wallet,
          notification: atomicResult.notification,
          atomicFirestore: true,
          alreadyProcessed: atomicResult.alreadyProcessed,
        });
        return;
      } catch (err: any) {
        const statusCode = Number(err?.statusCode) || 500;
        res.status(statusCode).json({
          error: err?.message || 'Failed to review payment submission in Firestore ledger.',
        });
        return;
      }
    }

    // Local ledger fallback when Firestore admin token is unavailable
    if (submission.balanceDeducted || submission.status === 'verified') {
      if (status === 'verified') {
        res.json({
          message: `Payment submission ${submission.reference} was already verified and settled.`,
          submission,
          transaction: txn || null,
          wallet: db.wallets.find((w) => w.userId === submission.userId) || null,
          alreadyProcessed: true,
          atomicFirestore: false,
        });
        return;
      }
      res.status(400).json({
        error: `Payment submission ${submission.reference} has already been verified and settled. Use Balance Adjustment if a manual reversal is required.`,
      });
      return;
    }

    const txType = submission.transactionType || txn?.type || 'transfer';
    const isDebitType = txType === 'transfer' || txType === 'withdrawal';
    const principalAmount = Math.round(Number(submission.amount || 0) * 100) / 100;
    let wallet = db.wallets.find((w) => w.userId === submission.userId);
    let previousBalance: number | undefined;
    let newBalance: number | undefined;

    if (status === 'verified' && isDebitType && principalAmount > 0) {
      previousBalance = Number(wallet?.availableBalance ?? 0);
      if (!wallet || previousBalance < principalAmount) {
        res.status(400).json({
          error: `Cannot approve ${txType} of $${principalAmount.toFixed(2)} USD. Available balance in this customer's wallet is only $${previousBalance.toFixed(2)} USD.`,
        });
        return;
      }
      newBalance = Math.round((previousBalance - principalAmount) * 100) / 100;
      wallet.availableBalance = newBalance;
      wallet.prototypeBalance = newBalance;
      wallet.lastUpdated = new Date().toISOString();
    }

    const previousStatus = submission.status;
    const now = new Date().toISOString();
    submission.status = status;
    submission.updatedAt = now;
    submission.reviewedAt = now;
    submission.reviewedBy = AUTHORIZED_ADMIN_EMAIL;
    submission.balanceDeducted = status === 'verified' && isDebitType && principalAmount > 0;
    if (submission.balanceDeducted) {
      submission.deductedAmount = principalAmount;
      submission.deductedAt = now;
    }
    if (adminNote !== undefined) submission.adminNote = adminNote.trim();

    if (txn) {
      txn.updatedAt = now;
      txn.reviewCompletedAt = now;
      if (adminNote) txn.adminNote = adminNote.trim();

      if (status === 'verified') {
        txn.paymentStatus = 'confirmed';
        txn.status = 'completed';
        txn.balanceDeducted = isDebitType && principalAmount > 0;
        if (txn.balanceDeducted) txn.deductedAt = now;
        if (previousBalance !== undefined) txn.previousBalance = previousBalance;
        if (newBalance !== undefined) txn.newBalance = newBalance;
      } else if (status === 'rejected') {
        txn.paymentStatus = 'rejected';
        txn.status = 'failed';
        txn.balanceDeducted = false;
      } else {
        txn.paymentStatus = 'awaiting_review';
        txn.status = 'pending';
        txn.balanceDeducted = false;
      }
    }

    let reviewNotif: any;
    if (status === 'verified') {
      const balText =
        newBalance !== undefined
          ? ` $${principalAmount.toFixed(2)} USD has been deducted from your wallet. Updated available balance: $${newBalance.toFixed(2)} USD.`
          : '';
      reviewNotif = createNotification(
        submission.userId,
        'Payment Verified & Approved',
        `Your ${submission.paymentMethod === 'bitcoin' ? 'Bitcoin' : 'Bank Transfer'} payment (Ref: ${submission.reference}) for $${principalAmount.toFixed(2)} USD has been verified and approved.${balText}`,
        'payment',
        undefined,
        submission.reference,
        principalAmount,
        {
          templateKey: 'payment_verified',
          templateParams: {
            method: submission.paymentMethod,
            reference: submission.reference,
            amount: principalAmount,
          },
        }
      );
      recordAuditLog(AUTHORIZED_ADMIN_EMAIL, 'admin', 'PAYMENT_SUBMISSION_VERIFIED', {
        targetUserId: submission.userId,
        targetUserEmail: submission.userEmail,
        reference: submission.reference,
        previousValue: previousBalance !== undefined ? `$${previousBalance.toFixed(2)}` : previousStatus,
        newValue: newBalance !== undefined ? `$${newBalance.toFixed(2)}` : 'verified',
        reason: adminNote || 'Payment verified and principal deducted',
      });
    } else if (status === 'rejected') {
      reviewNotif = createNotification(
        submission.userId,
        'Payment Rejected',
        `Your ${submission.paymentMethod === 'bitcoin' ? 'Bitcoin' : 'Bank Transfer'} payment submission (Ref: ${submission.reference}) was rejected and no funds were deducted. Reason: ${adminNote || 'Payment verification unsuccessful'}.`,
        'payment',
        undefined,
        submission.reference,
        principalAmount,
        {
          templateKey: 'payment_rejected',
          templateParams: {
            method: submission.paymentMethod,
            reference: submission.reference,
            reason: adminNote || 'Payment verification unsuccessful',
          },
        }
      );
      recordAuditLog(AUTHORIZED_ADMIN_EMAIL, 'admin', 'PAYMENT_SUBMISSION_REJECTED', {
        targetUserId: submission.userId,
        targetUserEmail: submission.userEmail,
        reference: submission.reference,
        previousValue: previousStatus,
        newValue: 'rejected',
        reason: adminNote || 'Payment rejected; no wallet deduction applied',
      });
    } else {
      reviewNotif = createNotification(
        submission.userId,
        'Payment Status: Pending Verification',
        `Your payment submission (Ref: ${submission.reference}) has been updated to Pending Verification.`,
        'payment',
        undefined,
        submission.reference,
        principalAmount,
        {
          templateKey: 'payment_pending',
          templateParams: { reference: submission.reference },
        }
      );
      recordAuditLog(AUTHORIZED_ADMIN_EMAIL, 'admin', 'PAYMENT_SUBMISSION_STATUS_PENDING', {
        targetUserId: submission.userId,
        targetUserEmail: submission.userEmail,
        reference: submission.reference,
        previousValue: previousStatus,
        newValue: 'pending',
        reason: adminNote || 'Status set to pending by administrator',
      });
    }

    saveDatabase();

    res.json({
      message: `Payment submission ${submission.reference} updated to ${status}.`,
      submission,
      transaction: txn || null,
      wallet: wallet || null,
      notification: reviewNotif,
      atomicFirestore: false,
    });
  }
);

// -------------------------------------------------------------
// Multilingual Bank Announcements
// -------------------------------------------------------------

apiRouter.get('/announcements', async (_req: Request, res: Response) => {
  const db = getDb();
  const annMap = new Map<string, Announcement>();
  (db.announcements || []).forEach((a) => annMap.set(a.id, a));

  const adminToken = await getFirebaseAdminAccessToken();
  if (adminToken) {
    const fsAnns = await fsListCollection<Announcement>('announcements', adminToken);
    if (!fsAnns.error) {
      fsAnns.items.forEach((a) => annMap.set(a.id, a));
    }
  }

  const active = Array.from(annMap.values())
    .filter((a) => a.active)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  res.json({ announcements: active });
});

apiRouter.get('/admin/announcements', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  const currentAdmin: User = (req as any).user;
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  const annMap = new Map<string, Announcement>();
  (db.announcements || []).forEach((a) => annMap.set(a.id, a));

  if (callerToken) {
    const fsAnns = await fsListCollection<Announcement>('announcements', callerToken);
    if (!fsAnns.error) {
      fsAnns.items.forEach((a) => {
        const existing = annMap.get(a.id);
        if (!existing) annMap.set(a.id, a);
        else {
          const fsT = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const locT = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          if (fsT >= locT) annMap.set(a.id, a);
        }
      });
    }
  }

  const list = Array.from(annMap.values()).sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
  res.json({ announcements: list });
});

apiRouter.post('/admin/announcements', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const { titleTranslations, bodyTranslations, defaultLanguage, priority, active } = req.body;
  if (!titleTranslations || typeof titleTranslations !== 'object' || !bodyTranslations || typeof bodyTranslations !== 'object') {
    res.status(400).json({ error: 'Localized title and body translations are required.' });
    return;
  }

  const db = getDb();
  if (!db.announcements) db.announcements = [];
  const currentAdmin: User = (req as any).user;
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  const now = new Date().toISOString();
  const entry: Announcement = {
    id: `ann_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    titleTranslations,
    bodyTranslations,
    defaultLanguage: String(defaultLanguage || 'en'),
    priority: ['info', 'important', 'urgent'].includes(priority) ? priority : 'info',
    active: active !== undefined ? Boolean(active) : true,
    createdAt: now,
    updatedAt: now,
    createdBy: AUTHORIZED_ADMIN_EMAIL,
  };
  db.announcements.unshift(entry);
  const auditEntry = recordAuditLog(AUTHORIZED_ADMIN_EMAIL, 'admin', 'ANNOUNCEMENT_CREATED', {
    reference: entry.id,
    newValue: entry.titleTranslations[entry.defaultLanguage] || Object.values(entry.titleTranslations)[0] || '',
    reason: `Published multilingual announcement (${Object.keys(entry.titleTranslations).length} languages)`,
  });
  saveDatabase();

  if (callerToken) {
    await Promise.all([
      fsSetDoc('announcements', entry.id, { ...entry }, callerToken).catch(() => {}),
      fsSetDoc('audit_logs', auditEntry.id, { ...auditEntry }, callerToken).catch(() => {}),
    ]);
  }

  res.status(201).json({ message: 'Announcement published successfully.', announcement: entry });
});

apiRouter.put('/admin/announcements/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  if (!db.announcements) db.announcements = [];
  const currentAdmin: User = (req as any).user;
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  let ann = db.announcements.find((a) => a.id === req.params.id);
  if (!ann && callerToken) {
    const fsAnn = await fsGetDoc<Announcement>('announcements', req.params.id, callerToken);
    if (fsAnn.exists && fsAnn.data) {
      ann = fsAnn.data;
      db.announcements.unshift(ann);
    }
  }
  if (!ann) {
    res.status(404).json({ error: 'Announcement not found' });
    return;
  }
  const { titleTranslations, bodyTranslations, defaultLanguage, priority, active } = req.body;
  if (titleTranslations && typeof titleTranslations === 'object') ann.titleTranslations = titleTranslations;
  if (bodyTranslations && typeof bodyTranslations === 'object') ann.bodyTranslations = bodyTranslations;
  if (defaultLanguage) ann.defaultLanguage = String(defaultLanguage);
  if (priority && ['info', 'important', 'urgent'].includes(priority)) ann.priority = priority;
  if (active !== undefined) ann.active = Boolean(active);
  ann.updatedAt = new Date().toISOString();
  saveDatabase();

  if (callerToken) {
    await fsSetDoc('announcements', ann.id, { ...ann }, callerToken).catch(() => {});
  }

  res.json({ message: 'Announcement updated.', announcement: ann });
});

apiRouter.delete('/admin/announcements/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  if (!db.announcements) db.announcements = [];
  const currentAdmin: User = (req as any).user;
  const callerToken = await getAdminFirestoreToken(req, currentAdmin);

  const idx = db.announcements.findIndex((a) => a.id === req.params.id);
  const removedId = idx !== -1 ? db.announcements[idx].id : req.params.id;
  if (idx !== -1) {
    db.announcements.splice(idx, 1);
  } else if (callerToken) {
    const fsAnn = await fsGetDoc<Announcement>('announcements', req.params.id, callerToken);
    if (!fsAnn.exists) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }
  } else {
    res.status(404).json({ error: 'Announcement not found' });
    return;
  }

  const auditEntry = recordAuditLog(AUTHORIZED_ADMIN_EMAIL, 'admin', 'ANNOUNCEMENT_DELETED', {
    reference: removedId,
    reason: 'Deleted bank announcement',
  });
  saveDatabase();

  if (callerToken) {
    await Promise.all([
      fsDeleteDoc('announcements', removedId, callerToken).catch(() => {}),
      fsSetDoc('audit_logs', auditEntry.id, { ...auditEntry }, callerToken).catch(() => {}),
    ]);
  }

  res.json({ message: 'Announcement deleted.', deletedId: removedId });
});
