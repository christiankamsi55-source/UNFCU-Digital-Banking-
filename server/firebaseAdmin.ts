import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

interface AppletFirebaseConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

export interface FirebaseAdminCredentialStatus {
  configured: boolean;
  projectId: string;
  databaseId: string;
  source: 'FIREBASE_SERVICE_ACCOUNT_JSON' | 'GOOGLE_APPLICATION_CREDENTIALS' | 'none';
  reason?: string;
}

export interface FirebaseAuthDeletionResult {
  deleted: boolean;
  userExisted: boolean | null;
  credentialMissing: boolean;
  deletedUid?: string;
  deletedUids?: string[];
  error?: string;
}

export interface FirebaseAuthEmailLookupResult {
  checked: boolean;
  exists: boolean;
  uid?: string;
  emailVerified?: boolean;
  disabled?: boolean;
  error?: string;
}

let cachedConfig: AppletFirebaseConfig | null = null;
let cachedAdminApp: App | null = null;
let cachedCredSource: FirebaseAdminCredentialStatus['source'] = 'none';
let cachedInitReason: string | undefined;
let initAttempted = false;

export function getAppletFirebaseConfig(): AppletFirebaseConfig {
  if (cachedConfig) return cachedConfig;
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as AppletFirebaseConfig;
  if (!parsed.projectId) {
    throw new Error('Missing projectId in firebase-applet-config.json');
  }
  cachedConfig = parsed;
  return cachedConfig;
}

function normalizeServiceAccountObject(parsed: any, envName: string): ServiceAccount & { project_id?: string } {
  if (!parsed || typeof parsed !== 'object' || !parsed.client_email || !parsed.private_key) {
    throw new Error(`${envName} is missing client_email or private_key.`);
  }
  if (typeof parsed.private_key === 'string' && parsed.private_key.includes('\\n')) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

function parseServiceAccountFromEnv(): {
  serviceAccount: ServiceAccount & { project_id?: string };
  source: 'FIREBASE_SERVICE_ACCOUNT_JSON' | 'GOOGLE_APPLICATION_CREDENTIALS';
} | null {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineJson) {
    let rawJson = inlineJson;
    if (
      (rawJson.startsWith("'") && rawJson.endsWith("'")) ||
      (rawJson.startsWith('"') && rawJson.endsWith('"'))
    ) {
      rawJson = rawJson.slice(1, -1).trim();
    }
    if (!rawJson.startsWith('{')) {
      try {
        rawJson = Buffer.from(rawJson, 'base64').toString('utf-8').trim();
      } catch {
        // Leave as-is for JSON.parse error reporting below
      }
    }
    const parsed = JSON.parse(rawJson);
    return {
      serviceAccount: normalizeServiceAccountObject(parsed, 'FIREBASE_SERVICE_ACCOUNT_JSON'),
      source: 'FIREBASE_SERVICE_ACCOUNT_JSON',
    };
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credPath && fs.existsSync(credPath)) {
    const raw = fs.readFileSync(credPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      serviceAccount: normalizeServiceAccountObject(parsed, 'GOOGLE_APPLICATION_CREDENTIALS'),
      source: 'GOOGLE_APPLICATION_CREDENTIALS',
    };
  }

  return null;
}

function ensureAdminApp(): App | null {
  if (cachedAdminApp) return cachedAdminApp;
  if (initAttempted) return cachedAdminApp;
  initAttempted = true;

  const { projectId } = getAppletFirebaseConfig();

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      cachedAdminApp = existingApps[0];
      return cachedAdminApp;
    }

    const found = parseServiceAccountFromEnv();
    if (!found) {
      cachedCredSource = 'none';
      cachedInitReason =
        'No Firebase Admin service account credential is configured in environment (FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS).';
      return null;
    }

    const saProjectId =
      (found.serviceAccount as any).project_id || found.serviceAccount.projectId;
    if (saProjectId && saProjectId !== projectId) {
      cachedCredSource = 'none';
      cachedInitReason = `Configured service account belongs to project "${saProjectId}" instead of "${projectId}".`;
      return null;
    }

    cachedAdminApp = initializeApp({
      credential: cert(found.serviceAccount),
      projectId,
    });
    cachedCredSource = found.source;
    cachedInitReason = undefined;
    return cachedAdminApp;
  } catch (err: any) {
    cachedCredSource = 'none';
    cachedInitReason = err?.message || 'Failed to initialize Firebase Admin SDK.';
    return null;
  }
}

export function getFirebaseAdminCredentialStatus(): FirebaseAdminCredentialStatus {
  const cfg = getAppletFirebaseConfig();
  const app = ensureAdminApp();
  return {
    configured: Boolean(app),
    projectId: cfg.projectId,
    databaseId: cfg.firestoreDatabaseId || '(default)',
    source: app ? cachedCredSource : 'none',
    reason: app ? undefined : cachedInitReason,
  };
}

export function hasFirebaseAdminCredentials(): boolean {
  return Boolean(ensureAdminApp());
}

export async function getFirebaseAdminAccessToken(): Promise<string | null> {
  const app = ensureAdminApp();
  if (!app) return null;
  try {
    const cred = app.options.credential;
    if (!cred) return null;
    const tokenRes = await cred.getAccessToken();
    return tokenRes?.access_token || null;
  } catch {
    return null;
  }
}

