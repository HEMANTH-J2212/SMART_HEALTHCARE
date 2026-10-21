import React, { useState } from 'react';
import {
  Globe,
  Copy,
  Check,
  Share2,
  Rocket,
  ShieldCheck,
  Server,
  ExternalLink,
  Terminal,
  X,
  QrCode,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface LiveDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveDeployModal: React.FC<LiveDeployModalProps> = ({ isOpen, onClose }) => {
  const sharedPublicUrl = 'https://ais-pre-agnngcgcncmh4v642hscyo-369323863521.asia-east1.run.app';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : sharedPublicUrl;
  const activePublicUrl = currentOrigin.includes('ais-dev-') ? sharedPublicUrl : currentOrigin;

  const [activeTab, setActiveTab] = useState<'share' | 'cloudrun' | 'domain' | 'selfhost'>('share');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState('care.smarthealthindia.org');

  if (!isOpen) return null;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const cleanDomain = customDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'yourdomain.com';
  const isSubdomain = cleanDomain.split('.').length > 2;
  const hostLabel = isSubdomain ? cleanDomain.split('.')[0] : '@';

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(activePublicUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 border border-teal-400/30 rounded-2xl text-teal-300">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">Deploy & Share Website Live</h2>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                  Production Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Share your public link immediately, deploy to Google Cloud Run, or connect a custom domain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'share'
                ? 'bg-white text-teal-800 border-teal-600 shadow-2xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>1. Instant Public Link & QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cloudrun')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'cloudrun'
                ? 'bg-white text-teal-800 border-teal-600 shadow-2xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>2. 1-Click Cloud Run Deploy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('domain')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'domain'
                ? 'bg-white text-teal-800 border-teal-600 shadow-2xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>3. Custom Domain & DNS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('selfhost')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'selfhost'
                ? 'bg-white text-teal-800 border-teal-600 shadow-2xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>4. Self-Host / Docker</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5 text-xs text-slate-700">
          {activeTab === 'share' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-emerald-950 text-sm">
                    Your Website Is Already Live & Accessible!
                  </h3>
                  <p className="text-emerald-800 leading-relaxed">
                    Anyone (Patients, Doctors, or Hospitals) can open the public link below on their mobile phone, tablet, or computer to register, book appointments, and use the ecosystem.
                  </p>
                </div>
              </div>

              {/* Public URL Copy Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Live Public Shareable URL (For Patients, Doctors & Hospitals)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activePublicUrl}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyText(activePublicUrl, 'public-url')}
                    className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedKey === 'public-url' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Public Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* QR Code & Quick Share */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
                  <img
                    src={qrCodeUrl}
                    alt="Live Website QR Code"
                    className="w-28 h-28 rounded-xl border border-slate-200 p-1 bg-white shrink-0"
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                      <QrCode className="w-4 h-4 text-teal-700" />
                      <span>Scan on Mobile</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed">
                      Print or display this QR code at hospital reception desks so patients and doctors can open the portal immediately on their phones.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">Important: Enable Public Access</h4>
                    <p className="text-slate-600 leading-relaxed">
                      In the top-right bar of your AI Studio workspace, click the <strong>Share (🔗)</strong> button and set visibility to <strong>Public / Anyone with the link</strong> so external visitors don't hit a permission screen.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Access our Smart Health Management & Hospital Portal live here: ${activePublicUrl}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Share on WhatsApp</span>
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent('Smart Health Management Portal - Live Access Link')}&body=${encodeURIComponent(`Hello,\n\nYou can access our live Smart Health Management & Hospital Portal here:\n${activePublicUrl}\n\nThank you!`)}`}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl inline-flex items-center gap-1.5"
                    >
                      <span>Share via Email</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cloudrun' && (
            <div className="space-y-4">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-1.5">
                <h3 className="font-bold text-teal-950 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-700" />
                  <span>Official 1-Click Deployment to Google Cloud Run</span>
                </h3>
                <p className="text-teal-900 leading-relaxed">
                  Your application is already pre-configured with an Express + Vite production server, dynamic port binding, and Cloud Firestore real-time synchronization.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-black flex items-center justify-center shrink-0">1</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Click "Deploy to Cloud Run" in Top-Right Toolbar</h4>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      Look at the top-right corner of the AI Studio screen and click the <strong>Deploy / Rocket icon</strong> (next to Share/Download). Select your Google Cloud Project (e.g., <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">smart-health-management-6cc87</code>).
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-black flex items-center justify-center shrink-0">2</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Authorize Google Sign-In for Your Deployed Domain</h4>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      Once deployed, copy your new <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">.run.app</code> domain and add it in:
                      <br />
                      <strong>Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains &rarr; Add domain</strong>.
                      <br />
                      This ensures the <em>"Sign in with Google"</em> popup works for every user on the live URL.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-black flex items-center justify-center shrink-0">3</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Verify Cloud Firestore Rules</h4>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      In your Firebase Console (<code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">smart-health-management-6cc87</code>), open <strong>Firestore Database &rarr; Rules</strong> so all hospital, doctor, and patient registrations sync in real time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'domain' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block font-bold text-slate-800">
                  Enter Your Custom Domain Name (GoDaddy, Namecheap, Cloudflare, Hostinger):
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="e.g. care.yourhospital.org or smarthealth.in"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900"
                />
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 text-white px-4 py-2.5 font-bold flex items-center justify-between">
                  <span>Required DNS Records for {cleanDomain}</span>
                  <span className="text-[10px] font-mono text-teal-300">Auto-SSL Enabled</span>
                </div>
                <div className="p-4 bg-white space-y-3 font-mono text-[11px]">
                  {isSubdomain ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold mr-2">CNAME</span>
                        <span className="text-slate-600">Host:</span> <strong className="text-slate-900">{hostLabel}</strong>
                        <span className="mx-2 text-slate-400">&rarr;</span>
                        <span className="text-slate-600">Value:</span> <strong className="text-teal-800">ghs.googlehosted.com.</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText('ghs.googlehosted.com.', 'cname')}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-sans font-bold cursor-pointer"
                      >
                        {copiedKey === 'cname' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {['216.239.32.21', '216.239.34.21', '216.239.36.21', '216.239.38.21'].map((ip) => (
                        <div key={ip} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-bold mr-2">A</span>
                            <span>Host: <strong>@</strong> &rarr; Points to: <strong>{ip}</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyText(ip, ip)}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-sans font-bold cursor-pointer"
                          >
                            {copiedKey === ip ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Remember:</strong> After mapping <code className="font-mono font-bold">{cleanDomain}</code> in Google Cloud Run &rarr; Custom Domains, add <code className="font-mono font-bold">{cleanDomain}</code> to <strong>Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains</strong>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'selfhost' && (
            <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Want to host on your own server (Render, Railway, AWS, DigitalOcean, or VPS)? Export the ZIP from AI Studio and run these production commands:
              </p>

              <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] space-y-2 relative">
                <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-teal-400" />
                    <span>Production Build & Start Commands</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        'npm install\nnpm run build\nNODE_ENV=production PORT=3000 npm start',
                        'cmds'
                      )
                    }
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded font-sans font-bold cursor-pointer"
                  >
                    {copiedKey === 'cmds' ? 'Copied!' : 'Copy Commands'}
                  </button>
                </div>
                <pre className="overflow-x-auto leading-relaxed text-emerald-300">
{`# 1. Install dependencies
npm install

# 2. Build optimized frontend bundle into dist/
npm run build

# 3. Start full-stack Express + API + SPA server
NODE_ENV=production PORT=3000 npm start`}
                </pre>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="font-bold text-slate-900">Environment Variables (.env) for Production</h4>
                <pre className="p-3 bg-white border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 overflow-x-auto">
{`NODE_ENV=production
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
SMTP_USER=aivirtualcare@gmail.com
SMTP_PASS=your_gmail_app_password
VITE_FIREBASE_PROJECT_ID=smart-health-management-6cc87`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>HTTPS / TLS 1.3 & Cloud Firestore Sync Enabled</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
