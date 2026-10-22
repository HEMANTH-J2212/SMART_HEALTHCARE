import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  UserCredential,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

/**
 * Primary Smart Health Management Firebase Auth Config (`smart-health-management-6cc87`).
 * Shows "to continue to smart-health-management-6cc87.firebaseapp.com" (or "Smart Health Management"
 * once configured in Google Cloud OAuth Consent Screen) in the Google Account Chooser popup.
 */
export const smartHealthFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAVGPBcs1vf4VBzvxcsxkHla6z-JFxrvq4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smart-health-management-6cc87.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smart-health-management-6cc87",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smart-health-management-6cc87.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "988544351643",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:988544351643:web:ae1a08925a0716d012753e"
};

/**
 * Provisioned AI Studio Firebase Configuration loaded from `firebase-applet-config.json`.
 * Used for Cloud Firestore (`ai-studio-smarthealthmanag-a9377bd3-31c0-4b17-bacd-4c37880f767d`)
 * and as an automatic production Auth fallback if a custom/published domain has not yet been
 * added to `smart-health-management-6cc87`'s Authorized Domains list.
 */
export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || smartHealthFirebaseConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain || smartHealthFirebaseConfig.authDomain,
  projectId: firebaseAppletConfig.projectId || smartHealthFirebaseConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket || smartHealthFirebaseConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId || smartHealthFirebaseConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId || smartHealthFirebaseConfig.appId,
  measurementId: firebaseAppletConfig.measurementId || '',
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId
};

export const AUTHORIZED_PRODUCTION_DOMAINS = [
  'shm-systems.ai.studio',
  'shm-systems-818844908041.asia-southeast1.run.app',
  'ais-dev-agnngcgcncmh4v642hscyo-369323863521.asia-east1.run.app',
  'ais-pre-agnngcgcncmh4v642hscyo-369323863521.asia-east1.run.app',
  'ais-mob-agnngcgcncmh4v642hscyo-369323863521.asia-east1.run.app',
  'smart-health-management-6cc87.firebaseapp.com',
  'smart-health-management-6cc87.web.app',
  'total-freedom-z48x0.firebaseapp.com',
  'total-freedom-z48x0.web.app',
  'localhost'
];

// 1. Initialize Primary Firebase App (connected to provisioned Firestore database)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Branded Smart Health Management Auth App (`smart-health-management-6cc87`)
const SMART_HEALTH_AUTH_APP_NAME = 'smart-health-management-auth';
const smartHealthApp =
  getApps().find((a) => a.name === SMART_HEALTH_AUTH_APP_NAME) ||
  initializeApp(smartHealthFirebaseConfig, SMART_HEALTH_AUTH_APP_NAME);

// 3. Initialize Firebase Authentication instances
export const auth = getAuth(app);
export const smartHealthAuth = getAuth(smartHealthApp);

// 4. Initialize Firebase Cloud Firestore with provisioned database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Track live Authorized Domains for `smart-health-management-6cc87`
let smartHealthAuthorizedDomains: string[] = [
  'localhost',
  'smart-health-management-6cc87.firebaseapp.com',
  'smart-health-management-6cc87.web.app',
  'ais-pre-agnngcgcncmh4v642hscyo-369323863521.asia-east1.run.app',
  'ais-dev-agnngcgcncmh4v642hscyo-369323863521.asia-east1.run.app'
];

function doesDomainMatchList(hostname: string, domains: string[]): boolean {
  const cleanHost = hostname.trim().toLowerCase();
  return domains.some((d) => {
    const cleanDomain = d.trim().toLowerCase();
    return cleanHost === cleanDomain || cleanHost.endsWith(`.${cleanDomain}`);
  });
}

/**
 * Fetches the live `authorizedDomains` list for `smart-health-management-6cc87` directly
 * from Google Identity Toolkit so that as soon as `shm-systems.ai.studio` is added in the
 * Firebase Console (`smart-health-management-6cc87` > Authentication > Settings > Authorized domains),
 * Google Sign-In automatically uses `smart-health-management-6cc87.firebaseapp.com` without
 * requiring a code rebuild.
 */
export async function refreshSmartHealthAuthorizedDomains(): Promise<string[]> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${smartHealthFirebaseConfig.apiKey}`
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.authorizedDomains) && data.authorizedDomains.length > 0) {
        smartHealthAuthorizedDomains = data.authorizedDomains;
      }
    }
  } catch {
    // Keep cached list if offline
  }
  return smartHealthAuthorizedDomains;
}

// Validate connection to Firestore and pre-fetch live authorized domains on boot
async function testConnection() {
  refreshSmartHealthAuthorizedDomains();
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      refreshSmartHealthAuthorizedDomains();
    });
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// 5. Configure GoogleAuthProvider to force the real Google account selector popup
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function getFirebaseAuthorizedDomainsConsoleUrl(
  projectId: string = smartHealthFirebaseConfig.projectId
): string {
  return `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
}

