import crypto from 'crypto';
import { getAppletFirebaseConfig, getFirebaseAdminAccessToken } from './firebaseAdmin';
import { AUTHORIZED_ADMIN_EMAIL } from './db';
import { User, Wallet, Transaction, Notification, AuditLog, PaymentSubmission } from './types';

function getDatabaseBaseUrl(): string {
  const cfg = getAppletFirebaseConfig();
  const dbId = cfg.firestoreDatabaseId || '(default)';
  return `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${encodeURIComponent(dbId)}`;
}

function getDocumentsRootPath(): string {
  const cfg = getAppletFirebaseConfig();
  const dbId = cfg.firestoreDatabaseId || '(default)';
  return `projects/${cfg.projectId}/databases/${dbId}/documents`;
}

function toFirestoreValue(val: any): Record<string, any> | undefined {
  if (val === undefined) return undefined;
  if (val === null) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { doubleValue: 0 };
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val
          .map((item) => toFirestoreValue(item))
          .filter((v): v is Record<string, any> => v !== undefined),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      const converted = toFirestoreValue(v);
      if (converted !== undefined) {
        fields[k] = converted;
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const converted = toFirestoreValue(v);
    if (converted !== undefined) {
      fields[k] = converted;
    }
  }
  return fields;
}

function fromFirestoreValue(v: any): any {
  if (!v || typeof v !== 'object') return undefined;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) {
    const vals = v.arrayValue?.values;
    return Array.isArray(vals) ? vals.map((item) => fromFirestoreValue(item)) : [];
  }
  if ('mapValue' in v) {
    return fromFirestoreFields(v.mapValue?.fields || {});
  }
  return undefined;
}

export function fromFirestoreFields<T = Record<string, any>>(fields: Record<string, any> = {}): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out as T;
}

async function resolveBearerToken(callerIdToken?: string | null): Promise<string | null> {
  if (callerIdToken && callerIdToken.trim()) {
    return callerIdToken.trim();
  }
  return getFirebaseAdminAccessToken();
}

export interface FirestoreDocReadResult<T> {
  exists: boolean;
  data: T | null;
  permissionDenied: boolean;
  error?: string;
}

export async function fsGetDoc<T = Record<string, any>>(
  collectionPath: string,
  docId: string,
  callerIdToken?: string | null
): Promise<FirestoreDocReadResult<T>> {
  const token = await resolveBearerToken(callerIdToken);
  if (!token) {
    return {
      exists: false,
      data: null,
      permissionDenied: true,
      error: 'No authentication token available to read Firestore.',
    };
  }

  const url = `${getDatabaseBaseUrl()}/documents/${collectionPath}/${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 404) {
    return { exists: false, data: null, permissionDenied: false };
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload?.error?.message || `Firestore read failed (${res.status})`;
    return {
      exists: false,
      data: null,
      permissionDenied: res.status === 401 || res.status === 403,
      error: msg,
    };
  }

  return {
    exists: true,
    data: fromFirestoreFields<T>(payload.fields || {}),
    permissionDenied: false,
  };
}

export async function fsListCollection<T = Record<string, any>>(
  collectionPath: string,
  callerIdToken?: string | null,
  pageSize: number = 300
): Promise<{ items: T[]; permissionDenied: boolean; error?: string }> {
  const token = await resolveBearerToken(callerIdToken);
  if (!token) {
    return {
      items: [],
      permissionDenied: true,
      error: 'No authentication token available to list Firestore collection.',
    };
  }

  const items: T[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) params.set('pageToken', pageToken);
    const url = `${getDatabaseBaseUrl()}/documents/${collectionPath}?${params.toString()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        items: [],
        permissionDenied: res.status === 401 || res.status === 403,
        error: payload?.error?.message || `Firestore list failed (${res.status})`,
      };
    }

    if (Array.isArray(payload.documents)) {
      for (const d of payload.documents) {
        if (d.fields) {
          const parsed = fromFirestoreFields<T>(d.fields) as any;
          if (d.name) {
            Object.defineProperty(parsed, '__docPath', { value: d.name, enumerable: false });
            Object.defineProperty(parsed, '__docId', {
              value: String(d.name).split('/').pop(),
              enumerable: false,
            });
          }
          items.push(parsed);
        }
      }
    }
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return { items, permissionDenied: false };
}

