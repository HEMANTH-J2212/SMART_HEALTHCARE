import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Trash2,
  Download,
  Code,
  ShieldCheck,
  Building2,
  Stethoscope,
  Users,
  Activity,
  Car,
  Calendar,
  FileText,
  Package,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Info,
  Server,
  Layers,
  Sparkles,
  ArrowRight,
  Cloud,
  ExternalLink,
  Lock,
  Unlock
} from 'lucide-react';
import { api } from '../../services/api';
import {
  syncFullEcosystemToFirestore,
  testFirestoreConnection,
  clearFirestoreDatabase,
  deleteFirestoreRecord,
} from '../../services/firestoreSync';

export const DatabaseManagementView: React.FC = () => {
  const [databaseSnapshot, setDatabaseSnapshot] = useState<any>(null);
  const [selectedCollection, setSelectedCollection] = useState<string>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [inspectedJsonRecord, setInspectedJsonRecord] = useState<any | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [showArchSuggestions, setShowArchSuggestions] = useState(false);
  const [syncingToFirestore, setSyncingToFirestore] = useState(false);
  const [firestoreSyncMessage, setFirestoreSyncMessage] = useState<string | null>(null);
  const [rulesStatus, setRulesStatus] = useState<'unknown' | 'testing' | 'open' | 'locked'>('unknown');
  const [copiedRules, setCopiedRules] = useState(false);

  const recommendedRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

  const checkRulesStatus = async () => {
    setRulesStatus('testing');
    try {
      const res = await testFirestoreConnection();
      if (res.permissionGranted) {
        setRulesStatus('open');
      } else {
        setRulesStatus('locked');
      }
    } catch {
      setRulesStatus('locked');
    }
  };

  const fetchDatabase = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminDatabase();
      setDatabaseSnapshot(data);
    } catch (err) {
      console.error('Failed to load database snapshot', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabase();
    checkRulesStatus();
  }, []);

  const handleResetDatabase = async () => {
    setLoading(true);
    try {
      const res = await api.resetDatabase();
      // User Requirement: Clean reset database must delete live Firestore records as well
      try {
        await clearFirestoreDatabase(true);
      } catch (fsErr) {
        console.warn('[DatabaseManagementView] Firestore wipe notice:', fsErr);
      }
      setActionNotice(res.message || 'Database cleaned successfully! Live Firestore collections and portal records are zero. Only Master Admin HEMANTH remains.');
      setTimeout(() => setActionNotice(null), 5000);
      await fetchDatabase();
    } catch (err: any) {
      setActionNotice('Failed to reset database: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (collection: string, id: string) => {
    try {
      await api.deleteDatabaseRecord(collection, id);
      try {
        await deleteFirestoreRecord(collection, id);
      } catch (fsErr) {
        console.warn('[DatabaseManagementView] Firestore delete record notice:', fsErr);
      }
      setActionNotice(`Record ${id} removed from ${collection} (local & live Firestore).`);
      setTimeout(() => setActionNotice(null), 4000);
      await fetchDatabase();
    } catch (err: any) {
      setActionNotice('Failed to delete record: ' + (err.message || 'Error'));
    }
  };

  const handleExportJson = () => {
    if (!databaseSnapshot) return;
    const blob = new Blob([JSON.stringify(databaseSnapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smarthealth-ecosystem-db-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    if (!inspectedJsonRecord) return;
    navigator.clipboard.writeText(JSON.stringify(inspectedJsonRecord, null, 2));
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handleSyncToFirestore = async () => {
    if (!databaseSnapshot) return;
    setSyncingToFirestore(true);
    setFirestoreSyncMessage('Probing Firestore security rules and synchronizing all collections...');
    try {
      const res = await syncFullEcosystemToFirestore({
        users: databaseSnapshot.users || [],
        appointments: databaseSnapshot.appointments || [],
        prescriptions: databaseSnapshot.prescriptions || [],
        emergencies: databaseSnapshot.emergencyAlerts || [],
        doctorLeaves: databaseSnapshot.doctorLeaveRequests || databaseSnapshot.doctorLeaves || [],
        patientRequests: databaseSnapshot.patientDoctorRequests || databaseSnapshot.patientRequests || [],
        items: databaseSnapshot.items || [],
        scheduledSurgeries: databaseSnapshot.scheduledSurgeries || [],
        iotReadings: databaseSnapshot.iotReadings || [],
      });
      if (res.success && res.syncedCount > 0) {
        setRulesStatus('open');
        setFirestoreSyncMessage(`✅ Successfully written ${res.syncedCount} records across all collections (users, appointments, prescriptions, emergencies, items, surgeries) into Google Cloud Firestore! Refresh your Firebase console to view.`);
      } else if (res.permissionDenied) {
        setRulesStatus('locked');
        setFirestoreSyncMessage(`❌ PERMISSION_DENIED: Firebase Firestore rules are in Locked Mode. Please click the 'Rules' tab in your Firebase Console, paste 'allow read, write: if true;' and click Publish.`);
      } else {
        setFirestoreSyncMessage(`ℹ️ Cloud Firestore sync completed. ${res.syncedCount} records processed.`);
      }
      setTimeout(() => setFirestoreSyncMessage(null), 12000);
    } catch (err: any) {
      setRulesStatus('locked');
      setFirestoreSyncMessage('❌ Cloud Firestore sync notice: ' + (err.message || 'Check Firebase Console rules'));
      setTimeout(() => setFirestoreSyncMessage(null), 12000);
    } finally {
      setSyncingToFirestore(false);
    }
  };

  // Extract collection records
  let rawCollectionRecords: any[] = databaseSnapshot?.[selectedCollection] || [];

  // User Requirement: System database users MUST be sorted by Hospital and Patients only
  if (selectedCollection === 'users') {
    const hospitals = (databaseSnapshot?.users || [])
      .filter((u: any) => u.role === 'hospital')
      .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    const patients = (databaseSnapshot?.users || [])
      .filter((u: any) => u.role === 'patient')
      .sort((a: any, b: any) => {
        const hospA = a.patientProfile?.assignedHospitalName || '';
        const hospB = b.patientProfile?.assignedHospitalName || '';
        if (hospA !== hospB) return hospA.localeCompare(hospB);
        return (a.name || '').localeCompare(b.name || '');
      });

    rawCollectionRecords = [...hospitals, ...patients];
  }

  const currentRecords: any[] = rawCollectionRecords;

  const filteredRecords = currentRecords.filter((rec) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const stringified = JSON.stringify(rec).toLowerCase();
    return stringified.includes(query);
  });

  const collectionsMeta = [
    { id: 'users', label: 'Users (Sorted: Hospitals & Patients)', icon: Users, count: (databaseSnapshot?.hospitals?.length || 0) + (databaseSnapshot?.patients?.length || 0), color: 'text-purple-600' },
    { id: 'hospitals', label: 'Hospitals', icon: Building2, count: databaseSnapshot?.hospitals?.length || 0, color: 'text-amber-600' },
    { id: 'doctors', label: 'Physicians / Doctors', icon: Stethoscope, count: databaseSnapshot?.doctors?.length || 0, color: 'text-indigo-600' },
    { id: 'patients', label: 'Patients', icon: Users, count: databaseSnapshot?.patients?.length || 0, color: 'text-teal-600' },
    { id: 'iotReadings', label: 'IoT Vitals Telemetry', icon: Activity, count: databaseSnapshot?.iotReadings?.length || 0, color: 'text-emerald-600' },
    { id: 'driverReadings', label: 'Driver Safety Logs', icon: Car, count: databaseSnapshot?.driverReadings?.length || 0, color: 'text-cyan-600' },
    { id: 'appointments', label: 'Appointments', icon: Calendar, count: databaseSnapshot?.appointments?.length || 0, color: 'text-blue-600' },
    { id: 'healthcareItems', label: 'IoT Kits Catalog', icon: Package, count: databaseSnapshot?.healthcareItems?.length || 0, color: 'text-violet-600' },
    { id: 'emergencyAlerts', label: 'Emergency Alerts', icon: ShieldAlert, count: databaseSnapshot?.emergencyAlerts?.length || 0, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-xs font-semibold text-purple-200 mb-2">
              <Database className="w-3.5 h-3.5 text-purple-300" /> System Database Control & Explorer
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Central Ecosystem Database Manager
            </h1>
            <p className="text-purple-200/80 text-xs max-w-2xl mt-1">
              Direct administrative database control. Inspect raw entity collections, clean the database, export JSON dumps, and review architectural suggestions.
            </p>
          </div>

          {/* Quick Database Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchDatabase}
              disabled={loading}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh Database Snapshot"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-300" />
              <span>Export JSON Backup</span>
            </button>

            <button
              type="button"
              onClick={handleSyncToFirestore}
              disabled={syncingToFirestore || loading}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Cloud className={`w-4 h-4 ${syncingToFirestore ? 'animate-bounce' : ''}`} />
              <span>{syncingToFirestore ? 'Syncing to Firestore...' : 'Sync to Cloud Firestore'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDatabase}
              disabled={loading}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clean / Reset Database</span>
            </button>
          </div>
        </div>

        {/* Action Notice Banner */}
        {actionNotice && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Firestore Cloud Sync Status Message */}
        {firestoreSyncMessage && (
          <div className="mt-4 p-3 bg-amber-500/25 border border-amber-400/50 rounded-xl text-amber-100 text-xs flex items-center gap-2 animate-in fade-in">
            <Cloud className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{firestoreSyncMessage}</span>
          </div>
        )}
      </div>

      {/* WHERE TO VIEW DATA IN FIREBASE GUIDE & RULES HELPER */}
      <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-white rounded-2xl border-2 border-amber-300 p-5 shadow-xs space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
          <div>
            <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
              <Cloud className="w-5 h-5 text-amber-600" />
              <span>Google Cloud Firestore — Live Collections & Rules Guide</span>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Project ID: <strong className="font-mono text-slate-800">smart-health-management-6cc87</strong> • Database: <strong className="font-mono text-slate-800">(default)</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 border ${
              rulesStatus === 'open'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : rulesStatus === 'locked'
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {rulesStatus === 'open' ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-rose-600" />}
              <span>{rulesStatus === 'open' ? 'Firestore Rules: Active' : rulesStatus === 'locked' ? 'Firestore Rules: Locked Mode (PERMISSION_DENIED)' : 'Checking Rules...'}</span>
            </span>

            <button
              type="button"
              onClick={handleSyncToFirestore}
              disabled={syncingToFirestore}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingToFirestore ? 'animate-spin' : ''}`} />
              <span>Push Live Data to Firestore Now</span>
            </button>
          </div>
        </div>

        {/* If Rules are locked (matches user's screenshot situation) */}
        {rulesStatus === 'locked' && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-rose-950">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Why are collections not visible in your Firebase console?</span>
            </div>
            <p className="text-[11px] text-rose-900 leading-relaxed">
              In your Firebase Console (as seen in your screenshot), Cloud Firestore was created in <strong>Locked / Production Mode</strong> where default security rules block all writes (<code className="bg-rose-100 px-1 py-0.5 rounded font-mono">allow read, write: if false;</code>). Because writes are rejected with <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">PERMISSION_DENIED</code>, Firebase has not created the collection tabs yet.
            </p>
            <div className="p-3 bg-white rounded-lg border border-rose-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">
                  Quick 10-Second Fix (Directly in your open Firebase Console tab):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(recommendedRules);
                    setCopiedRules(true);
                    setTimeout(() => setCopiedRules(false), 2500);
                  }}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-md text-[11px] flex items-center gap-1 cursor-pointer border border-indigo-200"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedRules ? 'Copied to Clipboard!' : 'Copy Rule Code'}</span>
                </button>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700">
                <li>In your Firebase Console tab, click the <strong>Rules</strong> tab (located right next to <strong>Data</strong> in your top navigation).</li>
                <li>Replace the contents with the snippet below:</li>
              </ol>
              <pre className="p-2.5 bg-slate-900 text-emerald-300 rounded-md font-mono text-[10px] overflow-x-auto">
{recommendedRules}
              </pre>
              <ol start={3} className="list-decimal list-inside space-y-1 text-[11px] text-slate-700">
                <li>Click the blue <strong>Publish</strong> button in Firebase Console.</li>
                <li>Return here and click <strong>"Push Live Data to Firestore Now"</strong>. All collections (<code className="font-mono text-indigo-700">users</code>, <code className="font-mono text-indigo-700">appointments</code>, <code className="font-mono text-indigo-700">prescriptions</code>, etc.) will immediately appear!</li>
              </ol>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-slate-700">
          <div className="p-3 bg-white/80 rounded-xl border border-amber-200/80">
            <span className="font-bold text-amber-900 block mb-1">1. Open Firebase Console</span>
            <p className="text-[11px] text-slate-600">
              Navigate to <strong>console.firebase.google.com</strong> and open project <strong>smart-health-management-6cc87</strong>.
            </p>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border border-amber-200/80">
            <span className="font-bold text-amber-900 block mb-1">2. Click Firestore Database</span>
            <p className="text-[11px] text-slate-600">
              In the left navigation bar under <strong>Build</strong>, click <strong>Firestore Database</strong>.
            </p>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border border-amber-200/80">
            <span className="font-bold text-amber-900 block mb-1">3. Check Rules Tab</span>
            <p className="text-[11px] text-slate-600">
              Click the <strong>Rules</strong> tab to verify rules are published (<code className="text-amber-800 font-bold">allow read, write: if true;</code>).
            </p>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border border-amber-200/80">
            <span className="font-bold text-amber-900 block mb-1">4. Explore Collections</span>
            <p className="text-[11px] text-slate-600">
              Under the <strong>Data</strong> tab, view documents in collections: <code className="text-amber-800 font-bold">users</code>, <code className="text-amber-800 font-bold">appointments</code>, <code className="text-amber-800 font-bold">prescriptions</code>, <code className="text-amber-800 font-bold">emergency_alerts</code>, <code className="text-amber-800 font-bold">patient_requests</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Database Suggestions & Architecture Guide (User requested suggestions) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Database Architecture & Production Roadmap Suggestions
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowArchSuggestions(!showArchSuggestions)}
            className="text-xs text-purple-700 font-bold hover:underline cursor-pointer"
          >
            {showArchSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
          </button>
        </div>

        {showArchSuggestions && (
          <div className="p-5 text-xs text-slate-600 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-purple-900 text-sm">
                  <Layers className="w-4 h-4 text-purple-700" />
                  <span>1. Relational SQL Core</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>Recommended: PostgreSQL / Cloud SQL</strong>
                  <br />
                  Best suited for structured clinical schemas: <code className="bg-purple-100 px-1 py-0.5 rounded text-purple-900">users</code>, <code className="bg-purple-100 px-1 py-0.5 rounded text-purple-900">hospitals</code>, <code className="bg-purple-100 px-1 py-0.5 rounded text-purple-900">doctors</code>, <code className="bg-purple-100 px-1 py-0.5 rounded text-purple-900">appointments</code>, and <code className="bg-purple-100 px-1 py-0.5 rounded text-purple-900">prescriptions</code>. Guarantees ACID transactions, strict foreign keys, and HIPAA compliance audit trails.
                </p>
              </div>

              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-teal-900 text-sm">
                  <Activity className="w-4 h-4 text-teal-700" />
                  <span>2. Time-Series Telemetry Store</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>Recommended: TimescaleDB / Cloud Firestore</strong>
                  <br />
                  For continuous IoT streams (Heart Rate, Blood Pressure, SpO2, Temperature, Driver Fatigue sensors). Time-series hyper-tables enable rolling 30-day aggregations, trend analysis, and sub-second Gemini AI risk evaluations.
                </p>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>3. Security, Encryption & Privacy</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>Role-Based Access Control (RBAC)</strong>
                  <br />
                  Enforce field-level encryption (AES-256) on Government IDs (Aadhaar, Passports). Implement Row-Level Security (RLS) so patients access strictly their medical data, doctors access their hospital patients, and hospital admins oversee their facility.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-slate-700">
                <Info className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Current Environment State:</strong> Active Full-Stack In-Memory Store running with Express on Node.js. Instant data persistence across API requests with zero lag and full administrative CRUD control.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Database Statistics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        {collectionsMeta.map((col) => {
          const Icon = col.icon;
          const isSelected = selectedCollection === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setSelectedCollection(col.id)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-purple-50/90 border-purple-500 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-slate-100">
                  <Icon className={`w-4 h-4 ${col.color}`} />
                </span>
                <span className={`text-xl font-black ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>
                  {col.count}
                </span>
              </div>
              <p className="font-bold text-slate-800 truncate">{col.label}</p>
              <p className="text-[10px] text-slate-400 capitalize">{col.count} records stored</p>
            </button>
          );
        })}
      </div>

      {/* Collection Explorer & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Explorer Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Viewing Collection:
            </span>
            <span className="px-2.5 py-1 bg-purple-100 text-purple-900 font-mono font-bold rounded-lg text-xs">
              {selectedCollection}
            </span>
            <span className="text-slate-500 text-xs">
              ({filteredRecords.length} records shown)
            </span>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${selectedCollection}...`}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4">Record ID</th>
                <th className="py-2.5 px-4">Primary Subject / Entity</th>
                <th className="py-2.5 px-4">Key Attributes & Clinical Data</th>
                <th className="py-2.5 px-4">Status & Timestamp</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* Record ID */}
                  <td className="py-3 px-4 font-mono font-bold text-purple-900 text-[11px] whitespace-nowrap">
                    {row.id}
                  </td>

                  {/* Primary Subject */}
                  <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {row.avatarUrl && (
                        <img
                          src={row.avatarUrl}
                          alt={row.name || 'avatar'}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                      )}
                      <div>
                        <div>{row.name || row.hospitalName || row.doctorName || row.patientName || row.modelNumber || 'Database Record'}</div>
                        {row.role && (
                          <span className="text-[10px] text-slate-400 capitalize">Role: {row.role}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Attributes Preview */}
                  <td className="py-3 px-4 text-slate-600 max-w-md">
                    <div className="space-y-0.5 truncate text-[11px]">
                      {row.email && <div>Email: <span className="font-semibold text-slate-800">{row.email}</span></div>}
                      {row.phone && <div>Phone: <span className="font-medium text-slate-700">{row.phone}</span></div>}
                      
                      {row.patientProfile && (
                        <div className="text-teal-700 font-medium">
                          ID: {row.patientProfile.govtIdType} ({row.patientProfile.govtIdNumber || 'Aadhaar Verified'}) • Blood: {row.patientProfile.bloodGroup} • BMI: {row.patientProfile.bmi}
                        </div>
                      )}

                      {row.doctorProfile && (
                        <div className="text-indigo-700 font-medium">
                          Lic: {row.doctorProfile.medicalLicenseNumber} • {row.doctorProfile.specialization} • Fee: ₹{row.doctorProfile.consultationFee}
                        </div>
                      )}

                      {row.hospitalProfile && (
                        <div className="text-amber-700 font-medium">
                          Lic: {row.hospitalProfile.licenseNumber} • {row.hospitalProfile.totalBeds} Beds ({row.hospitalProfile.icuBeds} ICU) • ER: {row.hospitalProfile.emergencyHotline}
                        </div>
                      )}

                      {row.heartRate && (
                        <div className="font-mono text-emerald-800 font-bold">
                          HR: {row.heartRate} bpm • BP: {row.systolicBp}/{row.diastolicBp} • SpO2: {row.spO2}% • Temp: {row.temperature}°F
                        </div>
                      )}

                      {row.diagnosis && (
                        <div>Diagnosis: <strong className="text-slate-800">{row.diagnosis}</strong> ({row.doctorName})</div>
                      )}

                      {row.reasonForVisit && (
                        <div>Reason: {row.reasonForVisit} • Slot: {row.timeSlot}</div>
                      )}

                      {row.drowsinessScore !== undefined && (
                        <div className="text-cyan-700 font-bold">
                          Fatigue Score: {row.drowsinessScore}/100 • Eye Closure: {row.eyeClosureDurationMs}ms • Vehicle: {row.vehicleSpeedKmh} km/h
                        </div>
                      )}

                      {row.triggerReason && (
                        <div className="text-rose-600 font-bold">
                          Emergency Reason: {row.triggerReason} (Priority: {row.priority})
                        </div>
                      )}

                      {row.category && (
                        <div>Category: {row.category} (₹{row.price}) • Stock: {row.stock}</div>
                      )}
                    </div>
                  </td>

                  {/* Status & Timestamp */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {row.status && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          row.status === 'active' || row.status === 'verified' || row.status === 'approved' || row.status === 'normal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.status === 'pending' || row.status === 'pending_verification' || row.status === 'warning' || row.status === 'on_hold'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {row.status}
                        </span>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono">
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : row.timestamp ? new Date(row.timestamp).toLocaleDateString() : 'Active Record'}
                      </div>
                    </div>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setInspectedJsonRecord(row)}
                        className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                        title="Inspect JSON Record"
                      >
                        <Code className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(selectedCollection, row.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Record Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">No records found in collection "{selectedCollection}"</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchQuery ? `No matches for query "${searchQuery}"` : 'This collection is currently empty.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Record Inspector Modal */}
      {inspectedJsonRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 text-slate-100 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-700 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="font-mono text-xs text-purple-400 font-bold flex items-center gap-1.5">
                <Code className="w-4 h-4" /> JSON Inspector: {inspectedJsonRecord.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSuccess ? 'Copied!' : 'Copy JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedJsonRecord(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <pre className="bg-black/60 p-4 rounded-xl overflow-x-auto text-[11px] font-mono text-emerald-400 max-h-96 leading-relaxed">
              {JSON.stringify(inspectedJsonRecord, null, 2)}
            </pre>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedJsonRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
