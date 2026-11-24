import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  setPersistence,
  browserLocalPersistence,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendEmailVerification as firebaseSendEmailVerification,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  ConfirmationResult,
  ActionCodeSettings,
} from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
  measurementId: firebaseConfigData.measurementId || undefined,
};

// Initialize Firebase App singleton
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with permanent browser-local persistence
export const auth: Auth = getAuth(app);
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase Auth persistence initialization note:', err?.message);
  });
} catch (e) {
  console.warn('Firebase Auth persistence setup note:', e);
}

// Initialize Firestore
export const db: Firestore = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

// Test Firestore connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system_test', 'connection'));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('Firestore client is currently offline or unreachable.');
      return false;
    }
    // Document not existing or permission denied is still a network roundtrip response
    return true;
  }
}

// Dispatch genuine Firebase Authentication password-reset email link
export async function sendFirebasePasswordResetLink(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const origin = typeof window !== 'undefined' ? window.location.origin : `https://${firebaseConfigData.authDomain}`;
  const actionCodeSettings: ActionCodeSettings = {
    url: `${origin}/reset-password`,
    handleCodeInApp: true,
  };
  await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
}

// Re-export common Firebase Auth functions
export {
  setPersistence,
  browserLocalPersistence,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  firebaseSendEmailVerification,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
  firebaseSignOut,
  onAuthStateChanged,
};
export type { FirebaseUser, ConfirmationResult, ActionCodeSettings };
