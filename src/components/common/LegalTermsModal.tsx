import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Lock, CheckCircle2, AlertTriangle, Building2, Stethoscope, ChevronRight } from 'lucide-react';

interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'agreement' | 'privacy';
}

export const LegalTermsModal: React.FC<LegalTermsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'agreement',
}) => {
  const [activeTab, setActiveTab] = useState<'agreement' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-400/30">
              <ShieldCheck className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Legal & Clinical Compliance Center</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-400/20 text-teal-300 border border-teal-400/30">
                  DISHA & ABDM Compliant
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                AI Virtual Care Healthcare Ecosystem • Patient, Provider & Hospital Platform Terms
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('agreement')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'agreement'
                ? 'border-teal-700 text-teal-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-teal-700" />
            <span>Healthcare Customer Agreement</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-teal-700 text-teal-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4 text-teal-700" />
            <span>Patient & Provider Privacy Notice</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-700 space-y-5 leading-relaxed">
          {activeTab === 'agreement' ? (
            <div className="space-y-4">
              <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-teal-950 text-sm">Official Master Healthcare Customer Agreement</h4>
                  <p className="text-[11px] text-teal-800 mt-0.5">
                    Effective Date: Current Version • Governing Medical Telemedicine Practice Guidelines & Indian Clinical Establishments Act
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">1</span>
                  <span>Scope of Digital Health & Clinical Ecosystem</span>
                </h5>
                <p>
                  AI Virtual Care ("Platform") provides secure cloud-based clinical integration, real-time IoT vital telemetry streaming, teleconsultation scheduling, diagnostic lab order routing, and emergency SOS distress routing between Patients, Licensed Medical Practitioners ("Doctors"), and Authorized Medical Institutions ("Hospitals"). By creating an account or accessing services, you enter into a legally binding contract governed by the Information Technology Act, 2000, and National Medical Commission (NMC) Telemedicine Practice Guidelines.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">2</span>
                  <span>Practitioner Licensing & Hospital Accreditation Responsibilities</span>
                </h5>
                <p>
                  All participating Doctors warrant that they hold valid permanent registration with the National Medical Commission (NMC) or respective State Medical Council (SMC) and possess qualified medical degrees (MBBS, MD, MS, DM, MCh, DNB). Participating Hospitals warrant that they operate in strict compliance with the Clinical Establishment (Registration and Regulation) Act and maintain appropriate state regulatory certifications (NABH, Fire Safety NOC, Bio-Medical Waste Authorization).
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">3</span>
                  <span>Emergency Distress (SOS) Disclaimer & In-Person Care</span>
                </h5>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Emergency Services Acknowledgment</span>
                  </div>
                  <p className="text-[11px] text-amber-900">
                    While the Platform includes real-time emergency routing with live GPS telemetry broadcast to your selected trauma facility and designated emergency contacts, digital communications can experience network latency. IN THE EVENT OF LIFE-THREATENING TRAUMA, STROKE, OR ACUTE CARDIAC ARREST, PROMPTLY CALL NATIONAL AMBULANCE SERVICES (108 / 112) OR PROCEED IMMEDIATELY TO THE NEAREST PHYSICAL HOSPITAL CASUALTY WARD.
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">4</span>
                  <span>Consultation Economics, OPD Pricing & Refund Policy</span>
                </h5>
                <p>
                  Doctors and Hospitals maintain complete transparency regarding first-time OPD consultation fees, follow-up visit charges, and cashless insurance TPA approvals. If an appointment is cancelled by the physician or medical facility prior to slot commencement, patients receive full automated refund credit within 3 to 5 business days.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">5</span>
                  <span>Ayushman Bharat Digital Mission (ABDM) & Health ID Consent</span>
                </h5>
                <p>
                  Where enabled by the patient or medical practitioner, records may link to your Ayushman Bharat Health Account (ABHA / HPR ID). You grant explicit electronic consent for authorized medical professionals to review shared health records solely during the active treatment episode.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-indigo-950 text-sm">Patient & Provider Privacy Notice</h4>
                  <p className="text-[11px] text-indigo-800 mt-0.5">
                    Data Protection Standards: ISO/IEC 27001 • Digital Information Security in Healthcare Act (DISHA) • HIPAA Equivalent Standards
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">1</span>
                  <span>Information We Collect</span>
                </h5>
                <ul className="list-disc pl-5 space-y-1 text-[11px]">
                  <li><strong>Personal Identity:</strong> Full Name, Government ID / Aadhaar verification metadata, contact email, phone number, and physical residential coordinates.</li>
                  <li><strong>Protected Health Information (PHI):</strong> Continuous vital telemetry (Heart rate BPM, blood pressure, SpO2, sleep patterns), prescribed medications, lab test orders, medical allergies, and diagnosed clinical conditions.</li>
                  <li><strong>Professional Medical Credentials:</strong> Doctor Medical Council Registration certificates, degrees (MBBS/MD), HPR ID, hospital establishment licenses, and fire/pollution regulatory authorizations.</li>
                  <li><strong>Live Geolocation Coordinates:</strong> Captured only upon user consent during map facility location pinning or emergency SOS distress dispatches.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">2</span>
                  <span>Zero Commercial Sale of Personal Health Data</span>
                </h5>
                <p>
                  WE DO NOT SELL, RENT, OR MONETIZE PATIENT HEALTH INFORMATION OR MEDICAL RECORDS TO THIRD-PARTY ADVERTISERS, MARKETING FIRMS, OR DATA BROKERS. Your clinical information is accessible strictly to your assigned treating physician, designated hospital team, and approved emergency contacts.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">3</span>
                  <span>Encryption & Security Architecture</span>
                </h5>
                <p>
                  All database records, IoT telemetry streams, and prescription documents are safeguarded using AES-256 encryption at rest and TLS 1.3 encryption in transit. Role-based access control (RBAC) ensures hospital staff, doctors, and patients can only access authorized endpoints and patient partitions.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">4</span>
                  <span>User Rights & Account Portability</span>
                </h5>
                <p>
                  You hold the absolute right to inspect all stored clinical records, export health records in standard JSON or PDF format, modify emergency contact directives, and request permanent erasure of your account in accordance with applicable healthcare retention laws.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500 font-medium text-center sm:text-left">
            By registering, you confirm that you have read, understood, and accept these clinical protocols.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