export async function verifyFirebaseAdminLiveCapabilities(): Promise<{
  tokenAcquired: boolean;
  authAdminVerified: boolean;
  firestoreAdminVerified: boolean;
  authError?: string;
  firestoreError?: string;
}> {
  const app = ensureAdminApp();
  if (!app) {
    return {
      tokenAcquired: false,
      authAdminVerified: false,
      firestoreAdminVerified: false,
    };
  }

  const accessToken = await getFirebaseAdminAccessToken();
  const tokenAcquired = Boolean(accessToken);

  let authAdminVerified = false;
  let authError: string | undefined;
  try {
    await getAuth(app).getUser('verify_nonexistent_probe_uid');
    authAdminVerified = true;
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      authAdminVerified = true;
    } else {
      authError = err?.message || err?.code || 'Auth Admin verification failed.';
    }
  }

  let firestoreAdminVerified = false;
  let firestoreError: string | undefined;
  if (accessToken) {
    try {
      const cfg = getAppletFirebaseConfig();
      const dbId = cfg.firestoreDatabaseId || '(default)';
      const probeUrl = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${encodeURIComponent(dbId)}/documents/system_test/connection`;
      const res = await fetch(probeUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok || res.status === 404) {
        firestoreAdminVerified = true;
      } else {
        const payload = await res.json().catch(() => ({}));
        firestoreError = payload?.error?.message || `Firestore probe returned ${res.status}`;
      }
    } catch (err: any) {
      firestoreError = err?.message || 'Firestore Admin probe failed.';
    }
  } else {
    firestoreError = 'Failed to acquire OAuth access token from service account credential.';
  }

  return {
    tokenAcquired,
    authAdminVerified,
    firestoreAdminVerified,
    ...(authError ? { authError } : {}),
    ...(firestoreError ? { firestoreError } : {}),
  };
}

/**
 * Checks Firebase Authentication directly by email using Firebase Admin SDK.
 */
export async function checkFirebaseAuthAccountByEmail(
  email: string
): Promise<FirebaseAuthEmailLookupResult> {
  const app = ensureAdminApp();
  if (!app) {
    return {
      checked: false,
      exists: false,
      error: cachedInitReason || 'Firebase Admin SDK credentials are not configured on the server.',
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { checked: true, exists: false };
  }

  try {
    const record = await getAuth(app).getUserByEmail(cleanEmail);
    return {
      checked: true,
      exists: true,
      uid: record.uid,
      emailVerified: Boolean(record.emailVerified),
      disabled: Boolean(record.disabled),
    };
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      return {
        checked: true,
        exists: false,
      };
    }
    return {
      checked: false,
      exists: false,
      error: err?.message || 'Unable to verify email in Firebase Authentication.',
    };
  }
}

/**
 * Deletes a user from Firebase Authentication using Firebase Admin SDK (checking both UID and email).
 * Never claims success if credentials are unavailable or Firebase rejects deletion.
 */
export async function deleteFirebaseAuthUser(
  uid: string,
  email?: string
): Promise<FirebaseAuthDeletionResult> {
  const app = ensureAdminApp();
  if (!app) {
    return {
      deleted: false,
      userExisted: null,
      credentialMissing: true,
      error:
        cachedInitReason ||
        'Firebase Admin SDK credentials are not configured on the server; Firebase Authentication user cannot be deleted automatically.',
    };
  }

  const adminAuth = getAuth(app);
  const cleanEmail = email?.trim().toLowerCase();
  const deletedUids: string[] = [];

  try {
    // 1. Delete by exact UID if present
    if (uid) {
      try {
        await adminAuth.getUser(uid);
        await adminAuth.deleteUser(uid);
        deletedUids.push(uid);
      } catch (errByUid: any) {
        if (errByUid?.code !== 'auth/user-not-found') {
          throw errByUid;
        }
      }
    }

    // 2. Always verify by email so no residual Auth record remains for that email address
    if (cleanEmail) {
      try {
        const byEmail = await adminAuth.getUserByEmail(cleanEmail);
        if (byEmail && !deletedUids.includes(byEmail.uid)) {
          await adminAuth.deleteUser(byEmail.uid);
          deletedUids.push(byEmail.uid);
        }
      } catch (errByEmail: any) {
        if (errByEmail?.code !== 'auth/user-not-found') {
          throw errByEmail;
        }
      }
    }

    return {
      deleted: true,
      userExisted: deletedUids.length > 0,
      credentialMissing: false,
      ...(deletedUids[0] ? { deletedUid: deletedUids[0] } : {}),
      deletedUids,
    };
  } catch (err: any) {
    const code = String(err?.code || '');
    const msg = String(err?.message || 'Firebase Auth deletion failed.');
    const isPermOrCredError =
      code.includes('insufficient-permission') ||
      code.includes('credential') ||
      msg.includes('403') ||
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('Caller does not have required permission');

    return {
      deleted: false,
      userExisted: null,
      credentialMissing: isPermOrCredError,
      error: msg,
    };
  }
}
