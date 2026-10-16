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
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase Configuration for Web Modular SDK
 * Uses environment variables if configured, with resilient fallbacks.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAVGPBcs1vf4VBzvxcsxkHla6z-JFxrvq4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smart-health-management-6cc87.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smart-health-management-6cc87",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smart-health-management-6cc87.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "988544351643",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:988544351643:web:ae1a08925a0716d012753e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-NTJXBKXC9E"
};

// 1. Initialize Firebase App (Singleton check)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Firebase Authentication
export const auth = getAuth(app);

// 3. Initialize Firebase Cloud Firestore
export const db = getFirestore(app);

// 3. Provider Setup with CRITICAL REQUIREMENT:
// Configure GoogleAuthProvider to force the account selector by adding:
// provider.setCustomParameters({ prompt: 'select_account' });
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Executes Google Sign-In with standard Google 'Choose an account' popup.
 * Forces the user to select from the Gmail accounts saved on their device every time.
 * Navigates directly to accounts.google.com/v3/signin/accountchooser.
 * Avoids One Tap overlay and prevents automatic login with cached sessions.
 */
export async function signInWithGooglePopup(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  // CRITICAL REQUIREMENT: Force Google 'Choose an account' popup every time
  provider.setCustomParameters({ prompt: 'select_account' });
  
  return await signInWithPopup(auth, provider);
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
  const id = clientId || "333358223263-c8bcn8rnc3e5f6e5vr6an9qpne7jfejs.apps.googleusercontent.com";
  return `https://accounts.google.com/v3/signin/accountchooser?prompt=select_account&client_id=${id}`;
}

/**
 * Signs out the currently authenticated Firebase user.
 */
export async function signOutGoogle(): Promise<void> {
  return await signOut(auth);
}

/**
 * Helper to subscribe to Firebase Auth state changes.
 */
export function onFirebaseAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