/**
 * Verifies whether the current browser hostname is in the Firebase project's
 * Authorized Domains list.
 */
export function isCurrentDomainAuthorized(): {
  hostname: string;
  origin: string;
  isAuthorized: boolean;
  isSmartHealthBrandAuthorized: boolean;
  projectId: string;
} {
  const hostname =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : 'shm-systems.ai.studio';
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://shm-systems.ai.studio';
  const isSmartHealthBrandAuthorized = doesDomainMatchList(hostname, smartHealthAuthorizedDomains);
  const isAuthorized =
    isSmartHealthBrandAuthorized ||
    AUTHORIZED_PRODUCTION_DOMAINS.some(
      (d) => d === hostname || hostname.endsWith('.ai.studio') || hostname.endsWith('.run.app')
    );
  return {
    hostname,
    origin,
    isAuthorized,
    isSmartHealthBrandAuthorized,
    projectId: isSmartHealthBrandAuthorized
      ? smartHealthFirebaseConfig.projectId
      : firebaseConfig.projectId
  };
}

/**
 * Executes real Google Sign-In using Firebase's standard `signInWithPopup(auth, provider)`
 * (opens https://accounts.google.com/v3/signin/accountchooser).
 *
 * Priority order:
 * 1. If the current hostname is authorized in `smart-health-management-6cc87` (checked live on boot),
 *    uses `smartHealthAuth` so the popup displays `smart-health-management-6cc87.firebaseapp.com`
 *    (or "Smart Health Management").
 * 2. If the current hostname (e.g. `shm-systems.ai.studio`) is not yet added to `smart-health-management-6cc87`
 *    in Firebase Console, automatically uses `auth` (`firebase-applet-config.json`) so the popup
 *    still opens on the first click without failing.
 */
export async function signInWithGooglePopup(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const currentHost =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : 'shm-systems.ai.studio';

  const useSmartHealthPrimary = doesDomainMatchList(currentHost, smartHealthAuthorizedDomains);
  const primaryAuth = useSmartHealthPrimary ? smartHealthAuth : auth;
  const secondaryAuth = useSmartHealthPrimary ? auth : smartHealthAuth;

  try {
    return await signInWithPopup(primaryAuth, provider);
  } catch (err: any) {
    const code = err?.code || '';
    const msg = err?.message || '';

    if (
      code === 'auth/unauthorized-domain' ||
      msg.includes('auth/unauthorized-domain')
    ) {
      try {
        return await signInWithPopup(secondaryAuth, provider);
      } catch (fallbackErr: any) {
        const fbCode = fallbackErr?.code || '';
        const fbMsg = fallbackErr?.message || '';
        if (
          fbCode === 'auth/unauthorized-domain' ||
          fbMsg.includes('auth/unauthorized-domain')
        ) {
          const domainErr: any = new Error(
            `Domain "${currentHost}" is not yet added to your Firebase Console Authorized Domains list.`
          );
          domainErr.code = 'auth/unauthorized-domain';
          domainErr.unauthorizedDomain = currentHost;
          domainErr.consoleUrl = getFirebaseAuthorizedDomainsConsoleUrl();
          throw domainErr;
        }
        throw fallbackErr;
      }
    }

    if (code === 'auth/popup-blocked' || msg.includes('auth/popup-blocked')) {
      const popupErr: any = new Error(
        'Your browser blocked the Google Sign-In popup window. Please allow popups for this site in your browser address bar and click "Continue with Google" again.'
      );
      popupErr.code = 'auth/popup-blocked';
      throw popupErr;
    }

    throw err;
  }
}

// Alias for backwards compatibility across components
export const triggerGoogleSignInWithPopup = async () => {
  const cred = await signInWithGooglePopup();
  return {
    email: cred.user.email || '',
    displayName: cred.user.displayName || cred.user.email?.split('@')[0] || '',
    photoURL: cred.user.photoURL || undefined,
    uid: cred.user.uid,
  };
};

/**
 * Direct URL generator to accounts.google.com account chooser
 */
export function getGoogleAccountChooserUrl(clientId?: string): string {
  const id =
    clientId ||
    "988544351643-0mcmatp9a4g3tqnlrcfuqji6rhueqo21.apps.googleusercontent.com";
  return `https://accounts.google.com/v3/signin/accountchooser?prompt=select_account&client_id=${id}`;
}

/**
 * Signs out the currently authenticated Firebase user from both Auth instances.
 */
export async function signOutGoogle(): Promise<void> {
  await Promise.allSettled([signOut(smartHealthAuth), signOut(auth)]);
}

/**
 * Helper to subscribe to Firebase Auth state changes.
 */
export function onFirebaseAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(smartHealthAuth, callback);
}

