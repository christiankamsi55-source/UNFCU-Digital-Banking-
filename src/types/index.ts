export type UserRole = 'user' | 'admin';

export type SupportedLanguage =
  | 'en'
  | 'zh-CN'
  | 'zh-TW'
  | 'vi'
  | 'it'
  | 'fr'
  | 'es'
  | 'pt'
  | 'pt-BR'
  | 'de'
  | 'nl'
  | 'ar'
  | 'ja'
  | 'ko'
  | 'hi'
  | 'ur'
  | 'bn'
  | 'id'
  | 'ms'
  | 'th'
  | 'tr'
  | 'ru'
  | 'uk'
  | 'pl'
  | 'el'
  | 'sv'
  | 'no'
  | 'da'
  | 'fi'
  | 'he'
  | 'fa'
  | 'fil'
  | 'ro'
  | 'cs'
  | 'hu'
  | 'sk'
  | 'ca'
  | 'bg';

export interface User {
  id: string;
  email: string;
  fullName: string;
  country: string;
  countryCode: string;
  dialingCode?: string;
  phoneNumber?: string;
  language: SupportedLanguage;
  role: UserRole;
  status: 'active' | 'suspended';
  emailVerified?: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  updatedAt?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  accountNumber: string;
  currency: 'USD';
  availableBalance: number;
  prototypeBalance: number;
  isSimulated: boolean;
  lastUpdated: string;
}

export type TransactionType = 'transfer' | 'withdrawal' | 'admin_credit' | 'admin_debit' | 'admin_adjustment';
export type PaymentMethod = 'bitcoin' | 'bank_transfer' | 'internal';
export type PaymentStatus = 'not_started' | 'awaiting_payment' | 'awaiting_review' | 'confirmed' | 'rejected' | 'failed' | 'cancelled';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  reference: string;
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
  defaultLanguage: SupportedLanguage;
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

export type CountryRegion =
  | 'Americas'
  | 'Europe'
  | 'Asia'
  | 'Middle East'
  | 'Oceania';

export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  region: CountryRegion;
  dateLocale: string;
  numberLocale: string;
  currencyCode: string;
  currencySymbol: string;
  suggestedLang?: SupportedLanguage;
}
