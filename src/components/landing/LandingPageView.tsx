import React from 'react';
import {
  HeartPulse,
  ShieldCheck,
  Building2,
  Stethoscope,
  Activity,
  Car,
  UserCheck,
  Lock,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  LogIn,
  UserPlus
} from 'lucide-react';

interface LandingPageViewProps {
  onOpenSignIn: () => void;
  onOpenRegister: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenSignIn,
  onOpenRegister,
}) => {
  return (
    <div className="space-y-12 max-w-6xl mx-auto py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-indigo-950 text-white p-8 sm:p-12 shadow-2xl border border-teal-900/50">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold">
            <HeartPulse className="w-4 h-4 text-teal-400 animate-pulse" />
            <span>Smart Health Management & Accident Prevention Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Advanced Clinical Care, IoT Telemetry & Driver Safety
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            A unified, secure healthcare network connecting Patients, Medical Doctors, and Accredited Hospitals. Experience continuous vital signs monitoring, instant doctor scheduling, and proactive road accident prevention.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenSignIn}
              className="px-6 py-3.5 bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer group"
            >
              <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              <span>Sign In to Access Portal</span>
            </button>

            <button
              type="button"
              onClick={onOpenRegister}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-teal-300" />
              <span>Register New Profile</span>
            </button>
          </div>

          {/* Key Trust Highlights */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-white/10 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>CIA Triad Encrypted Data</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Verified Hospital Network</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Instant Google Sign-In</span>
            </div>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* Role-Specific Portal Overview (Sign-In Required Notice) */}
      <section className="space-y-4">
        <div className="text-center max-w-2xl mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Ecosystem Portals & Protected Services
          </h2>
          <p className="text-xs text-slate-500">
            Sign in with your verified credentials or Google account to access your personalized medical workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Patient Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-teal-300 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Patient Vitals & Care</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Continuous IoT vital telemetry (SpO2, heart rate, blood pressure), morning checklist routine, prescriptions, and direct doctor consultations.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-teal-800">Requires Sign-In</span>
              <button
                type="button"
                onClick={onOpenSignIn}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Access</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Doctor Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Doctor Clinical Center</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hospital-affiliated clinical hub for physicians to manage patient appointments, review biometric trends, and dispatch e-prescriptions.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-800">Requires Sign-In</span>
              <button
                type="button"
                onClick={onOpenSignIn}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Access</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Hospital Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-300 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Hospital Management</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accredited facility administration: medical staff onboarding, doctor verification, bed allocation, and inter-hospital doctor transfer coordination.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800">Requires Admin Approval</span>
              <button
                type="button"
                onClick={onOpenSignIn}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Access</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Driver Safety Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-cyan-300 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
                <Car className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Driver Accident Prevention</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Continuous driver alertness tracking, steering angle telemetry, drowsiness alarms, and automatic SOS dispatch to nearest hospital ER.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-cyan-800">Requires Sign-In</span>
              <button
                type="button"
                onClick={onOpenSignIn}
                className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Access</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* How it Works / Registration Protocol */}
      <section className="bg-slate-100/80 rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">How Onboarding Works</h3>
          <p className="text-xs text-slate-500">Fast, streamlined, and strictly verified healthcare compliance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-black text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="font-bold text-sm text-slate-900">Sign Up with Google</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Use Google Sign-In to select your browser Google account directly with zero password friction, or register with your verified email address.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="font-bold text-sm text-slate-900">Admin Approval for Hospitals</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hospital registrations are submitted to the System Administrator for verification of accreditation and license numbers before login activation.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="font-bold text-sm text-slate-900">Secure Clinical Operation</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Once onboarded, enjoy encrypted health records (CIA Triad), real-time IoT vital alerts, physician transfers, and emergency assistance.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
