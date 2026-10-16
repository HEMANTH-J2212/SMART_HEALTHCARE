import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { PatientDashboard } from './components/patient/PatientDashboard';
import { DoctorDashboard } from './components/doctor/DoctorDashboard';
import { HospitalDashboard } from './components/hospital/HospitalDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { DatabaseManagementView } from './components/admin/DatabaseManagementView';
import { DriverSafetyView } from './components/driver/DriverSafetyView';
import { RegistrationPageView } from './components/registration/RegistrationPageView';
import { LandingPageView } from './components/landing/LandingPageView';
import { HeartPulse } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [activeView, setActiveView] = useState<string>('landing');

  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    mode: 'login' | 'register';
  }>({
    isOpen: false,
    mode: 'login',
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [googlePrefill, setGooglePrefill] = useState<{ email: string; name: string } | null>(null);

  // Automatically navigate on authentication state change
  React.useEffect(() => {
    if (user) {
      closeAuth();
      if (user.role === 'admin') {
        setActiveView('dashboard');
      } else if (activeView === 'register' || activeView === 'landing') {
        setActiveView('dashboard');
      }
    } else {
      if (activeView !== 'register') {
        setActiveView('landing');
      }
    }
  }, [user]);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthModalState({ isOpen: true, mode });
  };

  const closeAuth = () => {
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-teal-800 text-white rounded-2xl shadow-md animate-pulse">
            <HeartPulse className="w-8 h-8" />
          </div>
          <p className="text-xs font-bold text-slate-600 tracking-wider uppercase font-mono">
            Loading Smart Health Ecosystem...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col text-slate-800 antialiased selection:bg-teal-500 selection:text-white">
      {/* Top Header with clean user menu, quick role views, profile, and logout */}
      <Header
        onOpenAuth={openAuth}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenGoogleChange={() => {
          logout();
          openAuth('login');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* If user is NOT authenticated */}
        {!user ? (
          activeView === 'register' ? (
            <RegistrationPageView
              onOpenSignIn={() => openAuth('login')}
              initialGoogleAccount={googlePrefill}
              onRegistrationComplete={() => {
                closeAuth();
                setGooglePrefill(null);
                setActiveView('dashboard');
              }}
            />
          ) : (
            <LandingPageView
              onOpenSignIn={() => openAuth('login')}
              onOpenRegister={() => setActiveView('register')}
            />
          )
        ) : (
          /* User is Authenticated */
          activeView === 'driver' ? (
            <DriverSafetyView />
          ) : activeView === 'database' && user.role === 'admin' ? (
            <DatabaseManagementView />
          ) : (
            <>
              {user.role === 'admin' && (
                <AdminDashboard onNavigateToDatabase={() => setActiveView('database')} />
              )}
              {user.role === 'hospital' && <HospitalDashboard />}
              {user.role === 'doctor' && <DoctorDashboard />}
              {user.role === 'patient' && <PatientDashboard />}
            </>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-teal-700 text-white rounded-lg">
              <HeartPulse className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800">
              Smart Health Management & Accident Prevention System
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>IoT Healthcare Kits</span>
            <span>•</span>
            <span>Gemini AI Clinical Intelligence</span>
            <span>•</span>
            <span>Hospital Verified Network</span>
            <span>•</span>
            <span className="text-rose-600 font-bold">24x7 ER Hotline: 1-800-555-9111</span>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalState.isOpen}
        onClose={closeAuth}
        initialMode={authModalState.mode}
        onOpenRegisterPage={(prefillEmail?: string, prefillName?: string) => {
          closeAuth();
          if (prefillEmail) {
            setGooglePrefill({ email: prefillEmail, name: prefillName || '' });
          }
          setActiveView('register');
        }}
      />

      {/* User Profile & Medical Details Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenGoogleChange={() => {
          setIsProfileModalOpen(false);
          logout();
          openAuth('login');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
