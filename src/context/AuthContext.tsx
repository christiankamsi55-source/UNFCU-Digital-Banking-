import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Wallet, SupportedLanguage, Country } from '../types';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../lib/api';
import { DICTIONARY, getTranslations, isRTLLanguage, Translations } from '../lib/i18n';
import { findCountryByCode, COUNTRIES } from '../lib/countries';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSendEmailVerification,
  firebaseSignOut,
  onAuthStateChanged,
} from '../lib/firebase';
import {
  waitForVerifiedAuth,
  saveUserProfileToFirestore,
  getUserProfileFromFirestore,
  getUserProfileWithStatusFromFirestore,
  createInitialWalletInFirestore,
  saveWalletToFirestore,
  getWalletFromFirestore,
  ensureAdminRecordInFirestore,
  saveNotificationToFirestore,
} from '../lib/firebaseStore';

const AUTHORIZED_ADMIN_EMAIL = 'un.department.retirement.unjspf@gmail.com';

function createVerificationRequiredError(message: string): Error {
  const err = new Error(message);
  (err as any).code = 'EMAIL_NOT_VERIFIED';
  return err;
}

interface AuthContextType {
  user: User | null;
  wallet: Wallet | null;
  unreadNotifications: number;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  country: Country;
  countryCode: string;
  setCountryPreference: (country: Country) => void;
  t: Translations;
  isRTL: boolean;
  refreshUserData: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  adminLogin: (email: string, pass: string) => Promise<void>;
  adminRegister: (
    fullName: string,
    email: string,
    pass: string
  ) => Promise<{ verificationRequired?: boolean; email?: string; token?: string; user?: User; wallet?: Wallet }>;
  register: (payload: any) => Promise<void>;
  resendVerificationEmail: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('ungb_language') as SupportedLanguage;
    return saved && DICTIONARY[saved] ? saved : 'en';
  });

  const [countryCode, setCountryCodeState] = useState<string>(() => {
    const saved = localStorage.getItem('ungb_country');
    if (saved) {
      const found = findCountryByCode(saved);
      if (found) return found.code;
    }
    return COUNTRIES[0].code;
  });

  const languageRef = useRef(language);
  languageRef.current = language;
  const authActionInProgressRef = useRef(false);

  const country = findCountryByCode(countryCode);
  const t = getTranslations(language);
  const isRTL = isRTLLanguage(language);

  // Sync document direction and lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    if (isRTL) {
      document.body.classList.add('font-arabic');
    } else {
      document.body.classList.remove('font-arabic');
    }
  }, [language, isRTL]);

  const applyUserPreferences = useCallback((loadedUser: User) => {
    if (loadedUser.language && DICTIONARY[loadedUser.language]) {
      setLanguageState(loadedUser.language as SupportedLanguage);
      localStorage.setItem('ungb_language', loadedUser.language);
    }
    if (loadedUser.countryCode) {
      const matched = findCountryByCode(loadedUser.countryCode);
      setCountryCodeState(matched.code);
      localStorage.setItem('ungb_country', matched.code);
    }
  }, []);

  /**
   * Independent Language Setter:
   * Immediately updates the entire UI language & persists to localStorage + Firestore + Backend
   * WITHOUT altering the user's selected country/region or USD ledger balance.
   */
  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      if (!DICTIONARY[lang]) return;
      setLanguageState(lang);
      localStorage.setItem('ungb_language', lang);
      if (user) {
        const now = new Date().toISOString();
        const updatedUser: User = { ...user, language: lang, updatedAt: now };
        setUser(updatedUser);
        api.updateProfile({ language: lang }).catch(() => {});
        saveUserProfileToFirestore(updatedUser).catch(() => {});
      }
    },
    [user]
  );

  /**
   * Independent Country/Region Setter:
   * Immediately updates dialing code, region & formatting locale
   * WITHOUT altering language selection or currency ledger values.
   */
  const setCountryPreference = useCallback(
    (nextCountry: Country) => {
      setCountryCodeState(nextCountry.code);
      localStorage.setItem('ungb_country', nextCountry.code);
      if (user) {
        const now = new Date().toISOString();
        const updatedUser: User = {
          ...user,
          country: nextCountry.name,
          countryCode: nextCountry.code,
          dialingCode: nextCountry.dialCode,
          updatedAt: now,
        };
        setUser(updatedUser);
        api
          .updateProfile({
            country: nextCountry.name,
            countryCode: nextCountry.code,
            dialingCode: nextCountry.dialCode,
          })
          .catch(() => {});
        saveUserProfileToFirestore(updatedUser).catch(() => {});
      }
    },
    [user]
  );

  // Unified refresh routine
  const refreshUserData = useCallback(async () => {
    await auth.authStateReady();
    const token = getStoredToken();
    const fbUser = auth.currentUser;

    if (!token && !fbUser) {
      setUser(null);
      setWallet(null);
      setIsLoading(false);
      return;
    }

    try {
      if (fbUser) {
        try {
          await fbUser.reload();
        } catch (reloadErr: any) {
          const reloadCode = reloadErr?.code || '';
          if (
            reloadCode === 'auth/user-not-found' ||
            reloadCode === 'auth/user-token-expired' ||
            reloadCode === 'auth/invalid-user-token' ||
            reloadCode === 'auth/user-disabled'
          ) {
            try {
              await firebaseSignOut(auth);
            } catch {}
            clearStoredToken();
            setUser(null);
            setWallet(null);
            setIsLoading(false);
            return;
          }
        }

        const activeFbUser = auth.currentUser || fbUser;
        if (!activeFbUser.emailVerified) {
          clearStoredToken();
          setUser(null);
          setWallet(null);
          setIsLoading(false);
          return;
        }

        await waitForVerifiedAuth(true);
        const firebaseIdToken = await activeFbUser.getIdToken(true);

        const [fsUserRes, fsWallet] = await Promise.all([
          getUserProfileWithStatusFromFirestore(activeFbUser.uid),
          getWalletFromFirestore(activeFbUser.uid).catch(() => null),
        ]);

        if (fsUserRes.status === 'permission_denied') {
          console.error('Firestore profile permission error during refreshUserData:', fsUserRes.error);
        }

        const fsUser = fsUserRes.user;
        const res = await api.firebaseSync({
          firebaseIdToken,
          uid: activeFbUser.uid,
          email: activeFbUser.email || '',
          firestoreProfile: fsUser || undefined,
          firestoreWallet: fsWallet || undefined,
        });
        setStoredToken(res.token);
        setUser(res.user);
        setWallet(res.wallet);
        setUnreadNotifications(res.unreadNotifications || 0);

        applyUserPreferences(res.user);

        saveUserProfileToFirestore(res.user).catch((err) =>
          console.warn('Firestore profile sync note:', err)
        );
        if (res.wallet) {
          if (!fsWallet) {
            createInitialWalletInFirestore(res.wallet).catch((err) =>
              console.warn('Firestore initial wallet sync note:', err)
            );
          }
          if (res.user.role === 'admin') {
            saveWalletToFirestore(res.wallet).catch(() => {});
          }
        }
      } else if (token) {
        const res = await api.getCurrentUser();
        setUser(res.user);
        setWallet(res.wallet);
        setUnreadNotifications(res.unreadNotifications || 0);
        applyUserPreferences(res.user);
      }
    } catch (err: any) {
      const errCode = err?.code;
      if (errCode === 'PROFILE_MISSING_FOR_AUTH_USER' || errCode === 'ACCOUNT_NOT_FOUND') {
        clearStoredToken();
        setUser(null);
        setWallet(null);
        setIsLoading(false);
        return;
      }

      if (auth.currentUser && auth.currentUser.emailVerified) {
        try {
          await waitForVerifiedAuth(true);
          const firebaseIdToken = await auth.currentUser.getIdToken(true);
          const [fsUser, fsWallet] = await Promise.all([
            getUserProfileFromFirestore(auth.currentUser.uid).catch(() => null),
            getWalletFromFirestore(auth.currentUser.uid).catch(() => null),
          ]);
          const res = await api.firebaseSync({
            firebaseIdToken,
            uid: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            firestoreProfile: fsUser || undefined,
            firestoreWallet: fsWallet || undefined,
          });
          setStoredToken(res.token);
          setUser(res.user);
          setWallet(res.wallet);
          setUnreadNotifications(res.unreadNotifications || 0);
          applyUserPreferences(res.user);
          return;
        } catch {}
      }
      clearStoredToken();
      setUser(null);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  }, [applyUserPreferences]);

  // Permanent Firebase Auth Lifecycle Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (authActionInProgressRef.current) {
        return;
      }

      if (fbUser) {
        try {
          try {
            await fbUser.reload();
          } catch (reloadErr: any) {
            const reloadCode = reloadErr?.code || '';
            if (
              reloadCode === 'auth/user-not-found' ||
              reloadCode === 'auth/user-token-expired' ||
              reloadCode === 'auth/invalid-user-token' ||
              reloadCode === 'auth/user-disabled'
            ) {
              try {
                await firebaseSignOut(auth);
              } catch {}
              clearStoredToken();
              setUser(null);
              setWallet(null);
              setIsLoading(false);
              return;
            }
          }

          const activeFbUser = auth.currentUser || fbUser;
          if (!activeFbUser.emailVerified) {
            clearStoredToken();
            setUser(null);
            setWallet(null);
            setIsLoading(false);
            return;
          }

          await waitForVerifiedAuth(true);
          const firebaseIdToken = await activeFbUser.getIdToken(true);
          const [fsUserRes, fsWallet] = await Promise.all([
            getUserProfileWithStatusFromFirestore(activeFbUser.uid),
            getWalletFromFirestore(activeFbUser.uid).catch(() => null),
          ]);

          if (fsUserRes.status === 'permission_denied') {
            console.error('Firestore profile permission error in auth listener:', fsUserRes.error);
          }

          const fsUser = fsUserRes.user;
          const syncRes = await api.firebaseSync({
            firebaseIdToken,
            uid: activeFbUser.uid,
            email: activeFbUser.email || '',
            firestoreProfile: fsUser || undefined,
            firestoreWallet: fsWallet || undefined,
          });
          setStoredToken(syncRes.token);
          setUser(syncRes.user);
          setWallet(syncRes.wallet);
          setUnreadNotifications(syncRes.unreadNotifications || 0);

          applyUserPreferences(syncRes.user);

          saveUserProfileToFirestore(syncRes.user).catch((err) =>
            console.warn('Firestore profile sync note:', err)
          );
          if (syncRes.wallet) {
            if (!fsWallet) {
              createInitialWalletInFirestore(syncRes.wallet).catch((err) =>
                console.warn('Firestore initial wallet sync note:', err)
              );
            }
            if (syncRes.user.role === 'admin') {
              saveWalletToFirestore(syncRes.wallet).catch(() => {});
            }
          }
          if (syncRes.user.role === 'admin') {
            ensureAdminRecordInFirestore(syncRes.user.id).catch(() => {});
          }
        } catch (syncErr: any) {
          const syncCode = syncErr?.code;
          if (syncCode === 'PROFILE_MISSING_FOR_AUTH_USER' || syncCode === 'ACCOUNT_NOT_FOUND') {
            console.warn('Firebase session sync notice:', syncErr?.message || syncCode);
            clearStoredToken();
            setUser(null);
            setWallet(null);
            return;
          }

          console.warn('Firebase session sync note:', syncErr);
          const activeFbUser = auth.currentUser || fbUser;
          if (activeFbUser.emailVerified) {
            try {
              const firestoreUser = await getUserProfileFromFirestore(activeFbUser.uid);
              const firestoreWallet = await getWalletFromFirestore(activeFbUser.uid);
              if (firestoreUser) {
                setUser(firestoreUser);
                applyUserPreferences(firestoreUser);
                if (firestoreWallet) setWallet(firestoreWallet);
              }
            } catch {}
          } else {
            clearStoredToken();
            setUser(null);
            setWallet(null);
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        const token = getStoredToken();
        if (token) {
          try {
            const res = await api.getCurrentUser();
            setUser(res.user);
            setWallet(res.wallet);
            setUnreadNotifications(res.unreadNotifications || 0);
            applyUserPreferences(res.user);
          } catch {
            clearStoredToken();
            setUser(null);
            setWallet(null);
          } finally {
            setIsLoading(false);
          }
        } else {
          setUser(null);
          setWallet(null);
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [applyUserPreferences]);

  // Resend verification email
  const resendVerificationEmail = async (email?: string, password?: string) => {
    let targetUser = auth.currentUser;
    if ((!targetUser || (email && targetUser.email?.toLowerCase() !== email.trim().toLowerCase())) && email && password) {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      targetUser = cred.user;
    }
    if (!targetUser) {
      throw new Error(getTranslations(languageRef.current).errors.fillRequiredFields);
    }
    await targetUser.reload();
    const active = auth.currentUser || targetUser;
    if (active.emailVerified) {
      return;
    }
    await firebaseSendEmailVerification(active);
  };

  // Standard User Login (strictly registered accounts only)
  const login = async (email: string, pass: string) => {
    authActionInProgressRef.current = true;
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const curT = getTranslations(languageRef.current);
    try {
      let fbUserUid: string;
      let firebaseIdToken: string;

      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        await cred.user.reload();
        const activeFbUser = auth.currentUser || cred.user;
        if (!activeFbUser.emailVerified) {
          throw createVerificationRequiredError(curT.errors.emailNotVerified);
        }
        await waitForVerifiedAuth(true);
        fbUserUid = activeFbUser.uid;
        firebaseIdToken = await activeFbUser.getIdToken(true);
      } catch (fbErr: any) {
        if (fbErr?.code === 'EMAIL_NOT_VERIFIED') {
          throw fbErr;
        }
        if (fbErr?.code === 'auth/too-many-requests') {
          throw new Error(curT.errors.tooManyRequests);
        }
        if (fbErr?.code === 'auth/user-disabled') {
          throw new Error(curT.errors.userDisabled);
        }
        if (fbErr?.code === 'auth/invalid-email') {
          throw new Error(curT.errors.invalidEmail);
        }
        if (fbErr?.code === 'auth/user-not-found') {
          const notFoundErr = new Error(curT.errors.noAccountFound);
          (notFoundErr as any).code = 'ACCOUNT_NOT_FOUND';
          throw notFoundErr;
        }
        if (fbErr?.code === 'auth/wrong-password') {
          throw new Error(curT.errors.invalidCredentials);
        }
        if (fbErr?.code === 'auth/invalid-credential') {
          try {
            await api.login({ email: cleanEmail, password: '' });
          } catch (probeErr: any) {
            if (probeErr?.code === 'ACCOUNT_NOT_FOUND') {
              const notFoundErr = new Error(curT.errors.noAccountFound);
              (notFoundErr as any).code = 'ACCOUNT_NOT_FOUND';
              throw notFoundErr;
            }
          }
          throw new Error(curT.errors.invalidCredentials);
        }
        throw new Error(fbErr?.message || curT.errors.invalidCredentials);
      }

      const [fsProfileRes, fsWallet] = await Promise.all([
        getUserProfileWithStatusFromFirestore(fbUserUid),
        getWalletFromFirestore(fbUserUid).catch(() => null),
      ]);

      if (fsProfileRes.status === 'permission_denied') {
        console.error('Firestore profile read permission error during login:', fsProfileRes.error);
      }

      let res: { token: string; user: any; wallet: any };
      try {
        res = await api.login({
          email: cleanEmail,
          password: pass,
          uid: fbUserUid,
          firebaseIdToken,
          firestoreProfile: fsProfileRes.user || undefined,
          firestoreWallet: fsWallet || undefined,
        });
      } catch (backendErr: any) {
        if (
          backendErr?.code === 'ACCOUNT_NOT_FOUND' ||
          backendErr?.code === 'PROFILE_MISSING_FOR_AUTH_USER'
        ) {
          clearStoredToken();
          try {
            await firebaseSignOut(auth);
          } catch {}
        }
        throw backendErr;
      }

      setStoredToken(res.token);
      setUser(res.user);
      setWallet(res.wallet);

      applyUserPreferences(res.user);

      if (res.user && fbUserUid) {
        saveUserProfileToFirestore(res.user).catch((err) =>
          console.warn('Firestore profile sync note:', err)
        );
      }
      if (res.wallet && fbUserUid) {
        if (!fsWallet) {
          createInitialWalletInFirestore(res.wallet).catch((err) =>
            console.warn('Firestore initial wallet sync note:', err)
          );
        }
        if (res.user.role === 'admin') {
          saveWalletToFirestore(res.wallet).catch(() => {});
        }
      }
    } finally {
      authActionInProgressRef.current = false;
      setIsLoading(false);
    }
  };

  // Administrator Login
  const adminLogin = async (email: string, pass: string) => {
    authActionInProgressRef.current = true;
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const curT = getTranslations(languageRef.current);
    try {
      if (cleanEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
        throw new Error(curT.errors.adminRestricted);
      }

      let fbUserUid: string;
      let firebaseIdToken: string;

      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        await cred.user.reload();
        const activeFbUser = auth.currentUser || cred.user;
        if (!activeFbUser.emailVerified) {
          throw createVerificationRequiredError(curT.errors.emailNotVerified);
        }
        await waitForVerifiedAuth(true);
        fbUserUid = activeFbUser.uid;
        firebaseIdToken = await activeFbUser.getIdToken(true);
      } catch (fbErr: any) {
        if (fbErr?.code === 'EMAIL_NOT_VERIFIED') {
          throw fbErr;
        }
        if (fbErr?.code === 'auth/too-many-requests') {
          throw new Error(curT.errors.tooManyRequests);
        }
        if (fbErr?.code === 'auth/user-not-found') {
          throw new Error(curT.errors.noAccountFound);
        }
        if (fbErr?.code === 'auth/invalid-credential') {
          try {
            await api.adminLogin({ email: cleanEmail, password: '' });
          } catch (probeErr: any) {
            if (probeErr?.code === 'ACCOUNT_NOT_FOUND') {
              throw new Error(curT.errors.noAccountFound);
            }
          }
          throw new Error(curT.errors.invalidCredentials);
        }
        throw new Error(fbErr?.message || curT.errors.invalidCredentials);
      }

      const [fsProfileRes, fsWallet] = await Promise.all([
        getUserProfileWithStatusFromFirestore(fbUserUid),
        getWalletFromFirestore(fbUserUid).catch(() => null),
      ]);

      const res = await api.adminLogin({
        email: cleanEmail,
        password: pass,
        uid: fbUserUid,
        firebaseIdToken,
        firestoreProfile: fsProfileRes.user || undefined,
        firestoreWallet: fsWallet || undefined,
      });

      setStoredToken(res.token);
      setUser(res.user);
      setWallet(res.wallet);
      applyUserPreferences(res.user);

      if (res.user && fbUserUid) {
        saveUserProfileToFirestore(res.user).catch(() => {});
        ensureAdminRecordInFirestore(res.user.id).catch(() => {});
      }
      if (res.wallet && fbUserUid) {
        if (!fsWallet) {
          createInitialWalletInFirestore(res.wallet).catch(() => {});
        }
        saveWalletToFirestore(res.wallet).catch(() => {});
      }
    } finally {
      authActionInProgressRef.current = false;
      setIsLoading(false);
    }
  };

  // Administrator Registration
  const adminRegister = async (fullName: string, email: string, pass: string) => {
    authActionInProgressRef.current = true;
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const curT = getTranslations(languageRef.current);
    try {
      if (cleanEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
        throw new Error(curT.errors.adminRestricted);
      }

      let activeFbUser = auth.currentUser;
      if (!activeFbUser || activeFbUser.email?.toLowerCase() !== cleanEmail) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
          activeFbUser = cred.user;
        } catch (fbCreateErr: any) {
          if (fbCreateErr?.code === 'auth/email-already-in-use') {
            try {
              const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
              activeFbUser = cred.user;
            } catch {
              throw new Error(curT.errors.emailInUse);
            }
          } else {
            throw fbCreateErr;
          }
        }
      }

      await activeFbUser.reload();
      activeFbUser = auth.currentUser || activeFbUser;

      if (!activeFbUser.emailVerified) {
        try {
          await firebaseSendEmailVerification(activeFbUser);
        } catch {}
        return { verificationRequired: true, email: cleanEmail };
      }

      await waitForVerifiedAuth(true);
      const firebaseIdToken = await activeFbUser.getIdToken(true);
      const res = await api.adminRegister({
        fullName,
        email: cleanEmail,
        password: pass,
        uid: activeFbUser.uid,
        firebaseIdToken,
      });

      setStoredToken(res.token);
      setUser(res.user);
      setWallet(res.wallet);

      if (res.user) {
        await saveUserProfileToFirestore(res.user).catch((err) =>
          console.warn('Firestore admin profile write warning:', err)
        );
        await ensureAdminRecordInFirestore(res.user.id).catch(() => {});
      }
      if (res.wallet) {
        await createInitialWalletInFirestore(res.wallet).catch(() => {});
        await saveWalletToFirestore(res.wallet).catch(() => {});
      }
      return res;
    } finally {
      authActionInProgressRef.current = false;
      setIsLoading(false);
    }
  };

  // Standard User Registration
  const register = async (payload: any) => {
    authActionInProgressRef.current = true;
    setIsLoading(true);
    const cleanEmail = payload.email.trim().toLowerCase();
    const curT = getTranslations(languageRef.current);
    try {
      let activeFbUser = auth.currentUser;
      if (!activeFbUser || activeFbUser.email?.toLowerCase() !== cleanEmail) {
        throw createVerificationRequiredError(curT.errors.emailNotVerified);
      }

      await activeFbUser.reload();
      activeFbUser = auth.currentUser || activeFbUser;

      if (!activeFbUser.emailVerified) {
        throw createVerificationRequiredError(curT.errors.emailNotVerified);
      }

      await waitForVerifiedAuth(true);
      const firebaseIdToken = await activeFbUser.getIdToken(true);

      const res = await api.register({
        ...payload,
        email: cleanEmail,
        uid: activeFbUser.uid,
        firebaseIdToken,
      });

      if (res.user) {
        await saveUserProfileToFirestore(res.user);
      }
      if (res.wallet) {
        await createInitialWalletInFirestore(res.wallet);
      }
      if (res.notification) {
        saveNotificationToFirestore(res.notification).catch((err) =>
          console.warn('Welcome notification sync warning:', err)
        );
      }

      setStoredToken(res.token);
      setUser(res.user);
      setWallet(res.wallet);
      applyUserPreferences(res.user);
    } finally {
      authActionInProgressRef.current = false;
      setIsLoading(false);
    }
  };

  // Safe Logout
  const logout = async () => {
    authActionInProgressRef.current = true;
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      try {
        await firebaseSignOut(auth);
      } catch {}
      clearStoredToken();
      setUser(null);
      setWallet(null);
      authActionInProgressRef.current = false;
    }
  };

  const isAuthorizedEmail = (e?: string | null) => {
    if (!e) return false;
    const clean = e.trim().toLowerCase();
    return clean === AUTHORIZED_ADMIN_EMAIL.toLowerCase();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        unreadNotifications,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin' && isAuthorizedEmail(user?.email),
        isLoading,
        language,
        setLanguage,
        country,
        countryCode,
        setCountryPreference,
        t,
        isRTL,
        refreshUserData,
        login,
        adminLogin,
        adminRegister,
        register,
        resendVerificationEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
