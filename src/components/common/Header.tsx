import React, { useState, useRef, useEffect } from 'react';
import {
  HeartPulse,
  ShieldCheck,
  Building2,
  Stethoscope,
  User as UserIcon,
  LogOut,
  LogIn,
  UserPlus,
  Car,
  ChevronDown,
  Activity,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface HeaderProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenProfile: () => void;
  onOpenGoogleChange: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuth,
  activeView,
  setActiveView,
  onOpenProfile,
  onOpenGoogleChange,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />,
          label: 'Master Admin',
          bg: 'bg-purple-100 text-purple-900 border-purple-200',
        };
      case 'hospital':
        return {
          icon: <Building2 className="w-3.5 h-3.5 text-amber-700" />,
          label: 'Hospital Mgmt',
          bg: 'bg-amber-100 text-amber-900 border-amber-200',
        };
      case 'doctor':
        return {
          icon: <Stethoscope className="w-3.5 h-3.5 text-indigo-700" />,
          label: 'Physician',
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-200',
        };
      case 'patient':
      default:
        return {
          icon: <UserIcon className="w-3.5 h-3.5 text-teal-700" />,
          label: 'Patient',
          bg: 'bg-teal-100 text-teal-900 border-teal-200',
        };
    }
  };

  const badge = user ? getRoleBadge(user.role) : null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('dashboard')}
              className="flex items-center gap-2.5 group text-left cursor-pointer"
            >
              <div className="p-2 bg-gradient-to-tr from-teal-700 to-cyan-600 rounded-xl shadow-xs group-hover:scale-105 transition-transform text-white">
                <HeartPulse className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  SmartHealth <span className="text-teal-700 font-black">Ecosystem</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide block -mt-0.5">
                  HMS • IoT Vital Telemetry • Driver Safety
                </span>
              </div>
            </button>
          </div>

          {/* Clean Main Navigation Bar based on authenticated role */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            {/* If user is Admin */}
            {user?.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeView === 'dashboard' || activeView === 'admin'
                      ? 'bg-purple-100 text-purple-900 font-bold border border-purple-200 shadow-2xs'
                      : 'hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                  <span>Admin Authority</span>
                </button>

                <button
                  onClick={() => setActiveView('database')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeView === 'database'
                      ? 'bg-purple-900 text-white font-bold shadow-2xs'
                      : 'hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-purple-400" />
                  <span>System Database</span>
                </button>
              </>
            )}

            {/* If user is Hospital */}
            {user?.role === 'hospital' && (
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'dashboard'
                    ? 'bg-amber-100 text-amber-900 font-bold border border-amber-200 shadow-2xs'
                    : 'hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
                <span>Hospital Management</span>
              </button>
            )}

            {/* If user is Doctor */}
            {user?.role === 'doctor' && (
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'dashboard'
                    ? 'bg-indigo-100 text-indigo-900 font-bold border border-indigo-200 shadow-2xs'
                    : 'hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-indigo-700" />
                <span>Doctor Portal</span>
              </button>
            )}

            {/* If user is Authenticated Patient */}
            {user && user.role === 'patient' && (
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'dashboard'
                    ? 'bg-teal-50 text-teal-900 font-bold border border-teal-200 shadow-2xs'
                    : 'hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-teal-600" />
                <span>Patient Vitals & Care</span>
              </button>
            )}

            {/* Driver Health & Safety System (Hidden for Hospital accounts per requirement) */}
            {user && user.role !== 'hospital' && (
              <button
                onClick={() => setActiveView('driver')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'driver'
                    ? 'bg-slate-900 text-white font-bold shadow-2xs'
                    : 'hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Car className="w-3.5 h-3.5 text-cyan-500" />
                <span>Driver Safety</span>
              </button>
            )}

            {/* If visitor is NOT signed in: Only show Home and Registration options */}
            {!user && (
              <>
                <button
                  onClick={() => setActiveView('landing')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeView === 'landing' || activeView === 'dashboard'
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'hover:bg-slate-100 hover:text-slate-900 text-slate-600'
                  }`}
                >
                  <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => setActiveView('register')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeView === 'register'
                      ? 'bg-teal-700 text-white font-bold shadow-2xs'
                      : 'hover:bg-slate-100 hover:text-slate-900 text-teal-800 font-semibold'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-teal-600" />
                  <span>Register Profile</span>
                </button>
              </>
            )}
          </nav>

          {/* Right Area: Emergency Hotline & User Menu */}
          <div className="flex items-center gap-2.5">
            {/* Emergency 24/7 Hotline Badge */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>24/7 ER: 1-800-555-9111</span>
            </div>

            {/* Authenticated User Menu */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200/80 shadow-2xs cursor-pointer"
                >
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                  />
                  <div className="hidden sm:block text-left pr-1">
                    <p className="text-xs font-bold text-slate-800 leading-tight max-w-[130px] truncate">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-slate-500 capitalize leading-tight flex items-center gap-1">
                      <span>{user.role}</span>
                      {badge && <span className="text-teal-700 font-bold">• Active</span>}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Clean Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                    
                    {/* Header info in menu */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-sm truncate">{user.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-800 shrink-0">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] truncate font-mono">{user.email}</p>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      {/* View & Edit Profile */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition-colors text-left cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-teal-600" />
                        <span>My Profile & Registration Details</span>
                      </button>

                      {/* Change Google Account */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenGoogleChange();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition-colors text-left cursor-pointer"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                          />
                        </svg>
                        <span>Switch / Change Google Account</span>
                      </button>
                    </div>

                    {/* Sign out button */}
                    <div className="p-1.5 border-t border-slate-100 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-600" />
                        <span>Sign Out / Log Out</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => setActiveView('register')}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