export async function fsQueryByField<T = Record<string, any>>(
  collectionId: string,
  fieldPath: string,
  value: string,
  callerIdToken?: string | null,
  limitCount: number = 200
): Promise<{ items: (T & { __docPath?: string; __docId?: string })[]; permissionDenied: boolean; error?: string }> {
  const token = await resolveBearerToken(callerIdToken);
  if (!token) {
    return {
      items: [],
      permissionDenied: true,
      error: 'No authentication token available to query Firestore.',
    };
  }

  const url = `${getDatabaseBaseUrl()}/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value: { stringValue: value },
          },
        },
        limit: limitCount,
      },
    }),
  });

  const payload = await res.json().catch(() => ([]));
  if (!res.ok) {
    const errObj = Array.isArray(payload) ? payload[0]?.error : payload?.error;
    return {
      items: [],
      permissionDenied: res.status === 401 || res.status === 403,
      error: errObj?.message || `Firestore query failed (${res.status})`,
    };
  }

  const items: (T & { __docPath?: string; __docId?: string })[] = [];
  if (Array.isArray(payload)) {
    for (const row of payload) {
      if (row?.document?.fields) {
        const docName = String(row.document.name || '');
        const parsed = fromFirestoreFields<T>(row.document.fields) as T & {
          __docPath?: string;
          __docId?: string;
        };
        parsed.__docPath = docName;
        parsed.__docId = docName.split('/').pop();
        items.push(parsed);
      }
    }
  }

  return { items, permissionDenied: false };
}

export async function fsSetDoc(
  collectionPath: string,
  docId: string,
  data: Record<string, any>,
  callerIdToken?: string | null
): Promise<void> {
  const token = await resolveBearerToken(callerIdToken);
  if (!token) {
    throw new Error('No authentication token available to write Firestore document.');
  }

  const url = `${getDatabaseBaseUrl()}/documents/${collectionPath}/${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: toFirestoreFields(data),
    }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error?.message || `Firestore write failed (${res.status})`);
  }
}

