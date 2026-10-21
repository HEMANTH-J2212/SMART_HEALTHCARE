import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  Package,
  Layers,
  HeartPulse,
  Radio,
  Clock,
  Phone,
  MapPin,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Database,
  Download,
  Code,
  Sparkles,
  Mail,
  X,
  Stethoscope,
  FileText,
  Calendar,
  Activity,
  IndianRupee,
  CalendarOff,
  CreditCard,
  Receipt,
  Truck,
  PauseCircle,
  ArrowLeft,
  UserCheck,
  UserX,
  Check,
  FileCheck2,
  AlertCircle,
  Globe,
  Copy,
  Server
} from 'lucide-react';
import { User, HealthcareItem, EmergencyAlert, MEDICAL_SPECIALIZATIONS, UserDocument, KitPaymentOrder } from '../../types';
import { api } from '../../services/api';
import { INDIA_STATES, INDIA_DISTRICTS, fetchIndiaPincodeDetails } from '../../utils/indiaLocations';
import { LocationMapModal, LocationSelectedData } from '../common/LocationMapModal';
import {
  syncUserToFirestore,
  deleteUserFromFirestore,
  clearFirestoreDatabase,
  fetchUsersFromFirestore,
} from '../../services/firestoreSync';
import { RegistrationPageView } from '../registration/RegistrationPageView';

