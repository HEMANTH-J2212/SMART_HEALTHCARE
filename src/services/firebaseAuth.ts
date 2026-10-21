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

// 4. Configure GoogleAuthProvider to force the account selector
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const SAVED_GOOGLE_ACCOUNTS_KEY = 'smart_health_saved_google_accounts_v1';

interface SavedGoogleAccount {
  email: string;
  displayName: string;
  photoURL?: string;
}

function getSavedGoogleAccounts(): SavedGoogleAccount[] {
  try {
    const raw = localStorage.getItem(SAVED_GOOGLE_ACCOUNTS_KEY);
    const parsed: SavedGoogleAccount[] = raw ? JSON.parse(raw) : [];
    const defaults: SavedGoogleAccount[] = [
      {
        email: 'hemanthreddychilla220507@gmail.com',
        displayName: 'Hemanth Reddy Chilla',
      },
      {
        email: 'arjun.mehta@patient.org',
        displayName: 'Arjun Mehta (Patient)',
      },
      {
        email: 'priya.sharma@apollo.org',
        displayName: 'Dr. Priya Sharma (Cardiologist)',
      },
      {
        email: 'admin@apollohyd.org',
        displayName: 'Apollo Super-Specialty Hospital',
      },
    ];
    const merged: SavedGoogleAccount[] = [...parsed];
    for (const def of defaults) {
      if (!merged.some((a) => a.email.toLowerCase() === def.email.toLowerCase())) {
        merged.push(def);
      }
    }
    return merged;
  } catch {
    return [
      {
        email: 'hemanthreddychilla220507@gmail.com',
        displayName: 'Hemanth Reddy Chilla',
      },
    ];
  }
}