export async function fsDeleteDoc(
  docFullPathOrCollection: string,
  docId?: string,
  callerIdToken?: string | null
): Promise<{ deleted: boolean; notFound: boolean; error?: string }> {
  const token = await resolveBearerToken(callerIdToken);
  if (!token) {
    return {
      deleted: false,
      notFound: false,
      error: 'No authentication token available to delete Firestore document.',
    };
  }

  const url = docId
    ? `${getDatabaseBaseUrl()}/documents/${docFullPathOrCollection}/${encodeURIComponent(docId)}`
    : `https://firestore.googleapis.com/v1/${docFullPathOrCollection}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) {
    return { deleted: true, notFound: true };
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    return {
      deleted: false,
      notFound: false,
      error: payload?.error?.message || `Firestore delete failed (${res.status})`,
    };
  }

  return { deleted: true, notFound: false };
}

export async function fsIsAccountNumberTaken(
  accountNumber: string,
  callerIdToken?: string | null
): Promise<boolean> {
  const token = await resolveBearerToken(callerIdToken);
  if (!token) return false;
  const res = await fsQueryByField<any>('wallets', 'accountNumber', accountNumber, token, 1);
  if (res.error) return false;
  return res.items.length > 0;
}

export async function fsDeleteUserAndRelatedDocs(
  userId: string,
  callerIdToken?: string | null,
  options?: { extraUserIds?: string[]; email?: string }
): Promise<{ deletedPaths: string[]; errors: string[]; completed: boolean }> {
  const token = await resolveBearerToken(callerIdToken);
  if (!token) {
    return {
      deletedPaths: [],
      errors: ['No authentication token available to delete Firestore records.'],
      completed: false,
    };
  }

  const deletedPathSet = new Set<string>();
  const deletedPaths: string[] = [];
  const errors: string[] = [];
  const recordDeleted = (pathLabel: string) => {
    if (!deletedPathSet.has(pathLabel)) {
      deletedPathSet.add(pathLabel);
      deletedPaths.push(pathLabel);
    }
  };

  const uidSet = new Set<string>(
    [userId, ...(options?.extraUserIds || [])].map((v) => String(v || '').trim()).filter(Boolean)
  );
  const cleanEmail = options?.email ? String(options.email).trim().toLowerCase() : '';

  // 0. Discover any stale/orphan user documents matching this email address
  if (cleanEmail) {
    const emailUsersRes = await fsQueryByField<any>('users', 'email', cleanEmail, token, 25);
    if (emailUsersRes.error) {
      errors.push(`query users by email: ${emailUsersRes.error}`);
    } else {
      for (const uDoc of emailUsersRes.items) {
        const docId = uDoc.__docId || uDoc.id;
        if (docId) uidSet.add(String(docId));
        if (uDoc.__docPath) {
          const delU = await fsDeleteDoc(uDoc.__docPath, undefined, token);
          if (delU.deleted) {
            if (!delU.notFound) recordDeleted(`users/${docId}`);
          } else {
            errors.push(`users/${docId}: ${delU.error || 'Delete failed'}`);
          }
        }
      }
    }
  }

  const cleanPaymentSubmissionDoc = async (sub: any) => {
    const subIdsToClean = new Set<string>();
    if (sub.id) subIdsToClean.add(String(sub.id));
    if (sub.__docId) subIdsToClean.add(String(sub.__docId));
    if (sub.reference) subIdsToClean.add(String(sub.reference));

    for (const rcptParentId of subIdsToClean) {
      const receiptsRes = await fsListCollection<any>(
        `payment_submissions/${encodeURIComponent(rcptParentId)}/receipts`,
        token
      );
      if (receiptsRes.error) {
        errors.push(`list payment_submissions/${rcptParentId}/receipts: ${receiptsRes.error}`);
      } else {
        for (const rcpt of receiptsRes.items as any[]) {
          const delR = rcpt.__docPath
            ? await fsDeleteDoc(rcpt.__docPath, undefined, token)
            : rcpt?.id
            ? await fsDeleteDoc(
                `payment_submissions/${encodeURIComponent(rcptParentId)}/receipts`,
                rcpt.id,
                token
              )
            : null;
          if (delR && delR.deleted && !delR.notFound) {
            recordDeleted(`payment_submissions/${rcptParentId}/receipts/${rcpt.__docId || rcpt.id}`);
          } else if (delR && !delR.deleted) {
            errors.push(
              `payment_submissions/${rcptParentId}/receipts/${rcpt.__docId || rcpt.id}: ${delR.error}`
            );
          }
        }
      }
    }

    if (sub.__docPath) {
      const delSub = await fsDeleteDoc(sub.__docPath, undefined, token);
      if (delSub.deleted) {
        if (!delSub.notFound) recordDeleted(`payment_submissions/${sub.__docId || sub.id}`);
      } else {
        errors.push(`payment_submissions/${sub.__docId || sub.id}: ${delSub.error}`);
      }
    }
  };

  for (const uid of uidSet) {
    // 1. Delete primary user document & canonical wallet document
    for (const [col, id] of [
      ['users', uid],
      ['wallets', `wallet_${uid}`],
    ] as const) {
      const res = await fsDeleteDoc(col, id, token);
      if (res.deleted) {
        if (!res.notFound) recordDeleted(`${col}/${id}`);
      } else {
        errors.push(`${col}/${id}: ${res.error || 'Delete failed'}`);
      }
    }

    // 2. Delete payment_submissions and nested /receipts subcollections by userId
    const subsRes = await fsQueryByField<any>('payment_submissions', 'userId', uid, token);
    if (subsRes.error) {
      errors.push(`query payment_submissions (${uid}): ${subsRes.error}`);
    } else {
      for (const sub of subsRes.items) {
        await cleanPaymentSubmissionDoc(sub);
      }
    }

    // 3. Delete any remaining wallets, transactions, notifications by userId
    for (const colName of ['wallets', 'transactions', 'notifications']) {
      for (let page = 0; page < 10; page++) {
        const queryRes = await fsQueryByField<any>(colName, 'userId', uid, token, 200);
        if (queryRes.error) {
          errors.push(`query ${colName} (${uid}): ${queryRes.error}`);
          break;
        }
        if (queryRes.items.length === 0) break;
        let deletedInBatch = 0;
        for (const docItem of queryRes.items) {
          if (!docItem.__docPath) continue;
          const delRes = await fsDeleteDoc(docItem.__docPath, undefined, token);
          if (delRes.deleted) {
            if (!delRes.notFound) recordDeleted(`${colName}/${docItem.__docId || docItem.id}`);
            deletedInBatch++;
          } else {
            errors.push(`${colName}/${docItem.__docId || docItem.id}: ${delRes.error}`);
          }
        }
        if (queryRes.items.length < 200 || deletedInBatch === 0) break;
      }
    }
  }

  // 4. Delete any email-indexed remnants in payment_submissions and transactions
  if (cleanEmail) {
    const emailSubsRes = await fsQueryByField<any>('payment_submissions', 'userEmail', cleanEmail, token);
    if (emailSubsRes.error) {
      errors.push(`query payment_submissions by email: ${emailSubsRes.error}`);
    } else {
      for (const sub of emailSubsRes.items) {
        await cleanPaymentSubmissionDoc(sub);
      }
    }

    for (let page = 0; page < 10; page++) {
      const txByEmailRes = await fsQueryByField<any>('transactions', 'userEmail', cleanEmail, token, 200);
      if (txByEmailRes.error) {
        errors.push(`query transactions by email: ${txByEmailRes.error}`);
        break;
      }
      if (txByEmailRes.items.length === 0) break;
      let deletedInBatch = 0;
      for (const docItem of txByEmailRes.items) {
        if (!docItem.__docPath) continue;
        const delRes = await fsDeleteDoc(docItem.__docPath, undefined, token);
        if (delRes.deleted) {
          if (!delRes.notFound) recordDeleted(`transactions/${docItem.__docId || docItem.id}`);
          deletedInBatch++;
        } else {
          errors.push(`transactions/${docItem.__docId || docItem.id}: ${delRes.error}`);
        }
      }
      if (txByEmailRes.items.length < 200 || deletedInBatch === 0) break;
    }
  }

  return {
    deletedPaths,
    errors,
    completed: errors.length === 0,
  };
}

export interface AtomicBalanceAdjustmentParams {
  userId: string;
  adjustmentType: 'credit' | 'debit';
  amount: number;
  reason: string;
  notes?: string;
  idempotencyKey?: string;
  actorEmail?: string;
  reference: string;
  bearerToken: string;
}

export interface AtomicBalanceAdjustmentResult {
  user: User;
  wallet: Wallet;
  transaction: Transaction;
  notification: Notification;
  auditLog: AuditLog;
  idempotentReplay: boolean;
}

function sanitizeFirestoreId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  return cleaned || `id_${Date.now()}`;
}

export async function fsExecuteAtomicBalanceAdjustment(
  params: AtomicBalanceAdjustmentParams
): Promise<AtomicBalanceAdjustmentResult> {
  const baseUrl = getDatabaseBaseUrl();
  const docsRoot = getDocumentsRootPath();
  const token = await resolveBearerToken(params.bearerToken);
  if (!token) {
    throw new Error('Authentication token is required for Firestore transaction execution.');
  }

  // Begin Firestore ReadWrite Transaction
  const beginRes = await fetch(`${baseUrl}/documents:beginTransaction`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      options: { readWrite: {} },
    }),
  });

  const beginPayload = await beginRes.json().catch(() => ({}));
  if (!beginRes.ok || !beginPayload.transaction) {
    throw new Error(
      beginPayload?.error?.message || `Failed to begin Firestore transaction (${beginRes.status})`
    );
  }

  const fsTxId: string = beginPayload.transaction;
  let committed = false;

  try {
    const rollbackIfNeeded = async () => {
      if (committed) return;
      await fetch(`${baseUrl}/documents:rollback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction: fsTxId }),
      }).catch(() => {});
    };

    const readInTx = async <T>(docName: string): Promise<{ exists: boolean; data: T | null }> => {
      const r = await fetch(`${baseUrl}/documents/${docName}?transaction=${encodeURIComponent(fsTxId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 404) return { exists: false, data: null };
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(body?.error?.message || `Firestore transactional read failed for ${docName}`);
      }
      return { exists: true, data: fromFirestoreFields<T>(body.fields || {}) };
    };

    // 1. Check idempotency key first if supplied
    const cleanIdemKey = params.idempotencyKey?.trim()
      ? sanitizeFirestoreId(params.idempotencyKey.trim())
      : undefined;
    const deterministicTxId = cleanIdemKey
      ? sanitizeFirestoreId(`txn_adj_${cleanIdemKey}`)
      : `txn_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    if (cleanIdemKey) {
      const existingTx = await readInTx<Transaction>(`transactions/${deterministicTxId}`);
      if (existingTx.exists && existingTx.data) {
        let walletSnap = await readInTx<Wallet>(`wallets/${encodeURIComponent(`wallet_${params.userId}`)}`);
        if (!walletSnap.exists || !walletSnap.data) {
          const qW = await fsQueryByField<Wallet>('wallets', 'userId', params.userId, token, 1);
          const qDocId = qW.items[0]?.__docId || qW.items[0]?.id;
          if (qDocId) {
            walletSnap = await readInTx<Wallet>(`wallets/${encodeURIComponent(qDocId)}`);
          }
        }
        const userSnap = await readInTx<User>(`users/${encodeURIComponent(params.userId)}`);
        await rollbackIfNeeded();
        if (walletSnap.data && userSnap.data) {
          const replayNotif: Notification = {
            id: `notif_${sanitizeFirestoreId(cleanIdemKey)}`,
            userId: params.userId,
            title:
              params.adjustmentType === 'credit'
                ? `Account Credited — $${existingTx.data.amount.toFixed(2)} USD`
                : `Account Debited — $${existingTx.data.amount.toFixed(2)} USD`,
            message: existingTx.data.description,
            type: params.adjustmentType === 'credit' ? 'credit' : 'debit',
            read: false,
            createdAt: existingTx.data.createdAt,
            reference: existingTx.data.reference,
            amount: existingTx.data.amount,
          };
          const replayAudit: AuditLog = {
            id: `audit_${sanitizeFirestoreId(cleanIdemKey)}`,
            timestamp: existingTx.data.createdAt,
            actorEmail: params.actorEmail || AUTHORIZED_ADMIN_EMAIL,
            actorRole: 'admin',
            action: `BALANCE_${params.adjustmentType.toUpperCase()}`,
            targetUserId: params.userId,
            targetUserEmail: userSnap.data.email,
            reference: existingTx.data.reference,
            reason: params.reason.trim(),
          };
          return {
            user: userSnap.data,
            wallet: walletSnap.data,
            transaction: existingTx.data,
            notification: replayNotif,
            auditLog: replayAudit,
            idempotentReplay: true,
          };
        }
      }
    }

    // 2. Read authoritative customer profile in Firestore inside transaction
    const userRes = await readInTx<User>(`users/${encodeURIComponent(params.userId)}`);
    if (!userRes.exists || !userRes.data) {
      await rollbackIfNeeded();
      const notFoundErr = new Error('Customer profile record not found in Firestore.');
      (notFoundErr as any).statusCode = 404;
      throw notFoundErr;
    }
    const targetUser = {
      ...userRes.data,
      id: userRes.data.id || params.userId,
    };

    // 3. Read authoritative wallet in Firestore inside transaction (canonical ID first, query fallback second)
    let walletDocId = `wallet_${params.userId}`;
    let walletRes = await readInTx<Wallet>(`wallets/${encodeURIComponent(walletDocId)}`);
    if (!walletRes.exists || !walletRes.data) {
      const qRes = await fsQueryByField<Wallet>('wallets', 'userId', params.userId, token, 1);
      const qDocId = qRes.items[0]?.__docId || qRes.items[0]?.id;
      if (qDocId) {
        walletDocId = qDocId;
        walletRes = await readInTx<Wallet>(`wallets/${encodeURIComponent(walletDocId)}`);
      }
    }

    const walletExistsInFs = Boolean(walletRes.exists && walletRes.data);
    const currentWallet = walletRes.data;
    const previousBalance = Number(currentWallet?.availableBalance) || 0;
    const numAmount = Math.round(params.amount * 100) / 100;
    let newBalance = previousBalance;

    if (params.adjustmentType === 'credit') {
      newBalance = Math.round((previousBalance + numAmount) * 100) / 100;
    } else {
      if (!walletExistsInFs || previousBalance < numAmount) {
        await rollbackIfNeeded();
        const insuffErr = new Error(
          `Cannot debit $${numAmount.toFixed(2)} USD. Available funds in this account are only $${previousBalance.toFixed(2)} USD.`
        );
        (insuffErr as any).statusCode = 400;
        throw insuffErr;
      }
      newBalance = Math.round((previousBalance - numAmount) * 100) / 100;
    }

    const now = new Date().toISOString();
    const adminIdentity = (params.actorEmail || AUTHORIZED_ADMIN_EMAIL).slice(0, 160);
    const cleanRef = String(params.reference || '').slice(0, 80);
    const fallbackAcct = `UNGB-${crypto.randomInt(1000, 9999)}-${crypto.randomInt(1000, 9999)}-${crypto.randomInt(1000, 9999)}`;

    const updatedWallet: Wallet = {
      id: currentWallet?.id || walletDocId,
      userId: targetUser.id,
      accountNumber: String(currentWallet?.accountNumber || fallbackAcct).slice(0, 64),
      currency: 'USD',
      availableBalance: newBalance,
      prototypeBalance: newBalance,
      isSimulated: currentWallet?.isSimulated !== undefined ? Boolean(currentWallet.isSimulated) : true,
      lastUpdated: now,
    };

    const txnRecord: Transaction & { idempotencyKey?: string; netAmount?: number } = {
      id: deterministicTxId,
      reference: cleanRef,
      userId: targetUser.id,
      userEmail: String(targetUser.email || '').slice(0, 160),
      userName: String(targetUser.fullName || 'Account Holder').slice(0, 120),
      type: params.adjustmentType === 'credit' ? 'admin_credit' : 'admin_debit',
      senderOrRecipient: 'UNFCU Treasury Ledger',
      bankName: 'United Nations Federal Credit Union (UNFCU) — Administrator Console',
      accountNumber: 'UNGB-ADMIN-LEDGER',
      amount: numAmount,
      fee: 0,
      netAmount: numAmount,
      total: numAmount,
      previousBalance,
      newBalance,
      adjustedBy: adminIdentity,
      paymentMethod: 'internal',
      paymentStatus: 'confirmed',
      status: 'completed',
      description: `${params.adjustmentType === 'credit' ? 'Credit' : 'Debit'} Adjustment: ${params.reason.trim()}`.slice(0, 380),
      adminNote: `Authorized by ${adminIdentity}.${params.notes ? ' Notes: ' + params.notes.trim() : ''}`.slice(0, 480),
      isSimulated: true,
      createdAt: now,
      updatedAt: now,
      reviewCompletedAt: now,
      ...(cleanIdemKey ? { idempotencyKey: cleanIdemKey.slice(0, 80) } : {}),
    };

    const notifId = cleanIdemKey
      ? sanitizeFirestoreId(`notif_${cleanIdemKey}`)
      : `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const notifRecord: Notification = {
      id: notifId,
      userId: targetUser.id,
      title: (
        params.adjustmentType === 'credit'
          ? `Account Credited — $${numAmount.toFixed(2)} USD`
          : `Account Debited — $${numAmount.toFixed(2)} USD`
      ).slice(0, 200),
      message: `A ${params.adjustmentType} transaction of $${numAmount.toFixed(2)} USD has been successfully recorded in your account. Reference: ${cleanRef}. Previous balance: $${previousBalance.toFixed(2)} USD, New balance: $${newBalance.toFixed(2)} USD. Reason: ${params.reason.trim()}.`.slice(0, 980),
      type: params.adjustmentType === 'credit' ? 'credit' : 'debit',
      read: false,
      createdAt: now,
      reference: cleanRef,
      amount: numAmount,
      templateKey: params.adjustmentType === 'credit' ? 'admin_credit' : 'admin_debit',
      templateParams: {
        amount: numAmount,
        reference: cleanRef,
        previousBalance,
        newBalance,
        reason: params.reason.trim().slice(0, 200),
      },
    };

    const auditId = cleanIdemKey
      ? sanitizeFirestoreId(`audit_${cleanIdemKey}`)
      : `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const auditRecord: AuditLog = {
      id: auditId,
      timestamp: now,
      actorEmail: adminIdentity,
      actorRole: 'admin',
      action: `BALANCE_${params.adjustmentType.toUpperCase()}`,
      targetUserId: targetUser.id,
      targetUserEmail: String(targetUser.email || '').slice(0, 160),
      previousValue: `$${previousBalance.toFixed(2)}`,
      newValue: `$${newBalance.toFixed(2)}`,
      reason: params.reason.trim().slice(0, 380),
      reference: cleanRef,
    };

    // 4. Atomic Commit: Wallet update (or initial create) + Transaction create + Notification create + AuditLog create
    const commitRes = await fetch(`${baseUrl}/documents:commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: fsTxId,
        writes: [
          {
            currentDocument: { exists: walletExistsInFs },
            update: {
              name: `${docsRoot}/wallets/${walletDocId}`,
              fields: toFirestoreFields(updatedWallet),
            },
          },
          {
            currentDocument: { exists: false },
            update: {
              name: `${docsRoot}/transactions/${deterministicTxId}`,
              fields: toFirestoreFields(txnRecord),
            },
          },
          {
            currentDocument: { exists: false },
            update: {
              name: `${docsRoot}/notifications/${notifId}`,
              fields: toFirestoreFields(notifRecord),
            },
          },
          {
            currentDocument: { exists: false },
            update: {
              name: `${docsRoot}/audit_logs/${auditId}`,
              fields: toFirestoreFields(auditRecord),
            },
          },
        ],
      }),
    });

    const commitPayload = await commitRes.json().catch(() => ({}));
    if (!commitRes.ok) {
      await rollbackIfNeeded();
      throw new Error(
        commitPayload?.error?.message || `Atomic Firestore commit failed (${commitRes.status})`
      );
    }

    committed = true;
    return {
      user: targetUser,
      wallet: updatedWallet,
      transaction: txnRecord,
      notification: notifRecord,
      auditLog: auditRecord,
      idempotentReplay: false,
    };
  } catch (err) {
    if (!committed) {
      await fetch(`${baseUrl}/documents:rollback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction: fsTxId }),
      }).catch(() => {});
    }
    throw err;
  }
}

