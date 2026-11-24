export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  country: string;
  countryCode: string;
  dialingCode: string;
  phoneNumber: string;
  language: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  emailVerified?: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  updatedAt?: string;
  resetAttempts: number;
}

export interface Wallet {
  id: string;
  userId: string;
  accountNumber: string; // e.g. UNGB-4920-8812-4019
  currency: 'USD';
  availableBalance: number;
  prototypeBalance: number; // Simulated prototype balance
  isSimulated: boolean;
  lastUpdated: string;
}

export type TransactionType = 'transfer' | 'withdrawal' | 'admin_credit' | 'admin_debit' | 'admin_adjustment';
export type PaymentMethod = 'bitcoin' | 'bank_transfer' | 'internal';
export type PaymentStatus = 'not_started' | 'awaiting_payment' | 'awaiting_review' | 'confirmed' | 'rejected' | 'failed' | 'cancelled';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  reference: string; // e.g. TXN-UNGB-892401-9821
  userId: string;
  userEmail: string;
  userName: string;
  type: TransactionType;
  senderOrRecipient: string;
  bankName: string;
  accountNumber: string;
  routingOrSwift?: string;
  amount: number;
  fee: number;
  total: number;
  previousBalance?: number;
  newBalance?: number;
  adjustedBy?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: TransactionStatus;
  description: string;
  descriptionKey?: string;
  templateParams?: Record<string, string | number>;
  adminNote?: string;
  isSimulated: boolean;
  createdAt: string;
  updatedAt: string;
  paymentSubmittedAt?: string;
  paymentTxHashOrProof?: string;
  reviewCompletedAt?: string;
  receiptImages?: string[];
  userMessage?: string;
  balanceDeducted?: boolean;
  deductedAt?: string;
}

export interface FeeSettings {
  transferFixedFee: number;
  transferPercentFee: number;
  transferFeeEnabled: boolean;
  withdrawalFixedFee: number;
  withdrawalPercentFee: number;
  withdrawalFeeEnabled: boolean;
  minTransferAmount: number;
  maxTransferAmount: number;
  currency: 'USD';
  updatedAt: string;
  updatedBy: string;
  // Legacy compatibility fields
  transferFee: number;
  withdrawalFee: number;
}

export interface PaymentMethodConfig {
  id: 'bitcoin' | 'bank_transfer';
  name: string;
  enabled: boolean;
  fee: number;
  instructions: string;
  accountDetails?: {
    // Bank Transfer configuration fields
    beneficiary?: string;
    accountHolderName?: string;
    bankName?: string;
    routingNumber?: string;
    accountNumber?: string;
    swiftBic?: string;
    bankInstructions?: string;
    referenceInstructions?: string;
    // Bitcoin Payment configuration fields
    providerName?: string;
    btcAddress?: string;
    network?: string;
    bitcoinInstructions?: string;
  };
}

export type PaymentSubmissionStatus = 'pending' | 'verified' | 'rejected';

export interface PaymentSubmission {
  id: string;
  transactionId?: string;
  reference: string;
  userId: string;
  userEmail: string;
  userName: string;
  paymentMethod: 'bank_transfer' | 'bitcoin';
  amount: number;
  fee: number;
  total: number;
  transactionType: 'transfer' | 'withdrawal' | 'fee_payment';
  receiptImages: string[];
  userMessage: string;
  status: PaymentSubmissionStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  balanceDeducted?: boolean;
  deductedAmount?: number;
  deductedAt?: string;
  recipientName?: string;
  recipientBank?: string;
  recipientAccount?: string;
  routingOrSwift?: string;
  description?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'payment' | 'security' | 'credit' | 'debit' | 'system';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  reference?: string;
  amount?: number;
  templateKey?: string;
  templateParams?: Record<string, string | number>;
  translations?: Record<string, { title: string; message: string }>;
}

export interface Announcement {
  id: string;
  titleTranslations: Record<string, string>;
  bodyTranslations: Record<string, string>;
  defaultLanguage: string;
  priority: 'info' | 'important' | 'urgent';
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetUserId?: string;
  targetUserEmail?: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  reference?: string;
  ipAddress?: string;
}

export interface ResetSecurity {
  resetPasswordHash: string;
  resetSalt: string;
  sessionTimeoutMinutes: number;
  failedAttempts: number;
  lockedUntil: string | null;
  lastPasswordChange: string;
}

export interface PasswordRecoveryCode {
  email: string;
  code: string;
  expiresAt: string;
  used: boolean;
  attempts: number;
}

export interface ActiveSession {
  token: string;
  userId: string;
  role: 'user' | 'admin';
  email: string;
  expiresAt: number;
}

export interface PendingCleanupRecord {
  id: string;
  userId: string;
  extraUserIds?: string[];
  email: string;
  deletedAuthUid?: string;
  deletedPaths: string[];
  errors: string[];
  status: 'pending' | 'resolved';
  createdAt: string;
  lastAttemptAt: string;
  resolvedAt?: string;
  actorEmail: string;
}

export interface DatabaseSchema {
  users: User[];
  wallets: Wallet[];
  transactions: Transaction[];
  feeSettings: FeeSettings;
  paymentMethods: PaymentMethodConfig[];
  paymentSubmissions?: PaymentSubmission[];
  notifications: Notification[];
  announcements?: Announcement[];
  auditLogs: AuditLog[];
  resetSecurity: ResetSecurity;
  recoveryCodes: PasswordRecoveryCode[];
  sessions?: ActiveSession[];
  pendingCleanups?: PendingCleanupRecord[];
}