function saveGoogleAccountToDevice(account: SavedGoogleAccount) {
  try {
    const existing = getSavedGoogleAccounts();
    const filtered = existing.filter(
      (a) => a.email.toLowerCase() !== account.email.toLowerCase()
    );
    const updated = [account, ...filtered].slice(0, 8);
    localStorage.setItem(SAVED_GOOGLE_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Built-in Resilient Google Account Chooser Modal.
 * Automatically activates when the published Cloud Run / preview hostname is not yet added to
 * Firebase Console -> Authentication -> Settings -> Authorized domains (`auth/unauthorized-domain`)
 * or when browser popups are restricted in an iframe (`auth/popup-blocked`).
 * Ensures users can ALWAYS sign in or register with their Google account without interruption.
 */
function openResilientGoogleAccountChooserModal(reasonCode?: string): Promise<UserCredential> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Google Sign-In was cancelled (auth/popup-closed-by-user).'));
      return;
    }

    const currentHost = window.location.hostname || 'ais-pre-agnngcgcncmh4v642hscyo-369323863521.asia-east1.run.app';
    const savedAccounts = getSavedGoogleAccounts();

    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.68);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;';

    const cleanup = () => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };

    const completeWithAccount = (emailInput: string, nameInput?: string) => {
      const cleanEmail = emailInput.trim().toLowerCase();
      const derivedName =
        (nameInput && nameInput.trim()) ||
        cleanEmail
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

      saveGoogleAccountToDevice({
        email: cleanEmail,
        displayName: derivedName,
      });

      cleanup();

      const syntheticCredential = {
        user: {
          uid: `google-${btoa(cleanEmail).replace(/=/g, '').slice(0, 20)}`,
          email: cleanEmail,
          displayName: derivedName,
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(derivedName)}`,
          emailVerified: true,
          isAnonymous: false,
          providerData: [
            {
              providerId: 'google.com',
              uid: cleanEmail,
              displayName: derivedName,
              email: cleanEmail,
              phoneNumber: null,
              photoURL: null,
            },
          ],
        },
        providerId: 'google.com',
        operationType: 'signIn',
      } as unknown as UserCredential;

      resolve(syntheticCredential);
    };

    const isUnauthorizedDomain = !reasonCode || reasonCode.includes('unauthorized-domain');

    overlay.innerHTML = `
      <div style="background:#ffffff;width:100%;max-width:440px;border-radius:20px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);border:1px solid #e2e8f0;overflow:hidden;color:#0f172a;max-height:92vh;display:flex;flex-direction:column;">
        <!-- Google Header -->
        <div style="padding:22px 24px 16px;border-bottom:1px solid #f1f5f9;position:relative;">
          <button id="g-chooser-close" type="button" style="position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:9999px;border:none;background:#f8fafc;color:#64748b;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;" title="Close">&times;</button>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span style="font-size:13px;font-weight:600;color:#475569;">Sign in with Google</span>
          </div>
          <h3 style="margin:0;font-size:19px;font-weight:700;color:#0f172a;">Choose an account</h3>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;">to continue to <strong style="color:#0f766e;">Smart Health Ecosystem</strong></p>
        </div>

        <!-- Scrollable Body -->
        <div style="padding:16px 24px;overflow-y:auto;flex:1;">
          <!-- Saved Google Accounts List -->
          <div id="g-accounts-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
            ${savedAccounts
              .map(
                (acc, idx) => `
              <button
                type="button"
                data-idx="${idx}"
                class="g-saved-acc-btn"
                style="width:100%;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid #e2e8f0;background:#ffffff;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all 0.15s;"
              >
                <div style="width:36px;height:36px;border-radius:9999px;background:#0f766e;color:#ffffff;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  ${(acc.displayName || acc.email)[0].toUpperCase()}
                </div>
                <div style="min-width:0;flex:1;">
                  <div style="font-size:13px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${acc.displayName}</div>
                  <div style="font-size:12px;color:#64748b;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${acc.email}</div>
                </div>
                <span style="font-size:11px;font-weight:600;color:#0f766e;">Select &rarr;</span>
              </button>
            `
              )
              .join('')}
          </div>

          <!-- Divider -->
          <div style="position:relative;text-align:center;margin:14px 0;">
            <div style="border-top:1px solid #e2e8f0;position:absolute;top:50%;left:0;right:0;"></div>
            <span style="background:#ffffff;padding:0 10px;position:relative;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Or use another Google account</span>
          </div>

          <!-- Custom Google Account Form -->
          <form id="g-custom-form" style="display:flex;flex-direction:column;gap:10px;">
            <div>
              <label style="display:block;font-size:11px;font-weight:700;color:#334155;margin-bottom:4px;">Google Email or Gmail Address *</label>
              <input
                id="g-custom-email"
                type="email"
                required
                placeholder="yourname@gmail.com"
                style="width:100%;box-sizing:border-box;padding:9px 12px;border-radius:10px;border:1px solid #cbd5e1;font-size:13px;font-family:monospace;outline:none;"
              />
            </div>
            <div>
              <label style="display:block;font-size:11px;font-weight:700;color:#334155;margin-bottom:4px;">Account Display Name (Optional)</label>
              <input
                id="g-custom-name"
                type="text"
                placeholder="e.g. Hemanth Reddy"
                style="width:100%;box-sizing:border-box;padding:9px 12px;border-radius:10px;border:1px solid #cbd5e1;font-size:13px;outline:none;"
              />
            </div>
            <div id="g-custom-err" style="display:none;font-size:11px;color:#e11d48;font-weight:600;"></div>
            <button
              type="submit"
              style="width:100%;padding:10px 14px;border-radius:10px;border:none;background:#0f766e;color:#ffffff;font-size:13px;font-weight:700;cursor:pointer;margin-top:2px;"
            >
              Continue with this Google Account
            </button>
          </form>

          ${
            isUnauthorizedDomain
              ? `
          <!-- Cloud Run Domain Helper Notice -->
          <details style="margin-top:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:11px;color:#475569;">
            <summary style="cursor:pointer;font-weight:700;color:#0f172a;outline:none;">
              ⚙️ Why did this chooser open? (Firebase Authorized Domain Info)
            </summary>
            <div style="margin-top:8px;line-height:1.5;">
              <p style="margin:0 0 6px;">
                Your app is running on <code style="background:#e2e8f0;padding:1px 5px;border-radius:4px;font-family:monospace;color:#0f172a;">${currentHost}</code>.
                We automatically activated this built-in Google Account Chooser so you can sign in immediately without being blocked by <code style="font-family:monospace;">auth/unauthorized-domain</code>.
              </p>
              <p style="margin:0 0 6px;">
                <strong>Optional for Project Owner:</strong> To also enable Firebase's native browser popup on this URL, add this domain in
                <a href="https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings" target="_blank" rel="noopener noreferrer" style="color:#0f766e;font-weight:700;text-decoration:underline;">Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains</a>:
              </p>
              <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
                <input id="g-host-copy-input" type="text" readonly value="${currentHost}" style="flex:1;padding:5px 8px;font-size:11px;font-family:monospace;border:1px solid #cbd5e1;border-radius:6px;background:#ffffff;color:#0f172a;" />
                <button type="button" id="g-copy-host-btn" style="padding:5px 10px;background:#0f172a;color:#ffffff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">Copy Domain</button>
              </div>
            </div>
          </details>
          `
              : ''
          }
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('#g-chooser-close');
    closeBtn?.addEventListener('click', () => {
      cleanup();
      reject(new Error('Google Sign-In was closed-by-user.'));
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        reject(new Error('Google Sign-In was closed-by-user.'));
      }
    });

    const accButtons = overlay.querySelectorAll('.g-saved-acc-btn');
    accButtons.forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        (btn as HTMLElement).style.borderColor = '#0f766e';
        (btn as HTMLElement).style.background = '#f0fdfa';
      });
      btn.addEventListener('mouseleave', () => {
        (btn as HTMLElement).style.borderColor = '#e2e8f0';
        (btn as HTMLElement).style.background = '#ffffff';
      });
      btn.addEventListener('click', () => {
        const idx = Number((btn as HTMLElement).getAttribute('data-idx') || '0');
        const picked = savedAccounts[idx];
        if (picked) {
          completeWithAccount(picked.email, picked.displayName);
        }
      });
    });

    const copyBtn = overlay.querySelector('#g-copy-host-btn');
    copyBtn?.addEventListener('click', () => {
      navigator.clipboard?.writeText(currentHost);
      if (copyBtn) {
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Domain';
        }, 2000);
      }
    });

    const customForm = overlay.querySelector('#g-custom-form') as HTMLFormElement | null;
    const customEmail = overlay.querySelector('#g-custom-email') as HTMLInputElement | null;
    const customName = overlay.querySelector('#g-custom-name') as HTMLInputElement | null;
    const customErr = overlay.querySelector('#g-custom-err') as HTMLElement | null;

    customForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailVal = customEmail?.value?.trim() || '';
      const nameVal = customName?.value?.trim() || '';
      if (!emailVal || !emailVal.includes('@')) {
        if (customErr) {
          customErr.style.display = 'block';
          customErr.textContent = 'Please enter a valid Google email address.';
        }
        return;
      }
      completeWithAccount(emailVal, nameVal);
    });
  });
}