export interface AtomicPaymentSubmissionReviewParams {
  submissionId: string;
  targetStatus: 'pending' | 'verified' | 'rejected';
  adminNote?: string;
  actorEmail?: string;
  bearerToken: string;
  fallbackSubmission?: PaymentSubmission | null;
  fallbackTransaction?: Transaction | null;
}

export interface AtomicPaymentSubmissionReviewResult {
  submission: PaymentSubmission;
  transaction: Transaction | null;
  wallet: Wallet | null;
  notification: Notification | null;
  auditLog: AuditLog | null;
  alreadyProcessed: boolean;
}

export async function fsExecuteAtomicPaymentSubmissionReview(
  params: AtomicPaymentSubmissionReviewParams
): Promise<AtomicPaymentSubmissionReviewResult> {
  const baseUrl = getDatabaseBaseUrl();
  const docsRoot = getDocumentsRootPath();
  const token = await resolveBearerToken(params.bearerToken);
  if (!token) {
    throw new Error('Authentication token is required for Firestore transaction execution.');
  }

  const beginRes = await fetch(`${baseUrl}/documents:beginTransaction`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      options: { readWrite: {} },
    }),
  });

  const beginPayload = await beginRes.json().catch(() => ({}));
  if (!beginRes.ok || !beginPayload.transaction) {
    throw new Error(
      beginPayload?.error?.message || `Failed to begin Firestore transaction (${beginRes.status})`
    );
  }

  const fsTxId: string = beginPayload.transaction;
  let committed = false;

  const rollbackIfNeeded = async () => {
    if (committed) return;
    await fetch(`${baseUrl}/documents:rollback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transaction: fsTxId }),
    }).catch(() => {});
  };

  try {
    const readInTx = async <T>(docName: string): Promise<{ exists: boolean; data: T | null }> => {
      const r = await fetch(`${baseUrl}/documents/${docName}?transaction=${encodeURIComponent(fsTxId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 404) return { exists: false, data: null };
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(body?.error?.message || `Firestore transactional read failed for ${docName}`);
      }
      return { exists: true, data: fromFirestoreFields<T>(body.fields || {}) };
    };

    const subSnap = await readInTx<PaymentSubmission>(
      `payment_submissions/${encodeURIComponent(params.submissionId)}`
    );
    const submissionExistsInFs = Boolean(subSnap.exists && subSnap.data);
    const currentSubmission = subSnap.data || params.fallbackSubmission || null;

    if (!currentSubmission) {
      await rollbackIfNeeded();
      const notFoundErr = new Error('Payment submission not found.');
      (notFoundErr as any).statusCode = 404;
      throw notFoundErr;
    }

    const txnId = currentSubmission.transactionId || params.fallbackTransaction?.id || '';
    let txnExistsInFs = false;
    let currentTxn: Transaction | null = params.fallbackTransaction || null;
    if (txnId) {
      const txnSnap = await readInTx<Transaction>(`transactions/${encodeURIComponent(txnId)}`);
      if (txnSnap.exists && txnSnap.data) {
        txnExistsInFs = true;
        currentTxn = txnSnap.data;
      }
    }

    const userId = currentSubmission.userId;
    let walletDocId = `wallet_${userId}`;
    let walletSnap = await readInTx<Wallet>(`wallets/${encodeURIComponent(walletDocId)}`);
    if (!walletSnap.exists || !walletSnap.data) {
      const qW = await fsQueryByField<Wallet>('wallets', 'userId', userId, token, 1);
      const qDocId = qW.items[0]?.__docId || qW.items[0]?.id;
      if (qDocId) {
        walletDocId = qDocId;
        walletSnap = await readInTx<Wallet>(`wallets/${encodeURIComponent(walletDocId)}`);
      }
    }

    const walletExistsInFs = Boolean(walletSnap.exists && walletSnap.data);
    const currentWallet = walletSnap.data;
    const txType = currentSubmission.transactionType || currentTxn?.type || 'transfer';
    const isDebitType = txType === 'transfer' || txType === 'withdrawal';
    const alreadyDeducted = Boolean(
      currentSubmission.balanceDeducted || currentTxn?.balanceDeducted
    );

    // Double-deduction & silent-reversal guard
    if (alreadyDeducted || currentSubmission.status === 'verified') {
      if (params.targetStatus === 'verified') {
        await rollbackIfNeeded();
        return {
          submission: currentSubmission,
          transaction: currentTxn,
          wallet: currentWallet,
          notification: null,
          auditLog: null,
          alreadyProcessed: true,
        };
      }
      await rollbackIfNeeded();
      const err = new Error(
        `Payment submission ${currentSubmission.reference} has already been verified and settled. Use Balance Adjustment if a manual reversal is required.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    const adminIdentity = (params.actorEmail || AUTHORIZED_ADMIN_EMAIL).slice(0, 160);
    const cleanNote = params.adminNote !== undefined ? params.adminNote.trim().slice(0, 500) : currentSubmission.adminNote;
    const previousStatus = currentSubmission.status;
    const principalAmount = Math.round(Number(currentSubmission.amount || 0) * 100) / 100;

    let updatedWallet: Wallet | null = currentWallet;
    let previousBalance: number | undefined;
    let newBalance: number | undefined;
    let shouldWriteWallet = false;

    const writes: any[] = [];

    if (params.targetStatus === 'verified' && isDebitType && principalAmount > 0) {
      previousBalance = Number(currentWallet?.availableBalance ?? 0);
      if (!walletExistsInFs || previousBalance < principalAmount) {
        await rollbackIfNeeded();
        const insuffErr = new Error(
          `Cannot approve ${txType} of $${principalAmount.toFixed(2)} USD. Available balance in this customer's wallet is only $${previousBalance.toFixed(2)} USD.`
        );
        (insuffErr as any).statusCode = 400;
        throw insuffErr;
      }

      newBalance = Math.round((previousBalance - principalAmount) * 100) / 100;
      updatedWallet = {
        ...(currentWallet as Wallet),
        id: currentWallet?.id || walletDocId,
        userId,
        currency: 'USD',
        availableBalance: newBalance,
        prototypeBalance: newBalance,
        lastUpdated: now,
      };
      shouldWriteWallet = true;

      writes.push({
        currentDocument: { exists: walletExistsInFs },
        update: {
          name: `${docsRoot}/wallets/${walletDocId}`,
          fields: toFirestoreFields(updatedWallet),
        },
      });
    }

    const updatedSubmission: PaymentSubmission = {
      ...currentSubmission,
      status: params.targetStatus,
      updatedAt: now,
      reviewedAt: now,
      reviewedBy: adminIdentity,
      balanceDeducted: params.targetStatus === 'verified' && isDebitType && principalAmount > 0,
      ...(params.targetStatus === 'verified' && isDebitType && principalAmount > 0
        ? { deductedAmount: principalAmount, deductedAt: now }
        : {}),
      ...(cleanNote !== undefined ? { adminNote: cleanNote } : {}),
    };

    writes.push({
      currentDocument: { exists: submissionExistsInFs },
      update: {
        name: `${docsRoot}/payment_submissions/${params.submissionId}`,
        fields: toFirestoreFields(updatedSubmission),
      },
    });

    let updatedTxn: Transaction | null = null;
    if (currentTxn && (txnId || currentTxn.id)) {
      const finalTxnId = txnId || currentTxn.id;
      updatedTxn = {
        ...currentTxn,
        updatedAt: now,
        reviewCompletedAt: now,
        ...(cleanNote ? { adminNote: cleanNote } : {}),
        ...(params.targetStatus === 'verified'
          ? {
              paymentStatus: 'confirmed',
              status: 'completed',
              balanceDeducted: isDebitType && principalAmount > 0,
              ...(isDebitType && principalAmount > 0 ? { deductedAt: now } : {}),
              ...(previousBalance !== undefined ? { previousBalance } : {}),
              ...(newBalance !== undefined ? { newBalance } : {}),
            }
          : params.targetStatus === 'rejected'
          ? {
              paymentStatus: 'rejected',
              status: 'failed',
              balanceDeducted: false,
            }
          : {
              paymentStatus: 'awaiting_review',
              status: 'pending',
              balanceDeducted: false,
            }),
      };

      writes.push({
        currentDocument: { exists: txnExistsInFs },
        update: {
          name: `${docsRoot}/transactions/${finalTxnId}`,
          fields: toFirestoreFields(updatedTxn),
        },
      });
    }

    const notifId = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const auditId = `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const methodLabel = currentSubmission.paymentMethod === 'bitcoin' ? 'Bitcoin' : 'Bank Transfer';

    let notifRecord: Notification;
    let auditRecord: AuditLog;

    if (params.targetStatus === 'verified') {
      const balanceLine =
        shouldWriteWallet && newBalance !== undefined
          ? ` $${principalAmount.toFixed(2)} USD has been deducted from your wallet. Updated available balance: $${newBalance.toFixed(2)} USD.`
          : '';
      notifRecord = {
        id: notifId,
        userId,
        title: 'Payment Verified & Approved',
        message: `Your ${methodLabel} payment (Ref: ${currentSubmission.reference}) for $${principalAmount.toFixed(2)} USD has been verified and approved.${balanceLine}`.slice(0, 980),
        type: 'payment',
        read: false,
        createdAt: now,
        reference: currentSubmission.reference,
        amount: principalAmount,
        templateKey: 'payment_verified',
        templateParams: {
          method: currentSubmission.paymentMethod,
          reference: currentSubmission.reference,
          amount: principalAmount,
        },
      };

      auditRecord = {
        id: auditId,
        timestamp: now,
        actorEmail: adminIdentity,
        actorRole: 'admin',
        action: 'PAYMENT_SUBMISSION_VERIFIED',
        targetUserId: userId,
        targetUserEmail: String(currentSubmission.userEmail || '').slice(0, 160),
        previousValue:
          previousBalance !== undefined ? `$${previousBalance.toFixed(2)}` : previousStatus,
        newValue:
          newBalance !== undefined ? `$${newBalance.toFixed(2)}` : 'verified',
        reason: (cleanNote || `Verified ${txType} receipt and deducted $${principalAmount.toFixed(2)} USD`).slice(0, 380),
        reference: currentSubmission.reference,
      };
    } else if (params.targetStatus === 'rejected') {
      notifRecord = {
        id: notifId,
        userId,
        title: 'Payment Rejected',
        message: `Your ${methodLabel} payment submission (Ref: ${currentSubmission.reference}) was rejected and no funds were deducted from your wallet. Reason: ${cleanNote || 'Payment verification unsuccessful'}.`.slice(0, 980),
        type: 'payment',
        read: false,
        createdAt: now,
        reference: currentSubmission.reference,
        amount: principalAmount,
        templateKey: 'payment_rejected',
        templateParams: {
          method: currentSubmission.paymentMethod,
          reference: currentSubmission.reference,
          reason: (cleanNote || 'Payment verification unsuccessful').slice(0, 200),
        },
      };

      auditRecord = {
        id: auditId,
        timestamp: now,
        actorEmail: adminIdentity,
        actorRole: 'admin',
        action: 'PAYMENT_SUBMISSION_REJECTED',
        targetUserId: userId,
        targetUserEmail: String(currentSubmission.userEmail || '').slice(0, 160),
        previousValue: previousStatus,
        newValue: 'rejected',
        reason: (cleanNote || 'Payment rejected; no wallet deduction applied').slice(0, 380),
        reference: currentSubmission.reference,
      };
    } else {
      notifRecord = {
        id: notifId,
        userId,
        title: 'Payment Status: Pending Verification',
        message: `Your payment submission (Ref: ${currentSubmission.reference}) is pending verification.`.slice(0, 980),
        type: 'payment',
        read: false,
        createdAt: now,
        reference: currentSubmission.reference,
        amount: principalAmount,
        templateKey: 'payment_pending',
        templateParams: { reference: currentSubmission.reference },
      };

      auditRecord = {
        id: auditId,
        timestamp: now,
        actorEmail: adminIdentity,
        actorRole: 'admin',
        action: 'PAYMENT_SUBMISSION_STATUS_PENDING',
        targetUserId: userId,
        targetUserEmail: String(currentSubmission.userEmail || '').slice(0, 160),
        previousValue: previousStatus,
        newValue: 'pending',
        reason: (cleanNote || 'Status set to pending by administrator').slice(0, 380),
        reference: currentSubmission.reference,
      };
    }

    writes.push(
      {
        currentDocument: { exists: false },
        update: {
          name: `${docsRoot}/notifications/${notifId}`,
          fields: toFirestoreFields(notifRecord),
        },
      },
      {
        currentDocument: { exists: false },
        update: {
          name: `${docsRoot}/audit_logs/${auditId}`,
          fields: toFirestoreFields(auditRecord),
        },
      }
    );

    const commitRes = await fetch(`${baseUrl}/documents:commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: fsTxId,
        writes,
      }),
    });

    const commitPayload = await commitRes.json().catch(() => ({}));
    if (!commitRes.ok) {
      await rollbackIfNeeded();
      throw new Error(
        commitPayload?.error?.message || `Atomic Firestore commit failed (${commitRes.status})`
      );
    }

    committed = true;
    return {
      submission: updatedSubmission,
      transaction: updatedTxn,
      wallet: updatedWallet,
      notification: notifRecord,
      auditLog: auditRecord,
      alreadyProcessed: false,
    };
  } catch (err) {
    await rollbackIfNeeded();
    throw err;
  }
}

