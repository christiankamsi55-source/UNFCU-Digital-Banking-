#!/usr/bin/env node
/**
 * Authorized Firebase Authentication & Cloud Firestore Account Cleanup Script
 *
 * Deletes the 8 authorized obsolete test accounts and their associated Firestore
 * records without modifying Firebase configuration, security rules, or settings.
 *
 * Usage (requires a Firebase Service Account JSON with Firebase Auth Admin + Cloud Datastore User roles):
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/cleanup-firebase-accounts.mjs --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/cleanup-firebase-accounts.mjs --execute
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TARGET_EMAILS = [
  'un.department.retirement.unjspf@gmail.com',
  'kamsikamsi392@gmail.com',
  'cchristiankamsi55@gmail.com',
  'demo.client@ungoldchase.bank',
  'returning.client@gmail.com',
  'victoria.sterling@prestige.org',
  'marie.curie@gmail.com',
  'kamsi.permanent@ungoldchase.bank',
];

const KNOWN_LEGACY_UIDS = [
  'user_admin_01',
  'user_demo_01',
  'user_1793270255069_ea3621',
  'user_1793705943827_a7e9fd',
  'user_1793724186168_9b25c2',
  'i5I2bIHmnrY60U6JQ9HKnjZDW442',
  'uid_kamsi_permanent_001',
  'firebase_uid_client_8899',
  // Orphan test IDs referenced in historical notifications
  'user_1793814272423_e863c3',
  'user_1793452661182_4fcd26',
  'user_1793355445761_9f233b',
];

const EXECUTE = process.argv.includes('--execute');

function loadConfig() {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  if (!cfg.projectId || !cfg.firestoreDatabaseId) {
    throw new Error('Missing projectId or firestoreDatabaseId in firebase-applet-config.json');
  }
  return cfg;
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
    return JSON.parse(fs.readFileSync(credPath, 'utf-8'));
  }
  throw new Error(
    'No service account credentials provided. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.'
  );
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64Url(
    JSON.stringify({
      iss: sa.client_email,
      scope: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/identitytoolkit',
        'https://www.googleapis.com/auth/datastore',
      ].join(' '),
      aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );

  const signingInput = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = base64Url(signer.sign(sa.private_key));
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Failed to obtain Google OAuth2 access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

function unwrapField(val) {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  return undefined;
}

async function listCollectionDocs(baseDocsUrl, collectionName, token) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${baseDocsUrl}/${collectionName}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Firestore list failed for ${collectionName}: ${JSON.stringify(data)}`);
    }
    if (Array.isArray(data.documents)) {
      docs.push(...data.documents);
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function deleteFirestoreDoc(docName, token) {
  const res = await fetch(`https://firestore.googleapis.com/v1/${docName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed deleting Firestore document ${docName}: ${res.status} ${text}`);
  }
}

async function main() {
  const { projectId, firestoreDatabaseId } = loadConfig();
  const sa = loadServiceAccount();
  const token = await getAccessToken(sa);

  console.log(`Mode: ${EXECUTE ? 'EXECUTE (PERMANENT DELETION)' : 'DRY RUN (no changes)'}`);
  console.log(`Project: ${projectId} | Firestore DB: ${firestoreDatabaseId}`);

  // 1. Lookup Auth users by email
  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: TARGET_EMAILS }),
    }
  );
  const lookupData = await lookupRes.json();
  if (!lookupRes.ok) {
    throw new Error(`Identity Toolkit lookup failed: ${JSON.stringify(lookupData)}`);
  }

  const foundAuthUsers = Array.isArray(lookupData.users) ? lookupData.users : [];
  const targetUidSet = new Set(KNOWN_LEGACY_UIDS);
  const targetEmailSet = new Set(TARGET_EMAILS.map((e) => e.toLowerCase()));

  for (const u of foundAuthUsers) {
    if (u.localId) targetUidSet.add(u.localId);
    console.log(`[Auth Found] ${u.email} (UID: ${u.localId}, emailVerified: ${Boolean(u.emailVerified)})`);
  }

  if (foundAuthUsers.length === 0) {
    console.log('[Auth] No matching users found in Firebase Authentication.');
  } else if (EXECUTE) {
    for (const u of foundAuthUsers) {
      const delRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ localId: u.localId }),
        }
      );
      const delData = await delRes.json();
      if (!delRes.ok) {
        throw new Error(`Failed to delete Firebase Auth user ${u.email} (${u.localId}): ${JSON.stringify(delData)}`);
      }
      console.log(`[Auth DELETED] ${u.email} (UID: ${u.localId})`);
    }
  }

  // 2. Scan and delete matching Firestore documents
  const baseDocsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${firestoreDatabaseId}/documents`;
  const collectionsToClean = ['users', 'wallets', 'transactions', 'notifications', 'payment_submissions', 'admins'];

  for (const col of collectionsToClean) {
    const docs = await listCollectionDocs(baseDocsUrl, col, token);
    let matchedCount = 0;

    for (const doc of docs) {
      const docId = doc.name.split('/').pop();
      const fields = doc.fields || {};
      const uidCandidates = [
        docId,
        unwrapField(fields.id),
        unwrapField(fields.uid),
        unwrapField(fields.userId),
      ]
        .filter(Boolean)
        .map(String);

      const emailCandidates = [unwrapField(fields.email), unwrapField(fields.userEmail)]
        .filter(Boolean)
        .map((v) => String(v).trim().toLowerCase());

      const matchesUid = uidCandidates.some((id) => targetUidSet.has(id));
      const matchesEmail = emailCandidates.some((e) => targetEmailSet.has(e));

      if (matchesUid || matchesEmail) {
        matchedCount++;
        console.log(`[Firestore Match] ${col}/${docId}`);

        if (col === 'payment_submissions') {
          const receipts = await listCollectionDocs(`${baseDocsUrl}/payment_submissions/${docId}`, 'receipts', token).catch(() => []);
          for (const r of receipts) {
            console.log(`  [Firestore Match Subdoc] ${r.name.split('/documents/')[1]}`);
            if (EXECUTE) {
              await deleteFirestoreDoc(r.name, token);
              console.log(`  [Firestore DELETED Subdoc] ${r.name.split('/documents/')[1]}`);
            }
          }
        }

        if (EXECUTE) {
          await deleteFirestoreDoc(doc.name, token);
          console.log(`[Firestore DELETED] ${col}/${docId}`);
        }
      }
    }

    console.log(`[Firestore Summary] ${col}: ${matchedCount} matched out of ${docs.length} scanned.`);
  }
}

main().catch((err) => {
  console.error('Cleanup error:', err.message);
  process.exit(1);
});