interface AdminDashboardProps {
  onNavigateToDatabase?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateToDatabase }) => {
  const [activeTab, setActiveTab] = useState<'hospitals' | 'doctors' | 'patients' | 'items' | 'emergencies' | 'payments' | 'database'>('hospitals');

  // Data states
  const [hospitals, setHospitals] = useState<User[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [items, setItems] = useState<HealthcareItem[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyAlert[]>([]);
  const [databaseSnapshot, setDatabaseSnapshot] = useState<any>(null);
  const [kitPayments, setKitPayments] = useState<KitPaymentOrder[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('users');
  const [inspectedJsonRecord, setInspectedJsonRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Hospital View & Status Filter
  const [hospitalTabFilter, setHospitalTabFilter] = useState<'pending' | 'verified' | 'on_hold' | 'all'>('pending');
  const [selectedHospitalRecord, setSelectedHospitalRecord] = useState<User | null>(null);
  const [hospitalDetailTab, setHospitalDetailTab] = useState<'beds' | 'facilities' | 'licenses' | 'doctors'>('beds');
  const [hospitalLabSearch, setHospitalLabSearch] = useState<string>('');

  // Custom Domain & Deployment Modal State
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('care.myhospital.org');
  const [domainProviderTab, setDomainProviderTab] = useState<'cloudrun' | 'vps' | 'docker' | 'dns'>('dns');
  const [dnsCopiedKey, setDnsCopiedKey] = useState<string | null>(null);

  // Doctor Navigation & Sub-Page State (Separate Dedicated Pages)
  const [selectedDoctorViewId, setSelectedDoctorViewId] = useState<string | null>(null);
  const [doctorSubTab, setDoctorSubTab] = useState<'profile' | 'patients' | 'suggestions' | 'leaves'>('profile');
  const [doctorHospitalFilter, setDoctorHospitalFilter] = useState<string>('all');
  const [doctorStatusFilter, setDoctorStatusFilter] = useState<string>('all');
  const [doctorSearchQuery, setDoctorSearchQuery] = useState<string>('');

  // Doctor Audit & Treated Patients Full Data
  const [selectedDoctorAudit, setSelectedDoctorAudit] = useState<{
    doctor: User;
    appointments: any[];
    prescriptions: any[];
    leaves: any[];
    patientsCount: number;
  } | null>(null);
  const [loadingDoctorAudit, setLoadingDoctorAudit] = useState(false);

  // Patient Records Search & Filter
  const [patientSearch, setPatientSearch] = useState('');

  // General Filters & User Details Modal
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUserDetail, setSelectedUserDetail] = useState<User | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ name: string; url: string; type?: string } | null>(null);

  // In-Page Action Modal (For Hold / Reject Reason & Immediate Email Dispatch)
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    targetType: 'hospital' | 'doctor';
    targetId: string;
    targetName: string;
    action: 'hold' | 'reject';
    reason: string;
    loading: boolean;
  } | null>(null);

  // Interactive Map Picker Modal in Add Hospital
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Add Hospital Registration Modal (Comprehensive Options matching Registration Page)
  const [isAddHospitalOpen, setIsAddHospitalOpen] = useState(false);
  const [hospName, setHospName] = useState('');
  const [hospCategory, setHospCategory] = useState<'Private Super-Specialty' | 'Government / Public' | 'Trust / Non-Profit' | 'Multi-Specialty Clinic'>('Private Super-Specialty');
  const [hospEmail, setHospEmail] = useState('');
  const [hospPhone, setHospPhone] = useState('');
  const [hospLicense, setHospLicense] = useState('');
  const [hospAccreditation, setHospAccreditation] = useState('NABH Certified & State Health Authority Verified');
  const [hospCountry, setHospCountry] = useState('India');
  const [hospState, setHospState] = useState('Telangana');
  const [hospDistrict, setHospDistrict] = useState('Hyderabad');
  const [hospCity, setHospCity] = useState('Hyderabad');
  const [hospPincode, setHospPincode] = useState('500001');
  const [hospAddress, setHospAddress] = useState('100 Medical Center Parkway');
  const [hospBeds, setHospBeds] = useState('250');
  const [hospIcuBeds, setHospIcuBeds] = useState('30');
  const [hospHotline, setHospHotline] = useState('');
  const [hospAdminRep, setHospAdminRep] = useState('Medical Superintendent');
  const [hospPincodeFetching, setHospPincodeFetching] = useState(false);
  const [hospPincodeFetchStatus, setHospPincodeFetchStatus] = useState<string | null>(null);
  
  // Mandatory Hospital Documents
  const [hospLicenseFile, setHospLicenseFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [hospAccreditationFile, setHospAccreditationFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [hospLogoFile, setHospLogoFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);

  const [hospSelectedDepts, setHospSelectedDepts] = useState<string[]>([
    'Cardiology (Heart & Blood Vessels)',
    'Emergency & Trauma Medicine',
    'Pulmonology (Lungs & Respiratory)',
    'General & Internal Medicine',
  ]);

  // Add Item Modal
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'Patient IoT Kit' | 'Driver Safety Kit' | 'Hospital Monitor' | 'Emergency Telekit'>('Patient IoT Kit');
  const [newItemModel, setNewItemModel] = useState('');
  const [newItemFirmware, setNewItemFirmware] = useState('v1.0.0');
  const [newItemSensors, setNewItemSensors] = useState('Heart Rate, SpO2, Blood Pressure');
  const [newItemPrice, setNewItemPrice] = useState('149');
  const [newItemStock, setNewItemStock] = useState('50');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemImage, setNewItemImage] = useState('');

  // Hospital Action Feedback
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [approvedEmailModal, setApprovedEmailModal] = useState<any | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Fast, lightweight data loader - Zero lag
  const loadData = async () => {
    setLoading(true);
    try {
      const [hospData, allUsers, itemsData, emgData, kitPaymentsData] = await Promise.all([
        api.getAdminHospitals(),
        api.getAllUsers(),
        api.getHealthcareItems(),
        api.getEmergencyAlerts(),
        api.getAdminKitPayments(),
      ]);

      // Combine hospitals and strip any ghost demo artifacts like Apollo
      const cleanHospitals = (hospData || []).filter(
        (h) => h.name !== 'Apollo Super Specialty Care' && h.email !== 'contact@apollohyderabad.org' && h.id !== 'usr-hos-1791470500246'
      );
      const cleanUsers = (allUsers || []).filter(
        (u) => u.name !== 'Apollo Super Specialty Care' && u.email !== 'contact@apollohyderabad.org' && u.id !== 'usr-hos-1791470500246'
      );

      setHospitals(cleanHospitals);
      setUsersList(cleanUsers);
      setItems(itemsData || []);
      setEmergencies(emgData || []);
      setKitPayments(kitPaymentsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseSnapshot = async () => {
    try {
      const dbData = await api.getAdminDatabase();
      setDatabaseSnapshot(dbData);
    } catch (err) {
      console.warn('Failed to load database snapshot:', err);
    }
  };

  const handleDeleteDatabaseRecord = async (collection: string, id: string) => {
    try {
      await api.deleteDatabaseRecord(collection, id);
      setActionFeedback(`Record ${id} deleted from ${collection}.`);
      setTimeout(() => setActionFeedback(null), 4000);
      loadData();
    } catch (err: any) {
      setActionFeedback('Failed to delete record: ' + (err.message || 'Error'));
    }
  };

  const handleDownloadDatabaseJson = () => {
    if (!databaseSnapshot) return;
    const blob = new Blob([JSON.stringify(databaseSnapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smarthealth-database-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResetDatabase = async () => {
    setShowResetConfirm(false);
    setLoading(true);
    try {
      const res = await api.resetDatabase();
      // User Requirement: Clean reset database must delete live Firestore records as well
      try {
        await clearFirestoreDatabase(true);
      } catch (fsErr) {
        console.warn('[AdminDashboard] Firestore reset note:', fsErr);
      }
      setActionFeedback(res.message || 'Database cleaned successfully! Live Firestore collections and portal records are zero. Only Master Admin HEMANTH remains.');
      setTimeout(() => setActionFeedback(null), 5000);
      await loadData();
    } catch (err: any) {
      setActionFeedback('❌ Failed to reset database: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdminHospPincodeLookup = async (code: string) => {
    const pin = code.trim();
    if (pin.length !== 6) return;
    setHospPincodeFetching(true);
    setHospPincodeFetchStatus('Fetching details from India Post...');
    try {
      const info = await fetchIndiaPincodeDetails(pin);
      if (info) {
        if (info.state) setHospState(info.state);
        if (info.district) setHospDistrict(info.district);
        if (info.city) setHospCity(info.city);
        setHospPincodeFetchStatus(`✅ Auto-detected: ${info.city}, ${info.district}, ${info.state}`);
      } else {
        setHospPincodeFetchStatus('Pincode details not found. Please enter manually.');
      }
    } catch {
      setHospPincodeFetchStatus('Unable to auto-fetch. Please enter manually.');
    } finally {
      setHospPincodeFetching(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleViewDoctorInAdmin = async (doctorId: string) => {
    setLoadingDoctorAudit(true);
    try {
      const data = await api.getDoctorFullDetails(doctorId);
      setSelectedDoctorAudit(data);
    } catch (err: any) {
      setActionFeedback('❌ Failed to load doctor audit details: ' + (err.message || 'Error'));
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      setLoadingDoctorAudit(false);
    }
  };

  const handleVerifyHospital = async (id: string, action: 'approve' | 'reject' | 'hold', notes?: string) => {
    try {
      const res = await api.verifyHospital(id, action, notes);
      if (action === 'approve') {
        // User Requirement: Push full details to Firebase Firestore when accepted
        if (res.hospital) {
          try {
            await syncUserToFirestore(res.hospital);
          } catch (fsErr) {
            console.warn('[AdminDashboard] Firestore hospital sync notice:', fsErr);
          }
        }
        setActionFeedback('✅ Hospital registration accepted & verified! Beneficial activation email with credentials dispatched to the hospital.');
        if (res.emailSent) {
          setApprovedEmailModal(res.emailSent);
        }
      } else if (action === 'hold') {
        setActionFeedback('⚠️ Hospital placed on hold. Official email notification dispatched.');
        if (res.emailSent) {
          setApprovedEmailModal(res.emailSent);
        }
      } else {
        try {
          await deleteUserFromFirestore(id);
        } catch (fsErr) {
          console.warn('[AdminDashboard] Firestore delete notice:', fsErr);
        }
        setActionFeedback('❌ Hospital request declined. Rejection notification email dispatched.');
        if (res.emailSent) {
          setApprovedEmailModal(res.emailSent);
        }
      }
      setTimeout(() => setActionFeedback(null), 5000);
      loadData();
    } catch (err: any) {
      setActionFeedback('❌ ' + (err.message || 'Verification failed'));
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleAdminVerifyDoctor = async (id: string, action: 'approve' | 'reject' | 'hold', notes?: string) => {
    try {
      const res = await api.adminVerifyDoctor(id, action, notes);
      if (action === 'approve') {
        if (res.doctor) {
          try {
            await syncUserToFirestore(res.doctor);
          } catch (fsErr) {
            console.warn('[AdminDashboard] Firestore doctor sync notice:', fsErr);
          }
        }
        setActionFeedback(`✅ Dr. ${res.doctor?.name || ''} officially approved! Doctor credentials generated and emailed.`);
        if (res.emailSent) {
          setApprovedEmailModal(res.emailSent);
        }
      } else if (action === 'hold') {
        setActionFeedback('⚠️ Doctor placed on hold. Notification email dispatched.');
        if (res.emailSent) {
          setApprovedEmailModal(res.emailSent);
        }
      } else {
        setActionFeedback('❌ Doctor application declined. Rejection notification email dispatched.');
        if (res.emailSent) {
          setApprovedEmailModal(res.emailSent);
        }
      }
      setTimeout(() => setActionFeedback(null), 5000);
      loadData();
    } catch (err: any) {
      setActionFeedback('❌ ' + (err.message || 'Doctor action failed'));
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleConfirmActionModal = async () => {
    if (!actionModal || !actionModal.reason.trim()) return;
    setActionModal({ ...actionModal, loading: true });
    try {
      if (actionModal.targetType === 'hospital') {
        await handleVerifyHospital(actionModal.targetId, actionModal.action, actionModal.reason);
      } else {
        await handleAdminVerifyDoctor(actionModal.targetId, actionModal.action, actionModal.reason);
      }
      setActionModal(null);
    } catch (err: any) {
      setActionFeedback('❌ Action failed: ' + (err.message || 'Error'));
      setActionModal({ ...actionModal, loading: false });
    }
  };

  const handleApplyMapLocation = (data: LocationSelectedData) => {
    if (data.facilityName) {
      setHospName(data.facilityName);
    }
    if (data.country) setHospCountry(data.country);
    if (data.state) setHospState(data.state);
    if (data.district) setHospDistrict(data.district);
    if (data.city) setHospCity(data.city);
    if (data.pincode) setHospPincode(data.pincode);
    if (data.streetAddress) setHospAddress(data.streetAddress);
    setHospPincodeFetchStatus(`✓ Location set from Google Maps: ${data.facilityName ? `${data.facilityName} • ` : ''}${data.city || data.district}, ${data.state}`);
    setTimeout(() => setHospPincodeFetchStatus(null), 4500);
    setIsMapModalOpen(false);
  };

  const handleCreateHospitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospName.trim() || !hospEmail.trim()) {
      setActionFeedback('❌ Hospital name and official email are required.');
      setTimeout(() => setActionFeedback(null), 5000);
      return;
    }

    // User Requirement: Uploading files should be mandatory
    if (!hospLicenseFile) {
      setActionFeedback('❌ Clinical Establishment / Hospital License document is mandatory. Please upload.');
      setTimeout(() => setActionFeedback(null), 5000);
      return;
    }
    if (!hospAccreditationFile) {
      setActionFeedback('❌ Accreditation Certificate is mandatory. Please upload.');
      setTimeout(() => setActionFeedback(null), 5000);
      return;
    }
    if (!hospLogoFile) {
      setActionFeedback('❌ Official Hospital Logo is mandatory. Please upload the logo.');
      setTimeout(() => setActionFeedback(null), 5000);
      return;
    }

    setLoading(true);
    try {
      const uploadedDocs: UserDocument[] = [
        {
          id: `doc-hosp-lic-${Date.now()}`,
          name: hospLicenseFile.name || 'Hospital License Document',
          type: 'hospital_license',
          url: hospLicenseFile.dataUrl,
          uploadedAt: new Date().toISOString(),
        },
        {
          id: `doc-hosp-acc-${Date.now()}`,
          name: hospAccreditationFile.name || 'Accreditation Certificate',
          type: 'other',
          url: hospAccreditationFile.dataUrl,
          uploadedAt: new Date().toISOString(),
        },
        {
          id: `doc-hosp-logo-${Date.now()}`,
          name: hospLogoFile.name || 'Official Hospital Logo Emblem',
          type: 'other',
          url: hospLogoFile.dataUrl,
          uploadedAt: new Date().toISOString(),
        },
      ];

      const res = await api.registerHospital({
        name: hospName.trim(),
        email: hospEmail.trim().toLowerCase(),
        phone: hospPhone || '+91 (040) 2345-6789',
        licenseNumber: hospLicense || `HOSP-REG-${Math.floor(1000 + Math.random() * 9000)}`,
        accreditation: hospAccreditation,
        hospitalType: hospCategory,
        country: hospCountry,
        state: hospState,
        district: hospDistrict,
        city: hospCity,
        pincode: hospPincode || '500001',
        address: hospAddress || '100 Medical Center Parkway',
        emergencyHotline: hospHotline || hospPhone || '+91 1800-425-9111',
        adminRepresentative: hospAdminRep,
        departments: hospSelectedDepts,
        totalBeds: Number(hospBeds) || 250,
        icuBeds: Number(hospIcuBeds) || 30,
        logoUrl: hospLogoFile.dataUrl,
        avatarUrl: hospLogoFile.dataUrl,
        uploadedDocuments: uploadedDocs,
      });

      // User Requirement: Live sync to Cloud Firestore
      if (res?.hospital) {
        try {
          await syncUserToFirestore(res.hospital);
        } catch (fsErr) {
          console.warn('[AdminDashboard] Firestore live sync notice:', fsErr);
        }
      }

      setIsAddHospitalOpen(false);
      setActionFeedback(`Hospital "${hospName}" registered, authorized, and synchronized to Firestore! Official credentials email dispatched.`);
      setTimeout(() => setActionFeedback(null), 6000);

      // Reset form
      setHospName('');
      setHospEmail('');
      setHospPhone('');
      setHospLicense('');
      setHospAddress('');
      setHospCity('Hyderabad');
      setHospState('Telangana');
      setHospDistrict('Hyderabad');
      setHospPincode('500001');
      setHospHotline('');
      setHospLicenseFile(null);
      setHospAccreditationFile(null);
      setHospLogoFile(null);

      loadData();
    } catch (err: any) {
      setActionFeedback('❌ ' + (err.message || 'Failed to register hospital'));
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUserStatus(user.id, nextStatus);
      loadData();
      if (selectedUserDetail && selectedUserDetail.id === user.id) {
        setSelectedUserDetail({ ...selectedUserDetail, status: nextStatus });
      }
    } catch (err: any) {
      setActionFeedback('❌ Failed to update user status');
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleCreateHealthcareItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemModel) return;

    try {
      await api.addHealthcareItem({
        name: newItemName,
        category: newItemCategory,
        modelNumber: newItemModel,
        firmwareVersion: newItemFirmware,
        supportedSensors: newItemSensors.split(',').map((s) => s.trim()),
        price: Number(newItemPrice),
        stock: Number(newItemStock),
        description: newItemDescription,
        imageUrl: newItemImage || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80',
      });
      setIsAddItemOpen(false);
      // Reset form
      setNewItemName('');
      setNewItemModel('');
      setNewItemDescription('');
      loadData();
    } catch (err: any) {
      setActionFeedback('❌ Failed to add healthcare item');
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await api.deleteHealthcareItem(id);
      setActionFeedback('Healthcare item removed from catalog.');
      setTimeout(() => setActionFeedback(null), 4000);
      loadData();
    } catch (err) {
      setActionFeedback('Failed to delete item.');
    }
  };

  // Hospital filters - strictly exclude rejected/suspended records from pending
  const pendingHospitals = hospitals.filter(
    (h) =>
      h.role === 'hospital' &&
      (h.hospitalProfile?.verificationStatus === 'pending_admin_verification' ||
        h.status === 'pending_admin_approval' ||
        h.status === 'pending_verification') &&
      h.status !== 'rejected' &&
      h.status !== 'suspended' &&
      h.status !== 'on_hold' &&
      h.hospitalProfile?.verificationStatus !== 'rejected' &&
      h.hospitalProfile?.verificationStatus !== 'on_hold'
  );

  const onHoldHospitals = hospitals.filter(
    (h) =>
      h.role === 'hospital' &&
      (h.status === 'on_hold' || h.hospitalProfile?.verificationStatus === 'on_hold')
  );

  const verifiedHospitals = hospitals.filter(
    (h) =>
      h.role === 'hospital' &&
      (h.hospitalProfile?.verificationStatus === 'verified' || h.status === 'active') &&
      h.status !== 'on_hold' &&
      h.status !== 'rejected' &&
      h.status !== 'suspended' &&
      h.hospitalProfile?.verificationStatus !== 'on_hold' &&
      h.hospitalProfile?.verificationStatus !== 'rejected'
  );

  // Doctors & Specialists filter
  const doctorsList = usersList.filter((u) => u.role === 'doctor');
  const filteredDoctors = doctorsList.filter((doc) => {
    if (doctorHospitalFilter !== 'all') {
      const matchHosp = doc.doctorProfile?.hospitalId === doctorHospitalFilter;
      if (!matchHosp) return false;
    }
    if (doctorStatusFilter !== 'all') {
      const approval = doc.doctorProfile?.approvalStatus || 'pending';
      if (doctorStatusFilter === 'approved' && !(approval === 'approved' && doc.status === 'active')) return false;
      if (doctorStatusFilter === 'pending' && !(approval === 'pending' || doc.status === 'pending_verification')) return false;
      if (doctorStatusFilter === 'on_hold' && !(approval === 'on_hold' || doc.status === 'on_hold')) return false;
      if (doctorStatusFilter === 'rejected' && !(approval === 'rejected' || doc.status === 'rejected' || doc.status === 'suspended')) return false;
    }
    if (doctorSearchQuery.trim()) {
      const q = doctorSearchQuery.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchSpec = (doc.doctorProfile?.specialization || '').toLowerCase().includes(q);
      const matchHosp = (doc.doctorProfile?.hospitalName || '').toLowerCase().includes(q);
      const matchLic = (doc.doctorProfile?.medicalLicenseNumber || '').toLowerCase().includes(q);
      return matchName || matchSpec || matchHosp || matchLic;
    }
    return true;
  });

  // Patient records filter with mandatory Aadhaar & Govt ID search
  const patientsList = usersList.filter((u) => u.role === 'patient');
  const filteredPatients = patientsList.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase();
    const nameMatches = p.name.toLowerCase().includes(q);
    const emailMatches = p.email.toLowerCase().includes(q);
    const phoneMatches = p.phone.includes(q);
    const aadharMatches = (p.patientProfile?.aadharNumber || p.patientProfile?.govtIdNumber || '').toLowerCase().includes(q);
    const additionalMatches = (p.patientProfile?.additionalDocNumber || '').toLowerCase().includes(q);
    return nameMatches || emailMatches || phoneMatches || aadharMatches || additionalMatches;
  });

  // Users filter
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-xs font-semibold text-purple-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-300" /> System Administrator: <strong>HEMANTH</strong>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Hospital Verification & Ecosystem Management
            </h1>
            <p className="text-purple-200/80 text-xs max-w-2xl mt-1">
              Verify hospital registrations, manage all user accounts, curate IoT Healthcare Kits catalog, and monitor real-time system emergency telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsAddHospitalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-emerald-200" />
              <span>Register New Hospital</span>
            </button>
            <button
              onClick={() => setIsAddItemOpen(true)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Healthcare Item</span>
            </button>
            <button
              onClick={() => setIsDomainModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Globe className="w-4 h-4 text-indigo-200" />
              <span>Deploy Custom Domain</span>
            </button>
            {onNavigateToDatabase && (
              <button
                onClick={onNavigateToDatabase}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-purple-400/40 text-purple-200 hover:text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Database className="w-4 h-4 text-purple-400" />
                <span>Open System Database</span>
              </button>
            )}
          </div>
        </div>

        {/* Action feedback */}
        {actionFeedback && (
          <div className="mt-4 p-3 bg-teal-500/20 border border-teal-400/40 rounded-xl text-teal-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{actionFeedback}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('hospitals');
            setSelectedDoctorViewId(null);
          }}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'hospitals'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Hospitals Network ({hospitals.length})</span>
          {pendingHospitals.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 font-extrabold rounded-full">
              {pendingHospitals.length} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('doctors');
            setSelectedDoctorViewId(null);
          }}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'doctors'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-indigo-600" />
          <span>Doctors & Specialists ({doctorsList.length})</span>
          {doctorsList.filter((d) => d.doctorProfile?.approvalStatus === 'pending' || d.status === 'pending_verification').length > 0 && (
            <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 font-extrabold rounded-full">
              {doctorsList.filter((d) => d.doctorProfile?.approvalStatus === 'pending' || d.status === 'pending_verification').length} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('patients');
            setSelectedDoctorViewId(null);
          }}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'patients'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-teal-600" />
          <span>Patient Health Records ({patientsList.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('items');
            setSelectedDoctorViewId(null);
          }}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'items'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Healthcare Items & IoT Kits ({items.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('emergencies');
            setSelectedDoctorViewId(null);
          }}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'emergencies'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Emergency Routing ({emergencies.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('payments');
            setSelectedDoctorViewId(null);
          }}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>Kit Orders & Received Payments ({kitPayments.length})</span>
          {kitPayments.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 font-extrabold rounded-full">
              ₹{kitPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('database');
            setSelectedDoctorViewId(null);
            loadDatabaseSnapshot();
          }}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'database'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-purple-600" />
          <span>Live Database Manager</span>
        </button>
      </div>

      {/* ======================= TAB 1: HOSPITAL VERIFICATION ======================= */}
      {activeTab === 'hospitals' && (
        <div className="space-y-6">
          
          {/* Admin Hospital Registration Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Register & Authorize New Hospital Facility
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5 max-w-2xl">
                  Only System Administrators can register and verify medical facilities into the SmartHealth network. Once registered, hospitals can onboard and approve physician rosters.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddHospitalOpen(true)}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New Hospital</span>
            </button>
          </div>

          {/* PENDING APPROVAL QUEUE */}
          <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Pending Hospital Verification Requests ({pendingHospitals.length})
                </h3>
              </div>
              <span className="text-[11px] text-amber-800 font-medium">
                Admin approval is required before hospitals can manage doctors
              </span>
            </div>

            {pendingHospitals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                No pending hospital requests. All registered medical facilities are verified.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingHospitals.map((hosp) => (
                  <div key={hosp.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              hosp.hospitalProfile?.logoUrl ||
                              hosp.avatarUrl ||
                              'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=120&auto=format&fit=crop&q=80'
                            }
                            alt="Hospital Logo"
                            className="w-12 h-12 rounded-xl object-cover bg-white p-0.5 border border-amber-300 shadow-xs shrink-0"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {hosp.hospitalProfile?.hospitalName || hosp.name}
                            </h4>
                            <p className="text-xs text-slate-500">
                              Official Email: <span className="font-semibold text-slate-700">{hosp.email}</span> • Phone: {hosp.phone}
                            </p>
                          </div>
                        </div>

                        {/* License & Credentials Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-400 block uppercase">Govt License #</span>
                            <span className="font-mono font-bold text-slate-800">
                              {hosp.hospitalProfile?.licenseNumber}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-400 block uppercase">Accreditation</span>
                            <span className="font-semibold text-slate-800 truncate block">
                              {hosp.hospitalProfile?.accreditation}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-400 block uppercase">Bed Capacity</span>
                            <span className="font-semibold text-slate-800">
                              {hosp.hospitalProfile?.totalBeds} Beds ({hosp.hospitalProfile?.icuBeds} ICU)
                            </span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-400 block uppercase">Emergency Hotline</span>
                            <span className="font-semibold text-rose-600">
                              {hosp.hospitalProfile?.emergencyHotline}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {hosp.hospitalProfile?.address}, {hosp.hospitalProfile?.city}, {hosp.hospitalProfile?.state}
                          </span>
                        </p>
                      </div>

                      {/* Approval Actions */}
                      <div className="flex sm:flex-col lg:flex-row gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedHospitalRecord(hosp)}
                          className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-indigo-600" />
                          <span>Full Details & Doctors</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionModal({
                            isOpen: true,
                            targetType: 'hospital',
                            targetId: hosp.id,
                            targetName: hosp.hospitalProfile?.hospitalName || hosp.name,
                            action: 'hold',
                            reason: '',
                            loading: false,
                          })}
                          className="px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Hold</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionModal({
                            isOpen: true,
                            targetType: 'hospital',
                            targetId: hosp.id,
                            targetName: hosp.hospitalProfile?.hospitalName || hosp.name,
                            action: 'reject',
                            reason: '',
                            loading: false,
                          })}
                          className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyHospital(hosp.id, 'approve')}
                          className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify & Approve Hospital</span>
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VERIFIED HOSPITALS NETWORK */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Verified Healthcare Facilities Network ({verifiedHospitals.length})
              </h3>
              <span className="text-xs text-slate-500">
                Authorized to onboard and approve doctors
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {verifiedHospitals.map((hosp) => (
                <div key={hosp.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={hosp.avatarUrl || 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=256&q=80'}
                      alt={hosp.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {hosp.hospitalProfile?.hospitalName || hosp.name}
                        </h4>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          Verified & Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        License: <span className="font-mono text-slate-700 font-medium">{hosp.hospitalProfile?.licenseNumber}</span> • {hosp.hospitalProfile?.city}, {hosp.hospitalProfile?.state}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-1">
                        <span>Total Beds: {hosp.hospitalProfile?.totalBeds}</span>
                        <span>•</span>
                        <span>ICU: {hosp.hospitalProfile?.icuBeds}</span>
                        <span>•</span>
                        <span className="text-rose-600 font-medium">ER: {hosp.hospitalProfile?.emergencyHotline}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedHospitalRecord(hosp)}
                      className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>View Hospital & Doctors</span>
                    </button>
                    <button
                      onClick={() => handleToggleUserStatus(hosp)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      {hosp.status === 'active' ? 'Hold Facility' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 2: DOCTORS DIRECTORY & APPROVALS ======================= */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          
          {/* Doctors Filter & Search Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={doctorSearchQuery}
                onChange={(e) => setDoctorSearchQuery(e.target.value)}
                placeholder="Search physician name, specialization, license #..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
              />
              {doctorSearchQuery && (
                <button
                  type="button"
                  onClick={() => setDoctorSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Hospital Affiliation Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={doctorHospitalFilter}
                  onChange={(e) => setDoctorHospitalFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="all">All Hospitals ({hospitals.length})</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.hospitalProfile?.hospitalName || h.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={doctorStatusFilter}
                onChange={(e) => setDoctorStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="all">All Statuses ({doctorsList.length})</option>
                <option value="pending">Pending Verification ({doctorsList.filter(d => d.doctorProfile?.approvalStatus === 'pending' || d.status === 'pending_verification').length})</option>
                <option value="approved">Approved & Active ({doctorsList.filter(d => (d.doctorProfile?.approvalStatus === 'approved' || d.doctorProfile?.approvalStatus === 'active') && d.status === 'active').length})</option>
                <option value="on_hold">On Hold ({doctorsList.filter(d => d.doctorProfile?.approvalStatus === 'on_hold' || d.status === 'on_hold').length})</option>
                <option value="rejected">Rejected ({doctorsList.filter(d => d.doctorProfile?.approvalStatus === 'rejected' || d.status === 'rejected').length})</option>
              </select>

              {(doctorHospitalFilter !== 'all' || doctorStatusFilter !== 'all' || doctorSearchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setDoctorHospitalFilter('all');
                    setDoctorStatusFilter('all');
                    setDoctorSearchQuery('');
                  }}
                  className="px-3 py-2 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Active Hospital Filter Indicator */}
          {doctorHospitalFilter !== 'all' && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900 font-semibold">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>
                  Showing doctors affiliated with:{' '}
                  <strong>
                    {hospitals.find((h) => h.id === doctorHospitalFilter)?.hospitalProfile?.hospitalName ||
                     hospitals.find((h) => h.id === doctorHospitalFilter)?.name ||
                     doctorHospitalFilter}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDoctorHospitalFilter('all')}
                className="text-xs text-indigo-700 underline font-bold cursor-pointer"
              >
                Clear Hospital Filter
              </button>
            </div>
          )}

          {/* Doctors List */}
          {filteredDoctors.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
              <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Doctors Found</p>
              <p className="text-xs text-slate-500 mt-1">
                {doctorSearchQuery || doctorHospitalFilter !== 'all' || doctorStatusFilter !== 'all'
                  ? 'Try modifying your search or status filters.'
                  : 'No physicians are currently registered in this category.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDoctors.map((doc) => {
                const isPending = doc.doctorProfile?.approvalStatus === 'pending' || doc.status === 'pending_verification';
                const isHold = doc.doctorProfile?.approvalStatus === 'on_hold' || doc.status === 'on_hold';
                const isRejected = doc.doctorProfile?.approvalStatus === 'rejected' || doc.status === 'rejected' || doc.status === 'suspended';
                const isApproved = !isPending && !isHold && !isRejected;

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-5 shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={doc.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(doc.name)}`}
                          alt={doc.name}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-100 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{doc.name}</h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : isHold
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isApproved ? 'Approved' : isPending ? 'Pending Verification' : isHold ? 'On Hold' : 'Rejected'}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-indigo-700">
                            {doc.doctorProfile?.specialization || 'General Physician'}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{doc.doctorProfile?.hospitalName || 'Affiliated Hospital'}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 font-medium">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">License #</span>
                        <span className="font-mono text-slate-800">{doc.doctorProfile?.medicalLicenseNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Qualifications</span>
                        <span className="text-slate-800 truncate block">{doc.doctorProfile?.qualifications || doc.doctorProfile?.ugDegree || 'MBBS'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Experience</span>
                        <span className="text-slate-800">{doc.doctorProfile?.yearsOfExperience ?? 1} Years</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Consultation Fee</span>
                        <span className="text-emerald-700 font-bold">₹{doc.doctorProfile?.consultationFee ?? 500}</span>
                      </div>
                    </div>

                    {doc.doctorProfile?.rejectionReason && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                        <strong>Administrative Note:</strong> {doc.doctorProfile.rejectionReason}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewDoctorInAdmin(doc.id)}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>View Full Practice & Patients</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAdminVerifyDoctor(doc.id, 'approve')}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Accept Doctor</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActionModal({
                                isOpen: true,
                                targetType: 'doctor',
                                targetId: doc.id,
                                targetName: doc.name,
                                action: 'hold',
                                reason: '',
                                loading: false,
                              })}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>Hold</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActionModal({
                                isOpen: true,
                                targetType: 'doctor',
                                targetId: doc.id,
                                targetName: doc.name,
                                action: 'reject',
                                reason: '',
                                loading: false,
                              })}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {isApproved && (
                          <button
                            type="button"
                            onClick={() => setActionModal({
                              isOpen: true,
                              targetType: 'doctor',
                              targetId: doc.id,
                              targetName: doc.name,
                              action: 'hold',
                              reason: '',
                              loading: false,
                            })}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Hold Doctor</span>
                          </button>
                        )}

                        {isHold && (
                          <button
                            type="button"
                            onClick={() => handleAdminVerifyDoctor(doc.id, 'approve', 'Hold lifted by admin')}
                            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resume Activities (Unhold)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 3: PATIENT HEALTH RECORDS ======================= */}
      {activeTab === 'patients' && (
        <div className="space-y-4">
          
          {/* Patient Search & Government ID / Aadhaar Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search by Aadhaar #, Govt ID, Name, Phone, Email..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
              />
              {patientSearch && (
                <button
                  type="button"
                  onClick={() => setPatientSearch('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto text-xs">
              <div className="px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Total Patients: {patientsList.length}</span>
              </div>
              <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Aadhaar Verified: {patientsList.filter((p) => p.patientProfile?.aadharNumber || p.patientProfile?.govtIdNumber).length}</span>
              </div>
            </div>
          </div>

          {/* Patients Table & Records */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Patient Profile</th>
                    <th className="py-3 px-4">Mandatory Aadhaar Card Details</th>
                    <th className="py-3 px-4">Optional Additional ID</th>
                    <th className="py-3 px-4">Clinical Demographics</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No patient records match the search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((p) => {
                      const aadharDoc = p.uploadedDocuments?.find((d) => d.type === 'aadhar' || d.name?.toLowerCase().includes('aadhar')) || 
                        (p.patientProfile?.aadharDocumentUrl ? { name: p.patientProfile.aadharDocumentName || 'Aadhaar Card', url: p.patientProfile.aadharDocumentUrl, type: 'aadhar' } : null);
                      const additionalDoc = p.uploadedDocuments?.find((d) => d.type === 'other' || (!d.type?.includes('aadhar') && !d.name?.toLowerCase().includes('aadhar'))) ||
                        (p.patientProfile?.additionalDocUrl ? { name: p.patientProfile.additionalDocName || `${p.patientProfile.additionalDocType} Document`, url: p.patientProfile.additionalDocUrl, type: 'other' } : null);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={p.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name)}`}
                                alt={p.name}
                                className="w-9 h-9 rounded-full border border-slate-200 object-cover"
                              />
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                                <p className="text-[11px] text-slate-500">{p.email}</p>
                                <p className="text-[11px] text-slate-500 font-mono">{p.phone}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-200 font-mono">
                                <ShieldCheck className="w-3 h-3 text-teal-700" />
                                {p.patientProfile?.aadharNumber || p.patientProfile?.govtIdNumber || 'Aadhaar Registered'}
                              </span>
                              {aadharDoc?.url ? (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setViewingDoc(aadharDoc)}
                                    className="px-2 py-0.5 bg-white hover:bg-teal-50 border border-teal-300 text-teal-800 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3 text-teal-600" />
                                    <span>View Aadhaar Doc</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 block italic">Document on File</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {p.patientProfile?.additionalDocType && p.patientProfile.additionalDocType !== 'None' ? (
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold text-slate-800 block">
                                  {p.patientProfile.additionalDocType}
                                </span>
                                {p.patientProfile.additionalDocNumber && (
                                  <span className="font-mono text-[10px] text-slate-600 block">
                                    #{p.patientProfile.additionalDocNumber}
                                  </span>
                                )}
                                {additionalDoc?.url && (
                                  <button
                                    type="button"
                                    onClick={() => setViewingDoc(additionalDoc)}
                                    className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3 text-slate-500" />
                                    <span>View Doc</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">None Provided</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            {p.patientProfile ? (
                              <div className="space-y-0.5 text-[11px]">
                                <div>
                                  <span className="font-bold text-slate-800">Blood: {p.patientProfile.bloodGroup}</span> • {p.patientProfile.gender} • DOB: {p.patientProfile.dateOfBirth}
                                </div>
                                <div>
                                  BMI: <strong className="text-slate-800">{p.patientProfile.bmi}</strong> • Ht: {p.patientProfile.heightCm}cm • Wt: {p.patientProfile.weightKg}kg
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-xs">
                                  Conditions: {p.patientProfile.existingConditions?.join(', ') || 'None'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No clinical record</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {p.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedUserDetail(p)}
                                className="px-2.5 py-1 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Inspect Full Patient Medical File"
                              >
                                <Eye className="w-3.5 h-3.5 text-teal-600" />
                                <span>Full Record</span>
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(p)}
                                className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                                  p.status === 'active'
                                    ? 'text-rose-700 hover:bg-rose-50'
                                    : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {p.status === 'active' ? 'Hold' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 3: HEALTHCARE ITEMS CATALOG ======================= */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Healthcare Items & IoT Smart Hardware Catalog
              </h3>
              <p className="text-xs text-slate-500">
                Manage patient IoT health check kits, driver safety pods, and medical monitors.
              </p>
            </div>
            <button
              onClick={() => setIsAddItemOpen(true)}
              className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Healthcare Item
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col hover:border-purple-200 transition-all">
                <div className="h-40 bg-slate-100 relative overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-black/60 backdrop-blur-md text-white font-semibold text-[10px] rounded-full">
                    {item.category}
                  </span>
                  <span className="absolute top-3 right-3 px-2 py-0.5 bg-purple-900/80 backdrop-blur-md text-white font-mono text-[10px] rounded-md">
                    {item.modelNumber}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {item.name}
                      </h4>
                      <span className="text-sm font-black text-purple-700 shrink-0">
                        ₹{item.price.toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {item.description}
                    </p>

                    {/* Supported sensors */}
                    <div className="mb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Sensors Included
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.supportedSensors.map((sensor, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                            {sensor}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      In Stock: <strong className="text-slate-800">{item.stock} units</strong>
                    </span>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================= TAB 4: DIRECT HOSPITAL EMERGENCY ROUTING ======================= */}
      {activeTab === 'emergencies' && (
        <div className="space-y-4">
          {/* Architecture Protocol Notice */}
          <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-white p-5 rounded-2xl border-2 border-rose-300 shadow-2xs space-y-2 text-xs">
            <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Direct Hospital Emergency Routing Active (Admin Bypass Protocol)</span>
            </div>
            <p className="text-rose-950 leading-relaxed font-medium">
              <strong>Strict Clinical Routing Rule:</strong> When a patient triggers a medical SOS emergency, all distress telemetry and location coordinates are transmitted <strong>directly to the patient's chosen hospital emergency department</strong> and the attending physician. Emergency details are delivered to the patient and hospital only, not to the system admin.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 font-semibold pt-1">
              <span>● Live alert stream directed to: Target Hospital ER Portal</span>
              <span>● Immediate notifications sent to: Patient & Chosen Hospital Only</span>
              <span>● Admin Console Role: Audit compliance registry</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Network-Wide Emergency Alert Telemetry
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time critical health threshold notifications and SOS dispatches.
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Stream
            </button>
          </div>

          <div className="space-y-3">
            {emergencies.map((emg) => (
              <div
                key={emg.id}
                className={`p-4 rounded-2xl border shadow-xs transition-all ${
                  emg.status === 'resolved'
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-rose-50/50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          emg.severity === 'critical'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {emg.severity} Alert
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        {emg.patientName} — {emg.triggerReason}
                      </h4>
                    </div>

                    <p className="text-xs font-mono text-rose-900 font-semibold mb-1">
                      {emg.vitalSummary}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Location: {emg.location}</span>
                      <span>•</span>
                      <span>Target Hospital: <strong className="text-slate-700">{emg.targetHospitalName}</strong></span>
                      <span>•</span>
                      <span>Time: {new Date(emg.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        emg.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-200 text-rose-900 animate-pulse'
                      }`}
                    >
                      {emg.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================= TAB: HEALTHCARE KIT RECEIVED PAYMENTS & ORDERS ======================= */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Top Payment Metrics Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Received Revenue</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  ₹{kitPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()}
                </h3>
                <p className="text-[11px] text-emerald-600 font-medium">From patient IoT kit purchases</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Kit Orders</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{kitPayments.length}</h3>
                <p className="text-[11px] text-indigo-600 font-medium">Verified transactions</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-amber-100 text-amber-700 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Dispatch</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {kitPayments.filter((p) => p.fulfillmentStatus === 'processing').length}
                </h3>
                <p className="text-[11px] text-amber-600 font-medium">Pending kits to dispatch</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-teal-100 text-teal-700 rounded-xl">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispatched / Delivered</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {kitPayments.filter((p) => p.fulfillmentStatus === 'dispatched' || p.fulfillmentStatus === 'delivered').length}
                </h3>
                <p className="text-[11px] text-teal-600 font-medium">Fulfillment completed</p>
              </div>
            </div>
          </div>

          {/* Kit Orders and Payments List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Patient Healthcare Kit Payments & Order Registry
                </h3>
              </div>
              <button
                type="button"
                onClick={loadData}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Payments</span>
              </button>
            </div>

            {kitPayments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">No kit payment orders received yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  When patients order their IoT health kits (Pulse Oximeter, Smart BP Monitor, ECG patch) from the Patient Dashboard, all received payment amounts and shipping details will appear here for admin tracking.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">Order ID & Date</th>
                      <th className="py-3 px-4">Patient Details</th>
                      <th className="py-3 px-4">Item Ordered</th>
                      <th className="py-3 px-4">Amount & Payment Method</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4">Shipping & Fulfillment</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kitPayments.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-mono font-bold text-purple-900 text-[11px]">{order.id}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(order.orderedAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{order.patientName}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{order.patientEmail}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{order.patientPhone || 'N/A'}</span>
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {order.itemImage ? (
                              <img
                                src={order.itemImage}
                                alt={order.itemName}
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900">{order.itemName}</p>
                              <span className="inline-block text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium mt-0.5">
                                {order.itemCategory || 'Medical IoT'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-black text-emerald-700 text-sm">₹{order.amount.toLocaleString()}</p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5">
                            <CreditCard className="w-3 h-3 text-slate-400" />
                            <span>{order.paymentMethod}</span>
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">Txn: {order.transactionId}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              order.paymentStatus === 'received' || order.paymentStatus === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{order.paymentStatus}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex items-start gap-1 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-[11px] line-clamp-2">{order.shippingAddress}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                order.fulfillmentStatus === 'delivered'
                                  ? 'bg-teal-100 text-teal-800'
                                  : order.fulfillmentStatus === 'dispatched'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              Status: {order.fulfillmentStatus}
                            </span>
                            {order.trackingNumber && (
                              <span className="text-[10px] font-mono text-slate-500">
                                Track: {order.trackingNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.fulfillmentStatus === 'processing' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const track = `TRK-${Math.floor(100000 + Math.random() * 900000)}`;
                                    await fetch(`/api/admin/payments/${order.id}/status`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        fulfillmentStatus: 'dispatched',
                                        paymentStatus: 'verified',
                                        trackingNumber: track,
                                      }),
                                    });
                                    setActionFeedback(`Order ${order.id} marked as dispatched. Tracking: ${track}`);
                                    setTimeout(() => setActionFeedback(null), 4000);
                                    await loadData();
                                  } catch (err: any) {
                                    setActionFeedback('Failed to update status: ' + err.message);
                                  }
                                }}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                Mark Dispatched
                              </button>
                            )}

                            {order.fulfillmentStatus === 'dispatched' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await fetch(`/api/admin/payments/${order.id}/status`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        fulfillmentStatus: 'delivered',
                                        paymentStatus: 'verified',
                                      }),
                                    });
                                    setActionFeedback(`Order ${order.id} marked as delivered to patient.`);
                                    setTimeout(() => setActionFeedback(null), 4000);
                                    await loadData();
                                  } catch (err: any) {
                                    setActionFeedback('Failed to update status: ' + err.message);
                                  }
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                Mark Delivered
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 5: LIVE DATABASE MANAGER ======================= */}
      {activeTab === 'database' && (
        <div className="space-y-4 text-xs">
          
          {/* Database Control Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-700" />
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Live System Database Explorer & Management
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Inspect, query, download, and manage raw database records across all ecosystem collections.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                disabled={loading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clean / Reset DB</span>
              </button>
              {onNavigateToDatabase && (
                <button
                  type="button"
                  onClick={onNavigateToDatabase}
                  className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded-lg border border-purple-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-purple-700" />
                  <span>Open Full Dedicated DB Page</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadDatabaseJson}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Backup</span>
              </button>
              <button
                type="button"
                onClick={loadData}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh DB</span>
              </button>
            </div>
          </div>

          {/* Collection Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
            {[
              { id: 'users', label: 'All Users', count: databaseSnapshot?.users?.length || usersList.length },
              { id: 'hospitals', label: 'Hospitals', count: databaseSnapshot?.hospitals?.length || hospitals.length },
              { id: 'doctors', label: 'Doctors', count: databaseSnapshot?.doctors?.length || 0 },
              { id: 'patients', label: 'Patients', count: databaseSnapshot?.patients?.length || 0 },
              { id: 'healthcareItems', label: 'IoT Kits / Devices', count: databaseSnapshot?.healthcareItems?.length || items.length },
              { id: 'appointments', label: 'Appointments', count: databaseSnapshot?.appointments?.length || 0 },
              { id: 'iotReadings', label: 'IoT Vitals', count: databaseSnapshot?.iotReadings?.length || 0 },
              { id: 'emergencyAlerts', label: 'Emergency Alerts', count: databaseSnapshot?.emergencyAlerts?.length || emergencies.length },
              { id: 'driverReadings', label: 'Driver Safety', count: databaseSnapshot?.driverReadings?.length || 0 },
            ].map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setSelectedCollection(col.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCollection === col.id
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{col.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  selectedCollection === col.id ? 'bg-purple-900 text-purple-100' : 'bg-slate-200 text-slate-700'
                }`}>
                  {col.count}
                </span>
              </button>
            ))}
          </div>

          {/* Active Collection Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Collection: <span className="font-mono text-purple-800">{selectedCollection}</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {(databaseSnapshot?.[selectedCollection] || []).length} Records Stored
              </span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Record ID</th>
                    <th className="py-2.5 px-3">Primary Identifier</th>
                    <th className="py-2.5 px-3">Attributes / Data Preview</th>
                    <th className="py-2.5 px-3">Status / Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    let rows: any[] = databaseSnapshot?.[selectedCollection] || [];
                    if (selectedCollection === 'users') {
                      const hospitals = rows
                        .filter((u: any) => u.role === 'hospital')
                        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
                      const patients = rows
                        .filter((u: any) => u.role === 'patient')
                        .sort((a: any, b: any) => {
                          const hospA = a.patientProfile?.assignedHospitalName || '';
                          const hospB = b.patientProfile?.assignedHospitalName || '';
                          if (hospA !== hospB) return hospA.localeCompare(hospB);
                          return (a.name || '').localeCompare(b.name || '');
                        });
                      rows = [...hospitals, ...patients];
                    }
                    return rows.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-purple-900 font-bold whitespace-nowrap">
                        {row.id}
                      </td>

                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        {row.name || row.patientName || row.hospitalName || row.doctorName || row.driverName || 'Record'}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 max-w-md truncate">
                        {row.email && <span className="mr-2">Email: {row.email}</span>}
                        {row.doctorProfile && (
                          <span className="mr-2">Lic: {row.doctorProfile.medicalLicenseNumber} ({row.doctorProfile.specialization})</span>
                        )}
                        {row.hospitalProfile && (
                          <span className="mr-2">Lic: {row.hospitalProfile.licenseNumber} ({row.hospitalProfile.totalBeds} Beds)</span>
                        )}
                        {row.heartRate && (
                          <span className="mr-2 font-mono">HR: {row.heartRate} bpm | BP: {row.systolicBp}/{row.diastolicBp} | SpO2: {row.spO2}%</span>
                        )}
                        {row.diagnosis && (
                          <span className="mr-2 font-semibold">Diagnosis: {row.diagnosis}</span>
                        )}
                        {row.reasonForVisit && (
                          <span className="mr-2">Reason: {row.reasonForVisit}</span>
                        )}
                        {row.triggerReason && (
                          <span className="mr-2 text-rose-700 font-bold">{row.triggerReason}</span>
                        )}
                        {row.category && (
                          <span className="mr-2">{row.category} (₹{row.price})</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {row.status && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mr-1.5 ${
                            row.status === 'active' || row.status === 'approved' || row.status === 'verified' || row.status === 'normal'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.status === 'pending' || row.status === 'pending_verification' || row.status === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {row.status}
                          </span>
                        )}
                        <span>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : row.timestamp ? new Date(row.timestamp).toLocaleDateString() : ''}</span>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setInspectedJsonRecord(row)}
                            className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Inspect JSON Record"
                          >
                            <Code className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDatabaseRecord(selectedCollection, row.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete this record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ));
                  })()}

                  {(databaseSnapshot?.[selectedCollection] || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No records stored in collection "{selectedCollection}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* JSON Inspector Modal */}
          {inspectedJsonRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-slate-900 text-slate-100 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-700 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <span className="font-mono text-xs text-purple-400 font-bold flex items-center gap-1.5">
                    <Code className="w-4 h-4" /> JSON Inspector: {inspectedJsonRecord.id}
                  </span>
                  <button
                    onClick={() => setInspectedJsonRecord(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <pre className="bg-black/50 p-4 rounded-xl overflow-x-auto text-[11px] font-mono text-emerald-400 max-h-96">
                  {JSON.stringify(inspectedJsonRecord, null, 2)}
                </pre>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setInspectedJsonRecord(null)}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================= ADD HEALTHCARE ITEM MODAL ======================= */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span>Add Healthcare Item / IoT Device</span>
              </h3>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHealthcareItem} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Item / Device Name *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Smart CardioKit Pro Max"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Patient IoT Kit">Patient IoT Kit</option>
                    <option value="Driver Safety Kit">Driver Safety Kit</option>
                    <option value="Hospital Monitor">Hospital Bedside Monitor</option>
                    <option value="Emergency Telekit">Emergency Telekit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Model Number *</label>
                  <input
                    type="text"
                    required
                    value={newItemModel}
                    onChange={(e) => setNewItemModel(e.target.value)}
                    placeholder="SCK-900-PRO"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Stock Count</label>
                  <input
                    type="number"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Firmware</label>
                  <input
                    type="text"
                    value={newItemFirmware}
                    onChange={(e) => setNewItemFirmware(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Supported Sensors (comma separated)
                </label>
                <input
                  type="text"
                  value={newItemSensors}
                  onChange={(e) => setNewItemSensors(e.target.value)}
                  placeholder="Heart Rate, Blood Pressure, SpO2, Temperature, Glucose"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Clinical device details..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Healthcare Item to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= USER DETAIL INSPECTION MODAL ======================= */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>User Record & Health Profile</span>
              </h3>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <img
                  src={selectedUserDetail.avatarUrl}
                  alt={selectedUserDetail.name}
                  className="w-12 h-12 rounded-full border border-slate-200"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{selectedUserDetail.name}</h4>
                  <p className="text-slate-500">{selectedUserDetail.email} • {selectedUserDetail.phone}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-purple-700">
                    Role: {selectedUserDetail.role}
                  </span>
                </div>
              </div>

              {selectedUserDetail.patientProfile && (
                <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl space-y-2">
                  <h5 className="font-bold text-teal-900">Patient Health & Physical Profile:</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div>DOB: <strong>{selectedUserDetail.patientProfile.dateOfBirth}</strong></div>
                    <div>Blood Group: <strong>{selectedUserDetail.patientProfile.bloodGroup}</strong></div>
                    <div>BMI: <strong>{selectedUserDetail.patientProfile.bmi} kg/m²</strong></div>
                    <div>Height: {selectedUserDetail.patientProfile.heightCm} cm</div>
                    <div>Weight: {selectedUserDetail.patientProfile.weightKg} kg</div>
                  </div>
                  <p>Existing Conditions: <strong>{selectedUserDetail.patientProfile.existingConditions.join(', ') || 'None'}</strong></p>
                  <p>Allergies: <strong>{selectedUserDetail.patientProfile.allergies.join(', ') || 'None'}</strong></p>
                  <p>Emergency Contact: <strong>{selectedUserDetail.patientProfile.emergencyContact.name} ({selectedUserDetail.patientProfile.emergencyContact.relationship}) — {selectedUserDetail.patientProfile.emergencyContact.phone}</strong></p>
                </div>
              )}

              {selectedUserDetail.doctorProfile && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
                  <h5 className="font-bold text-indigo-900">Doctor Credentials:</h5>
                  <p>Medical License: <strong className="font-mono">{selectedUserDetail.doctorProfile.medicalLicenseNumber}</strong></p>
                  <p>Staff ID: <strong className="font-mono">{selectedUserDetail.doctorProfile.doctorIdNumber}</strong></p>
                  <p>Hospital: <strong>{selectedUserDetail.doctorProfile.hospitalName}</strong></p>
                  <p>Specialization: <strong>{selectedUserDetail.doctorProfile.specialization}</strong> ({selectedUserDetail.doctorProfile.yearsOfExperience} yrs exp)</p>
                  <p>Degrees: {selectedUserDetail.doctorProfile.qualifications}</p>
                  <p>Consultation Fee: ₹{selectedUserDetail.doctorProfile.consultationFee}</p>
                  <p>Leave Allowance: {selectedUserDetail.doctorProfile.maxLeaveAllowance ?? 5} working days</p>
                  <p>Hospital Approval: <strong className="uppercase">{selectedUserDetail.doctorProfile.approvalStatus}</strong></p>
                </div>
              )}

              {selectedUserDetail.hospitalProfile && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                  <h5 className="font-bold text-amber-900">Hospital Facility & Licensing Credentials:</h5>
                  <p>Facility Legal Name: <strong>{selectedUserDetail.hospitalProfile.hospitalName}</strong></p>
                  <p>Clinical License: <strong className="font-mono">{selectedUserDetail.hospitalProfile.licenseNumber}</strong></p>
                  <p>Accreditation: <strong>{selectedUserDetail.hospitalProfile.accreditation}</strong></p>
                  <p>Emergency Hotline: <strong className="font-mono text-rose-700">{selectedUserDetail.hospitalProfile.emergencyHotline}</strong></p>
                  <p>Address: {selectedUserDetail.hospitalProfile.address}, {selectedUserDetail.hospitalProfile.city}, {selectedUserDetail.hospitalProfile.state} - {selectedUserDetail.hospitalProfile.pincode}</p>
                  <p>Bed Capacity: <strong>{selectedUserDetail.hospitalProfile.totalBeds} total ({selectedUserDetail.hospitalProfile.icuBeds} ICU)</strong></p>
                  <p>Admin Representative: {selectedUserDetail.hospitalProfile.adminRepresentative}</p>
                  <p>Verification Status: <strong className="uppercase">{selectedUserDetail.hospitalProfile.verificationStatus}</strong></p>
                </div>
              )}

              {/* Uploaded Basic Documents & Certificates */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Uploaded Documents & Credentials ({selectedUserDetail.uploadedDocuments?.length || 0})</span>
                  </h5>
                  <span className="text-[10px] text-slate-500 font-semibold">Synced with Firestore</span>
                </div>

                {(!selectedUserDetail.uploadedDocuments || selectedUserDetail.uploadedDocuments.length === 0) ? (
                  <p className="text-slate-400 text-xs italic">No verification documents attached to this profile.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {selectedUserDetail.uploadedDocuments.map((doc) => (
                      <div key={doc.id} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate">{doc.name}</p>
                          <span className="text-[10px] text-purple-700 uppercase font-semibold font-mono block">
                            Type: {doc.type}
                          </span>
                        </div>
                        {doc.url && (
                          <button
                            type="button"
                            onClick={() => setViewingDoc(doc)}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-[11px] font-bold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: COMPREHENSIVE HOSPITAL AUDIT & DETAILS ======================= */}
      {selectedHospitalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8 max-h-[92vh] overflow-y-auto space-y-5 animate-in zoom-in-95 text-xs">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={
                    selectedHospitalRecord.hospitalProfile?.logoUrl ||
                    selectedHospitalRecord.avatarUrl ||
                    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=120&auto=format&fit=crop&q=80'
                  }
                  alt="Hospital Logo"
                  className="w-12 h-12 rounded-2xl object-cover bg-white p-0.5 border border-amber-300 shadow-xs shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900 truncate">
                      {selectedHospitalRecord.hospitalProfile?.hospitalName || selectedHospitalRecord.name}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                      selectedHospitalRecord.hospitalProfile?.verificationStatus === 'verified' || selectedHospitalRecord.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : selectedHospitalRecord.hospitalProfile?.verificationStatus === 'on_hold' || selectedHospitalRecord.status === 'on_hold'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {selectedHospitalRecord.hospitalProfile?.verificationStatus || selectedHospitalRecord.status}
                    </span>
                    {selectedHospitalRecord.hospitalProfile?.isClinicalActVerified && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-teal-600" />
                        <span>Clinical Act Verified</span>
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Category: <strong className="text-slate-800">{selectedHospitalRecord.hospitalProfile?.hospitalType || 'Clinical Healthcare Facility'}</strong> · Govt License: <span className="font-mono font-bold text-slate-800">{selectedHospitalRecord.hospitalProfile?.licenseNumber || 'PENDING'}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2 shrink-0">
                {selectedHospitalRecord.hospitalProfile?.verificationStatus !== 'verified' && selectedHospitalRecord.status !== 'active' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const h = selectedHospitalRecord;
                        setSelectedHospitalRecord(null);
                        setActionModal({
                          isOpen: true,
                          targetType: 'hospital',
                          targetId: h.id,
                          targetName: h.hospitalProfile?.hospitalName || h.name,
                          action: 'hold',
                          reason: '',
                          loading: false,
                        });
                      }}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Hold Facility</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const h = selectedHospitalRecord;
                        setSelectedHospitalRecord(null);
                        setActionModal({
                          isOpen: true,
                          targetType: 'hospital',
                          targetId: h.id,
                          targetName: h.hospitalProfile?.hospitalName || h.name,
                          action: 'reject',
                          reason: '',
                          loading: false,
                        });
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleVerifyHospital(selectedHospitalRecord.id, 'approve');
                        setSelectedHospitalRecord(null);
                      }}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify & Authorize</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedHospitalRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-1 rounded-2xl gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setHospitalDetailTab('beds')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  hospitalDetailTab === 'beds'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>Bed Capacities & Departments</span>
              </button>

              <button
                type="button"
                onClick={() => setHospitalDetailTab('facilities')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  hospitalDetailTab === 'facilities'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Facilities, Timings & Diagnostics</span>
                {selectedHospitalRecord.hospitalProfile?.availableLabTests?.length ? (
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-mono">
                    {selectedHospitalRecord.hospitalProfile.availableLabTests.length}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setHospitalDetailTab('licenses')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  hospitalDetailTab === 'licenses'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Statutory Licenses, Trust & Docs</span>
                {selectedHospitalRecord.uploadedDocuments?.length ? (
                  <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] rounded-full font-mono">
                    {selectedHospitalRecord.uploadedDocuments.length}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setHospitalDetailTab('doctors')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  hospitalDetailTab === 'doctors'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                <span>Affiliated Physicians Roster</span>
                {(() => {
                  const count = usersList.filter(
                    (u) =>
                      u.role === 'doctor' &&
                      (u.doctorProfile?.hospitalId === selectedHospitalRecord.id ||
                        u.doctorProfile?.hospitalName?.toLowerCase() === (selectedHospitalRecord.hospitalProfile?.hospitalName || selectedHospitalRecord.name).toLowerCase())
                  ).length;
                  return (
                    <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] rounded-full font-mono">
                      {count}
                    </span>
                  );
                })()}
              </button>
            </div>

            {/* ================= TAB 1: BEDS & INFRASTRUCTURE ================= */}
            {hospitalDetailTab === 'beds' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-2xl">
                    <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider block">Total Registered Beds</span>
                    <strong className="text-xl font-black font-mono text-teal-950 block mt-1">
                      {selectedHospitalRecord.hospitalProfile?.totalBeds || 0}
                    </strong>
                    <span className="text-[10px] text-teal-700">Official Sanctioned Capacity</span>
                  </div>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Available Beds</span>
                    <strong className="text-xl font-black font-mono text-emerald-950 block mt-1">
                      {selectedHospitalRecord.hospitalProfile?.availableBeds ?? selectedHospitalRecord.hospitalProfile?.totalBeds ?? 0}
                    </strong>
                    <span className="text-[10px] text-emerald-700">Live Available for Admission</span>
                  </div>

                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl">
                    <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block">ICU Beds</span>
                    <strong className="text-xl font-black font-mono text-rose-950 block mt-1">
                      {selectedHospitalRecord.hospitalProfile?.icuBeds || 0}
                    </strong>
                    <span className="text-[10px] text-rose-700">Critical Intensive Care</span>
                  </div>

                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                    <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">NICU Beds</span>
                    <strong className="text-xl font-black font-mono text-indigo-950 block mt-1">
                      {selectedHospitalRecord.hospitalProfile?.nicuBeds || 0}
                    </strong>
                    <span className="text-[10px] text-indigo-700">Neonatal Intensive Care</span>
                  </div>
                </div>

                {/* Detailed Ward Breakdown */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-teal-600" />
                    <span>Granular Ward & Theater Capacities</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">General Ward Beds</span>
                      <strong className="text-slate-800 font-mono text-sm">
                        {selectedHospitalRecord.hospitalProfile?.generalWardBeds || 'Configured in general pool'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Semi-Private Beds</span>
                      <strong className="text-slate-800 font-mono text-sm">
                        {selectedHospitalRecord.hospitalProfile?.semiPrivateBeds || 'Standard allocation'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Private Deluxe Rooms</span>
                      <strong className="text-slate-800 font-mono text-sm">
                        {selectedHospitalRecord.hospitalProfile?.privateBeds || 'Standard allocation'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Operation Theaters (OT)</span>
                      <strong className="text-slate-800 font-mono text-sm">
                        {selectedHospitalRecord.hospitalProfile?.operationTheaters || '2+ Laminar Airflow OTs'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Critical Life-Support Infrastructure */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    selectedHospitalRecord.hospitalProfile?.bloodBankAvailable
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <HeartPulse className={`w-5 h-5 shrink-0 mt-0.5 ${selectedHospitalRecord.hospitalProfile?.bloodBankAvailable ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <strong className="font-bold block text-xs">Dedicated In-House Blood Bank</strong>
                      <p className="text-[11px] mt-0.5">
                        {selectedHospitalRecord.hospitalProfile?.bloodBankAvailable
                          ? '✓ Fully licensed 24/7 blood storage & component separation facility available on premises.'
                          : '✗ No dedicated in-house blood bank. Hospital relies on external regional blood centers.'}
                      </p>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    selectedHospitalRecord.hospitalProfile?.oxygenPlantAvailable
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <Activity className={`w-5 h-5 shrink-0 mt-0.5 ${selectedHospitalRecord.hospitalProfile?.oxygenPlantAvailable ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <strong className="font-bold block text-xs">PSA Medical Oxygen Generation Plant</strong>
                      <p className="text-[11px] mt-0.5">
                        {selectedHospitalRecord.hospitalProfile?.oxygenPlantAvailable
                          ? '✓ 24/7 Dedicated on-site PSA/Cryogenic oxygen generation plant connected to all ICU & ward lines.'
                          : '✗ Cylinder manifold and liquid medical oxygen backup system without dedicated PSA plant.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clinical Departments */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Specialized Clinical Departments Offered ({selectedHospitalRecord.hospitalProfile?.departments?.length || 0})
                    </h4>
                  </div>
                  {(!selectedHospitalRecord.hospitalProfile?.departments || selectedHospitalRecord.hospitalProfile.departments.length === 0) ? (
                    <p className="text-slate-400 italic">No specific departments cataloged.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedHospitalRecord.hospitalProfile.departments.map((dept, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-800 font-semibold rounded-lg text-[11px] border border-slate-200">
                          {dept}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= TAB 2: FACILITIES, TIMINGS & DIAGNOSTIC LABS ================= */}
            {hospitalDetailTab === 'facilities' && (
              <div className="space-y-4 animate-in fade-in">
                {/* Emergency & Operational Timings Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-2">
                    <span className="text-[10px] text-rose-800 font-black uppercase tracking-wider block flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      <span>Emergency & Trauma Dispatch Service</span>
                    </span>
                    <div className="space-y-1">
                      <p className="text-slate-800 font-bold">
                        24x7 Emergency Trauma Care: {selectedHospitalRecord.hospitalProfile?.has24x7Emergency ? '✅ ACTIVE (Round the Clock)' : 'Limited Hours'}
                      </p>
                      <p className="text-rose-900 font-mono font-bold text-sm">
                        Emergency Hotline: {selectedHospitalRecord.hospitalProfile?.emergencyHotline || selectedHospitalRecord.phone}
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        Ambulance Dispatch: <span className="font-mono font-semibold text-slate-800">{selectedHospitalRecord.hospitalProfile?.ambulanceContact || 'Central Trauma Ambulance Fleet (108/102)'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-2">
                    <span className="text-[10px] text-teal-800 font-black uppercase tracking-wider block flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>Operational Shifts & Pharmacy</span>
                    </span>
                    <div className="space-y-1">
                      <p className="text-slate-800">
                        OPD Consultation Hours: <strong className="font-semibold text-teal-900">{selectedHospitalRecord.hospitalProfile?.opdHours || '08:00 AM - 08:00 PM (Mon - Sat)'}</strong>
                      </p>
                      <p className="text-slate-800">
                        Emergency Department: <strong className="font-semibold text-rose-900">{selectedHospitalRecord.hospitalProfile?.emergencyHours || '24/7 Round-the-Clock Emergency Trauma Care'}</strong>
                      </p>
                      <p className="text-slate-700">
                        In-House Pharmacy: <strong>{selectedHospitalRecord.hospitalProfile?.hasInhousePharmacy ? '✅ 24/7 Dispensing Chemist Onsite' : 'External Chemist'}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Administrative Liaison & Nodal Spoke */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Hospital Administrative Authority & Nodal Officer</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Administrative Representative</span>
                      <strong className="text-slate-900 text-xs block">
                        {selectedHospitalRecord.hospitalProfile?.adminRepresentative || 'Medical Superintendent'}
                      </strong>
                      <p className="text-slate-600 text-[11px]">
                        Official Email: <span className="font-mono text-slate-800">{selectedHospitalRecord.email}</span>
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        Official Phone: <span className="font-mono text-slate-800">{selectedHospitalRecord.phone}</span>
                      </p>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Nodal Officer (Emergency & Verification)</span>
                      <strong className="text-slate-900 text-xs block">
                        {selectedHospitalRecord.hospitalProfile?.nodalOfficerName || selectedHospitalRecord.hospitalProfile?.adminRepresentative || 'Hospital Nodal Officer'}
                      </strong>
                      <p className="text-slate-600 text-[11px]">
                        Nodal Email: <span className="font-mono text-slate-800">{selectedHospitalRecord.hospitalProfile?.nodalOfficerEmail || selectedHospitalRecord.email}</span>
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        Nodal Phone: <span className="font-mono text-slate-800">{selectedHospitalRecord.hospitalProfile?.nodalOfficerPhone || selectedHospitalRecord.phone}</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Physical Facility Address & Coordinates</span>
                    <p className="text-slate-800 mt-0.5">
                      {selectedHospitalRecord.hospitalProfile?.address || selectedHospitalRecord.hospitalProfile?.streetAddress}, {selectedHospitalRecord.hospitalProfile?.city}, {selectedHospitalRecord.hospitalProfile?.district}, {selectedHospitalRecord.hospitalProfile?.state} - {selectedHospitalRecord.hospitalProfile?.pincode}, {selectedHospitalRecord.hospitalProfile?.country || 'India'}
                    </p>
                    {selectedHospitalRecord.hospitalProfile?.latitude && selectedHospitalRecord.hospitalProfile?.longitude && (
                      <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                        📍 GPS Geo-Location: Lat {selectedHospitalRecord.hospitalProfile.latitude}, Lng {selectedHospitalRecord.hospitalProfile.longitude}
                      </p>
                    )}
                  </div>
                </div>

                {/* Diagnostic Labs & Imaging Tests Offered */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-teal-600" />
                        <span>Diagnostic Labs & Imaging Tests Offered</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Diagnostics cataloged by hospital for patient booking and physician ordering.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={hospitalLabSearch}
                        onChange={(e) => setHospitalLabSearch(e.target.value)}
                        placeholder="Search diagnostic tests..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                      />
                    </div>
                  </div>

                  {(() => {
                    const allTests = selectedHospitalRecord.hospitalProfile?.availableLabTests || [
                      'Complete Blood Count (CBC)',
                      'Liver Function Test (LFT)',
                      'Kidney Function Test (KFT)',
                      'Lipid Profile',
                      'Thyroid Profile (T3, T4, TSH)',
                      'HbA1c Blood Glucose',
                      '12-Lead Digital ECG',
                      'Digital Chest X-Ray',
                      'Ultrasound Whole Abdomen',
                      'CT Scan (High-Resolution)',
                      'MRI Scan (1.5T / 3.0T)',
                      '2D Echocardiography',
                      'Urine Routine & Microscopic',
                      'RT-PCR Diagnostic Assay'
                    ];

                    const filteredTests = allTests.filter((t) =>
                      t.toLowerCase().includes(hospitalLabSearch.toLowerCase().trim())
                    );

                    if (filteredTests.length === 0) {
                      return (
                        <p className="text-slate-400 italic text-xs py-2">
                          No diagnostic test matches "{hospitalLabSearch}".
                        </p>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 max-h-56 overflow-y-auto">
                        {filteredTests.map((testName, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-slate-50 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 rounded-xl flex items-center justify-between text-xs transition-colors"
                          >
                            <span className="font-semibold text-slate-800 text-[11px] truncate">{testName}</span>
                            <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[9px] font-bold rounded-full shrink-0">
                              Available
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ================= TAB 3: STATUTORY LICENSES, TRUST & DOCS ================= */}
            {hospitalDetailTab === 'licenses' && (
              <div className="space-y-4 animate-in fade-in">
                {/* Clinical Establishment Act Registration */}
                <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      <span>Clinical Establishment Act / Statutory Health License</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      selectedHospitalRecord.hospitalProfile?.isClinicalActVerified
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {selectedHospitalRecord.hospitalProfile?.isClinicalActVerified ? 'Verified by Authority' : 'Pending Cross-Verification'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-teal-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Statutory Registration #</span>
                      <strong className="font-mono text-slate-900 text-xs">
                        {selectedHospitalRecord.hospitalProfile?.clinicalEstablishmentRegNo || selectedHospitalRecord.hospitalProfile?.licenseNumber || 'REG-STATUTORY-PENDING'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-teal-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">State Health Authority</span>
                      <strong className="text-slate-900 text-xs">
                        {selectedHospitalRecord.hospitalProfile?.stateHealthAuthority || `${selectedHospitalRecord.hospitalProfile?.state || 'State'} Health & Family Welfare Department`}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-teal-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">License Validity Expiration</span>
                      <strong className="text-slate-900 text-xs">
                        {selectedHospitalRecord.hospitalProfile?.licenseExpiryDate || 'Permanent / Multi-Year Active'}
                      </strong>
                    </div>
                  </div>

                  {selectedHospitalRecord.hospitalProfile?.clinicalEstablishmentDocUrl && (
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-teal-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600" />
                        <span className="font-bold text-slate-800 text-xs truncate">
                          {selectedHospitalRecord.hospitalProfile.clinicalEstablishmentDocName || 'Clinical Establishment Act Certificate'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingDoc({
                          name: selectedHospitalRecord.hospitalProfile?.clinicalEstablishmentDocName || 'Clinical Establishment Certificate',
                          url: selectedHospitalRecord.hospitalProfile?.clinicalEstablishmentDocUrl || '',
                          type: 'Clinical Establishment Act Document'
                        })}
                        className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Certificate</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* NABH / National Accreditation Credentials */}
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-amber-600" />
                      <span>NABH / Quality Accreditation Credentials</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {selectedHospitalRecord.hospitalProfile?.accreditation || 'NABH Accredited'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-amber-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">NABH Certificate Number</span>
                      <strong className="font-mono text-slate-900 text-xs">
                        {selectedHospitalRecord.hospitalProfile?.nabhCertificateNo || selectedHospitalRecord.hospitalProfile?.licenseNumber || 'NABH-AUTH-VERIFIED'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-amber-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Accreditation Validity</span>
                      <strong className="text-slate-900 text-xs">
                        {selectedHospitalRecord.hospitalProfile?.nabhValidity || 'Valid through 2028 (Under Active Audit)'}
                      </strong>
                    </div>
                  </div>

                  {selectedHospitalRecord.hospitalProfile?.nabhDocUrl && (
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-amber-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-slate-800 text-xs truncate">
                          {selectedHospitalRecord.hospitalProfile.nabhDocName || 'NABH Official Certificate'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingDoc({
                          name: selectedHospitalRecord.hospitalProfile?.nabhDocName || 'NABH Certificate',
                          url: selectedHospitalRecord.hospitalProfile?.nabhDocUrl || '',
                          type: 'NABH Accreditation Document'
                        })}
                        className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect NABH Doc</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Financial & Tax Compliance (PAN & GSTIN) */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-purple-600" />
                    <span>Statutory Tax & Financial Credentials</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Hospital Legal PAN</span>
                      <strong className="font-mono text-slate-900 text-xs">
                        {selectedHospitalRecord.hospitalProfile?.hospitalPan || 'AAAAA0000A'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Hospital GSTIN</span>
                      <strong className="font-mono text-slate-900 text-xs">
                        {selectedHospitalRecord.hospitalProfile?.hospitalGstin || '36AAAAA0000A1Z5'}
                      </strong>
                    </div>
                  </div>

                  {/* Insurance TPAs & Government Health Schemes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Cashless Insurance Partners / TPAs</span>
                      <p className="text-slate-700 text-[11px]">
                        {selectedHospitalRecord.hospitalProfile?.partneredTPAs?.length
                          ? selectedHospitalRecord.hospitalProfile.partneredTPAs.join(', ')
                          : 'Star Health, HDFC ERGO, ICICI Lombard, Max Bupa, Care Health, Medi Assist, Paramount TPA'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Government Schemes Empaneled</span>
                      <p className="text-slate-700 text-[11px]">
                        {selectedHospitalRecord.hospitalProfile?.governmentSchemes?.length
                          ? selectedHospitalRecord.hospitalProfile.governmentSchemes.join(', ')
                          : 'Ayushman Bharat PM-JAY, Aarogyasri Scheme, CGHS, ECHS, State Government Health Scheme'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Uploaded Verification Documents & Certificates */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    All Attached Legal Documents & Certificates ({selectedHospitalRecord.uploadedDocuments?.length || 0})
                  </span>
                  {(!selectedHospitalRecord.uploadedDocuments || selectedHospitalRecord.uploadedDocuments.length === 0) ? (
                    <p className="text-slate-400 italic text-[11px]">No uploaded documents attached to this hospital record.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedHospitalRecord.uploadedDocuments.map((doc) => (
                        <div key={doc.id} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate">{doc.name}</p>
                            <span className="text-[10px] text-purple-700 uppercase font-mono font-bold">{doc.type}</span>
                          </div>
                          {doc.url && (
                            <button
                              type="button"
                              onClick={() => setViewingDoc(doc)}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 text-[11px] font-bold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Document</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= TAB 4: DOCTORS ROSTER ================= */}
            {hospitalDetailTab === 'doctors' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                      Physicians & Specialists Registered in this Facility
                    </h4>
                  </div>
                </div>

                {(() => {
                  const affiliatedDocs = usersList.filter(
                    (u) =>
                      u.role === 'doctor' &&
                      (u.doctorProfile?.hospitalId === selectedHospitalRecord.id ||
                        u.doctorProfile?.hospitalName?.toLowerCase() === (selectedHospitalRecord.hospitalProfile?.hospitalName || selectedHospitalRecord.name).toLowerCase())
                  );

                  if (affiliatedDocs.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                        <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-semibold text-slate-600 text-xs">No doctors currently registered in this hospital.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">When doctors onboard with this hospital facility, they will appear here.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {affiliatedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={doc.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(doc.name)}`}
                              alt={doc.name}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="font-bold text-slate-900 text-xs">{doc.name}</h5>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                  doc.doctorProfile?.approvalStatus === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {doc.doctorProfile?.approvalStatus || 'Active'}
                                </span>
                              </div>
                              <p className="text-indigo-700 font-semibold text-[11px]">
                                {doc.doctorProfile?.specialization}
                              </p>
                              <p className="text-slate-500 text-[10px] mt-0.5">
                                {doc.doctorProfile?.qualifications || 'MBBS'} • Exp: {doc.doctorProfile?.yearsOfExperience || 1} yrs • OPD Fee: ₹{doc.doctorProfile?.consultationFee ?? 500}
                              </p>
                              <p className="text-slate-400 font-mono text-[10px]">
                                Reg No: {doc.doctorProfile?.medicalLicenseNumber || 'MED-LIC'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className={`text-[10px] font-bold ${doc.doctorProfile?.inSurgery ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {doc.doctorProfile?.inSurgery ? '🔴 In Surgery' : '🟢 Available for OPD'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleViewDoctorInAdmin(doc.id)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[11px] shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Doctor Practice Audit</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Facility ID: {selectedHospitalRecord.id}
              </span>
              <button
                type="button"
                onClick={() => setSelectedHospitalRecord(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Close Hospital File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: CUSTOM DOMAIN & DEPLOYMENT GUIDE ======================= */}
      {isDomainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8 max-h-[92vh] overflow-y-auto space-y-5 animate-in zoom-in-95 text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xs">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Deploy With Your Own Custom Domain Name
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Configure DNS records (A / CNAME), automated SSL/TLS certificates, and production hosting for your brand.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDomainModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Plain English Explainer Card (User Clarification) */}
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-amber-200 text-amber-900 rounded-lg font-bold text-xs">💡 What is this?</span>
                <span className="text-xs font-bold text-amber-950">Simple Explanation of Custom Domains</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Right now, this portal runs on a cloud web address. If your hospital or organization owns an official website address (for example: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">www.yourhospital.com</code> or <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">care.cityhospital.org</code>), this tool helps your IT administrator connect it so patients and doctors visit your own branded website name.
              </p>
              <p className="text-[11px] text-amber-800 font-semibold">
                ⭐ <strong>Note for Testing:</strong> This is <strong>100% OPTIONAL</strong>! You do not need to buy or connect any domain to test or use this entire hospital system.
              </p>
            </div>

            {/* Custom Domain Input Bar */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-indigo-950 font-bold text-xs mb-1">
                    Enter Your Custom Domain Name or Subdomain:
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-2.5 text-indigo-500" />
                    <input
                      type="text"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value.toLowerCase().trim())}
                      placeholder="e.g. care.yourhospital.org or yourhospital.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:self-end">
                  <span className="text-[10px] text-indigo-700 font-semibold block sm:inline">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setCustomDomainInput('care.myhospital.org')}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    care.myhospital.org
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomDomainInput('telehealth.healthcity.in')}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    telehealth.healthcity.in
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomDomainInput('smarthealthportal.com')}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    smarthealthportal.com
                  </button>
                </div>
              </div>
            </div>

            {/* Provider Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-1 rounded-2xl gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDomainProviderTab('dns')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  domainProviderTab === 'dns'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. DNS Record Settings</span>
              </button>

              <button
                type="button"
                onClick={() => setDomainProviderTab('cloudrun')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  domainProviderTab === 'cloudrun'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-teal-600" />
                <span>2. Google Cloud Run (Recommended)</span>
              </button>

              <button
                type="button"
                onClick={() => setDomainProviderTab('vps')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  domainProviderTab === 'vps'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-purple-600" />
                <span>3. Linux VPS & Nginx SSL</span>
              </button>

              <button
                type="button"
                onClick={() => setDomainProviderTab('docker')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  domainProviderTab === 'docker'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>4. Docker & Production Build</span>
              </button>
            </div>

            {/* TAB CONTENT: DNS SETTINGS */}
            {domainProviderTab === 'dns' && (
              <div className="space-y-4 animate-in fade-in">
                <p className="text-slate-600 text-xs">
                  Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, AWS Route53, Google Domains/Squarespace) and navigate to <strong>DNS Management</strong>. Add the following records for <strong className="text-indigo-950 font-mono">{customDomainInput || 'your-domain.com'}</strong>:
                </p>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Host / Name</th>
                        <th className="py-2.5 px-3">Value / Target</th>
                        <th className="py-2.5 px-3">TTL</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {/* CNAME Record */}
                      <tr>
                        <td className="py-3 px-3 font-bold text-teal-700">CNAME</td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {customDomainInput.includes('.') ? customDomainInput.split('.')[0] : 'care'}
                        </td>
                        <td className="py-3 px-3 text-slate-700 truncate max-w-xs">
                          ghs.googlehosted.com
                        </td>
                        <td className="py-3 px-3 text-slate-500">3600 (Auto)</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('ghs.googlehosted.com');
                              setDnsCopiedKey('cname');
                              setTimeout(() => setDnsCopiedKey(null), 2500);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[10px] cursor-pointer"
                          >
                            {dnsCopiedKey === 'cname' ? '✓ Copied' : 'Copy'}
                          </button>
                        </td>
                      </tr>

                      {/* Apex A Record (if user uses root domain) */}
                      <tr>
                        <td className="py-3 px-3 font-bold text-indigo-700">A Record</td>
                        <td className="py-3 px-3 font-bold text-slate-800">@</td>
                        <td className="py-3 px-3 text-slate-700">216.239.32.21</td>
                        <td className="py-3 px-3 text-slate-500">3600</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('216.239.32.21');
                              setDnsCopiedKey('a1');
                              setTimeout(() => setDnsCopiedKey(null), 2500);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[10px] cursor-pointer"
                          >
                            {dnsCopiedKey === 'a1' ? '✓ Copied' : 'Copy'}
                          </button>
                        </td>
                      </tr>

                      {/* Secondary A Record */}
                      <tr>
                        <td className="py-3 px-3 font-bold text-indigo-700">A Record</td>
                        <td className="py-3 px-3 font-bold text-slate-800">@</td>
                        <td className="py-3 px-3 text-slate-700">216.239.34.21</td>
                        <td className="py-3 px-3 text-slate-500">3600</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('216.239.34.21');
                              setDnsCopiedKey('a2');
                              setTimeout(() => setDnsCopiedKey(null), 2500);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[10px] cursor-pointer"
                          >
                            {dnsCopiedKey === 'a2' ? '✓ Copied' : 'Copy'}
                          </button>
                        </td>
                      </tr>

                      {/* SSL Verification TXT Record */}
                      <tr>
                        <td className="py-3 px-3 font-bold text-amber-700">TXT</td>
                        <td className="py-3 px-3 font-bold text-slate-800">@</td>
                        <td className="py-3 px-3 text-slate-700 truncate max-w-xs">
                          smarthealth-verify-domain={customDomainInput || 'domain'}
                        </td>
                        <td className="py-3 px-3 text-slate-500">300</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`smarthealth-verify-domain=${customDomainInput || 'domain'}`);
                              setDnsCopiedKey('txt');
                              setTimeout(() => setDnsCopiedKey(null), 2500);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[10px] cursor-pointer"
                          >
                            {dnsCopiedKey === 'txt' ? '✓ Copied' : 'Copy'}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
                  <h4 className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Automatic Free SSL/TLS Provisioning</span>
                  </h4>
                  <p className="text-emerald-800 text-[11px]">
                    Once your DNS records propagate (typically 5 to 15 minutes), the hosting platform automatically issues a 2048-bit Let's Encrypt / Google-managed SSL Certificate. HTTPS traffic will automatically be enforced on port 443 with green padlock security.
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CLOUD RUN */}
            {domainProviderTab === 'cloudrun' && (
              <div className="space-y-3 animate-in fade-in">
                <p className="text-slate-600 text-xs">
                  Deploying to Google Cloud Run gives your platform serverless auto-scaling and automatic custom domain mapping with free managed SSL certificates.
                </p>

                <div className="p-4 bg-slate-900 text-purple-200 rounded-2xl font-mono text-[11px] space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                    <span>Deploy & Map Domain Commands</span>
                    <button
                      type="button"
                      onClick={() => {
                        const cmd = `npm run build\ngcloud run deploy smarthealth --source . --port 3000 --allow-unauthenticated\ngcloud beta run domain-mappings create --service smarthealth --domain ${customDomainInput}`;
                        navigator.clipboard.writeText(cmd);
                        setDnsCopiedKey('gcloud');
                        setTimeout(() => setDnsCopiedKey(null), 2500);
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded text-[10px] cursor-pointer font-sans"
                    >
                      {dnsCopiedKey === 'gcloud' ? '✓ Copied Commands' : 'Copy All'}
                    </button>
                  </div>
                  <p className="text-teal-400"># 1. Build frontend bundle for production</p>
                  <p className="text-white">npm run build</p>
                  <p className="text-teal-400 mt-2"># 2. Deploy full-stack container to Cloud Run</p>
                  <p className="text-white">gcloud run deploy smarthealth-app --source . --port 3000 --allow-unauthenticated</p>
                  <p className="text-teal-400 mt-2"># 3. Map your custom domain to the deployed service</p>
                  <p className="text-white">gcloud beta run domain-mappings create --service smarthealth-app --domain {customDomainInput}</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs space-y-1">
                  <strong className="block font-bold">Cloud Run Console Steps:</strong>
                  <p>1. Open Google Cloud Console → Cloud Run → Click your service.</p>
                  <p>2. Click <strong>"Manage Custom Domains"</strong> at top.</p>
                  <p>3. Click <strong>"Add Mapping"</strong>, select service <code>smarthealth-app</code>, and enter <code>{customDomainInput}</code>.</p>
                  <p>4. Google will output the exact CNAME/A records to paste into your registrar.</p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: LINUX VPS */}
            {domainProviderTab === 'vps' && (
              <div className="space-y-3 animate-in fade-in">
                <p className="text-slate-600 text-xs">
                  If hosting on an Ubuntu/Debian Cloud VPS (DigitalOcean, AWS EC2, Linode, Hostinger VPS), configure Nginx as a reverse proxy with automated Let's Encrypt SSL:
                </p>

                <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 font-sans">
                    <span>Nginx Site Configuration (/etc/nginx/sites-available/{customDomainInput})</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nginx = `server {\n    server_name ${customDomainInput};\n\n    location / {\n        proxy_pass http://127.0.0.1:3000;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection 'upgrade';\n        proxy_set_header Host $host;\n        proxy_cache_bypass $http_upgrade;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n}`;
                        navigator.clipboard.writeText(nginx);
                        setDnsCopiedKey('nginx');
                        setTimeout(() => setDnsCopiedKey(null), 2500);
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded text-[10px] cursor-pointer"
                    >
                      {dnsCopiedKey === 'nginx' ? '✓ Copied Config' : 'Copy Nginx Config'}
                    </button>
                  </div>
                  <pre className="text-emerald-300 whitespace-pre overflow-x-auto text-[10px] leading-relaxed">
{`server {
    server_name ${customDomainInput};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}
                  </pre>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1 text-purple-950 text-xs font-mono">
                  <strong className="block font-bold font-sans">Issue Free SSL via Certbot:</strong>
                  <p>sudo certbot --nginx -d {customDomainInput}</p>
                  <p className="text-purple-700 text-[11px] font-sans">Certbot will automatically verify ownership, install SSL certificate, and schedule auto-renewals.</p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: DOCKER & PRODUCTION START */}
            {domainProviderTab === 'docker' && (
              <div className="space-y-3 animate-in fade-in">
                <p className="text-slate-600 text-xs">
                  Run the complete full-stack Node.js & Vite bundle in production mode:
                </p>

                <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] space-y-2 border border-slate-800">
                  <p className="text-slate-400 font-sans font-bold">Standard Node.js Production Run:</p>
                  <p className="text-teal-400"># 1. Install dependencies & compile frontend dist</p>
                  <p className="text-white">npm install</p>
                  <p className="text-white">npm run build</p>
                  <p className="text-teal-400 mt-2"># 2. Launch production Express server on port 3000</p>
                  <p className="text-white">NODE_ENV=production PORT=3000 npm start</p>
                </div>

                <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] space-y-2 border border-slate-800">
                  <p className="text-slate-400 font-sans font-bold">Docker Container Run:</p>
                  <p className="text-teal-400"># Build and run Docker image binding to port 80/443</p>
                  <p className="text-white">docker build -t smarthealth-app .</p>
                  <p className="text-white">docker run -d -p 80:3000 -v $(pwd)/data:/app/data --name smarthealth smarthealth-app</p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Detailed file guide saved at <strong>DEPLOYMENT_CUSTOM_DOMAIN_GUIDE.md</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsDomainModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Close Deployment Center
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: FULL DOCTOR AUDIT, PATIENTS & PRESCRIPTIONS ======================= */}
      {(loadingDoctorAudit || selectedDoctorAudit) && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto space-y-5 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Administrator Physician Audit & Practice File
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete clinical history, attended patients, prescriptions issued, suggestions, and leave records
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctorAudit(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDoctorAudit && (
              <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <span>Loading physician practice, visited patients, and prescription records...</span>
              </div>
            )}

            {selectedDoctorAudit && (
              <div className="space-y-5">
                {/* Doctor Header Banner */}
                <div className="p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-teal-50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedDoctorAudit.doctor.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=Doc'}
                      alt={selectedDoctorAudit.doctor.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-200"
                    />
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">{selectedDoctorAudit.doctor.name}</h4>
                      <p className="text-indigo-800 font-bold">{selectedDoctorAudit.doctor.doctorProfile?.specialization}</p>
                      <p className="text-[11px] text-slate-500">{selectedDoctorAudit.doctor.doctorProfile?.hospitalName || 'Affiliated Hospital'}</p>
                      <p className="text-[11px] text-slate-500">{selectedDoctorAudit.doctor.email} • {selectedDoctorAudit.doctor.phone}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-1 font-mono text-[11px]">
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold">
                      Lic: {selectedDoctorAudit.doctor.doctorProfile?.medicalLicenseNumber}
                    </span>
                    <span className="text-teal-800 font-semibold">
                      Fee: ₹{selectedDoctorAudit.doctor.doctorProfile?.consultationFee ?? 500} / consult
                    </span>
                    <span className="text-amber-800 font-semibold">
                      Leave Allowance: {selectedDoctorAudit.doctor.doctorProfile?.maxLeaveAllowance ?? 5} days/month
                    </span>
                  </div>
                </div>

                {/* 4 Summary Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Patients Treated</span>
                    <span className="text-lg font-black text-indigo-900">{selectedDoctorAudit.patientsCount ?? 0}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Consultations</span>
                    <span className="text-lg font-black text-teal-900">{selectedDoctorAudit.appointments?.length ?? 0}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Prescriptions Issued</span>
                    <span className="text-lg font-black text-purple-900">{selectedDoctorAudit.prescriptions?.length ?? 0}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Leaves Taken</span>
                    <span className="text-lg font-black text-amber-900">{selectedDoctorAudit.leaves?.length ?? 0}</span>
                  </div>
                </div>

                {/* Dedicated Sub-Pages Navigation */}
                <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 rounded-2xl gap-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setDoctorSubTab('profile')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      doctorSubTab === 'profile'
                        ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>1. Profile & Qualifications</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorSubTab('patients')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      doctorSubTab === 'patients'
                        ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>2. Treated Patients History ({selectedDoctorAudit.appointments?.length ?? 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorSubTab('suggestions')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      doctorSubTab === 'suggestions'
                        ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>3. Clinical Suggestions & Rx ({selectedDoctorAudit.prescriptions?.length ?? 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorSubTab('leaves')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      doctorSubTab === 'leaves'
                        ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>4. Leave Applications ({selectedDoctorAudit.leaves?.length ?? 0})</span>
                  </button>
                </div>

                {/* PAGE 1: DOCTOR PROFILE & QUALIFICATIONS */}
                {doctorSubTab === 'profile' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                        Medical Council Credentials & Academic Qualifications
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Degrees & Qualifications:</span>
                          <strong className="text-slate-800 text-xs">{selectedDoctorAudit.doctor.doctorProfile?.qualifications || selectedDoctorAudit.doctor.doctorProfile?.ugDegree || 'MBBS'}</strong>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Graduating College:</span>
                          <strong className="text-slate-800 text-xs">{selectedDoctorAudit.doctor.doctorProfile?.graduatingCollege || 'Medical University'}</strong>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Graduation Year:</span>
                          <strong className="text-slate-800 text-xs">{selectedDoctorAudit.doctor.doctorProfile?.passingYear || '2016'}</strong>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Govt Identity / Aadhaar:</span>
                          <strong className="text-slate-800 text-xs">{selectedDoctorAudit.doctor.doctorProfile?.govtIdNumber || 'Verified ID On File'}</strong>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Clinical Experience:</span>
                          <strong className="text-slate-800 text-xs">{selectedDoctorAudit.doctor.doctorProfile?.yearsOfExperience || 1} Years in Practice</strong>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Surgery Telemetry:</span>
                          <strong className={`text-xs ${selectedDoctorAudit.doctor.doctorProfile?.inSurgery ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {selectedDoctorAudit.doctor.doctorProfile?.inSurgery ? '🔴 Currently In Surgery' : '🟢 Available For Consults'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {selectedDoctorAudit.doctor.doctorProfile?.bio && (
                      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs">
                        <strong className="text-indigo-900 block mb-1">Physician Clinical Statement & Specialty Bio:</strong>
                        <p className="text-slate-700 leading-relaxed">{selectedDoctorAudit.doctor.doctorProfile.bio}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* PAGE 2: TREATED PATIENTS HISTORY */}
                {doctorSubTab === 'patients' && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Patients Treated by Dr. {selectedDoctorAudit.doctor.name} ({selectedDoctorAudit.appointments?.length ?? 0})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {selectedDoctorAudit.patientsCount ?? 0} unique individual patients treated
                      </span>
                    </div>

                    {(!selectedDoctorAudit.appointments || selectedDoctorAudit.appointments.length === 0) ? (
                      <div className="p-10 bg-slate-50 text-slate-400 rounded-2xl text-center border border-slate-200">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-600">No Patient Consultations Recorded Yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">When this physician completes consultations, patient visit cards will appear here.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
                        {selectedDoctorAudit.appointments.map((apt: any) => (
                          <div key={apt.id} className="p-4 bg-white hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <strong className="text-slate-900 font-bold text-sm">{apt.patientName}</strong>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  apt.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : apt.status === 'approved'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : apt.status === 'missed'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {apt.status}
                                </span>
                              </div>
                              <p className="text-slate-500 text-[11px]">
                                Consultation Date: <strong>{apt.date}</strong> • Slot: <strong>{apt.timeSlot}</strong>
                              </p>
                              <p className="text-slate-700 text-xs">
                                <span className="text-slate-400 font-semibold">Chief Complaint:</span> {apt.reasonForVisit || 'General health consultation'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {apt.treatmentCode && (
                                <span className="font-mono text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">
                                  Ref: #{apt.treatmentCode}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PAGE 3: DOCTOR'S CLINICAL SUGGESTIONS & PRESCRIPTIONS */}
                {doctorSubTab === 'suggestions' && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Prescriptions & Clinical Suggestions Issued ({selectedDoctorAudit.prescriptions?.length ?? 0})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Formal diagnosis, prescriptions, and health advice
                      </span>
                    </div>

                    {(!selectedDoctorAudit.prescriptions || selectedDoctorAudit.prescriptions.length === 0) ? (
                      <div className="p-10 bg-slate-50 text-slate-400 rounded-2xl text-center border border-slate-200">
                        <HeartPulse className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-600">No Prescriptions or Suggestions Issued Yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Digital prescriptions and physician suggestions will be indexed here automatically.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {selectedDoctorAudit.prescriptions.map((rx: any) => (
                          <div key={rx.id} className="p-4 bg-white border border-slate-200 rounded-2xl text-xs space-y-2.5 shadow-2xs">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <span className="font-bold text-slate-900 text-sm">Patient: {rx.patientName}</span>
                              <span className="text-slate-400 text-[11px] font-mono">{new Date(rx.date || rx.createdAt).toLocaleDateString()}</span>
                            </div>

                            <div className="p-2.5 bg-teal-50/70 rounded-xl text-teal-950 text-xs border border-teal-200">
                              <strong className="text-teal-900">Clinical Diagnosis:</strong> {rx.diagnosis}
                            </div>

                            {(rx.advice || rx.generalAdvice) && (
                              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950">
                                <strong className="text-amber-900 block mb-0.5">Doctor's Suggestions & Lifestyle Advice:</strong>
                                <p className="leading-relaxed">{rx.advice || rx.generalAdvice}</p>
                              </div>
                            )}

                            {rx.medicines && rx.medicines.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <span className="font-bold text-slate-600 text-[10px] uppercase block">Prescribed Medicines:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {rx.medicines.map((m: any, idx: number) => (
                                    <div key={idx} className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                                      <strong className="text-slate-900">{m.name}</strong> ({m.dosage})
                                      <p className="text-slate-500 text-[10px] mt-0.5">{m.frequency} • {m.duration} {m.instructions ? `• ${m.instructions}` : ''}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PAGE 4: DOCTOR LEAVE APPLICATIONS */}
                {doctorSubTab === 'leaves' && (
                  <div className="space-y-3 animate-in fade-in">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                      Doctor Leave Applications & Absence Records ({selectedDoctorAudit.leaves?.length ?? 0})
                    </span>

                    {(!selectedDoctorAudit.leaves || selectedDoctorAudit.leaves.length === 0) ? (
                      <div className="p-10 bg-slate-50 text-slate-400 rounded-2xl text-center border border-slate-200">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-600">No Leave Applications</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">The physician is in active attendance with no registered leaves.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                        {selectedDoctorAudit.leaves.map((l: any) => (
                          <div key={l.id} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                            <div>
                              <span className="font-bold text-slate-800">{l.startDate} &rarr; {l.endDate} ({l.daysCount} working days)</span>
                              <p className="text-slate-500 text-[11px]">Reason: {l.reason}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : l.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {l.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedDoctorAudit(null)}
                    className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                  >
                    Close Doctor Audit File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Preview Lightbox Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{viewingDoc.name}</h4>
                <span className="text-[10px] text-purple-700 uppercase font-mono font-bold">Document Type: {viewingDoc.type || 'Official File'}</span>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-center max-h-[65vh] overflow-auto border border-slate-200">
              {viewingDoc.url?.startsWith('data:image/') || viewingDoc.url?.includes('http') ? (
                <img
                  src={viewingDoc.url}
                  alt={viewingDoc.name}
                  className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-xs"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <ShieldCheck className="w-12 h-12 text-purple-600 mx-auto" />
                  <p className="text-xs text-slate-600 font-semibold">{viewingDoc.name}</p>
                  <p className="text-[11px] text-slate-400">PDF / Binary Document Record</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black cursor-pointer"
              >
                Done Viewing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= REGISTER NEW HOSPITAL VIEW (Exact Same Page As Standalone Hospital Registration) ======================= */}
      {isAddHospitalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50/95 backdrop-blur-md overflow-y-auto overscroll-contain animate-in fade-in">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <RegistrationPageView
              defaultRole="hospital"
              lockRole={true}
              isEmbedded={true}
              embeddedTitle="Register & Authorize New Hospital Facility"
              onCancel={() => setIsAddHospitalOpen(false)}
              onRegistrationComplete={(createdHospital) => {
                setIsAddHospitalOpen(false);
                setActionFeedback(`✅ Hospital "${createdHospital?.name || "New Facility"}" registered and authorized! Official credentials email dispatched.`);
                setTimeout(() => setActionFeedback(null), 6000);
                loadData();
              }}
            />
          </div>
        </div>
      )}

      {/* ================= UNIQUE ACTIVATION EMAIL DISPATCH MODAL ================= */}
      {approvedEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-emerald-200 animate-in fade-in zoom-in-95 my-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Mail className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Beneficial Activation Email Dispatched</h3>
                  <p className="text-xs text-emerald-700">Hospital is now LIVE & Authorized to onboard doctors</p>
                </div>
              </div>
              <button
                onClick={() => setApprovedEmailModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div><span className="text-slate-400 uppercase font-semibold text-[10px]">To:</span> <strong className="text-slate-800 font-mono">{approvedEmailModal.to}</strong></div>
                <div><span className="text-slate-400 uppercase font-semibold text-[10px]">From:</span> <strong className="text-slate-800 font-mono">{approvedEmailModal.from}</strong></div>
                <div><span className="text-slate-400 uppercase font-semibold text-[10px]">Subject:</span> <strong className="text-slate-900">{approvedEmailModal.subject}</strong></div>
              </div>

              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl whitespace-pre-wrap font-mono text-[11px] text-slate-800 leading-relaxed max-h-72 overflow-y-auto">
                {approvedEmailModal.body}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setApprovedEmailModal(null)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Understood & Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Database Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reset & Clean Database?</h3>
                <p className="text-xs text-slate-500">Zero portal records • Permanent wipe</p>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed bg-rose-50 border border-rose-200 p-3 rounded-xl">
              Are you sure you want to clean and reset the entire database? Portal details will be cleaned out to zero and only Master Admin HEMANTH will remain.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDatabase}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{loading ? 'Cleaning...' : 'Yes, Clean Database'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= IN-PAGE HOLD / REJECT ACTION MODAL ======================= */}
      {actionModal && actionModal.isOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-2xl ${actionModal.action === 'hold' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                  {actionModal.action === 'hold' ? <Clock className="w-5 h-5 text-amber-700" /> : <XCircle className="w-5 h-5 text-rose-700" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {actionModal.action === 'hold' ? 'Place on Administrative Hold' : 'Decline & Reject Registration'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {actionModal.targetType === 'hospital' ? 'Hospital Medical Center' : 'Physician Specialist'}: <strong>{actionModal.targetName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className={`p-3 rounded-xl border leading-relaxed ${
                actionModal.action === 'hold'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-rose-50/80 border-rose-200 text-rose-900'
              }`}>
                <p className="font-semibold">
                  {actionModal.action === 'hold'
                    ? 'Placing this account on HOLD will pause practice and onboarding privileges until pending compliance items are updated.'
                    : 'Declining this registration will update the official status to REJECTED.'}
                </p>
                <p className="text-[11px] mt-1 opacity-90">
                  An official formal notification email with your explanation note will be dispatched automatically to the registered address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Reason for {actionModal.action === 'hold' ? 'Hold' : 'Rejection'} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={actionModal.reason}
                  onChange={(e) => setActionModal({ ...actionModal, reason: e.target.value })}
                  placeholder={
                    actionModal.action === 'hold'
                      ? 'e.g., Hospital accreditation certificate is pending board re-certification; please submit updated NABH endorsement.'
                      : 'e.g., Medical Council license verification failed; submitted credentials do not match state medical board registries.'
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!actionModal.reason.trim() || actionModal.loading}
                onClick={handleConfirmActionModal}
                className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                  actionModal.action === 'hold'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionModal.loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : actionModal.action === 'hold' ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>
                  {actionModal.loading
                    ? 'Dispatching...'
                    : actionModal.action === 'hold'
                    ? 'Confirm Hold & Dispatch Email'
                    : 'Confirm Rejection & Dispatch Email'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= GOOGLE MAPS LOCATION PICKER MODAL ======================= */}
      {isMapModalOpen && (
        <LocationMapModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          onApplyLocation={handleApplyMapLocation}
          initialState={hospState}
          initialCity={hospCity}
          initialPincode={hospPincode}
          modalTitle="Select Hospital Location on Google Maps (Satellite Hybrid)"
        />
      )}

    </div>
  );
};