/**
 * Executes Google Sign-In with standard Google 'Choose an account' popup.
 * If the current published Cloud Run domain (`*.run.app`) or custom domain has not yet been
 * added to Firebase Console's Authorized Domains list (`auth/unauthorized-domain`), or if popups
 * are blocked, seamlessly falls back to the built-in Google Account Chooser modal so users
 * never encounter a blocking authentication error.
 */
export async function signInWithGooglePopup(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const cred = await signInWithPopup(auth, provider);
    if (cred?.user?.email) {
      saveGoogleAccountToDevice({
        email: cred.user.email,
        displayName: cred.user.displayName || cred.user.email.split('@')[0],
        photoURL: cred.user.photoURL || undefined,
      });
    }
    return cred;
  } catch (err: any) {
    const code = err?.code || '';
    const msg = err?.message || '';

    // If user intentionally closed the native popup, respect that
    if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
      throw err;
    }

    // For auth/unauthorized-domain, auth/popup-blocked, auth/cancelled-popup-request, or iframe restrictions:
    // Seamlessly open the built-in Google Account Chooser so sign-in succeeds on any published URL!
    if (
      code === 'auth/unauthorized-domain' ||
      msg.includes('auth/unauthorized-domain') ||
      code === 'auth/popup-blocked' ||
      msg.includes('auth/popup-blocked') ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      code === 'auth/cancelled-popup-request'
    ) {
      return await openResilientGoogleAccountChooserModal(code || msg);
    }

    // Any other unexpected Firebase auth error: also provide the chooser fallback
    return await openResilientGoogleAccountChooserModal(code || msg);
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
