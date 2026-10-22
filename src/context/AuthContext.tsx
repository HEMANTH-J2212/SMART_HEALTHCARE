import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import {
  signInWithGooglePopup,
  isCurrentDomainAuthorized,
  AUTHORIZED_PRODUCTION_DOMAINS,
} from '../services/firebaseAuth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authorizedDomains: string[];
  sendOtp: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  login: (email: string) => Promise<void>;
  loginWithGoogle: (customEmail?: string, customName?: string, avatarUrl?: string) => Promise<void>;
  register: (payload: any) => Promise<any>;
  updateProfile: (payload: any) => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Explicitly verify that the current production hostname (e.g., shm-systems.ai.studio)
    // is included in the Firebase project's Authorized Domains list
    const domainCheck = isCurrentDomainAuthorized();
    if (!domainCheck.isAuthorized) {
      console.warn(
        `[Firebase Auth] Hostname "${domainCheck.hostname}" (${domainCheck.origin}) is not in the expected Authorized Domains list for project "${domainCheck.projectId}".`
      );
    }

    // Check if user session stored in localStorage
    const savedUserId = localStorage.getItem('smarthealth_user_id');
    const cachedUserStr = localStorage.getItem('smarthealth_user_data');
    if (cachedUserStr) {
      try {
        const cached = JSON.parse(cachedUserStr);
        if (cached && cached.id) {
          setUser(cached);
        }
      } catch {}
    }

    if (savedUserId || cachedUserStr) {
      api.getAllUsers().then((users) => {
        if (Array.isArray(users)) {
          let cached: any = null;
          try { cached = cachedUserStr ? JSON.parse(cachedUserStr) : null; } catch {}
          const found = users.find((u) => (savedUserId && u.id === savedUserId) || (cached?.email && u.email?.toLowerCase() === cached.email.toLowerCase()));
          if (found) {
            setUser(found);
            localStorage.setItem('smarthealth_user_id', found.id);
            localStorage.setItem('smarthealth_user_data', JSON.stringify(found));
          } else if (cached && cached.id) {
            // Keep cached user session so reload never resets the user!
            setUser(cached);
          }
        }
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const sendOtp = async (email: string) => {
    const res = await api.sendOtp(email);
    return res;
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = await api.verifyOtp(email, otp);
    return res.verified;
  };

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email);
      setUser(res.user);
      localStorage.setItem('smarthealth_user_id', res.user.id);
      localStorage.setItem('smarthealth_user_data', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (customEmail?: string, customName?: string, customAvatarUrl?: string) => {
    setIsLoading(true);
    try {
      let resolvedEmail = customEmail?.trim().toLowerCase() || '';
      let resolvedName = customName?.trim() || '';
      let resolvedAvatar = customAvatarUrl || '';

      // If called without pre-resolved Google credentials, invoke Firebase standard signInWithPopup
      if (!resolvedEmail) {
        const cred = await signInWithGooglePopup();
        resolvedEmail = (cred.user.email || '').trim().toLowerCase();
        resolvedName = cred.user.displayName || resolvedEmail.split('@')[0] || 'Google User';
        resolvedAvatar = cred.user.photoURL || '';
      }

      if (!resolvedEmail || !resolvedEmail.includes('@')) {
        throw new Error('Please select a valid Google account.');
      }

      const name = resolvedName || resolvedEmail.split('@')[0];
      const avatarUrl = resolvedAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

      // Auto-create is true so genuine Google mail sign-ins succeed seamlessly
      const res = await api.googleLogin({ email: resolvedEmail, name, avatarUrl, autoCreateIfNotFound: true });
      setUser(res.user);
      localStorage.setItem('smarthealth_user_id', res.user.id);
      localStorage.setItem('smarthealth_user_data', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      // Only log in immediately if active patient or verified user.
      // Hospitals require admin approval and doctors require hospital verification!
      if (res.user.role === 'patient' && res.user.status === 'active') {
        setUser(res.user);
        localStorage.setItem('smarthealth_user_id', res.user.id);
        localStorage.setItem('smarthealth_user_data', JSON.stringify(res.user));
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (payload: any) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api.updateUser(user.id, payload);
      setUser(res.user);
      localStorage.setItem('smarthealth_user_data', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await api.deleteUser(user.id);
      setUser(null);
      localStorage.removeItem('smarthealth_user_id');
      localStorage.removeItem('smarthealth_user_data');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('smarthealth_user_id');
    localStorage.removeItem('smarthealth_user_data');
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const updated = await api.getUserById(user.id);
      if (updated) {
        setUser(updated);
      }
    } catch (err) {
      try {
        const allUsers = await api.getAllUsers();
        const updated = allUsers.find((u) => u.id === user.id);
        if (updated) {
          setUser(updated);
        }
      } catch (e) {
        console.error('Failed to refresh user', e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        authorizedDomains: AUTHORIZED_PRODUCTION_DOMAINS,
        sendOtp,
        verifyOtp,
        login,
        loginWithGoogle,
        register,
        updateProfile,
        deleteAccount,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
