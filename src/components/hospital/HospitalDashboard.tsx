import React, { useState, useEffect } from 'react';
import {
  Building2,
  Stethoscope,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Bed,
  PhoneCall,
  Clock,
  ShieldCheck,
  RefreshCw,
  Search,
  Activity,
  FileCheck,
  PauseCircle,
  PlayCircle,
  ArrowRightLeft,
  X,
  Mail,
  CalendarOff,
  IndianRupee,
  Eye,
  EyeOff,
  Image,
  FileText,
  Sliders,
  Settings,
  Plus,
  Lock,
  Key,
  MapPin,
  Save,
  Upload,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { User, EmergencyAlert, DoctorTransferRequest, DoctorLeaveRequest, MEDICAL_SPECIALIZATIONS, UserDocument, LabTestOrder } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { INDIA_STATES, INDIA_DISTRICTS, fetchIndiaPincodeDetails } from '../../utils/indiaLocations';
import { syncUserToFirestore } from '../../services/firestoreSync';
import { RegistrationPageView } from '../registration/RegistrationPageView';

export const HospitalDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const hospitalId = user?.id || '';
  const hospitalProfile = user?.hospitalProfile;

  const [activeMainTab, setActiveMainTab] = useState<'doctors' | 'lab_tests' | 'leaves' | 'transfers' | 'email_requests' | 'emergencies' | 'settings'>('doctors');
  const [doctors, setDoctors] = useState<User[]>([]);
  const [doctorLeaves, setDoctorLeaves] = useState<DoctorLeaveRequest[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyAlert[]>([]);
  const [transferRequests, setTransferRequests] = useState<DoctorTransferRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctorTab, setSelectedDoctorTab] = useState<'all' | 'pending' | 'active' | 'on_hold'>('all');

  // Diagnostic Labs & Imaging Tests State
  const [hospitalLabTests, setHospitalLabTests] = useState<string[]>(
    hospitalProfile?.availableLabTests || [
      'MRI Scan (Brain / Spine)',
      'CT Scan (Chest / Abdomen / Head)',
      'Digital X-Ray (Chest & Skeletal)',
      'Complete Blood Count (CBC)',
      '2D Echocardiogram & Color Doppler',
      'Electrocardiogram (ECG)',
      'Ultrasound / Sonography (USG)',
      'Lipid Profile & Cardiac Enzymes',
      'Liver Function Test (LFT)',
      'Kidney Function Test (KFT)',
      'Fasting Blood Sugar & HbA1c',
      'Urine Routine & Microscopy',
    ]
  );
  const [customLabTestInput, setCustomLabTestInput] = useState('');
  const [savingLabTests, setSavingLabTests] = useState(false);
  const [labOrders, setLabOrders] = useState<LabTestOrder[]>([]);
  const [loadingLabOrders, setLoadingLabOrders] = useState(false);
  const [selectedOrderToComplete, setSelectedOrderToComplete] = useState<LabTestOrder | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completingOrder, setCompletingOrder] = useState(false);

  // Reason modal state
  const [modalAction, setModalAction] = useState<{ doctor: User; action: 'reject' | 'hold' } | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Doctor Full Details Modal State
  const [fullDoctorDetails, setFullDoctorDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Set Doctor Consultation Fee Modal State
  const [selectedDoctorFee, setSelectedDoctorFee] = useState<{ doctor: User; fee: number } | null>(null);
  const [savingFee, setSavingFee] = useState(false);

  // Set Doctor Leave Allowance Quota State
  const [selectedDoctorQuota, setSelectedDoctorQuota] = useState<{ doctor: User; quota: number } | null>(null);
  const [savingQuota, setSavingQuota] = useState(false);

  // Update Hospital Logo Modal State
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [logoInputUrl, setLogoInputUrl] = useState(hospitalProfile?.logoUrl || user?.avatarUrl || '');
  const [savingLogo, setSavingLogo] = useState(false);

  // ================= Onboard New Doctor Modal States =================
  const [isOnboardDoctorOpen, setIsOnboardDoctorOpen] = useState(false);
  const [onboardDocName, setOnboardDocName] = useState('');
  const [onboardDocEmail, setOnboardDocEmail] = useState('');
  const [onboardDocPhone, setOnboardDocPhone] = useState('');
  const [onboardDocLicense, setOnboardDocLicense] = useState('');
  const [onboardDocGovtIdType, setOnboardDocGovtIdType] = useState('Aadhar Card');
  const [onboardDocGovtIdNumber, setOnboardDocGovtIdNumber] = useState('');
  const [onboardDocSpecialization, setOnboardDocSpecialization] = useState('Cardiology (Heart & Blood Vessels)');
  const [onboardDocUgDegree, setOnboardDocUgDegree] = useState('MBBS');
  const [onboardDocPgDegree, setOnboardDocPgDegree] = useState('MD - Internal Medicine');
  const [onboardDocCollege, setOnboardDocCollege] = useState('All India Institute of Medical Sciences (AIIMS)');
  const [onboardDocPassingYear, setOnboardDocPassingYear] = useState('2018');
  const [onboardDocExperience, setOnboardDocExperience] = useState('6');
  const [onboardDocFee, setOnboardDocFee] = useState('500');
  const [onboardDocBio, setOnboardDocBio] = useState('');
  const [onboardDocSubmitting, setOnboardDocSubmitting] = useState(false);
  const [onboardSuccessData, setOnboardSuccessData] = useState<{ doctor: User; password?: string; emailSent?: any } | null>(null);

  // Mandatory Doctor Uploads
  const [onboardGovtIdFile, setOnboardGovtIdFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [onboardLicenseFile, setOnboardLicenseFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [onboardDegreeFile, setOnboardDegreeFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [onboardAvatarFile, setOnboardAvatarFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);

  // ================= Hospital Settings States =================
  const [settHospName, setSettHospName] = useState(hospitalProfile?.hospitalName || user?.name || '');
  const [settHospType, setSettHospType] = useState(hospitalProfile?.hospitalType || 'Private Super-Specialty');
  const [settLicense, setSettLicense] = useState(hospitalProfile?.licenseNumber || '');
  const [settAccreditation, setSettAccreditation] = useState(hospitalProfile?.accreditation || 'NABH Certified & JCI Gold');
  const [settAdminRep, setSettAdminRep] = useState(hospitalProfile?.adminRepresentative || '');
  const [settPhone, setSettPhone] = useState(hospitalProfile?.contactPhone || user?.phone || '');
  const [settEmail, setSettEmail] = useState(hospitalProfile?.contactEmail || user?.email || '');
  const [settHotline, setSettHotline] = useState(hospitalProfile?.emergencyHotline || '');
  const [settTotalBeds, setSettTotalBeds] = useState(String(hospitalProfile?.totalBeds || 300));
  const [settAvailableBeds, setSettAvailableBeds] = useState(String(hospitalProfile?.availableBeds || 75));
  const [settIcuBeds, setSettIcuBeds] = useState(String(hospitalProfile?.icuBeds || 30));
  const [settState, setSettState] = useState(hospitalProfile?.state || 'Telangana');
  const [settDistrict, setSettDistrict] = useState(hospitalProfile?.district || 'Hyderabad');
  const [settCity, setSettCity] = useState(hospitalProfile?.city || 'Hyderabad');
  const [settPincode, setSettPincode] = useState(hospitalProfile?.pincode || '500001');
  const [settAddress, setSettAddress] = useState(hospitalProfile?.address || '');
  const [settPincodeFetching, setSettPincodeFetching] = useState(false);
  const [settPincodeNotice, setSettPincodeNotice] = useState<string | null>(null);
  const [settLogoUrl, setSettLogoUrl] = useState(hospitalProfile?.logoUrl || user?.avatarUrl || '');
  const [settSaving, setSettSaving] = useState(false);

  // Password Settings
  const [pwdMethod, setPwdMethod] = useState<'old_password' | 'otp'>('otp');
  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdOtp, setPwdOtp] = useState('');
  const [pwdSendingOtp, setPwdSendingOtp] = useState(false);
  const [pwdOtpSent, setPwdOtpSent] = useState(false);
  const [pwdOtpNotice, setPwdOtpNotice] = useState<string | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showPwdOld, setShowPwdOld] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);

  useEffect(() => {
    if (hospitalProfile) {
      setSettHospName(hospitalProfile.hospitalName || user?.name || '');
      setSettHospType(hospitalProfile.hospitalType || 'Private Super-Specialty');
      setSettLicense(hospitalProfile.licenseNumber || '');
      setSettAccreditation(hospitalProfile.accreditation || 'NABH Certified & JCI Gold');
      setSettAdminRep(hospitalProfile.adminRepresentative || '');
      setSettPhone(hospitalProfile.contactPhone || user?.phone || '');
      setSettEmail(hospitalProfile.contactEmail || user?.email || '');
      setSettHotline(hospitalProfile.emergencyHotline || '');
      setSettTotalBeds(String(hospitalProfile.totalBeds || 300));
      setSettAvailableBeds(String(hospitalProfile.availableBeds || 75));
      setSettIcuBeds(String(hospitalProfile.icuBeds || 30));
      setSettState(hospitalProfile.state || 'Telangana');
      setSettDistrict(hospitalProfile.district || 'Hyderabad');
      setSettCity(hospitalProfile.city || 'Hyderabad');
      setSettPincode(hospitalProfile.pincode || '500001');
      setSettAddress(hospitalProfile.address || '');
      setSettLogoUrl(hospitalProfile.logoUrl || user?.avatarUrl || '');
    }
  }, [hospitalProfile, user]);

  const loadData = async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const [docs, emgs, transfers, leaves, testsRes, ordersRes] = await Promise.all([
        api.getHospitalDoctors(hospitalId),
        api.getEmergencyAlerts({ hospitalId }),
        api.getHospitalTransferRequests(hospitalId),
        api.getHospitalDoctorLeaves(hospitalId).catch(() => []),
        api.getHospitalLabTests(hospitalId).catch(() => ({ success: true, availableLabTests: [] })),
        api.getLabTestOrders({ hospitalId }).catch(() => []),
      ]);
      setDoctors(docs);
      setEmergencies(emgs);
      setTransferRequests(transfers);
      setDoctorLeaves(leaves);
      if (testsRes?.availableLabTests && testsRes.availableLabTests.length > 0) {
        setHospitalLabTests(testsRes.availableLabTests);
      }
      setLabOrders(ordersRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLabTests = async (updatedList: string[]) => {
    setSavingLabTests(true);
    try {
      setHospitalLabTests(updatedList);
      await api.updateHospitalLabTests(hospitalId, updatedList);
      if (refreshUser) await refreshUser();
      setActionNotice('Hospital diagnostic capabilities and lab tests updated successfully.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice('Failed to update lab tests: ' + (err.message || 'Error'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setSavingLabTests(false);
    }
  };

  const handleToggleLabTest = (test: string) => {
    let updated: string[];
    if (hospitalLabTests.includes(test)) {
      if (hospitalLabTests.length <= 1) return;
      updated = hospitalLabTests.filter((t) => t !== test);
    } else {
      updated = [...hospitalLabTests, test];
    }
    handleSaveLabTests(updated);
  };

  const handleAddCustomHospitalLabTest = () => {
    if (customLabTestInput.trim() && !hospitalLabTests.includes(customLabTestInput.trim())) {
      const updated = [...hospitalLabTests, customLabTestInput.trim()];
      setCustomLabTestInput('');
      handleSaveLabTests(updated);
    }
  };

  const handleCompleteLabOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderToComplete) return;
    setCompletingOrder(true);
    try {
      await api.completeLabTest(selectedOrderToComplete.id, completionNotes);
      setActionNotice(`Lab test for ${selectedOrderToComplete.patientName} marked completed. The doctor can now book a free follow-up appointment.`);
      setTimeout(() => setActionNotice(null), 4000);
      setSelectedOrderToComplete(null);
      setCompletionNotes('');
      loadData();
    } catch (err: any) {
      setActionNotice('Failed to complete lab test: ' + (err.message || 'Error'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setCompletingOrder(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hospitalId]);

  const handleDoctorAction = async (doctorId: string, action: 'approve' | 'reject' | 'hold' | 'unhold', reason?: string) => {
    try {
      const res = await api.approveDoctor(hospitalId, doctorId, action, reason);
      let msg = '';
      if (action === 'approve') {
        msg = 'Doctor credentials approved! Live Firestore updated. Physician can now consult patients.';
        if (res.doctor) {
          try {
            await syncUserToFirestore(res.doctor);
          } catch (fsErr) {
            console.warn('[HospitalDashboard] Firestore doctor sync notice:', fsErr);
          }
        }
      }
      else if (action === 'hold') msg = 'Doctor temporarily placed ON HOLD. Activities paused until changes are updated.';
      else if (action === 'unhold') msg = 'Doctor hold released. Physician activities resumed.';
      else if (action === 'reject') msg = 'Doctor application rejected.';
      
      setActionNotice(msg);
      setModalAction(null);
      setReasonInput('');
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to update doctor status'));
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleSettPincodeLookup = async (code: string) => {
    const pin = code.trim();
    if (pin.length !== 6) return;
    setSettPincodeFetching(true);
    setSettPincodeNotice('Fetching details from India Post...');
    try {
      const info = await fetchIndiaPincodeDetails(pin);
      if (info) {
        if (info.state) setSettState(info.state);
        if (info.district) setSettDistrict(info.district);
        if (info.city) setSettCity(info.city);
        setSettPincodeNotice(`✅ Auto-detected: ${info.city}, ${info.district}, ${info.state}`);
      } else {
        setSettPincodeNotice('Pincode details not found. Please enter manually.');
      }
    } catch {
      setSettPincodeNotice('Unable to auto-fetch. Please enter manually.');
    } finally {
      setSettPincodeFetching(false);
    }
  };

  const handleOnboardDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardDocName.trim() || !onboardDocEmail.trim()) {
      setActionNotice('❌ Doctor name and official email are required.');
      setTimeout(() => setActionNotice(null), 5000);
      return;
    }
    if (!onboardDocLicense.trim()) {
      setActionNotice('❌ Medical Practitioner License number is required.');
      setTimeout(() => setActionNotice(null), 5000);
      return;
    }

    // User Requirement: File uploads must be mandatory
    if (!onboardGovtIdFile) {
      setActionNotice('❌ Doctor Government ID / Aadhaar Document is mandatory. Please upload.');
      setTimeout(() => setActionNotice(null), 5000);
      return;
    }
    if (!onboardLicenseFile) {
      setActionNotice('❌ Medical Practitioner License document is mandatory. Please upload.');
      setTimeout(() => setActionNotice(null), 5000);
      return;
    }
    if (!onboardDegreeFile) {
      setActionNotice('❌ Medical Qualification Degree certificate is mandatory. Please upload.');
      setTimeout(() => setActionNotice(null), 5000);
      return;
    }

    setOnboardDocSubmitting(true);
    try {
      const docs: UserDocument[] = [
        {
          id: `doc-id-${Date.now()}`,
          name: onboardGovtIdFile.name || 'Doctor Govt ID / Aadhar',
          type: 'aadhar',
          url: onboardGovtIdFile.dataUrl,
          uploadedAt: new Date().toISOString(),
        },
        {
          id: `doc-lic-${Date.now()}`,
          name: onboardLicenseFile.name || 'Medical Practitioner License',
          type: 'medical_license',
          url: onboardLicenseFile.dataUrl,
          uploadedAt: new Date().toISOString(),
        },
        {
          id: `doc-deg-${Date.now()}`,
          name: onboardDegreeFile.name || 'Medical Qualification Degree',
          type: 'degree',
          url: onboardDegreeFile.dataUrl,
          uploadedAt: new Date().toISOString(),
        },
      ];

      const res = await api.hospitalOnboardDoctor(hospitalId, {
        name: onboardDocName.trim(),
        email: onboardDocEmail.trim().toLowerCase(),
        phone: onboardDocPhone.trim() || '+91 98765-43210',
        medicalLicenseNumber: onboardDocLicense.trim(),
        govtIdType: onboardDocGovtIdType,
        govtIdNumber: onboardDocGovtIdNumber.trim(),
        specialization: onboardDocSpecialization,
        ugDegree: onboardDocUgDegree,
        pgDegree: onboardDocPgDegree,
        graduatingCollege: onboardDocCollege.trim() || 'Medical College',
        passingYear: onboardDocPassingYear,
        yearsOfExperience: Number(onboardDocExperience) || 5,
        consultationFee: Number(onboardDocFee) || 500,
        bio: onboardDocBio.trim() || `Consultant Specialist in ${onboardDocSpecialization} affiliated with ${hospitalProfile?.hospitalName || user?.name}.`,
        avatarUrl: onboardAvatarFile?.dataUrl || undefined,
        uploadedDocuments: docs,
      });

      // User Requirement: Live sync to Cloud Firestore
      if (res.doctor) {
        try {
          await syncUserToFirestore(res.doctor);
        } catch (fsErr) {
          console.warn('[HospitalDashboard] Firestore sync notice:', fsErr);
        }
      }

      setIsOnboardDoctorOpen(false);
      setOnboardSuccessData({
        doctor: res.doctor,
        password: res.password,
        emailSent: res.emailSent,
      });

      setActionNotice(`✅ Dr. ${res.doctor.name} onboarded, authorized, and synchronized to Firestore!`);
      setTimeout(() => setActionNotice(null), 6000);

      // Reset form
      setOnboardDocName('');
      setOnboardDocEmail('');
      setOnboardDocPhone('');
      setOnboardDocLicense('');
      setOnboardDocGovtIdNumber('');
      setOnboardDocBio('');
      setOnboardGovtIdFile(null);
      setOnboardLicenseFile(null);
      setOnboardDegreeFile(null);
      setOnboardAvatarFile(null);

      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to onboard doctor'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setOnboardDocSubmitting(false);
    }
  };

  const handleSaveHospitalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettSaving(true);
    try {
      const updates = {
        name: settHospName.trim(),
        phone: settPhone.trim(),
        hospitalName: settHospName.trim(),
        hospitalType: settHospType,
        licenseNumber: settLicense.trim(),
        accreditation: settAccreditation.trim(),
        adminRepresentative: settAdminRep.trim(),
        contactPhone: settPhone.trim(),
        contactEmail: settEmail.trim().toLowerCase(),
        emergencyHotline: settHotline.trim(),
        totalBeds: Number(settTotalBeds) || 300,
        availableBeds: Number(settAvailableBeds) || 75,
        icuBeds: Number(settIcuBeds) || 30,
        state: settState,
        district: settDistrict,
        city: settCity,
        pincode: settPincode,
        address: settAddress,
        logoUrl: settLogoUrl.trim(),
      };

      const res = await api.updateHospitalSettings(hospitalId, updates);
      if (res.hospital) {
        try {
          await syncUserToFirestore(res.hospital);
        } catch (fsErr) {
          console.warn('[HospitalDashboard] Firestore sync note:', fsErr);
        }
      }
      setActionNotice('✅ Hospital settings updated and synchronized across all portals!');
      setTimeout(() => setActionNotice(null), 5000);
      refreshUser();
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to save hospital settings'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setSettSaving(false);
    }
  };

  const handleSendPwdOtp = async () => {
    const targetEmail = settEmail || user?.email;
    if (!targetEmail) return;
    setPwdSendingOtp(true);
    try {
      const res = await api.sendOtp(targetEmail.toLowerCase());
      setPwdOtpSent(true);
      setPwdOtpNotice(`Verification OTP sent to ${targetEmail}. (Preview: ${res.previewOtp || 'Sent'})`);
      setTimeout(() => setPwdOtpNotice(null), 8000);
    } catch (err: any) {
      setPwdOtpNotice('❌ ' + (err.message || 'Failed to send OTP'));
      setTimeout(() => setPwdOtpNotice(null), 5000);
    } finally {
      setPwdSendingOtp(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdNew.length < 6) {
      setPwdOtpNotice('❌ New password must be at least 6 characters long.');
      setTimeout(() => setPwdOtpNotice(null), 5000);
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdOtpNotice('❌ New password and confirmation do not match.');
      setTimeout(() => setPwdOtpNotice(null), 5000);
      return;
    }

    setPwdSaving(true);
    try {
      const payload: any = {
        userId: user?.id,
        email: user?.email,
        method: pwdMethod,
        newPassword: pwdNew,
      };
      if (pwdMethod === 'otp') {
        payload.otp = pwdOtp.trim();
      } else {
        payload.oldPassword = pwdOld;
      }

      const res = await api.changePassword(payload);
      setActionNotice(`✅ ${res.message || 'Password changed successfully!'}`);
      setPwdOld('');
      setPwdNew('');
      setPwdConfirm('');
      setPwdOtp('');
      setPwdOtpSent(false);
      setPwdOtpNotice(null);
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err: any) {
      setPwdOtpNotice('❌ ' + (err.message || 'Password change failed'));
      setTimeout(() => setPwdOtpNotice(null), 6000);
    } finally {
      setPwdSaving(false);
    }
  };

  const handleTransferResponse = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await api.respondDoctorTransfer(hospitalId, requestId, action);
      setActionNotice(
        action === 'accept'
          ? 'Transfer request accepted! Physician is now officially affiliated with your hospital.'
          : 'Transfer request declined.'
      );
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to respond to transfer'));
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleEmailChangeResponse = async (doctorId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const res = await api.approveDoctorEmailChange(hospitalId, doctorId, action, notes);
      setActionNotice(res.message || (action === 'approve' ? 'Doctor medical email change approved!' : 'Email change request declined.'));
      setTimeout(() => setActionNotice(null), 5000);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to process email change'));
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleViewDoctorDetails = async (doctor: User) => {
    setLoadingDetails(true);
    setFullDoctorDetails(null);
    try {
      const details = await api.getDoctorFullDetails(hospitalId, doctor.id);
      setFullDoctorDetails(details);
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to load doctor full details'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorFee) return;
    setSavingFee(true);
    try {
      const res = await api.updateDoctorConsultationFee(hospitalId, selectedDoctorFee.doctor.id, Number(selectedDoctorFee.fee) || 0);
      setActionNotice(`✅ ${res.message}`);
      setSelectedDoctorFee(null);
      setTimeout(() => setActionNotice(null), 5000);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to update consultation fee'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setSavingFee(false);
    }
  };

  const handleUpdateQuotaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorQuota) return;
    setSavingQuota(true);
    try {
      const res = await api.updateDoctorLeaveQuota(hospitalId, selectedDoctorQuota.doctor.id, Number(selectedDoctorQuota.quota) || 5);
      setActionNotice(`✅ ${res.message}`);
      setSelectedDoctorQuota(null);
      setTimeout(() => setActionNotice(null), 5000);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to update leave allowance'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setSavingQuota(false);
    }
  };

  const handleRespondLeave = async (leaveId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await api.respondDoctorLeave(hospitalId, leaveId, status);
      setActionNotice(`✅ ${res.message}`);
      setTimeout(() => setActionNotice(null), 5000);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to update leave status'));
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleUpdateLogoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoInputUrl.trim()) return;
    setSavingLogo(true);
    try {
      const res = await api.updateHospitalLogo(hospitalId, logoInputUrl.trim());
      setActionNotice(`✅ ${res.message}`);
      setIsLogoModalOpen(false);
      setTimeout(() => setActionNotice(null), 5000);
      refreshUser();
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to update hospital logo'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setSavingLogo(false);
    }
  };

  const emailChangeRequests = doctors.filter((d) => !!d.doctorProfile?.pendingEmailChange);

  const pendingDoctors = doctors.filter(
    (d) => d.doctorProfile?.approvalStatus === 'pending_hospital_approval' || d.status === 'pending_verification'
  );
  const approvedDoctors = doctors.filter(
    (d) => d.doctorProfile?.approvalStatus === 'approved' && d.status === 'active'
  );
  const onHoldDoctors = doctors.filter(
    (d) => d.doctorProfile?.approvalStatus === 'on_hold' || d.status === 'on_hold'
  );
  const pendingTransfers = transferRequests.filter((t) => t.status === 'pending');

  const filteredDoctors = doctors.filter((doc) => {
    if (selectedDoctorTab === 'pending') {
      return doc.doctorProfile?.approvalStatus === 'pending_hospital_approval' || doc.status === 'pending_verification';
    }
    if (selectedDoctorTab === 'active') {
      return doc.doctorProfile?.approvalStatus === 'approved' && doc.status === 'active';
    }
    if (selectedDoctorTab === 'on_hold') {
      return doc.doctorProfile?.approvalStatus === 'on_hold' || doc.status === 'on_hold';
    }
    return true;
  });


  return (
    <div className="space-y-6">
      
      {/* Hospital Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-orange-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={
                  hospitalProfile?.logoUrl ||
                  user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=160&auto=format&fit=crop&q=80'
                }
                alt="Hospital Logo"
                className="w-16 h-16 rounded-2xl object-cover bg-white p-1 border-2 border-amber-400/40 shadow-md"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-xs font-semibold text-amber-200 mb-1">
                <Building2 className="w-3.5 h-3.5 text-amber-300" /> Hospital Management Portal
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                {hospitalProfile?.hospitalName || user?.name || 'Hospital Center'}
              </h1>
              <p className="text-amber-200/80 text-xs max-w-2xl mt-0.5">
                License: <span className="font-mono text-white font-bold">{hospitalProfile?.licenseNumber || 'HOSP-REG-VERIFIED'}</span> • Accreditation: {hospitalProfile?.accreditation || 'NABH Certified'} • ER Hotline: <span className="font-bold text-white">{hospitalProfile?.emergencyHotline || '1-800-555-9111'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveMainTab('settings')}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Hospital basic settings & password change"
            >
              <Settings className="w-4 h-4 text-amber-300" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => {
                setLogoInputUrl(hospitalProfile?.logoUrl || user?.avatarUrl || '');
                setIsLogoModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Set or update official hospital logo displayed across hospital and doctors"
            >
              <Image className="w-4 h-4 text-amber-300" />
              <span>Update Logo</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Verification Status Banner if pending Admin review */}
        {hospitalProfile?.verificationStatus === 'pending_admin_verification' && (
          <div className="mt-4 p-3 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Your hospital registration request is currently <strong>Awaiting System Admin Verification</strong>. Once verified by the administrator, patient referrals and doctor rosters will be active.
            </span>
          </div>
        )}

        {hospitalProfile?.verificationStatus === 'on_hold' && (
          <div className="mt-4 p-3 bg-rose-500/20 border border-rose-400/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              This hospital profile is currently placed <strong>ON HOLD by System Administrator</strong>.
            </span>
          </div>
        )}

        {actionNotice && (
          <div className="mt-4 p-3 bg-teal-500/20 border border-teal-400/40 rounded-xl text-teal-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>

      {/* Hospital Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            Pending Doctor Approvals
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-amber-600">{pendingDoctors.length}</span>
            <Stethoscope className="w-5 h-5 text-amber-500/50" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            Active Physicians
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-slate-800">{approvedDoctors.length}</span>
            <Users className="w-5 h-5 text-indigo-500/50" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            Physicians on Hold
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-rose-600">{onHoldDoctors.length}</span>
            <PauseCircle className="w-5 h-5 text-rose-500/50" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            Inpatient Beds
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-slate-800">
              {hospitalProfile?.totalBeds || 300} ({hospitalProfile?.icuBeds || 30} ICU)
            </span>
            <Bed className="w-5 h-5 text-teal-500/50" />
          </div>
        </div>
      </div>

      {/* Main Section Navigation: Doctor Roster, Incoming Transfers, Emergency Response */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveMainTab('doctors')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'doctors'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Doctor Staff & Approvals</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
            {doctors.length}
          </span>
          {pendingDoctors.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-500 text-white font-bold animate-pulse">
              {pendingDoctors.length} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab('lab_tests')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'lab_tests'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-teal-600" />
          <span>Diagnostic Labs & Imaging Tests</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
            {hospitalLabTests.length}
          </span>
          {labOrders.filter((o) => o.status === 'ordered').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-teal-600 text-white font-bold animate-pulse">
              {labOrders.filter((o) => o.status === 'ordered').length} Orders
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab('leaves')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'leaves'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarOff className="w-4 h-4" />
          <span>Doctor Leave Requests</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
            {doctorLeaves.length}
          </span>
          {doctorLeaves.filter((l) => l.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-500 text-white font-bold animate-pulse">
              {doctorLeaves.filter((l) => l.status === 'pending').length} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab('transfers')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'transfers'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Incoming Doctor Transfers</span>
          {pendingTransfers.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-600 text-white font-bold animate-pulse">
              {pendingTransfers.length} Pending
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
              {transferRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab('email_requests')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'email_requests'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Doctor Email Change Requests</span>
          {emailChangeRequests.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-600 text-white font-bold animate-pulse">
              {emailChangeRequests.length} Pending
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
              0
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab('emergencies')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'emergencies'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>Emergency Alerts</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
            {emergencies.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('settings')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'settings'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Facility Settings & Password</span>
        </button>
      </div>

      {/* ================= TAB 1: DOCTORS STAFF ROSTER & HOLD MGMT ================= */}
      {activeMainTab === 'doctors' && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                Affiliated Medical Staff Roster ({doctors.length})
              </h3>
              <button
                type="button"
                onClick={() => setIsOnboardDoctorOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Onboard a New Doctor</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Review doctor registration requests, authorize clinical appointments, onboard new specialists, or put doctors on hold.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSelectedDoctorTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedDoctorTab === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              All ({doctors.length})
            </button>
            <button
              onClick={() => setSelectedDoctorTab('pending')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedDoctorTab === 'pending' ? 'bg-amber-500 text-white shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Requests ({pendingDoctors.length})
            </button>
            <button
              onClick={() => setSelectedDoctorTab('active')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedDoctorTab === 'active' ? 'bg-teal-700 text-white shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Active ({approvedDoctors.length})
            </button>
            <button
              onClick={() => setSelectedDoctorTab('on_hold')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedDoctorTab === 'on_hold' ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              On Hold ({onHoldDoctors.length})
            </button>
          </div>
        </div>

        {/* Doctor List Table / Cards */}
        {filteredDoctors.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Stethoscope className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No doctors found in this category.</p>
            <p className="text-[11px] mt-1">
              Physicians registering with affiliation to "{hospitalProfile?.hospitalName || user?.name}" will appear here for review and acceptance.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDoctors.map((doc) => {
              const status = doc.doctorProfile?.approvalStatus || 'pending_hospital_approval';
              const isHold = status === 'on_hold' || doc.status === 'on_hold';
              const isApproved = status === 'approved' && doc.status === 'active';
              const isPending = status === 'pending_hospital_approval' || doc.status === 'pending_verification';

              return (
                <div key={doc.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start gap-3">
                    <img
                      src={doc.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(doc.name)}`}
                      alt={doc.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{doc.name}</h4>
                        {isApproved && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                            Approved & Receiving Appointments
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                            Pending Hospital Acceptance
                          </span>
                        )}
                        {isHold && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Activities On Hold
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-indigo-700 mt-0.5">
                        {doc.doctorProfile?.specialization}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-1 font-mono">
                        <span>Lic: {doc.doctorProfile?.medicalLicenseNumber || 'Unverified'}</span>
                        {doc.doctorProfile?.govtIdNumber && (
                          <span>Govt ID: {doc.doctorProfile.govtIdNumber}</span>
                        )}
                        <span>Exp: {doc.doctorProfile?.yearsOfExperience || 1} yrs</span>
                        <span>Fee: ₹{doc.doctorProfile?.consultationFee ?? 500}</span>
                        <span>Degrees: {doc.doctorProfile?.qualifications || 'MBBS'}</span>
                      </div>

                      {doc.doctorProfile?.rejectionReason && isHold && (
                        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 mt-2">
                          <strong>Hold Reason / Needed Changes:</strong> {doc.doctorProfile.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Approve / Hold / Reactivate / Reject */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* If pending */}
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleDoctorAction(doc.id, 'approve')}
                          className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept Doctor</span>
                        </button>
                        <button
                          onClick={() => setModalAction({ doctor: doc, action: 'hold' })}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Hold Activities</span>
                        </button>
                        <button
                          onClick={() => setModalAction({ doctor: doc, action: 'reject' })}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {/* Full Doctor Details & Attended Patients Modal Trigger */}
                    <button
                      type="button"
                      onClick={() => handleViewDoctorDetails(doc)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="View complete credentials, patient visits, surgery records, and leave history"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Full Details & Patients</span>
                    </button>

                    {/* Set Doctor Consultation Fee */}
                    <button
                      type="button"
                      onClick={() => setSelectedDoctorFee({ doctor: doc, fee: doc.doctorProfile?.consultationFee ?? 500 })}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="Set doctor consultation fee"
                    >
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Set Fee (₹{doc.doctorProfile?.consultationFee ?? 500})</span>
                    </button>

                    {/* Set Doctor Leave Allowance Quota */}
                    <button
                      type="button"
                      onClick={() => setSelectedDoctorQuota({ doctor: doc, quota: doc.doctorProfile?.maxLeaveAllowance ?? 5 })}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title="Adjust doctor maximum working days leave allowance"
                    >
                      <CalendarOff className="w-3.5 h-3.5 text-slate-600" />
                      <span>Leave Quota ({doc.doctorProfile?.maxLeaveAllowance ?? 5}d)</span>
                    </button>

                    {/* If Active -> Can Put on Hold */}
                    {isApproved && (
                      <button
                        onClick={() => setModalAction({ doctor: doc, action: 'hold' })}
                        className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Hold Activities</span>
                      </button>
                    )}

                    {/* If On Hold -> Can Release Hold / Reactivate */}
                    {isHold && (
                      <button
                        onClick={() => handleDoctorAction(doc.id, 'unhold')}
                        className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Resume Activities (Unhold)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* ================= TAB: DIAGNOSTIC LABS & IMAGING TESTS ================= */}
      {activeMainTab === 'lab_tests' && (
        <div className="space-y-6">
          {/* Section 1: Hospital Lab & Diagnostic Modalities Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold mb-1">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  <span>Diagnostic Infrastructure Management</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hospital Diagnostic Laboratory & Imaging Capabilities
                </h3>
                <p className="text-xs text-slate-500">
                  Configure which diagnostic imaging modalities and pathology investigations this hospital can perform. Doctors in this facility can prescribe these tests to patients.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-3 py-1 bg-teal-50 text-teal-800 rounded-xl border border-teal-200">
                  {hospitalLabTests.length} Active Tests
                </span>
                {savingLabTests && (
                  <span className="text-xs text-amber-600 flex items-center gap-1 font-semibold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </span>
                )}
              </div>
            </div>

            {/* Test Modalities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {[
                'MRI Scan (Brain / Neuro Imaging)',
                'MRI Scan (Spine / Lumbo-Sacral & Cervical)',
                'MRI Scan (Joints / Musculoskeletal)',
                'CT Scan (High-Resolution Chest)',
                'CT Scan (Abdomen & Pelvis with Contrast)',
                'CT Scan (Head & Brain)',
                'Digital X-Ray (Chest PA View)',
                'Digital X-Ray (Spine & Skeletal Joint Views)',
                '2D Echocardiogram & Color Doppler',
                'Electrocardiogram (12-Lead Digital ECG)',
                'Ultrasound / Sonography (USG Whole Abdomen & Pelvis)',
                'Complete Blood Count (CBC with ESR & Platelet Count)',
                'Lipid Profile & Cardiac Biomarkers (Troponin-I, CK-MB)',
                'Liver Function Test (LFT - Bilirubin, SGOT, SGPT)',
                'Kidney Function Test (KFT - Blood Urea & Serum Creatinine)',
                'Glycated Hemoglobin (HbA1c) & Fasting / PP Glucose',
                'Thyroid Function Panel (Free T3, Free T4, TSH)',
                'Urine Routine & Microscopic Diagnostic Examination',
                'Bone Mineral Density (DEXA Dual-Energy Scan)',
                'Diagnostic Upper GI Endoscopy & Colonoscopy',
              ].map((testName) => {
                const isEnabled = hospitalLabTests.includes(testName);
                return (
                  <button
                    key={testName}
                    type="button"
                    onClick={() => handleToggleLabTest(testName)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                      isEnabled
                        ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <span className="truncate pr-2">{testName}</span>
                    {isEnabled ? (
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Test Addition */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Add new test or modality (e.g. Coronary Angiogram, Digital Mammography, Biopsy)..."
                value={customLabTestInput}
                onChange={(e) => setCustomLabTestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomHospitalLabTest();
                  }
                }}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddCustomHospitalLabTest}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Diagnostic Test</span>
              </button>
            </div>
          </div>

          {/* Section 2: Patient Diagnostic Test Orders Queue */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>Prescribed Diagnostic Test Orders ({labOrders.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tests ordered by hospital doctors. Laboratory technician can mark tests complete and upload diagnostic findings.
                </p>
              </div>

              <button
                type="button"
                onClick={loadData}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                title="Refresh orders list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {labOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Activity className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No diagnostic lab tests currently ordered.</p>
                <p className="text-[11px] text-slate-400">
                  When doctors in this hospital prescribe tests to patients (e.g., MRI scan, CT scan), they will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {labOrders.map((order) => {
                  const isCompleted = order.status === 'completed';
                  return (
                    <div key={order.id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          }`}>
                            {isCompleted ? '✓ Completed' : 'Pending Sample / Testing'}
                          </span>
                          <span className="text-xs font-mono text-slate-400">#{order.id}</span>
                        </div>

                        <span className="text-[11px] text-slate-400">
                          Ordered: {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-500 block">Patient Name:</span>
                          <strong className="text-slate-900">{order.patientName}</strong>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">Ordering Physician:</span>
                          <strong className="text-slate-900">Dr. {order.doctorName}</strong>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">Facility:</span>
                          <span className="text-slate-700">{order.hospitalName}</span>
                        </div>
                      </div>

                      {/* Tests Requested */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          Prescribed Tests & Modalities:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {order.testNames.map((t, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-teal-900">
                              🧪 {t}
                            </span>
                          ))}
                        </div>
                        {order.clinicalIndication && (
                          <p className="text-[11px] text-slate-600 mt-1">
                            <strong>Clinical Indication:</strong> {order.clinicalIndication}
                          </p>
                        )}
                      </div>

                      {/* Completed findings if completed */}
                      {isCompleted && (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-xs">
                          <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Laboratory Diagnostic Report & Findings:</span>
                          </span>
                          <p className="text-emerald-950 font-medium">{order.reportNotes || 'Testing complete. Normal physiological boundaries.'}</p>
                          {order.completedAt && (
                            <span className="text-[10px] text-emerald-700 block">
                              Completed on {new Date(order.completedAt).toLocaleString()} · Eligible for Free Follow-Up Review
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-1">
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderToComplete(order);
                              setCompletionNotes(`Diagnostic investigation for ${order.testNames.join(', ')} verified. Clinical findings uploaded to patient record.`);
                            }}
                            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete Test & Enter Report Notes</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete Lab Test Modal */}
      {selectedOrderToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Record Diagnostic Test Results
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Order #{selectedOrderToComplete.id} for {selectedOrderToComplete.patientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderToComplete(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteLabOrderSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tests Completed:
                </label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800">
                  {selectedOrderToComplete.testNames.join(' • ')}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Clinical Diagnostic Findings / Lab Notes *
                </label>
                <textarea
                  rows={4}
                  required
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. MRI Lumbar Spine: L4-L5 disc protrusion noted with mild thecal sac indent. No canal stenosis. / Blood Count: CBC within normal limits..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderToComplete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completingOrder}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{completingOrder ? 'Recording...' : 'Mark Completed'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= TAB: DOCTOR LEAVE REQUESTS & MANAGEMENT ================= */}
      {activeMainTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-amber-600" />
                <span>Doctor Leave Applications & Quota Management ({doctorLeaves.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and approve or reject leave applications submitted by affiliated physicians. Default allowance limit is 5 working days per physician.
              </p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-800 font-bold px-3 py-1.5 rounded-xl border border-amber-200 shrink-0">
              Hospital Management Authority
            </span>
          </div>

          {doctorLeaves.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <CalendarOff className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No doctor leave applications submitted.</p>
              <p className="text-[11px] mt-1">
                When an affiliated physician submits a leave request from their dashboard, it will appear here for administrative approval.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {doctorLeaves.map((leave) => {
                const doc = doctors.find((d) => d.id === leave.doctorId);
                const isPending = leave.status === 'pending';
                const isApproved = leave.status === 'approved';
                const isRejected = leave.status === 'rejected';

                return (
                  <div key={leave.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{leave.doctorName}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPending
                            ? 'bg-amber-100 text-amber-900 animate-pulse'
                            : isApproved
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}>
                          {leave.status?.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>Duration: <strong>{leave.startDate}</strong> to <strong>{leave.endDate}</strong></span>
                        <span>•</span>
                        <span>Working Days: <strong className="text-amber-900 font-black">{leave.daysCount} days</strong> (Limit: {doc?.doctorProfile?.maxLeaveAllowance ?? 5}d)</span>
                        <span>•</span>
                        <span>Submitted: {new Date(leave.requestedAt || Date.now()).toLocaleDateString()}</span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <span className="font-semibold text-slate-500 text-[10px] uppercase block">Reason for Absence:</span>
                        <p className="text-slate-800 font-medium mt-0.5">"{leave.reason}"</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRespondLeave(leave.id, 'approved')}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve Leave</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondLeave(leave.id, 'rejected')}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500">
                          Decided on {leave.respondedAt ? new Date(leave.respondedAt).toLocaleDateString() : 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: INCOMING DOCTOR TRANSFERS ================= */}
      {activeMainTab === 'transfers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              <span>Incoming Doctor Transfer Requests ({transferRequests.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Doctors currently affiliated with another hospital who requested a transfer to your facility. If you accept, they will be transferred to your hospital to receive appointments.
            </p>
          </div>

          {transferRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No transfer requests pending.</p>
              <p className="text-[11px] mt-1">
                When a doctor at another hospital submits a transfer request choosing "{hospitalProfile?.hospitalName || user?.name}", it will appear here for review and acceptance.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transferRequests.map((req) => {
                const isPending = req.status === 'pending';
                const isAccepted = req.status === 'accepted';
                const isRejected = req.status === 'rejected';

                return (
                  <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{req.doctorName}</h4>
                        {isPending && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                            Pending Your Approval
                          </span>
                        )}
                        {isAccepted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                            Transfer Accepted
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Transfer Declined
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-indigo-700 mt-0.5">
                        {req.specialization} • License: <span className="font-mono">{req.medicalLicenseNumber}</span>
                      </p>

                      <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-700">Currently Affiliated Hospital:</span>{' '}
                          <span className="font-bold text-slate-900">{req.currentHospitalName}</span>
                        </p>
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-700">Reason for Transfer:</span>{' '}
                          <span className="italic text-slate-800">{req.reason}</span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Requested: {new Date(req.requestDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleTransferResponse(req.id, 'accept')}
                          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accept Transfer</span>
                        </button>
                        <button
                          onClick={() => handleTransferResponse(req.id, 'reject')}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: DOCTOR MEDICAL EMAIL CHANGE REQUESTS ================= */}
      {activeMainTab === 'email_requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-600" />
                <span>Doctor Medical Email Change Authorizations ({emailChangeRequests.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Doctors cannot change their registered medical email directly. Requests are sent here for hospital administration approval.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              Hospital Exclusive Authority
            </span>
          </div>

          {emailChangeRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Mail className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No pending medical email change requests.</p>
              <p className="text-[11px] mt-1 text-slate-400">
                When a physician submits an email update request, it will appear here for verification and approval.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {emailChangeRequests.map((doc) => {
                const req = doc.doctorProfile?.pendingEmailChange;
                if (!req) return null;

                return (
                  <div key={doc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{doc.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 animate-pulse">
                          Pending Email Authorization
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                        <span>Specialization: <strong className="text-indigo-900">{doc.doctorProfile?.specialization}</strong></span>
                        <span>•</span>
                        <span>License: <strong className="font-mono text-slate-800">{doc.doctorProfile?.medicalLicenseNumber}</strong></span>
                      </div>

                      {/* Email change visual diff */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Registered Email:</span>
                            <span className="font-mono font-semibold text-slate-700 text-xs">{doc.email}</span>
                          </div>
                          <span className="hidden sm:inline text-slate-400 font-bold">&rarr;</span>
                          <div>
                            <span className="text-[10px] text-teal-700 uppercase font-bold block">Requested New Email:</span>
                            <span className="font-mono font-bold text-teal-900 text-xs bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {req.newEmail}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-600">
                          <strong>Clinical Reason:</strong> <em>"{req.reason}"</em> • Submitted: {new Date(req.requestedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEmailChangeResponse(doc.id, 'approve')}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Medical Email Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEmailChangeResponse(doc.id, 'reject')}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: HOSPITAL SETTINGS & SECURITY ================= */}
      {activeMainTab === 'settings' && (
        <div className="space-y-6">
          
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Settings className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hospital Facility Settings & Security</h3>
                <p className="text-xs text-slate-500">
                  Update facility credentials, clinical capacity, India location, official logo emblem, and change portal passwords.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Live Firestore Synced
              </span>
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Basic Hospital Profile & Location */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* General Facility Info Form */}
              <form onSubmit={handleSaveHospitalSettings} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span>Clinical Facility Identification</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Official Profile Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Hospital Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={settHospName}
                      onChange={(e) => setSettHospName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Hospital Type / Category *</label>
                    <select
                      value={settHospType}
                      onChange={(e) => setSettHospType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-semibold outline-none"
                    >
                      <option value="Private Super-Specialty">Private Super-Specialty</option>
                      <option value="Government / Public">Government / Public</option>
                      <option value="Trust / Non-Profit">Trust / Non-Profit</option>
                      <option value="Multi-Specialty Clinic">Multi-Specialty Clinic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Clinical License Number *</label>
                    <input
                      type="text"
                      required
                      value={settLicense}
                      onChange={(e) => setSettLicense(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Accreditation *</label>
                    <input
                      type="text"
                      value={settAccreditation}
                      onChange={(e) => setSettAccreditation(e.target.value)}
                      placeholder="e.g. NABH Certified & JCI Gold"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Medical Director / Admin Rep *</label>
                    <input
                      type="text"
                      required
                      value={settAdminRep}
                      onChange={(e) => setSettAdminRep(e.target.value)}
                      placeholder="e.g. Dr. K. Rao"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Official Management Email *</label>
                    <input
                      type="email"
                      required
                      value={settEmail}
                      onChange={(e) => setSettEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      value={settPhone}
                      onChange={(e) => setSettPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">24/7 Emergency ER Hotline *</label>
                    <input
                      type="tel"
                      required
                      value={settHotline}
                      onChange={(e) => setSettHotline(e.target.value)}
                      placeholder="+91 1800-425-9111"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-rose-700"
                    />
                  </div>
                </div>

                {/* Bed Capacity Controls */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <Bed className="w-3.5 h-3.5 text-teal-600" />
                    Bed Capacity & Inpatient Inventory
                  </span>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 mb-1">Total Beds</label>
                      <input
                        type="number"
                        value={settTotalBeds}
                        onChange={(e) => setSettTotalBeds(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Available Beds</label>
                      <input
                        type="number"
                        value={settAvailableBeds}
                        onChange={(e) => setSettAvailableBeds(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">ICU Critical Care Beds</label>
                      <input
                        type="number"
                        value={settIcuBeds}
                        onChange={(e) => setSettIcuBeds(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-700"
                      />
                    </div>
                  </div>
                </div>

                {/* India Location Details */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      Hospital Location (India Only)
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                      India Healthcare Registry
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">State *</label>
                      <select
                        value={settState}
                        onChange={(e) => {
                          const s = e.target.value;
                          setSettState(s);
                          const dists = INDIA_DISTRICTS[s];
                          if (dists && dists.length > 0) setSettDistrict(dists[0]);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800"
                      >
                        {INDIA_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">District *</label>
                      {INDIA_DISTRICTS[settState] && INDIA_DISTRICTS[settState].length > 0 ? (
                        <select
                          value={settDistrict}
                          onChange={(e) => setSettDistrict(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800"
                        >
                          {INDIA_DISTRICTS[settState].map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={settDistrict}
                          onChange={(e) => setSettDistrict(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">City / Municipality *</label>
                      <input
                        type="text"
                        required
                        value={settCity}
                        onChange={(e) => setSettCity(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                        <span>PIN Code *</span>
                        <span className="text-[10px] text-emerald-700">Auto-Fetch</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={settPincode}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '');
                            setSettPincode(v);
                            if (v.length === 6) handleSettPincodeLookup(v);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-emerald-950"
                        />
                        <button
                          type="button"
                          onClick={() => handleSettPincodeLookup(settPincode)}
                          disabled={settPincodeFetching || settPincode.length !== 6}
                          className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                        >
                          {settPincodeFetching ? '...' : 'Fetch'}
                        </button>
                      </div>
                      {settPincodeNotice && (
                        <p className="text-[10px] mt-1 text-emerald-800 font-medium">{settPincodeNotice}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-semibold mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        value={settAddress}
                        onChange={(e) => setSettAddress(e.target.value)}
                        placeholder="Plot No 42, Road 1"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Settings Button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={settSaving}
                    className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{settSaving ? 'Saving Settings...' : 'Save Hospital Settings'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right 1 Col: Logo Branding & Password Management */}
            <div className="space-y-6">
              
              {/* Hospital Logo & Identity Emblem (User Requirement: Logo displayed beside hospital name on hospital photo) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Image className="w-4 h-4 text-amber-600" />
                    <span>Official Hospital Logo</span>
                  </h4>
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                    Displayed on Photo
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
                  <img
                    src={
                      settLogoUrl ||
                      hospitalProfile?.logoUrl ||
                      user?.avatarUrl ||
                      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=160&auto=format&fit=crop&q=80'
                    }
                    alt="Hospital Logo"
                    className="w-16 h-16 rounded-2xl object-cover bg-white p-1 border-2 border-amber-400 shadow-md shrink-0"
                  />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">{settHospName || user?.name}</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      This logo emblem appears beside the hospital name in the hospital portal and inside affiliated doctors' dashboards.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="block font-semibold text-slate-700">Upload New Logo Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setSettLogoUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="w-full text-[10px] text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-amber-100 file:text-amber-800 cursor-pointer"
                  />
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mt-2 mb-1">Or Paste Image URL</label>
                    <input
                      type="url"
                      value={settLogoUrl}
                      onChange={(e) => setSettLogoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Password Management Card (User Requirement: Change password via Old Password OR Email OTP) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-600" />
                    <span>Change Portal Password</span>
                  </h4>
                  <span className="text-[10px] text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full font-bold">
                    Security
                  </span>
                </div>

                {/* Method Switch: OTP vs Old Password */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setPwdMethod('otp');
                      setPwdOtpNotice(null);
                    }}
                    className={`py-2 rounded-lg transition-colors cursor-pointer text-center ${
                      pwdMethod === 'otp' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Via Email OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPwdMethod('old_password');
                      setPwdOtpNotice(null);
                    }}
                    className={`py-2 rounded-lg transition-colors cursor-pointer text-center ${
                      pwdMethod === 'old_password' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Via Old Password
                  </button>
                </div>

                <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
                  {pwdMethod === 'otp' ? (
                    <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-950">Email Verification OTP</span>
                        <button
                          type="button"
                          onClick={handleSendPwdOtp}
                          disabled={pwdSendingOtp}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          {pwdSendingOtp ? 'Sending...' : pwdOtpSent ? 'Resend Code' : 'Send Code'}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-600">
                        A 6-digit OTP code will be dispatched to <strong>{settEmail || user?.email}</strong>.
                      </p>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={pwdOtp}
                        onChange={(e) => setPwdOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit OTP code"
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-mono text-center text-sm font-bold tracking-widest"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Current Old Password *</label>
                      <div className="relative">
                        <input
                          type={showPwdOld ? 'text' : 'password'}
                          required
                          value={pwdOld}
                          onChange={(e) => setPwdOld(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwdOld(!showPwdOld)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPwdOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">New Password (min 6 chars) *</label>
                    <div className="relative">
                      <input
                        type={showPwdNew ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={pwdNew}
                        onChange={(e) => setPwdNew(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl pr-9 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwdNew(!showPwdNew)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPwdNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Confirm New Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  {pwdOtpNotice && (
                    <div className={`p-2.5 rounded-xl text-[11px] font-semibold ${
                      pwdOtpNotice.startsWith('❌') ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {pwdOtpNotice}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={pwdSaving}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Key className="w-4 h-4 text-amber-300" />
                    <span>{pwdSaving ? 'Updating Password...' : 'Update Password'}</span>
                  </button>
                </form>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Action / Hold Reason Modal */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {modalAction.action === 'hold' ? (
                  <>
                    <PauseCircle className="w-4 h-4 text-amber-600" />
                    <span>Put Physician on Hold</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Reject Doctor Application</span>
                  </>
                )}
              </h4>
              <button
                onClick={() => setModalAction(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Physician: <strong>{modalAction.doctor.name}</strong> ({modalAction.doctor.doctorProfile?.specialization})
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {modalAction.action === 'hold' ? 'Reason for placing on hold *' : 'Reason for rejection *'}
              </label>
              <textarea
                rows={3}
                required
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder={
                  modalAction.action === 'hold'
                    ? 'e.g. License renewal in progress, clinical review, or temporary medical leave.'
                    : 'e.g. Credentials could not be verified with State Medical Council.'
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalAction(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDoctorAction(modalAction.doctor.id, modalAction.action, reasonInput)}
                className={`px-4 py-2 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer ${
                  modalAction.action === 'hold' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {modalAction.action === 'hold' ? 'Confirm Hold' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DOCTOR FULL DETAILS & VISITED PATIENTS ================= */}
      {(loadingDetails || fullDoctorDetails) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Comprehensive Physician Profile & Practice Audit
                  </h3>
                  <p className="text-xs text-slate-500">
                    Full hospital record, visited patients, clinical appointments, and leave quota history
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFullDoctorDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetails && (
              <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <span>Loading physician practice and patient records...</span>
              </div>
            )}

            {fullDoctorDetails && (
              <div className="space-y-5 text-xs">
                {/* Doctor Header Banner */}
                <div className="p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-teal-50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={fullDoctorDetails.doctor.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=Doc'}
                      alt={fullDoctorDetails.doctor.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-200"
                    />
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">{fullDoctorDetails.doctor.name}</h4>
                      <p className="text-indigo-800 font-bold">{fullDoctorDetails.doctor.doctorProfile?.specialization}</p>
                      <p className="text-[11px] text-slate-500">{fullDoctorDetails.doctor.email} • {fullDoctorDetails.doctor.phone}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-1 font-mono">
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold">
                      Lic: {fullDoctorDetails.doctor.doctorProfile?.medicalLicenseNumber}
                    </span>
                    <span className="text-[11px] text-teal-800 font-semibold">
                      Fee: ₹{fullDoctorDetails.doctor.doctorProfile?.consultationFee ?? 500} / consult
                    </span>
                    <span className="text-[11px] text-amber-800 font-semibold">
                      Leave Allowance: {fullDoctorDetails.doctor.doctorProfile?.maxLeaveAllowance ?? 5} working days
                    </span>
                  </div>
                </div>

                {/* 4 Summary Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Visited Patients</span>
                    <span className="text-lg font-black text-indigo-900">{fullDoctorDetails.patientsCount ?? 0}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Appointments</span>
                    <span className="text-lg font-black text-teal-900">{fullDoctorDetails.appointments?.length ?? 0}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Prescriptions Issued</span>
                    <span className="text-lg font-black text-purple-900">{fullDoctorDetails.prescriptions?.length ?? 0}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Leaves Taken</span>
                    <span className="text-lg font-black text-amber-900">{fullDoctorDetails.leaves?.length ?? 0}</span>
                  </div>
                </div>

                {/* Academic & Licensing Credentials */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                    Medical Council Credentials & College History
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Degrees & Qualifications:</span>
                      <strong className="text-slate-800">{fullDoctorDetails.doctor.doctorProfile?.qualifications || 'MBBS'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Graduating College:</span>
                      <strong className="text-slate-800">{fullDoctorDetails.doctor.doctorProfile?.college || 'National Medical College'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Graduation Year:</span>
                      <strong className="text-slate-800">{fullDoctorDetails.doctor.doctorProfile?.passingYear || '2016'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Govt Identity Number:</span>
                      <strong className="text-slate-800">{fullDoctorDetails.doctor.doctorProfile?.govtIdNumber || 'Aadhaar / Passport'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Clinical Experience:</span>
                      <strong className="text-slate-800">{fullDoctorDetails.doctor.doctorProfile?.yearsOfExperience || 1} Years</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Current Surgery Status:</span>
                      <strong className={fullDoctorDetails.doctor.doctorProfile?.inSurgery ? 'text-rose-600' : 'text-emerald-700'}>
                        {fullDoctorDetails.doctor.doctorProfile?.inSurgery ? '🔴 Currently In Surgery' : '🟢 Available For Consults'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Visited Patients & Appointments Breakdown */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                    Visited & Scheduled Patients Roster ({fullDoctorDetails.appointments?.length ?? 0})
                  </span>
                  {(!fullDoctorDetails.appointments || fullDoctorDetails.appointments.length === 0) ? (
                    <p className="p-4 bg-slate-50 text-slate-400 rounded-xl text-center">No patient consultations logged yet for this doctor.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                      {fullDoctorDetails.appointments.map((apt: any) => (
                        <div key={apt.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-slate-900">{apt.patientName}</strong>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              {apt.date} • {apt.timeSlot} • Reason: {apt.reasonForVisit}
                            </p>
                          </div>
                          {apt.treatmentCode && (
                            <span className="font-mono text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-700 shrink-0">
                              {apt.treatmentCode}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prescriptions & Clinical Suggestions Issued by Doctor */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                    Prescriptions & Clinical Suggestions Issued ({fullDoctorDetails.prescriptions?.length ?? 0})
                  </span>
                  {(!fullDoctorDetails.prescriptions || fullDoctorDetails.prescriptions.length === 0) ? (
                    <p className="p-4 bg-slate-50 text-slate-400 rounded-xl text-center">No prescriptions or clinical suggestions recorded yet for this doctor.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                      {fullDoctorDetails.prescriptions.map((rx: any) => (
                        <div key={rx.id} className="p-3 bg-white hover:bg-slate-50 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">Patient: {rx.patientName}</span>
                            <span className="text-slate-400 text-[11px]">{new Date(rx.date || rx.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="p-2 bg-teal-50/60 rounded-lg text-teal-900 text-[11px]">
                            <strong>Diagnosis:</strong> {rx.diagnosis}
                          </div>
                          {rx.medicines && rx.medicines.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-500 text-[10px] uppercase">Prescribed Medicines:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {rx.medicines.map((m: any, idx: number) => (
                                  <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[11px]">
                                    <strong className="text-slate-800">{m.name}</strong> ({m.dosage}) • {m.frequency} • {m.duration}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {(rx.advice || rx.generalAdvice) && (
                            <p className="text-[11px] text-slate-600 bg-amber-50/50 p-2 rounded border border-amber-100">
                              <strong className="text-amber-900">Suggestions & Advice Given:</strong> {rx.advice || rx.generalAdvice}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Doctor Leave Applications History */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                    Leave Applications History ({fullDoctorDetails.leaves?.length ?? 0})
                  </span>
                  {(!fullDoctorDetails.leaves || fullDoctorDetails.leaves.length === 0) ? (
                    <p className="p-4 bg-slate-50 text-slate-400 rounded-xl text-center">No leave requests logged for this physician.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                      {fullDoctorDetails.leaves.map((l: any) => (
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

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setFullDoctorDetails(null)}
                    className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                  >
                    Close Doctor Audit Record
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: SET DOCTOR CONSULTATION FEE ================= */}
      {selectedDoctorFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span>Set Doctor Consultation Fee</span>
              </h4>
              <button
                onClick={() => setSelectedDoctorFee(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600">
              Set the standard patient consultation tariff for <strong>{selectedDoctorFee.doctor.name}</strong> ({selectedDoctorFee.doctor.doctorProfile?.specialization}).
            </p>

            <form onSubmit={handleUpdateFeeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Consultation Fee (₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={selectedDoctorFee.fee}
                    onChange={(e) => setSelectedDoctorFee({ ...selectedDoctorFee, fee: Number(e.target.value) })}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDoctorFee(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFee}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{savingFee ? 'Saving Fee...' : 'Save Consultation Fee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SET DOCTOR LEAVE QUOTA ================= */}
      {selectedDoctorQuota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-amber-600" />
                <span>Adjust Physician Leave Allowance Quota</span>
              </h4>
              <button
                onClick={() => setSelectedDoctorQuota(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600">
              Set the maximum working days leave allowance for <strong>{selectedDoctorQuota.doctor.name}</strong>. Default policy limit is 5 working days per physician.
            </p>

            <form onSubmit={handleUpdateQuotaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Maximum Working Days Allowed *
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={selectedDoctorQuota.quota}
                  onChange={(e) => setSelectedDoctorQuota({ ...selectedDoctorQuota, quota: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  The physician cannot submit leave applications exceeding this quota without hospital approval.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDoctorQuota(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuota}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{savingQuota ? 'Updating Quota...' : 'Update Leave Quota'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: UPDATE HOSPITAL LOGO ================= */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Image className="w-4 h-4 text-amber-600" />
                <span>Update Official Hospital Logo</span>
              </h4>
              <button
                onClick={() => setIsLogoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600">
              Provide the direct image URL for your hospital emblem or logo. This logo appears in your hospital dashboard, official prescription documents, and on the dashboard of every doctor affiliated with this facility.
            </p>

            <form onSubmit={handleUpdateLogoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hospital Logo URL *
                </label>
                <input
                  type="url"
                  required
                  value={logoInputUrl}
                  onChange={(e) => setLogoInputUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or https://..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Logo Preview */}
              {logoInputUrl && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                  <img
                    src={logoInputUrl}
                    alt="Logo Preview"
                    onError={(e) => {
                      (e.target as any).src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=160&auto=format&fit=crop&q=80';
                    }}
                    className="w-14 h-14 rounded-xl object-cover bg-white p-1 border border-slate-200 shadow-2xs"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Logo Live Preview</span>
                    <span className="text-[11px] text-teal-700 font-semibold">Will synchronize to all affiliated physicians</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLogo || !logoInputUrl.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{savingLogo ? 'Saving Logo...' : 'Save & Publish Logo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= VIEW: ONBOARD NEW DOCTOR (Exact Same Page As Standalone Doctor Registration) ================= */}
      {isOnboardDoctorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50/95 backdrop-blur-md overflow-y-auto overscroll-contain animate-in fade-in">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <RegistrationPageView
              defaultRole="doctor"
              lockRole={true}
              isEmbedded={true}
              embeddedTitle="Register & Authorize Doctor"
              preselectedHospitalId={hospitalId}
              preselectedHospitalName={hospitalProfile?.hospitalName || user?.name}
              onCancel={() => setIsOnboardDoctorOpen(false)}
              onRegistrationComplete={(createdDoctor) => {
                setIsOnboardDoctorOpen(false);
                setActionNotice(`✅ Dr. ${createdDoctor?.name || "Physician"} registered, authorized, and linked to hospital!`);
                setTimeout(() => setActionNotice(null), 6000);
                loadData();
              }}
            />
          </div>
        </div>
      )}

      {/* ================= MODAL: DOCTOR ONBOARDED CREDENTIALS DISPLAY ================= */}
      {onboardSuccessData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
              Doctor Onboarded & Authorized
            </span>

            <h3 className="text-xl font-black text-slate-900 leading-snug">
              Dr. {onboardSuccessData.doctor.name} Successfully Registered
            </h3>

            <p className="text-xs text-slate-600">
              Physician account provisioned with official affiliation to <strong>{hospitalProfile?.hospitalName || user?.name}</strong> and live synchronized to Cloud Firestore.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Allocated Doctor Credentials</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Login Email:</span>
                <strong className="font-mono text-slate-900">{onboardSuccessData.doctor.email}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Access Password:</span>
                <strong className="font-mono text-emerald-800 text-sm font-black bg-emerald-100 px-2 py-0.5 rounded-md">
                  {onboardSuccessData.password}
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Medical License:</span>
                <strong className="font-mono text-slate-900">{onboardSuccessData.doctor.doctorProfile?.medicalLicenseNumber}</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-indigo-50 p-3 rounded-xl border border-indigo-200">
              ✉️ An official credentials notification email has been dispatched to <strong>{onboardSuccessData.doctor.email}</strong>. The doctor can now log in via Google Sign-In or using the email and password above.
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setOnboardSuccessData(null)}
                className="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Done / Back to Roster
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
