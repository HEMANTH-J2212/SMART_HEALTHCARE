import React, { useState } from 'react';
import {
  X,
  Mail,
  ShieldCheck,
  User as UserIcon,
  Stethoscope,
  Building2,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  HeartPulse
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { signInWithGooglePopup, firebaseConfig, getFirebaseAuthorizedDomainsConsoleUrl } from '../../services/firebaseAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onOpenRegisterPage?: (prefilledEmail?: string, prefilledName?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onOpenRegisterPage,
}) => {
  const { login, loginWithGoogle } = useAuth();

  // If initialMode is register, immediately redirect to registration page
  React.useEffect(() => {
    if (isOpen && initialMode === 'register') {
      onClose();
      if (onOpenRegisterPage) {
        onOpenRegisterPage();
      }
    }
  }, [isOpen, initialMode]);

  // Login role selector: Patient, Doctor, Hospital Staff
  const [loginRole, setLoginRole] = useState<'patient' | 'doctor' | 'hospital'>('patient');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Feedback & Loading
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomainInfo, setUnauthorizedDomainInfo] = useState<{
    domain: string;
    consoleUrl: string;
  } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email OTP login states
  const [useOtpLogin, setUseOtpLogin] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Dedicated Status / Notice Popup Modal
  const [statusPopup, setStatusPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    subtext?: string;
    role?: string;
    badge?: string;
  } | null>(null);

  // Dedicated Unregistered Account Popup Modal (User Requirement)
  const [unregisteredPopup, setUnregisteredPopup] = useState<{
    isOpen: boolean;
    email: string;
    name?: string;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  // Handle standard password or OTP login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnauthorizedDomainInfo(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (useOtpLogin) {
        if (!loginOtpCode) throw new Error('Please enter the verification code sent to your email.');
        const verifyRes = await api.verifyOtp(loginEmail.trim().toLowerCase(), loginOtpCode.trim());
        if (!verifyRes.verified) {
          throw new Error(verifyRes.message || 'Invalid or expired OTP code.');
        }
      }

      await login(loginEmail.trim().toLowerCase());
      onClose();
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes("hospital's request is sent to the admin") || errMsg.includes('pending_admin_approval') || errMsg.includes('admin acceptance') || errMsg.includes('hospital is registered')) {
        setStatusPopup({
          isOpen: true,
          role: 'hospital',
          title: "Hospital Registration Pending",
          badge: "Pending Admin Acceptance",
          message: "Your hospital is registered. Please wait until the admin's acceptance.",
          subtext: "Please wait until the administrator reviews and accepts your hospital registration. You will receive an email once accepted."
        });
        return;
      }
      if (errMsg.includes('Awaiting Hospital Management Verification') || errMsg.includes('pending_hospital_approval') || errMsg.includes('doctor accepts it')) {
        setStatusPopup({
          isOpen: true,
          role: 'doctor',
          title: "Doctor Registration Pending",
          badge: "Pending Acceptance",
          message: "Your registration request is being sent to the doctor. Please wait until the doctor accepts it.",
          subtext: "Your credentials and registration request have been sent. Please wait until the doctor / hospital accepts your account."
        });
        return;
      }
      if (errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('register first')) {
        setUnregisteredPopup({
          isOpen: true,
          email: loginEmail.trim().toLowerCase(),
          message: 'Your account is not signed up, so please register.',
        });
        return;
      }
      setError(errMsg || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendLoginOtp = async () => {
    if (!loginEmail.trim()) {
      setError('Please enter your email address to receive a sign-in code.');
      return;
    }
    setError(null);
    setSendingOtp(true);
    try {
      const res = await api.sendOtp(loginEmail.trim().toLowerCase());
      setOtpSent(true);
      setInfoMessage(`Verification code sent to ${loginEmail}. Please check your inbox.`);
      if (res.previewOtp) {
        setLoginOtpCode(res.previewOtp);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Google Sign-In: triggers official Google Chrome popup (accounts.google.com/v3/signin/accountchooser)
  const handleGoogleSignInClick = async () => {
    setError(null);
    setUnauthorizedDomainInfo(null);
    setLoading(true);
    try {
      const cred = await signInWithGooglePopup();
      if (cred.user.email) {
        const googleEmail = cred.user.email;
        const googleName = cred.user.displayName || cred.user.email.split('@')[0];

        // Check if account already exists
        const check = await api.checkEmail(googleEmail);
        if (!check.exists || !check.user) {
          setUnregisteredPopup({
            isOpen: true,
            email: googleEmail,
            name: googleName,
            message: 'Your account is not signed up, so please register.',
          });
          return;
        }

        // If hospital is pending admin approval
        if (
          check.user.role === 'hospital' &&
          (check.user.status === 'pending_admin_approval' ||
            check.user.hospitalProfile?.verificationStatus === 'pending_admin_verification' ||
            check.user.status !== 'active')
        ) {
          setStatusPopup({
            isOpen: true,
            role: 'hospital',
            title: "Hospital Registration Pending",
            badge: "Pending Admin Acceptance",
            message: "Your hospital is registered. Please wait until the admin's acceptance.",
            subtext: "Please wait until the administrator reviews and accepts your hospital registration. You will receive an email once accepted."
          });
          return;
        }

        // If doctor is pending hospital approval
        if (check.user.role === 'doctor' && (check.user.status === 'pending_verification' || check.user.doctorProfile?.approvalStatus === 'pending_hospital_approval')) {
          setStatusPopup({
            isOpen: true,
            role: 'doctor',
            title: "Doctor Registration Pending",
            badge: "Pending Acceptance",
            message: "Your registration request is being sent to the doctor. Please wait until the doctor accepts it.",
            subtext: "Your credentials and registration request have been sent. Please wait until the doctor / hospital accepts your account."
          });
          return;
        }

        // Existing active user: Log in
        await loginWithGoogle(googleEmail, googleName);
        onClose();
      }
    } catch (popupErr: any) {
      console.warn('Google sign-in popup notice:', popupErr.message);
      if (
        popupErr?.code === 'auth/unauthorized-domain' ||
        popupErr?.message?.includes('unauthorized-domain') ||
        popupErr?.unauthorizedDomain
      ) {
        const detectedHost =
          popupErr.unauthorizedDomain ||
          (typeof window !== 'undefined' && window.location.hostname) ||
          'shm-systems.ai.studio';
        setUnauthorizedDomainInfo({
          domain: detectedHost,
          consoleUrl:
            popupErr.consoleUrl ||
            getFirebaseAuthorizedDomainsConsoleUrl(),
        });
        return;
      }
      if (!popupErr.message?.includes('closed-by-user')) {
        setError(popupErr.message || 'Google Sign-In was cancelled or encountered an issue. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToRegistration = () => {
    onClose();
    if (onOpenRegisterPage) {
      onOpenRegisterPage();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-6 relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md">
                <HeartPulse className="w-7 h-7 text-teal-300 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Smart Health Ecosystem</h2>
                <p className="text-teal-200 text-xs mt-0.5">
                  HMS • IoT Vital Telemetry • Connected Hospital Care
                </p>
              </div>
            </div>

            {/* Quick Switch to Full Registration Page */}
            <div className="flex bg-black/25 p-1 rounded-xl mt-5 max-w-xs border border-white/15">
              <button
                type="button"
                className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-white text-teal-950 shadow-sm transition-all"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={handleGoToRegistration}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                New Registration
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6">
            {unauthorizedDomainInfo && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-slate-800 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-amber-950">
                      Add "{unauthorizedDomainInfo.domain}" to Firebase Authorized Domains
                    </p>
                    <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                      To open the official Google Account Chooser popup (<code className="font-mono">accounts.google.com</code>) on your published domain, add this domain in your Firebase Console under <strong>Authentication &rarr; Settings &rarr; Authorized domains</strong>:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={unauthorizedDomainInfo.domain}
                    className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(unauthorizedDomainInfo.domain);
                      setCopiedDomain(true);
                      setTimeout(() => setCopiedDomain(false), 2500);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0"
                  >
                    {copiedDomain ? '✓ Copied!' : 'Copy Domain'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <a
                    href={unauthorizedDomainInfo.consoleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-extrabold text-teal-800 hover:text-teal-950 underline"
                  >
                    Open Firebase Console &rarr; Authentication &rarr; Settings &rarr;
                  </a>
                  <span className="text-[10px] text-amber-800 font-mono">
                    Project: {firebaseConfig.projectId}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div className="mb-4 p-3.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Google Sign-In Button */}
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleSignInClick}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>Continue with Google</span>
              </button>
              
              <div className="relative mt-4 text-center">
                <span className="bg-white px-3 text-[11px] text-slate-400 font-semibold relative z-10">
                  Or sign in with Email
                </span>
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
              </div>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Role Selector during Login: Patient, Doctor, or Hospital Staff */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Select Your Portal Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginRole('patient')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      loginRole === 'patient'
                        ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserIcon className="w-4 h-4 text-teal-600" />
                    <span className="text-xs">Patient</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoginRole('doctor')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      loginRole === 'doctor'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs">Doctor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoginRole('hospital')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      loginRole === 'hospital'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span className="text-xs">Hospital</span>
                  </button>
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={
                      loginRole === 'doctor'
                        ? 'doctor@hospital.org'
                        : loginRole === 'hospital'
                        ? 'management@hospital.org'
                        : 'patient@example.com'
                    }
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono"
                  />
                </div>
              </div>

              {/* Password or Email OTP */}
              {!useOtpLogin ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Account Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseOtpLogin(true)}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                    >
                      Sign In with Email OTP
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-teal-50/60 border border-teal-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-900 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-teal-700" /> Email OTP Verification
                    </span>
                    <button
                      type="button"
                      onClick={() => setUseOtpLogin(false)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Use Password Instead
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={loginOtpCode}
                      onChange={(e) => setLoginOtpCode(e.target.value)}
                      placeholder="6-Digit OTP Code"
                      className="flex-1 px-3 py-2 bg-white border border-teal-300 rounded-lg text-xs font-mono font-bold tracking-widest text-center"
                    />
                    <button
                      type="button"
                      onClick={handleSendLoginOtp}
                      disabled={sendingOtp}
                      className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {sendingOtp ? 'Sending...' : otpSent ? 'Resend' : 'Send Code'}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Redirection to Full Registration Page */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={handleGoToRegistration}
                    className="font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                  >
                    Complete New Registration
                  </button>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Upload Aadhar, government ID, or medical credentials on the dedicated profile registration page.
                </p>
              </div>

            </form>
          </div>
        </div>
      </div>

      {/* Official Status Popup Modal */}
      {statusPopup?.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95">
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner">
              {statusPopup.role === 'hospital' ? (
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-amber-700" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <Stethoscope className="w-8 h-8 text-indigo-700" />
                </div>
              )}
            </div>

            {statusPopup.badge && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                {statusPopup.badge}
              </span>
            )}

            <h3 className="text-lg font-black text-slate-900 leading-snug">
              {statusPopup.title}
            </h3>

            <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              {statusPopup.message}
            </p>

            {statusPopup.subtext && (
              <p className="text-xs text-slate-500 leading-relaxed">
                {statusPopup.subtext}
              </p>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStatusPopup(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Understood / Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusPopup(null);
                  handleGoToRegistration();
                }}
                className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold rounded-xl border border-teal-200 transition-colors cursor-pointer"
              >
                Open Register Profile Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unregistered Account Notification Modal (User Requirement) */}
      {unregisteredPopup?.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner">
              <AlertCircle className="w-9 h-9 text-amber-600" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
              Unregistered Account
            </span>

            <h3 className="text-xl font-black text-slate-900 leading-snug">
              Account Not Registered
            </h3>

            <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed bg-amber-50/80 p-4 rounded-2xl border border-amber-200">
              {unregisteredPopup.message}
            </p>

            <p className="text-xs text-slate-500 leading-relaxed">
              We could not find an existing account matching <strong className="font-mono text-slate-800">{unregisteredPopup.email}</strong>. Please complete registration to gain access to the clinical ecosystem.
            </p>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const emailToPass = unregisteredPopup.email;
                  const nameToPass = unregisteredPopup.name;
                  setUnregisteredPopup(null);
                  onClose();
                  if (onOpenRegisterPage) {
                    onOpenRegisterPage(emailToPass, nameToPass);
                  }
                }}
                className="w-full py-3 bg-teal-800 hover:bg-teal-900 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proceed to Register</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setUnregisteredPopup(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel / Try Another Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
