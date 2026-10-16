import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
    // Check if user session stored in localStorage
    const savedUserId = localStorage.getItem('smarthealth_user_id');
    if (savedUserId) {
      api.getAllUsers().then((users) => {
        const found = users.find((u) => u.id === savedUserId);
        if (found) {
          setUser(found);
        } else {
          localStorage.removeItem('smarthealth_user_id');
          setUser(null);
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
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (customEmail?: string, customName?: string, customAvatarUrl?: string) => {
    if (!customEmail || !customEmail.includes('@')) {
      throw new Error('Please enter a valid Google email address.');
    }
    setIsLoading(true);
    try {
      const email = customEmail.trim().toLowerCase();
      const name = customName?.trim() || email.split('@')[0];
      const avatarUrl = customAvatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
      
      // Auto-create is FALSE during login so unregistered accounts are rejected with an error!
      const res = await api.googleLogin({ email, name, avatarUrl, autoCreateIfNotFound: false });
      setUser(res.user);
      localStorage.setItem('smarthealth_user_id', res.user.id);
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
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('smarthealth_user_id');
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
