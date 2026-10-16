import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User as UserIcon,
  Activity,
  FileText,
  Plus,
  Trash2,
  Printer,
  HeartPulse,
  Building2,
  CalendarOff,
  RefreshCw,
  Search,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  ArrowRightLeft,
  X,
  Mail,
  UserX,
  Sliders,
  UserCheck,
  UserPlus,
  History,
  ClipboardList,
  ArrowRight,
  Upload,
  Key,
  Copy,
  MapPin,
  FlaskConical,
  Share2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  Appointment,
  Prescription,
  IoTReading,
  User,
  PrescriptionMedicine,
  DoctorTransferRequest,
  DoctorLeaveRequest,
  PatientDoctorRequest,
  ScheduledSurgery,
  HealthVerification,
  UserDocument,
  EmergencyAlert,
  LabTestOrder
} from '../../types';
import { api } from '../../services/api';
import { PrescriptionModal } from '../prescriptions/PrescriptionModal';
import { syncUserToFirestore } from '../../services/firestoreSync';
import { INDIA_STATES, INDIA_DISTRICTS, fetchIndiaPincodeDetails } from '../../utils/indiaLocations';

export const isAppointmentSlotCompleted = (dateStr: string, timeSlotStr: string): boolean => {
  try {
    const now = new Date();
    let endTimeStr = timeSlotStr;
    if (timeSlotStr.includes('to')) {
      endTimeStr = timeSlotStr.split('to')[1].trim();
    } else if (timeSlotStr.includes('-')) {
      endTimeStr = timeSlotStr.split('-')[1].trim();
    }

    const isPM = /pm/i.test(endTimeStr) || (/pm/i.test(timeSlotStr) && !/am/i.test(endTimeStr));
    const isAM = /am/i.test(endTimeStr) || (/am/i.test(timeSlotStr) && !/pm/i.test(endTimeStr));

    const match = endTimeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) {
      const singleMatch = timeSlotStr.match(/(\d{1,2}):(\d{2})/);
      if (singleMatch) {
        let h = parseInt(singleMatch[1], 10);
        let m = parseInt(singleMatch[2], 10) + 30;
        if (m >= 60) { h += 1; m -= 60; }
        if (/pm/i.test(timeSlotStr) && h < 12) h += 12;
        if (/am/i.test(timeSlotStr) && h === 12) h = 0;
        const [year, month, day] = dateStr.split('-').map(Number);
        const slotEnd = new Date(year, month - 1, day, h, m, 0);
        return now.getTime() >= slotEnd.getTime();
      }
      return true;
    }

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const [year, month, day] = dateStr.split('-').map(Number);
    const slotEnd = new Date(year, month - 1, day, hours, minutes, 0);
    return now.getTime() >= slotEnd.getTime();
  } catch {
    return false;
  }
};

export const DoctorDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const doctorId = user?.id || 'doc-1';
  const doctorProfile = user?.doctorProfile;

  const [activeTab, setActiveTab] = useState<
    'appointments' | 'patients' | 'prescribe' | 'recent_prescriptions' | 'leaves' | 'surgery_slots' | 'hospital' | 'patient_requests' | 'treated_patients' | 'emergencies' | 'referrals' | 'lab_tests'
  >('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorPrescriptions, setDoctorPrescriptions] = useState<Prescription[]>([]);
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'pending' | 'approved' | 'completed' | 'cancelled'>('all');
  const [cancelCodeModalApt, setCancelCodeModalApt] = useState<Appointment | null>(null);
  const [inputCancelVerificationCode, setInputCancelVerificationCode] = useState('');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [includeFollowUpReview, setIncludeFollowUpReview] = useState(false);
  const [patients, setPatients] = useState<User[]>([]);
  const [patientReadings, setPatientReadings] = useState<Record<string, IoTReading[]>>({});
  const [emergencies, setEmergencies] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(false);

  // Patient Intake Requests (Intake capacity quota: 10 to 15 patients)
  const [patientRequests, setPatientRequests] = useState<PatientDoctorRequest[]>([]);
  const [respondingReqId, setRespondingReqId] = useState<string | null>(null);

  // Recent Patients Treated & Health Verification
  const [treatedPatients, setTreatedPatients] = useState<any[]>([]);
  const [selectedTreatedPatient, setSelectedTreatedPatient] = useState<any | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'clear' | 'observation' | 'critical'>('clear');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyingPatient, setVerifyingPatient] = useState(false);

  // Planned Surgery Scheduling (Must be >= 7 days ahead)
  const [plannedSurgeryDate, setPlannedSurgeryDate] = useState('');
  const [plannedSurgerySlot, setPlannedSurgerySlot] = useState('09:00 AM - 01:00 PM');
  const [plannedProcedure, setPlannedProcedure] = useState('');
  const [plannedOT, setPlannedOT] = useState('Main OT-1');
  const [plannedSurgeryNotes, setPlannedSurgeryNotes] = useState('');
  const [schedulingSurgery, setSchedulingSurgery] = useState(false);

  // Urgent Emergency Surgery Mode & Appointment Rescheduling
  const [urgentSurgeryDate, setUrgentSurgeryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [urgentNewDate, setUrgentNewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [urgentNewSlot, setUrgentNewSlot] = useState('10:00 AM');
  const [urgentReason, setUrgentReason] = useState('Immediate emergency surgical intervention');
  const [urgentRescheduling, setUrgentRescheduling] = useState(false);

  // Doctor Surgery Mode & Custom Slot Timings
  const [inSurgery, setInSurgery] = useState<boolean>(Boolean(doctorProfile?.inSurgery));
  const [surgeryNotes, setSurgeryNotes] = useState(doctorProfile?.surgeryNotes || '');
  const [isSurgeryModeModalOpen, setIsSurgeryModeModalOpen] = useState(false);
  const [surgeryWorkflowResult, setSurgeryWorkflowResult] = useState<any | null>(null);
  const [activatingSurgeryWorkflow, setActivatingSurgeryWorkflow] = useState(false);
  const [showWorkflowDetailsModal, setShowWorkflowDetailsModal] = useState(false);
  const [customSlotTimings, setCustomSlotTimings] = useState<string[]>(
    doctorProfile?.customSlotTimings?.length
      ? doctorProfile.customSlotTimings
      : ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '04:00 PM']
  );
  const [newSlotInput, setNewSlotInput] = useState('');
  const [savingSurgery, setSavingSurgery] = useState(false);

  // Doctor Leave Requests (5 working days limit by default, managed by hospital)
  const [doctorLeaves, setDoctorLeaves] = useState<DoctorLeaveRequest[]>([]);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveDaysCount, setLeaveDaysCount] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  // Hospital Transfer state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetHospId, setTransferTargetHospId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [myTransfers, setMyTransfers] = useState<DoctorTransferRequest[]>([]);

  // Rejection Modal
  const [rejectingAptId, setRejectingAptId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Leave Management
  const [newLeaveDate, setNewLeaveDate] = useState('');

  // Prescription Form
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAptId, setSelectedAptId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [recordedBp, setRecordedBp] = useState('120/80 mmHg');
  const [recordedHr, setRecordedHr] = useState('74');
  const [recordedSpO2, setRecordedSpO2] = useState('98');
  const [recordedTemp, setRecordedTemp] = useState('36.6');
  const [advice, setAdvice] = useState('Continue daily low-sodium diet and log morning IoT health measurements.');
  const [followUpDate, setFollowUpDate] = useState('2026-10-20');
  const [followUpTimeSlot, setFollowUpTimeSlot] = useState('10:00 AM');
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([
    {
      name: 'Tab. Amlodipine',
      dosage: '5 mg',
      frequency: '1-0-0 (Morning after food)',
      duration: '30 Days',
      instructions: 'Take with warm water. Do not skip doses.',
    },
  ]);

  // Prescription Viewer Modal
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Recent Prescriptions Filter State (Date Range, Date Picker, Treated Patient Selector)
  const [rxTimeFilter, setRxTimeFilter] = useState<'all' | '7d' | '10d' | '30d' | 'custom'>('all');
  const [rxSelectedDate, setRxSelectedDate] = useState<string>('');
  const [rxSelectedPatientId, setRxSelectedPatientId] = useState<string>('all');
  const [rxSearchQuery, setRxSearchQuery] = useState<string>('');

  // Doctor Registering Patient State
  const [hospitals, setHospitals] = useState<User[]>([]);
  const [isRegisterPatientOpen, setIsRegisterPatientOpen] = useState(false);
  const [patientRegName, setPatientRegName] = useState('');
  const [patientRegEmail, setPatientRegEmail] = useState('');
  const [patientRegPhone, setPatientRegPhone] = useState('');
  const [patientRegGovtIdType, setPatientRegGovtIdType] = useState('Aadhar Card');
  const [patientRegGovtIdNumber, setPatientRegGovtIdNumber] = useState('');
  const [patientRegDob, setPatientRegDob] = useState('1994-04-12');
  const [patientRegGender, setPatientRegGender] = useState('male');
  const [patientRegBloodGroup, setPatientRegBloodGroup] = useState('O+');
  const [patientRegHeight, setPatientRegHeight] = useState('174');
  const [patientRegWeight, setPatientRegWeight] = useState('70');
  const [patientRegConditions, setPatientRegConditions] = useState('Hypertension');
  const [patientRegAllergies, setPatientRegAllergies] = useState('None');
  const [patientRegEmergencyName, setPatientRegEmergencyName] = useState('');
  const [patientRegEmergencyPhone, setPatientRegEmergencyPhone] = useState('');
  const [patientRegEmergencyRel, setPatientRegEmergencyRel] = useState('Spouse');
  const [patientRegHospitalId, setPatientRegHospitalId] = useState('');
  const [patientRegSubmitting, setPatientRegSubmitting] = useState(false);

  // India Geographic Address States for Patient Registration (User Requirement)
  const [patientRegCountry, setPatientRegCountry] = useState('India');
  const [patientRegState, setPatientRegState] = useState('Telangana');
  const [patientRegDistrict, setPatientRegDistrict] = useState('Hyderabad');
  const [patientRegCity, setPatientRegCity] = useState('Hyderabad');
  const [patientRegPincode, setPatientRegPincode] = useState('500001');
  const [patientRegStreetAddress, setPatientRegStreetAddress] = useState('');
  const [patientRegPincodeFetching, setPatientRegPincodeFetching] = useState(false);
  const [patientRegPincodeNotice, setPatientRegPincodeNotice] = useState<string | null>(null);

  // Mandatory Patient ID Upload (User Requirement: Uploading files should be mandatory)
  const [patientRegGovtIdFile, setPatientRegGovtIdFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);

  // Registered Patient Credentials Success Modal
  const [registeredPatientSuccessData, setRegisteredPatientSuccessData] = useState<{
    patient: User;
    password?: string;
    emailSent?: any;
  } | null>(null);
  const [copiedPatientCredentials, setCopiedPatientCredentials] = useState(false);

  // Treatment Code Verification State
  const [completingApt, setCompletingApt] = useState<Appointment | null>(null);
  const [inputTreatmentCode, setInputTreatmentCode] = useState('');
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completingLoading, setCompletingLoading] = useState(false);

  // In-Hospital Colleague Referrals & Cross-Specialty Appointments
  const [hospitalDoctors, setHospitalDoctors] = useState<User[]>([]);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralPatientId, setReferralPatientId] = useState('');
  const [referralTargetDoctorId, setReferralTargetDoctorId] = useState('');
  const [referralDate, setReferralDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [referralTimeSlot, setReferralTimeSlot] = useState('10:00 AM');
  const [referralReason, setReferralReason] = useState('');
  const [referralSubmitting, setReferralSubmitting] = useState(false);

  // Diagnostic Labs & Imaging Tests
  const [hospitalLabTests, setHospitalLabTests] = useState<string[]>([]);
  const [labOrders, setLabOrders] = useState<LabTestOrder[]>([]);
  const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);
  const [labOrderPatientId, setLabOrderPatientId] = useState('');
  const [labOrderSelectedTests, setLabOrderSelectedTests] = useState<string[]>([]);
  const [labOrderIndication, setLabOrderIndication] = useState('');
  const [labOrderSubmitting, setLabOrderSubmitting] = useState(false);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [completingOrderReportNotes, setCompletingOrderReportNotes] = useState('');

  // Free Follow-Up Appointment after Diagnostic Lab Test ($0 Fee)
  const [isFreeFollowUpModalOpen, setIsFreeFollowUpModalOpen] = useState(false);
  const [selectedOrderForFollowUp, setSelectedOrderForFollowUp] = useState<LabTestOrder | null>(null);
  const [freeFollowUpDate, setFreeFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [freeFollowUpSlot, setFreeFollowUpSlot] = useState('11:00 AM');
  const [freeFollowUpNotes, setFreeFollowUpNotes] = useState('');
  const [freeFollowUpSubmitting, setFreeFollowUpSubmitting] = useState(false);

  // Doctor Medical Email Change State
  const [isEmailChangeModalOpen, setIsEmailChangeModalOpen] = useState(false);
  const [newMedicalEmail, setNewMedicalEmail] = useState('');
  const [emailChangeReason, setEmailChangeReason] = useState('');
  const [emailChangeSubmitting, setEmailChangeSubmitting] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);

  const handleRequestEmailChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedicalEmail || !newMedicalEmail.includes('@')) {
      setEmailChangeError('Please enter a valid official medical email address.');
      return;
    }
    setEmailChangeSubmitting(true);
    setEmailChangeError(null);
    try {
      const res = await api.requestDoctorEmailChange(doctorId, newMedicalEmail, emailChangeReason);
      setActionNotice(res.message || 'Medical email change request sent to hospital management for approval.');
      setTimeout(() => setActionNotice(null), 6000);
      setIsEmailChangeModalOpen(false);
      setNewMedicalEmail('');
      setEmailChangeReason('');
      loadData();
    } catch (err: any) {
      setEmailChangeError(err.message || 'Failed to submit medical email change request');
    } finally {
      setEmailChangeSubmitting(false);
    }
  };

  const handleRespondPatientRequest = async (requestId: string, action: 'accept' | 'decline') => {
    setRespondingReqId(requestId);
    try {
      const res = await api.respondDoctorPatientRequest(doctorId, requestId, action);
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 5000);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to respond to request'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setRespondingReqId(null);
    }
  };

  const handleVerifyPatientHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreatedPatient) return;
    setVerifyingPatient(true);
    try {
      await api.verifyPatientHealth(doctorId, selectedTreatedPatient.patientId, {
        status: verifyStatus,
        notes: verifyNotes.trim() || (verifyStatus === 'clear' ? 'Health condition evaluated and cleared.' : 'Routine monitoring advised.'),
      });
      setActionNotice(`✅ Health verification confirmed for ${selectedTreatedPatient.patientName}. Patient has been notified by email.`);
      setTimeout(() => setActionNotice(null), 6000);
      setSelectedTreatedPatient(null);
      setVerifyNotes('');
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to verify patient health'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setVerifyingPatient(false);
    }
  };

  const handleSchedulePlannedSurgery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plannedSurgeryDate || !plannedProcedure.trim()) {
      setActionNotice('❌ Surgery date and procedure name are required.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }
    setSchedulingSurgery(true);
    try {
      const res = await api.schedulePlannedSurgery(doctorId, {
        date: plannedSurgeryDate,
        timeSlot: plannedSurgerySlot,
        procedureName: plannedProcedure.trim(),
        operatingTheater: plannedOT,
        notes: plannedSurgeryNotes.trim(),
      });
      setActionNotice(`✅ ${res.message}`);
      setPlannedProcedure('');
      setPlannedSurgeryNotes('');
      setPlannedSurgeryDate('');
      setTimeout(() => setActionNotice(null), 6000);
      loadData();
      if (refreshUser) refreshUser();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to schedule surgery'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setSchedulingSurgery(false);
    }
  };

  const handleUrgentSurgeryReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urgentSurgeryDate || !urgentNewDate) {
      setActionNotice('❌ Surgery date and rescheduled date are required.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }
    setUrgentRescheduling(true);
    try {
      const res = await api.rescheduleUrgentSurgeryAppointments(doctorId, {
        surgeryDate: urgentSurgeryDate,
        newDate: urgentNewDate,
        newTimeSlot: urgentNewSlot,
        notes: urgentReason.trim(),
      });
      setActionNotice(`🚨 Urgent surgery mode activated! ${res.rescheduledCount} appointment(s) transferred to ${urgentNewDate}. Notification emails dispatched.`);
      setTimeout(() => setActionNotice(null), 7000);
      loadData();
      if (refreshUser) refreshUser();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to reschedule appointments'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setUrgentRescheduling(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const hospId = doctorProfile?.hospitalId || 'hosp-1';
      const [apts, allUsers, hospList, transfers, leaves, reqs, treated, emgs, testsRes, ordersRes, hospDocs, docRxList] = await Promise.all([
        api.getDoctorAppointments(doctorId),
        api.getAllUsers('patient'),
        api.getAdminHospitals(),
        api.getDoctorTransferStatus(doctorId),
        api.getDoctorLeaves(doctorId).catch(() => []),
        api.getDoctorPatientRequests(doctorId).catch(() => []),
        api.getDoctorTreatedPatients(doctorId).catch(() => []),
        api.getEmergencyAlerts({ doctorId }).catch(() => []),
        api.getHospitalLabTests(hospId).catch(() => ({ success: true, availableLabTests: [] })),
        api.getLabTestOrders({ doctorId }).catch(() => []),
        api.getHospitalDoctors(hospId).catch(() => []),
        api.getDoctorPrescriptions(doctorId).catch(() => []),
      ]);
      setAppointments(apts);
      setPatients(allUsers);
      setHospitals(hospList);
      setMyTransfers(transfers);
      setDoctorLeaves(leaves);
      setPatientRequests(reqs);
      setTreatedPatients(treated);
      setEmergencies(emgs);
      setDoctorPrescriptions(docRxList || []);

      if (testsRes?.availableLabTests && testsRes.availableLabTests.length > 0) {
        setHospitalLabTests(testsRes.availableLabTests);
      } else {
        setHospitalLabTests([
          'MRI Scan (Brain / Spine)',
          'CT Scan (Chest / Abdomen / Head)',
          'Digital X-Ray (Chest & Skeletal)',
          'Complete Blood Count (CBC)',
          '2D Echocardiogram & Color Doppler',
          'Ultrasound / Sonography (USG)',
          'Lipid Profile & Cardiac Enzymes',
          'Liver & Kidney Function Tests',
          'Bone Mineral Density (DEXA Scan)',
        ]);
      }
      setLabOrders(ordersRes || []);
      setHospitalDoctors((hospDocs || []).filter((d) => d.id !== doctorId));

      if (doctorProfile) {
        setInSurgery(Boolean(doctorProfile.inSurgery));
        if (doctorProfile.surgeryNotes) setSurgeryNotes(doctorProfile.surgeryNotes);
        if (doctorProfile.customSlotTimings?.length) setCustomSlotTimings(doctorProfile.customSlotTimings);
      }

      if (hospList.length > 0 && !patientRegHospitalId) {
        setPatientRegHospitalId(doctorProfile?.hospitalId || hospList[0].id);
      }
      if (hospList.length > 0 && !transferTargetHospId) {
        const otherHosp = hospList.find((h) => h.id !== doctorProfile?.hospitalId);
        if (otherHosp) setTransferTargetHospId(otherHosp.id);
      }

      // Load latest IoT readings for each patient
      const readingsMap: Record<string, IoTReading[]> = {};
      for (const p of allUsers) {
        try {
          const reads = await api.getPatientIoTReadings(p.id);
          readingsMap[p.id] = reads;
        } catch {
          readingsMap[p.id] = [];
        }
      }
      setPatientReadings(readingsMap);

      if (allUsers.length > 0 && !selectedPatientId) {
        setSelectedPatientId(allUsers[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetHospId) {
      setActionNotice('❌ Please select a destination hospital.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }
    if (!transferReason.trim()) {
      setActionNotice('❌ Please state a reason for the hospital transfer.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }

    setTransferSubmitting(true);
    try {
      const res = await api.requestDoctorTransfer(doctorId, transferTargetHospId, transferReason.trim());
      setActionNotice(`Transfer request submitted to ${res.transferRequest.targetHospitalName}! The hospital will review and accept your transfer.`);
      setTimeout(() => setActionNotice(null), 6000);
      setIsTransferModalOpen(false);
      setTransferReason('');
      await loadData();
      await refreshUser();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to submit transfer request'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setTransferSubmitting(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [doctorId]);

  const handleUpdateAppointment = async (aptId: string, status: 'approved' | 'rejected' | 'completed', reason?: string) => {
    try {
      await api.updateAppointmentStatus(doctorId, aptId, status, reason);
      setActionNotice(
        status === 'approved'
          ? 'Appointment approved! Patient has been notified.'
          : status === 'rejected'
          ? 'Appointment rejected.'
          : 'Appointment marked as completed.'
      );
      setRejectingAptId(null);
      setRejectionReason('');
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to update appointment'));
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleCompleteTreatmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingApt) return;
    if (!inputTreatmentCode.trim()) {
      setCompletionError('Please enter the patient’s unique treatment verification code.');
      return;
    }

    setCompletingLoading(true);
    setCompletionError(null);
    try {
      await api.updateAppointmentStatus(doctorId, completingApt.id, 'completed', undefined, inputTreatmentCode.trim());
      setActionNotice(`✓ Treatment verified & completed successfully for ${completingApt.patientName}!`);
      setTimeout(() => setActionNotice(null), 5000);
      setCompletingApt(null);
      setInputTreatmentCode('');
      loadData();
    } catch (err: any) {
      setCompletionError(err.message || 'Invalid treatment code. Please ask the patient for their unique code.');
    } finally {
      setCompletingLoading(false);
    }
  };

  const handleMarkMissed = async (aptId: string) => {
    try {
      const res = await api.markAppointmentMissed(doctorId, aptId);
      setActionNotice(res.message || 'Patient marked as No-Show. Attendance score decreased.');
      setTimeout(() => setActionNotice(null), 5000);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to mark appointment as missed'));
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleCancelWithPatientCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelCodeModalApt) return;
    if (!inputCancelVerificationCode.trim()) {
      setCancelError('Please enter the patient’s unique verification passkey code.');
      return;
    }
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await api.cancelAppointmentWithCode(
        cancelCodeModalApt.id,
        inputCancelVerificationCode.trim(),
        cancelReasonText.trim() || 'Cancelled upon patient verbal passkey verification before arrival',
        doctorId
      );
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 6000);
      setCancelCodeModalApt(null);
      setInputCancelVerificationCode('');
      setCancelReasonText('');
      loadData();
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel appointment with verification code');
    } finally {
      setCancelLoading(false);
    }
  };

  // Handler 1: Submit In-Hospital Colleague Referral & Book Appointment
  const handleCreateReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralPatientId) {
      setActionNotice('❌ Please select a patient to refer.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }
    if (!referralTargetDoctorId) {
      setActionNotice('❌ Please select a colleague physician within this hospital.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }
    if (!referralDate || !referralTimeSlot) {
      setActionNotice('❌ Please select consultation date and time slot.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }

    const targetPatient = patients.find((p) => p.id === referralPatientId);
    const targetDoc = hospitalDoctors.find((d) => d.id === referralTargetDoctorId);

    setReferralSubmitting(true);
    try {
      await api.bookAppointment({
        patientId: referralPatientId,
        patientName: targetPatient?.name || 'Patient',
        doctorId: referralTargetDoctorId,
        date: referralDate,
        timeSlot: referralTimeSlot,
        reasonForVisit: `Clinical Referral from Dr. ${user?.name} (${doctorProfile?.specialization || 'Attending Physician'}): ${referralReason || 'Specialist Evaluation'}`,
        symptoms: referralReason || 'Referred for specialized diagnostic assessment',
        isDoctorBooking: true,
        referredByDoctorId: doctorId,
        referredByDoctorName: user?.name,
        referredSpecialization: targetDoc?.doctorProfile?.specialization,
      });

      setActionNotice(`✓ In-Hospital Referral Confirmed! Appointment with Dr. ${targetDoc?.name || 'Specialist'} booked for ${targetPatient?.name || 'Patient'} on ${referralDate} at ${referralTimeSlot}.`);
      setTimeout(() => setActionNotice(null), 7000);
      setIsReferralModalOpen(false);
      setReferralReason('');
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to book in-hospital referral appointment'));
      setTimeout(() => setActionNotice(null), 6000);
    } finally {
      setReferralSubmitting(false);
    }
  };

  // Handler 2: Submit Lab Test Order (e.g., Orthopedic doctor ordering MRI/CT scan)
  const handleCreateLabOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labOrderPatientId) {
      setActionNotice('❌ Please select a patient.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }
    if (labOrderSelectedTests.length === 0) {
      setActionNotice('❌ Please select at least one laboratory or diagnostic imaging test (e.g. MRI, CT Scan, X-Ray).');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }

    setLabOrderSubmitting(true);
    try {
      const res = await api.orderLabTest({
        patientId: labOrderPatientId,
        doctorId,
        testNames: labOrderSelectedTests,
        clinicalIndication: labOrderIndication.trim() || 'Attending physician clinical evaluation',
      });

      setActionNotice(`🧪 ${res.message || 'Diagnostic investigations ordered successfully! Sent to hospital diagnostic laboratory.'}`);
      setTimeout(() => setActionNotice(null), 7000);
      setIsLabOrderModalOpen(false);
      setLabOrderSelectedTests([]);
      setLabOrderIndication('');
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to order lab tests'));
      setTimeout(() => setActionNotice(null), 6000);
    } finally {
      setLabOrderSubmitting(false);
    }
  };

  // Handler 3: Mark Lab Test Completed
  const handleCompleteLabOrderSubmit = async (orderId: string) => {
    try {
      const res = await api.completeLabTest(orderId, completingOrderReportNotes.trim() || 'Imaging/Laboratory investigations completed. Normal anatomical alignment / findings available for clinical review.');
      setActionNotice(`✓ ${res.message || 'Lab test marked completed! Doctor can now book the free follow-up appointment.'}`);
      setTimeout(() => setActionNotice(null), 6000);
      setCompletingOrderId(null);
      setCompletingOrderReportNotes('');
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to complete lab test'));
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Handler 4: Book FREE Follow-Up Appointment after Lab Test ($0 Fee)
  const handleBookFreeFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForFollowUp) return;
    if (!freeFollowUpDate || !freeFollowUpSlot) {
      setActionNotice('❌ Please select follow-up date and time slot.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }

    setFreeFollowUpSubmitting(true);
    try {
      await api.bookFreeFollowUp(selectedOrderForFollowUp.id, {
        date: freeFollowUpDate,
        timeSlot: freeFollowUpSlot,
        followUpNotes: freeFollowUpNotes.trim() || 'Post-investigation clinical review and findings discussion ($0 Free Consultation).',
      });

      setActionNotice(`🎉 Free follow-up appointment successfully booked for ${selectedOrderForFollowUp.patientName} on ${freeFollowUpDate} at ${freeFollowUpSlot}! Consultation fee waived ($0 Free Follow-Up).`);
      setTimeout(() => setActionNotice(null), 8000);
      setIsFreeFollowUpModalOpen(false);
      setSelectedOrderForFollowUp(null);
      setFreeFollowUpNotes('');
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to book free follow-up appointment'));
      setTimeout(() => setActionNotice(null), 6000);
    } finally {
      setFreeFollowUpSubmitting(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const maxAllowed = doctorProfile?.maxLeaveAllowance ?? 5;
    if (leaveDaysCount > maxAllowed) {
      setActionNotice(`❌ Cannot apply for ${leaveDaysCount} days. The limit of ${maxAllowed} paid leaves is strictly per month as managed by Hospital Management.`);
      setTimeout(() => setActionNotice(null), 5000);
      return;
    }
    if (!leaveStartDate || !leaveEndDate || !leaveReason.trim()) {
      setActionNotice('❌ Start date, end date, and reason are required.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }

    setLeaveSubmitting(true);
    try {
      const res = await api.submitDoctorLeave(doctorId, {
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        daysCount: leaveDaysCount,
        reason: leaveReason.trim()
      });
      setActionNotice(`✅ ${res.message}`);
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
      setLeaveDaysCount(1);
      setTimeout(() => setActionNotice(null), 5000);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to submit leave request'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleToggleSurgery = async (newVal: boolean) => {
    if (newVal) {
      // Open the automated surgery workflow activation modal
      setIsSurgeryModeModalOpen(true);
    } else {
      // Exit surgery mode
      try {
        const res = await api.toggleDoctorSurgeryMode(doctorId, { active: false });
        setInSurgery(false);
        setSurgeryWorkflowResult(null);
        setActionNotice(res.message);
        setTimeout(() => setActionNotice(null), 5000);
        refreshUser();
        loadData();
      } catch (err: any) {
        setActionNotice('❌ ' + (err.message || 'Failed to exit surgery mode'));
        setTimeout(() => setActionNotice(null), 5000);
      }
    }
  };

  const handleExecuteAutomatedSurgeryMode = async () => {
    setActivatingSurgeryWorkflow(true);
    try {
      const res = await api.toggleDoctorSurgeryMode(doctorId, {
        active: true,
        surgeryDate: urgentSurgeryDate,
        notes: urgentReason.trim() || 'Urgent Operating Theater Priority',
      });
      setInSurgery(true);
      setSurgeryWorkflowResult(res);
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 8000);
      setIsSurgeryModeModalOpen(false);
      refreshUser();
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to activate surgery mode workflow'));
      setTimeout(() => setActionNotice(null), 6000);
    } finally {
      setActivatingSurgeryWorkflow(false);
    }
  };

  const handleSaveSlotTimings = async () => {
    setSavingSurgery(true);
    try {
      const res = await api.updateDoctorSurgerySlots(doctorId, {
        inSurgery,
        surgeryNotes,
        customSlotTimings
      });
      setActionNotice(res.message || 'Slot timings updated successfully!');
      setTimeout(() => setActionNotice(null), 5000);
      refreshUser();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to save slot timings'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setSavingSurgery(false);
    }
  };

  const handleAddSlot = () => {
    if (!newSlotInput.trim()) return;
    const formatted = newSlotInput.trim();
    if (!customSlotTimings.includes(formatted)) {
      setCustomSlotTimings([...customSlotTimings, formatted].sort());
      setNewSlotInput('');
    }
  };

  const handleRemoveSlot = (slot: string) => {
    setCustomSlotTimings(customSlotTimings.filter((s) => s !== slot));
  };

  const handleAddLeave = async () => {
    if (!newLeaveDate) return;
    try {
      await api.updateDoctorLeave(doctorId, newLeaveDate, 'add');
      setNewLeaveDate('');
      setActionNotice(`Leave date ${newLeaveDate} scheduled. Patient bookings on this day are now blocked.`);
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to add leave date'));
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleRemoveLeave = async (date: string) => {
    try {
      await api.updateDoctorLeave(doctorId, date, 'remove');
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to remove leave date'));
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleAddMedicineRow = () => {
    setMedicines([
      ...medicines,
      {
        name: '',
        dosage: '',
        frequency: '1-0-1 (After Food)',
        duration: '7 Days',
        instructions: '',
      },
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index: number, field: keyof PrescriptionMedicine, value: string) => {
    const updated = [...medicines];
    (updated[index] as any)[field] = value;
    setMedicines(updated);
  };

  const handleCreatePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patientObj = patients.find((p) => p.id === selectedPatientId);
    if (!patientObj || !diagnosis) {
      setActionNotice('❌ Please select a patient and provide diagnosis.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }

    try {
      const res = await api.createPrescription({
        appointmentId: selectedAptId || undefined,
        patientId: patientObj.id,
        patientName: patientObj.name,
        patientAge: patientObj.patientProfile?.dateOfBirth
          ? new Date().getFullYear() - new Date(patientObj.patientProfile.dateOfBirth).getFullYear()
          : 40,
        patientGender: patientObj.patientProfile?.gender || 'Adult',
        doctorId: doctorId,
        diagnosis,
        vitalsRecorded: {
          bp: recordedBp,
          heartRate: Number(recordedHr),
          spO2: Number(recordedSpO2),
          temp: Number(recordedTemp),
        },
        medicines: medicines.filter((m) => m.name.trim() !== '').map((m) => ({
          ...m,
          frequency: m.timingOption || m.frequency,
          duration: `${m.durationDays || 7} Days`,
        })),
        advice,
        followUpDate: includeFollowUpReview && followUpDate ? followUpDate : undefined,
        followUpTimeSlot: includeFollowUpReview && followUpDate ? followUpTimeSlot : undefined,
      });

      setViewingPrescription(res.prescription);
      setActionNotice(
        selectedAptId
          ? '✓ Prescription generated & signed! Next step: Enter patient verification passkey in Appointments tab to officially complete treatment.'
          : (res.followUpAppointment
            ? `Prescription issued! Follow-up consultation confirmed for ${followUpDate} at ${followUpTimeSlot}.`
            : 'Prescription successfully created and signed!')
      );
      setDiagnosis('');
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to generate prescription'));
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const openPrescribeForAppointment = (apt: Appointment) => {
    setSelectedPatientId(apt.patientId);
    setSelectedAptId(apt.id);
    setDiagnosis(`Consultation for ${apt.reasonForVisit}`);
    setActiveTab('prescribe');
  };

  const handlePatientPincodeLookup = async (code: string) => {
    const pin = code.trim();
    if (pin.length !== 6) return;
    setPatientRegPincodeFetching(true);
    setPatientRegPincodeNotice('Fetching details from India Post...');
    try {
      const info = await fetchIndiaPincodeDetails(pin);
      if (info) {
        if (info.state) setPatientRegState(info.state);
        if (info.district) setPatientRegDistrict(info.district);
        if (info.city) setPatientRegCity(info.city);
        setPatientRegPincodeNotice(`✅ Auto-detected: ${info.city}, ${info.district}, ${info.state}`);
      } else {
        setPatientRegPincodeNotice('Pincode details not found. Please enter manually.');
      }
    } catch {
      setPatientRegPincodeNotice('Unable to auto-fetch. Please enter manually.');
    } finally {
      setPatientRegPincodeFetching(false);
    }
  };

  const handleDoctorRegisterPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientRegName.trim() || !patientRegEmail.trim()) {
      setActionNotice('❌ Patient name and email are required');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }
    const chosenHosp = hospitals.find((h) => h.id === patientRegHospitalId);
    if (!chosenHosp) {
      setActionNotice('❌ Please select a target hospital destination');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }

    // User Requirement: Uploading files should be mandatory
    if (!patientRegGovtIdFile) {
      setActionNotice('❌ Patient Government ID / Aadhaar Document is mandatory. Please upload.');
      setTimeout(() => setActionNotice(null), 5000);
      return;
    }

    setPatientRegSubmitting(true);
    try {
      const uploadedDocs: UserDocument[] = [
        {
          id: `doc-pat-id-${Date.now()}`,
          name: patientRegGovtIdFile.name || 'Aadhaar / Government ID Document',
          type: 'aadhar',
          url: patientRegGovtIdFile.dataUrl,
          uploadedAt: new Date().toISOString(),
        },
      ];

      const res = await api.doctorRegisterPatient(doctorId, {
        name: patientRegName.trim(),
        email: patientRegEmail.trim().toLowerCase(),
        phone: patientRegPhone.trim() || '+91 98765-43210',
        govtIdType: patientRegGovtIdType,
        govtIdNumber: patientRegGovtIdNumber.trim(),
        dateOfBirth: patientRegDob,
        gender: patientRegGender,
        bloodGroup: patientRegBloodGroup,
        heightCm: Number(patientRegHeight) || 170,
        weightKg: Number(patientRegWeight) || 70,
        country: patientRegCountry,
        state: patientRegState,
        district: patientRegDistrict,
        city: patientRegCity,
        pincode: patientRegPincode,
        streetAddress: patientRegStreetAddress,
        existingConditions: patientRegConditions.split(',').map((s) => s.trim()).filter(Boolean),
        allergies: patientRegAllergies.split(',').map((s) => s.trim()).filter(Boolean),
        emergencyContactName: patientRegEmergencyName.trim() || 'Family Member',
        emergencyContactPhone: patientRegEmergencyPhone.trim() || patientRegPhone.trim() || '+91 98765-43210',
        emergencyContactRelationship: patientRegEmergencyRel,
        hospitalId: chosenHosp.id,
        uploadedDocuments: uploadedDocs,
      });

      const hospLic = chosenHosp.hospitalProfile?.licenseNumber || 'REG-LIC';
      const hospName = chosenHosp.hospitalProfile?.hospitalName || chosenHosp.name;

      // User Requirement: Live sync registered patient to Cloud Firestore
      if (res?.patient) {
        try {
          await syncUserToFirestore(res.patient);
        } catch (fsErr) {
          console.warn('[DoctorDashboard] Firestore patient sync notice:', fsErr);
        }
      }

      setIsRegisterPatientOpen(false);
      setRegisteredPatientSuccessData({
        patient: res.patient,
        password: res.password,
        emailSent: res.emailSent,
      });

      setActionNotice(
        `✅ Patient ${patientRegName} successfully registered! Allocated login credentials dispatched to ${res.patient.email}. Care request dispatched to ${hospName} (Facility License: ${hospLic}).`
      );
      setTimeout(() => setActionNotice(null), 7000);

      // Reset form
      setPatientRegName('');
      setPatientRegEmail('');
      setPatientRegPhone('');
      setPatientRegGovtIdNumber('');
      setPatientRegStreetAddress('');
      setPatientRegGovtIdFile(null);
      loadData();
    } catch (err: any) {
      setActionNotice('❌ ' + (err.message || 'Failed to register patient'));
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setPatientRegSubmitting(false);
    }
  };

  // Hospital approval status checks
  const isPendingApproval = doctorProfile?.approvalStatus === 'pending_hospital_approval';
  const isRejected = doctorProfile?.approvalStatus === 'rejected';
  const isOnHold = doctorProfile?.approvalStatus === 'on_hold' || user?.status === 'on_hold';

  return (
    <div className="space-y-6">
      
      {/* Doctor Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-teal-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-semibold text-indigo-200">
                <Stethoscope className="w-3.5 h-3.5 text-indigo-300" /> Authorized Clinical Practitioner
              </div>

              {/* In Surgery Status Badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                inSurgery
                  ? 'bg-rose-500/30 border border-rose-400 text-rose-200 animate-pulse'
                  : 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-200'
              }`}>
                <span>{inSurgery ? '🔴 Currently In Surgery (Slots Hidden)' : '🟢 Available for Consultations'}</span>
              </div>
            </div>

            <h1 className="text-2xl font-black tracking-tight">{user?.name}</h1>
            <p className="text-indigo-200/80 text-xs max-w-2xl">
              {doctorProfile?.specialization} • {doctorProfile?.qualifications} • License: <span className="font-mono text-white font-bold">{doctorProfile?.medicalLicenseNumber}</span>
            </p>

            {/* Hospital Affiliation Card with Hospital Logo (User Requirement) */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl shadow-xs">
                {(() => {
                  const linkedHospital = hospitals.find((h) => h.id === doctorProfile?.hospitalId);
                  const effectiveLogo =
                    doctorProfile?.hospitalLogoUrl ||
                    linkedHospital?.hospitalProfile?.logoUrl ||
                    linkedHospital?.avatarUrl ||
                    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=120&auto=format&fit=crop&q=80';
                  const effectiveHospName =
                    doctorProfile?.hospitalName ||
                    linkedHospital?.hospitalProfile?.hospitalName ||
                    linkedHospital?.name ||
                    'Affiliated Hospital';
                  return (
                    <>
                      <img
                        src={effectiveLogo}
                        alt="Hospital Logo"
                        className="w-7 h-7 rounded-lg object-cover bg-white p-0.5 border border-white/30 shrink-0 shadow-xs"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white leading-tight">
                          {effectiveHospName}
                        </span>
                        <span className="text-[10px] text-teal-300 font-semibold flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5" /> Official Hospital Affiliation
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <span className="text-xs text-indigo-200">
                Consultation Fee: <strong className="text-white">${doctorProfile?.consultationFee ?? 50}</strong>
              </span>

              <span className="text-xs text-indigo-200">
                Leave Allowance: <strong className="text-white">{doctorProfile?.maxLeaveAllowance ?? 5} working days</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Surgery Mode Interactive Toggle Switch */}
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs border border-white/20 px-3.5 py-1.5 rounded-xl shadow-xs">
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Urgent Surgery Mode</span>
                <span className={`text-[11px] font-extrabold ${inSurgery ? 'text-rose-300 animate-pulse' : 'text-emerald-300'}`}>
                  {inSurgery ? '🔴 IN SURGERY' : '🟢 AVAILABLE'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSurgery(!inSurgery)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  inSurgery ? 'bg-rose-600' : 'bg-slate-700'
                }`}
                title={inSurgery ? 'Click to exit surgery mode' : 'Click to activate urgent surgery mode and auto-reassign conflicting slots'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    inSurgery ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsRegisterPatientOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserIcon className="w-4 h-4" />
              <span>Register Patient</span>
            </button>
            <button
              onClick={() => setActiveTab('prescribe')}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Write Prescription</span>
            </button>
          </div>
        </div>

        {/* Banner if in surgery with automated workflow feedback */}
        {inSurgery && (
          <div className="mt-4 p-4 bg-gradient-to-r from-rose-900/80 to-slate-900 border border-rose-400/60 rounded-xl text-rose-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-black text-white text-sm flex items-center gap-2">
                  <span>URGENT SURGERY MODE ACTIVE</span>
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] rounded-full uppercase font-black">
                    Slots Locked
                  </span>
                </p>
                <p className="text-rose-100/90 text-xs mt-1">
                  Physician is currently in urgent surgery ({doctorProfile?.surgeryNotes || 'Operating Theater Priority'}).
                  All new patient booking slot timings are hidden until surgery concludes.
                </p>
                {surgeryWorkflowResult && (
                  <p className="text-amber-200 text-xs mt-1 font-semibold flex items-center gap-1">
                    <span>⚡ Reassignment Workflow: {surgeryWorkflowResult.conflictingCount || 0} conflicting appointment(s) transferred to {surgeryWorkflowResult.nextAvailableDate}.</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {surgeryWorkflowResult?.reassignedAppointments && surgeryWorkflowResult.reassignedAppointments.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowWorkflowDetailsModal(true)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  View Transfer Report
                </button>
              )}
              <button
                type="button"
                onClick={() => handleToggleSurgery(false)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                Exit Surgery Mode
              </button>
            </div>
          </div>
        )}

        {/* NOTIFICATION: ON HOLD */}
        {isOnHold && (
          <div className="mt-4 p-3.5 bg-amber-500/20 border border-amber-400/50 rounded-xl text-amber-200 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-amber-100">
                Doctor Profile Currently ON HOLD by Hospital Management
              </p>
              <p className="text-amber-200/90 text-[11px] mt-0.5">
                Reason: {doctorProfile?.rejectionReason || 'Temporary administrative hold or medical leave review'}. Your profile is temporarily hidden from new patient booking until the hospital management releases the hold.
              </p>
            </div>
          </div>
        )}

        {/* NOTIFICATION: AWAITING HOSPITAL APPROVAL */}
        {isPendingApproval && (
          <div className="mt-4 p-3.5 bg-amber-500/20 border border-amber-400/50 rounded-xl text-amber-200 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-amber-100">
                Awaiting Hospital Management Verification
              </p>
              <p className="text-amber-200/80 text-[11px] mt-0.5">
                Your medical license and doctor registration credentials are currently under review by the management of <strong>{doctorProfile?.hospitalName}</strong>. You can preview features below; full appointment booking activation will complete upon hospital approval.
              </p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="mt-4 p-3.5 bg-rose-500/20 border border-rose-400/50 rounded-xl text-rose-200 text-xs flex items-center gap-2.5">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-rose-100">Hospital Application Rejected</p>
              <p className="text-rose-200/80 text-[11px] mt-0.5">
                Reason: {doctorProfile?.rejectionReason || 'Credentials did not match hospital department criteria.'}
              </p>
            </div>
          </div>
        )}

        {actionNotice && (
          <div className="mt-4 p-3 bg-teal-500/20 border border-teal-400/40 rounded-xl text-teal-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'appointments'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Patient Appointments ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('patients')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'patients'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>IoT Vitals Telemetry & Monitored Patients</span>
        </button>

        <button
          onClick={() => setActiveTab('prescribe')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'prescribe'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Prescription Generator</span>
        </button>

        <button
          onClick={() => setActiveTab('recent_prescriptions')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'recent_prescriptions'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-teal-600" />
          <span>Recent Prescriptions ({doctorPrescriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('patient_requests')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'patient_requests'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Patient Requests & Capacity ({patientRequests.filter((r) => r.status === 'pending').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('treated_patients')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'treated_patients'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Recent Patients Treated ({treatedPatients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'leaves'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarOff className="w-4 h-4" />
          <span>Leave Requests ({doctorLeaves.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('surgery_slots')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'surgery_slots'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Surgery & Slot Timings</span>
        </button>

        <button
          onClick={() => setActiveTab('hospital')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'hospital'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Hospital Affiliation & Transfer</span>
          {doctorProfile?.pendingTransfer && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'referrals'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Share2 className="w-4 h-4 text-indigo-600" />
          <span>In-Hospital Referrals ({appointments.filter(a => a.referredByDoctorId === doctorId).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lab_tests')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'lab_tests'
              ? 'border-teal-600 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-teal-600" />
          <span>Lab Tests & Free Follow-Up ({labOrders.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: APPOINTMENTS ================= */}
      {activeTab === 'appointments' && (() => {
        const filteredDoctorAppointments = appointments.filter((a) => {
          if (appointmentFilter === 'all') return true;
          if (appointmentFilter === 'cancelled') return a.status === 'cancelled' || a.status === 'rejected';
          return a.status === appointmentFilter;
        });

        return (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Consultation Requests & Schedule ({appointments.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Double-booking blocked • Sunday slots blocked • Slots immediately reopen upon patient cancellation code verification
                  </p>
                </div>

                {/* Filter Options: Pending, Approved, Completed, Cancelled */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'all', label: 'All', count: appointments.length },
                    { key: 'pending', label: 'Pending', count: appointments.filter((a) => a.status === 'pending').length },
                    { key: 'approved', label: 'Approved', count: appointments.filter((a) => a.status === 'approved').length },
                    { key: 'completed', label: 'Completed', count: appointments.filter((a) => a.status === 'completed').length },
                    { key: 'cancelled', label: 'Cancelled / Rejected', count: appointments.filter((a) => a.status === 'cancelled' || a.status === 'rejected').length },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setAppointmentFilter(f.key as any)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        appointmentFilter === f.key
                          ? 'bg-indigo-700 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        appointmentFilter === f.key ? 'bg-indigo-900 text-indigo-100' : 'bg-white text-slate-600 border border-slate-200'
                      }`}>
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {filteredDoctorAppointments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No {appointmentFilter !== 'all' ? appointmentFilter : ''} appointments found.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredDoctorAppointments.map((apt) => (
                  <div key={apt.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{apt.patientName}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              apt.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : apt.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : apt.status === 'completed'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1 font-semibold text-indigo-900">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            {apt.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {apt.timeSlot}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium">
                          Reason: <span className="font-normal text-slate-600">{apt.reasonForVisit}</span>
                        </p>

                        {apt.isFreeFollowUp && (
                          <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-black text-[10px]">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>100% FREE Follow-Up Investigation Consultation ($0 Waived)</span>
                          </div>
                        )}
                        {apt.referredByDoctorName && (
                          <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-full font-bold text-[10px]">
                            <Share2 className="w-3 h-3 text-indigo-600" />
                            <span>In-Hospital Referral from Dr. {apt.referredByDoctorName} ({apt.referredSpecialization || 'Physician'})</span>
                          </div>
                        )}

                        {/* Patient Attendance Reliability Score */}
                        <div className="flex flex-wrap items-center gap-2 mt-1 py-1">
                          <span className="text-[11px] font-semibold text-slate-500">Patient Reliability Score:</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black tracking-wide ${
                            (apt.patientReliabilityScore ?? 100) >= 80
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : (apt.patientReliabilityScore ?? 100) >= 60
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            ★ {apt.patientReliabilityScore ?? 100}/100
                          </span>
                          {(apt.patientReliabilityScore ?? 100) < 80 && (
                            <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              ⚠️ Patient missed past visits
                            </span>
                          )}
                        </div>

                        {apt.symptoms && (
                          <p className="text-[11px] text-slate-500">
                            Reported Symptoms: {apt.symptoms}
                          </p>
                        )}
                        {apt.rejectionReason && (
                          <p className="text-[11px] text-rose-600 font-medium">
                            Rejection Reason: {apt.rejectionReason}
                          </p>
                        )}

                        {/* Requirement: The patient verification passkey is NOT visible to the doctor.
                            Patient must verbally state the passkey (OTP) to the doctor during consultation */}
                        {apt.status === 'approved' && (
                          <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-amber-900">
                              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                              <span>
                                <strong>Patient Passkey (OTP) Required:</strong> The patient will verbally tell you their secret OTP during consultation. Click <em>"Verify Patient OTP & Complete"</em> to enter it.
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                              Confidential to Patient
                            </span>
                          </div>
                        )}

                        {apt.status === 'completed' && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-teal-700 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-teal-600" />
                            <span>Treatment Verified & Completed {apt.treatmentCode ? `(Code: ${apt.treatmentCode})` : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {apt.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setRejectingAptId(apt.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleUpdateAppointment(apt.id, 'approved')}
                              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve Slot
                            </button>
                          </>
                        )}

                        {apt.status === 'approved' && (
                          <>
                            {apt.prescriptionId && (
                              <span className="px-2.5 py-1 text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-300 rounded-xl flex items-center gap-1">
                                <FileText className="w-3 h-3 text-teal-600" />
                                <span>℞ Prescribed (Pending Patient Code)</span>
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setCompletingApt(apt);
                                setInputTreatmentCode('');
                                setCompletionError(null);
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Enter the patient's secret verification passkey to officially complete treatment"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" /> Verify Code & Complete Treatment
                            </button>
                            <button
                              onClick={() => openPrescribeForAppointment(apt)}
                              className="px-3.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" /> {apt.prescriptionId ? 'Update Prescription' : 'Consult & Prescribe'}
                            </button>
                            <button
                              onClick={() => {
                                setCancelCodeModalApt(apt);
                                setInputCancelVerificationCode('');
                                setCancelReasonText('');
                                setCancelError(null);
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="If patient contacts to cancel before coming, enter their secret verification passkey to cancel and free the slot"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Cancel with Patient Code
                            </button>
                            <button
                              onClick={() => {
                                setLabOrderPatientId(apt.patientId);
                                setIsLabOrderModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Order diagnostic laboratory or imaging tests (MRI, CT, X-Ray) for this patient"
                            >
                              <FlaskConical className="w-3.5 h-3.5 text-teal-600" /> Order Lab / MRI / CT
                            </button>
                            <button
                              onClick={() => {
                                setReferralPatientId(apt.patientId);
                                if (hospitalDoctors.length > 0 && !referralTargetDoctorId) {
                                  setReferralTargetDoctorId(hospitalDoctors[0].id);
                                }
                                setIsReferralModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Refer this patient to a colleague doctor in this hospital and book the appointment directly"
                            >
                              <Share2 className="w-3.5 h-3.5 text-indigo-600" /> Refer Colleague
                            </button>
                            {(() => {
                              const isCompleted = isAppointmentSlotCompleted(apt.date, apt.timeSlot);
                              return (
                                <button
                                  type="button"
                                  onClick={() => isCompleted && handleMarkMissed(apt.id)}
                                  disabled={!isCompleted}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1 ${
                                    isCompleted
                                      ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer'
                                      : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-60'
                                  }`}
                                  title={
                                    isCompleted
                                      ? 'Mark appointment as missed (no-show). Decreases patient reliability score.'
                                      : `Locked: Per medical protocol, you can only mark patient as No-Show after the consultation slot (${apt.timeSlot}) has concluded on ${apt.date}.`
                                  }
                                >
                                  <UserX className="w-3.5 h-3.5 text-rose-600" />
                                  <span>{isCompleted ? 'Mark No-Show' : 'No-Show (Locked Until Slot Ends)'}</span>
                                </button>
                              );
                            })()}
                          </>
                        )}
                      </div>

                    </div>

                    {/* Verification Form for completing treatment */}
                    {completingApt?.id === apt.id && (
                      <form onSubmit={handleCompleteTreatmentSubmit} className="mt-3 p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-950">
                            <ShieldCheck className="w-4 h-4 text-emerald-700" />
                            <span>Patient Treatment Completion Verification</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCompletingApt(null)}
                            className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-xs text-emerald-800">
                          Whenever the unique code is given to the doctor, then only the treatment will be completed. Ask <strong>{apt.patientName}</strong> for their 6-digit appointment code.
                        </p>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Enter Patient's Unique Treatment Code *
                          </label>
                          <input
                            type="text"
                            value={inputTreatmentCode}
                            onChange={(e) => setInputTreatmentCode(e.target.value.toUpperCase())}
                            placeholder="e.g. TRT-842910"
                            className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-lg text-sm font-mono font-bold tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-emerald-600"
                          />
                        </div>
                        {completionError && (
                          <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{completionError}</span>
                          </p>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setCompletingApt(null)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={completingLoading}
                            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{completingLoading ? 'Verifying...' : 'Verify Code & Complete Treatment'}</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Rejection reason inline form */}
                    {rejectingAptId === apt.id && (
                      <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
                        <label className="block text-rose-900 font-semibold">
                          Reason for rejection (shown to patient):
                        </label>
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="e.g. Doctor is in emergency surgery at this hour"
                          className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setRejectingAptId(null)}
                            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateAppointment(apt.id, 'rejected', rejectionReason)}
                            className="px-3 py-1 bg-rose-700 text-white rounded-lg font-semibold"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        );
      })()}

      {/* ================= TAB 2: IOT VITALS TELEMETRY & MONITORED PATIENTS ================= */}
      {activeTab === 'patients' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Assigned Patients Morning Health Check & IoT Vitals
              </h3>
              <p className="text-xs text-slate-500">
                Continuous telemetry stream connected directly to the Gemini AI risk assessment engine.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsRegisterPatientOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <UserIcon className="w-4 h-4" />
              <span>Register Patient & Dispatch Request</span>
            </button>
          </div>

          <div className="space-y-4">
            {patients.map((pat) => {
              const reads = patientReadings[pat.id] || [];
              const latest = reads[0];

              return (
                <div key={pat.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:border-indigo-200 transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    
                    {/* Patient Profile */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={pat.avatarUrl}
                          alt={pat.name}
                          className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{pat.name}</h4>
                          <p className="text-xs text-slate-500">
                            Blood: <strong className="text-slate-700">{pat.patientProfile?.bloodGroup}</strong> • BMI: {pat.patientProfile?.bmi} • Contact: {pat.phone}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 space-y-0.5">
                        <p>Conditions: <span className="font-semibold text-slate-800">{pat.patientProfile?.existingConditions.join(', ') || 'None'}</span></p>
                        <p>Allergies: <span className="font-semibold text-slate-800">{pat.patientProfile?.allergies.join(', ') || 'None'}</span></p>
                        <p>Current Meds: <span className="font-semibold text-slate-800">{pat.patientProfile?.currentMedications.join(', ') || 'None'}</span></p>
                      </div>
                    </div>

                    {/* Latest IoT Reading Display */}
                    {latest ? (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 max-w-lg w-full">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <HeartPulse className="w-4 h-4 text-rose-500 animate-pulse" />
                            Latest IoT Reading ({new Date(latest.timestamp).toLocaleDateString()})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              latest.status === 'normal'
                                ? 'bg-emerald-100 text-emerald-800'
                                : latest.status === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800 animate-pulse'
                            }`}
                          >
                            {latest.status === 'normal' ? '🟢 Normal' : latest.status === 'warning' ? '🟡 Warning' : '🔴 Critical'}
                          </span>
                        </div>

                        {/* Vitals metrics */}
                        <div className="grid grid-cols-5 gap-1.5 text-center">
                          <div className="p-1.5 bg-white rounded border border-slate-100">
                            <span className="text-[9px] text-slate-400 block">HR</span>
                            <span className="font-bold text-slate-800">{latest.heartRate} bpm</span>
                          </div>
                          <div className="p-1.5 bg-white rounded border border-slate-100">
                            <span className="text-[9px] text-slate-400 block">BP</span>
                            <span className="font-bold text-slate-800">{latest.systolicBp}/{latest.diastolicBp}</span>
                          </div>
                          <div className="p-1.5 bg-white rounded border border-slate-100">
                            <span className="text-[9px] text-slate-400 block">SpO2</span>
                            <span className="font-bold text-slate-800">{latest.spO2}%</span>
                          </div>
                          <div className="p-1.5 bg-white rounded border border-slate-100">
                            <span className="text-[9px] text-slate-400 block">Temp</span>
                            <span className="font-bold text-slate-800">{latest.temperature}°C</span>
                          </div>
                          <div className="p-1.5 bg-white rounded border border-slate-100">
                            <span className="text-[9px] text-slate-400 block">Glucose</span>
                            <span className="font-bold text-slate-800">{latest.glucose} mg</span>
                          </div>
                        </div>

                        {/* Gemini Summary */}
                        {latest.geminiAnalysis && (
                          <div className="p-2 bg-indigo-50/70 border border-indigo-200/80 rounded-lg text-[11px] text-indigo-950">
                            <span className="font-bold flex items-center gap-1 text-indigo-800 mb-0.5">
                              <Sparkles className="w-3 h-3 text-indigo-600" /> Gemini Risk Assessment:
                            </span>
                            <p>{latest.geminiAnalysis.summary}</p>
                            <p className="mt-1 text-[10px] text-indigo-700 font-semibold">
                              Action: {latest.geminiAnalysis.actionRequired}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 text-xs">
                        No IoT readings uploaded yet by this patient.
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: PRESCRIPTION GENERATOR ================= */}
      {activeTab === 'prescribe' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Create Official Digital Medical Prescription</span>
              </h3>
              <p className="text-xs text-slate-500">
                Prescription includes hospital credentials and downloadable / printable PDF output.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreatePrescriptionSubmit} className="space-y-4 text-xs">
            {/* Patient Selector */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Patient *</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (DOB: {p.patientProfile?.dateOfBirth}, Blood: {p.patientProfile?.bloodGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Clinical Assessment / Diagnosis *</label>
                <input
                  type="text"
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Essential Stage 1 Hypertension with morning systolic elevation"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Vitals Recorded */}
            <div className="grid grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Blood Pressure (mmHg)</label>
                <input
                  type="text"
                  value={recordedBp}
                  onChange={(e) => setRecordedBp(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Pulse (BPM)</label>
                <input
                  type="number"
                  value={recordedHr}
                  onChange={(e) => setRecordedHr(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">SpO2 (%)</label>
                <input
                  type="number"
                  value={recordedSpO2}
                  onChange={(e) => setRecordedSpO2(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={recordedTemp}
                  onChange={(e) => setRecordedTemp(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            {/* Medicine Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="font-serif font-black text-teal-800 text-sm">℞</span>
                  <span>Prescribed Medicines List</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddMedicineRow}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Medicine
                </button>
              </div>

              <div className="space-y-3">
                {medicines.map((med, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-4">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Medicine Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Tab. Amlodipine 5mg"
                          value={med.name}
                          onChange={(e) => handleMedicineChange(i, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Dosage *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 1 Tablet / 500mg"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(i, 'dosage', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">How Many Days *</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            required
                            placeholder="Days"
                            value={med.durationDays || parseInt(med.duration) || 7}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              const updated = [...medicines];
                              updated[i].durationDays = val;
                              updated[i].duration = `${val} Days`;
                              setMedicines(updated);
                            }}
                            className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center"
                          />
                          <span className="text-xs text-slate-500 font-semibold">Days</span>
                          <div className="flex items-center gap-1 ml-auto">
                            {[3, 5, 7, 14, 30].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  const updated = [...medicines];
                                  updated[i].durationDays = d;
                                  updated[i].duration = `${d} Days`;
                                  setMedicines(updated);
                                }}
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                                  (med.durationDays || parseInt(med.duration) || 7) === d
                                    ? 'bg-teal-700 text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {d}d
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="sm:col-span-1 text-right">
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(i)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                            title="Remove Medicine"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Meal Timing Options (Selected Options from Prompt) */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                        Select Prescription Timing *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { label: 'Morning after food', icon: '🌅', color: 'border-amber-200 hover:border-amber-400' },
                          { label: 'Morning before food', icon: '🌅', color: 'border-amber-200 hover:border-amber-400' },
                          { label: 'Afternoon after food', icon: '☀️', color: 'border-orange-200 hover:border-orange-400' },
                          { label: 'Afternoon before food', icon: '☀️', color: 'border-orange-200 hover:border-orange-400' },
                          { label: 'Night after food', icon: '🌙', color: 'border-indigo-200 hover:border-indigo-400' },
                          { label: 'Night before food', icon: '🌙', color: 'border-indigo-200 hover:border-indigo-400' },
                        ].map((t) => {
                          const isSelected = (med.timingOption || med.frequency) === t.label;
                          return (
                            <button
                              key={t.label}
                              type="button"
                              onClick={() => {
                                const updated = [...medicines];
                                updated[i].timingOption = t.label as any;
                                updated[i].frequency = t.label;
                                setMedicines(updated);
                              }}
                              className={`p-1.5 px-2 rounded-lg text-[11px] font-bold text-left transition-all cursor-pointer flex items-center gap-1.5 border ${
                                isSelected
                                  ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                                  : `bg-white text-slate-700 ${t.color}`
                              }`}
                            >
                              <span>{t.icon}</span>
                              <span className="truncate">{t.label}</span>
                              {isSelected && <span className="ml-auto text-[10px]">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advice & Follow-Up Review (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Lifestyle & Preventive Advice
                </label>
                <textarea
                  rows={3}
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  placeholder="e.g. Low sodium diet, 30-minute daily morning brisk walk, monitor blood pressure daily."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                />
              </div>

              {/* Follow-up review: OPTIONAL ONLY */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeFollowUpReview}
                      onChange={(e) => setIncludeFollowUpReview(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                    />
                    <span className="font-bold text-xs text-slate-900">
                      Schedule Follow-Up Review Date & Time Slot
                    </span>
                  </label>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                    {includeFollowUpReview ? 'Enabled' : 'Optional (Disabled)'}
                  </span>
                </div>

                {includeFollowUpReview ? (
                  <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Follow-up Review Date *
                        </label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Follow-up Time Slot *
                        </label>
                        <select
                          value={followUpTimeSlot}
                          onChange={(e) => setFollowUpTimeSlot(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        >
                          {customSlotTimings.map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 p-2 rounded-lg">
                      ✓ Saving prescription will auto-book this follow-up slot for the patient.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Without selecting this, no follow-up slot will be scheduled. The doctor can give follow-up only if required. The patient can book appointments on-demand.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Issue Prescription (PDF & Auto Follow-Up)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB: RECENT PRESCRIPTIONS GENERATED BY DOCTOR ================= */}
      {activeTab === 'recent_prescriptions' && (() => {
        // Calculate filtered prescriptions based on time range, chosen date, and chosen patient
        const now = new Date();
        const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const cutoff10d = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const cutoff30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // 1. Time range filter
        let filteredByTime = doctorPrescriptions.filter((rx) => {
          if (rxTimeFilter === '7d') return rx.date >= cutoff7d;
          if (rxTimeFilter === '10d') return rx.date >= cutoff10d;
          if (rxTimeFilter === '30d') return rx.date >= cutoff30d;
          return true;
        });

        // 2. Specific single date filter (if selected)
        if (rxSelectedDate) {
          filteredByTime = filteredByTime.filter((rx) => rx.date === rxSelectedDate);
        }

        // Available dates in this dataset (sorted newest first)
        const availableDates = Array.from(new Set(doctorPrescriptions.map((rx) => rx.date))).sort((a, b) => b.localeCompare(a));

        // Available patients treated in the filtered set
        const treatedPatientsMap = new Map<string, { id: string; name: string; count: number }>();
        filteredByTime.forEach((rx) => {
          const key = rx.patientId || rx.patientName;
          const existing = treatedPatientsMap.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            treatedPatientsMap.set(key, { id: rx.patientId, name: rx.patientName, count: 1 });
          }
        });
        const treatedPatientsList = Array.from(treatedPatientsMap.values());

        // 3. Filter by chosen patient
        let finalFiltered = filteredByTime;
        if (rxSelectedPatientId !== 'all') {
          finalFiltered = finalFiltered.filter(
            (rx) => rx.patientId === rxSelectedPatientId || rx.patientName.toLowerCase() === rxSelectedPatientId.toLowerCase()
          );
        }

        // 4. Search query filter
        if (rxSearchQuery.trim()) {
          const q = rxSearchQuery.toLowerCase().trim();
          finalFiltered = finalFiltered.filter(
            (rx) =>
              rx.patientName.toLowerCase().includes(q) ||
              rx.diagnosis.toLowerCase().includes(q) ||
              rx.id.toLowerCase().includes(q) ||
              rx.medicines?.some((m) => m.name.toLowerCase().includes(q))
          );
        }

        // Group final filtered prescriptions by date
        const groupedByDate = new Map<string, Prescription[]>();
        finalFiltered.forEach((rx) => {
          const d = rx.date || 'Unknown Date';
          const list = groupedByDate.get(d) || [];
          list.push(rx);
          groupedByDate.set(d, list);
        });

        const sortedDates = Array.from(groupedByDate.keys()).sort((a, b) => b.localeCompare(a));

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            {/* Header & New Rx Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-teal-600" />
                  <span>Clinical Prescription History & Daily Consultations</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Filter by consultation date, review patients treated on each day, and inspect official signed prescription PDFs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 font-bold rounded-xl text-xs">
                  {doctorPrescriptions.length} Total Issued
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('prescribe')}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate New ℞</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Bar: Time Range, Date Picker, Patient Selector, and Search */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* 1. Time Range Filter Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    1. Time Range Window:
                  </span>
                  <div className="inline-flex flex-wrap p-1 bg-white rounded-xl border border-slate-200 gap-1 text-xs">
                    {[
                      { key: 'all', label: 'All Time' },
                      { key: '7d', label: 'Last 7 Days' },
                      { key: '10d', label: 'Last 10 Days' },
                      { key: '30d', label: 'Last 30 Days' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setRxTimeFilter(tab.key as any);
                          if (tab.key !== 'custom') setRxSelectedDate('');
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          rxTimeFilter === tab.key && !rxSelectedDate
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Choose Specific Date */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    2. Choose Specific Consultation Date:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={rxSelectedDate}
                      onChange={(e) => {
                        setRxSelectedDate(e.target.value);
                        if (e.target.value) setRxTimeFilter('custom');
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                    {rxSelectedDate && (
                      <button
                        type="button"
                        onClick={() => setRxSelectedDate('')}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
                      >
                        Clear Date
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Filter by Treated Patient */}
                <div className="space-y-1.5 min-w-[200px]">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    3. Select Treated Patient:
                  </span>
                  <select
                    value={rxSelectedPatientId}
                    onChange={(e) => setRxSelectedPatientId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="all">-- All Treated Patients ({treatedPatientsList.length}) --</option>
                    {treatedPatientsList.map((p) => (
                      <option key={p.id || p.name} value={p.id || p.name}>
                        {p.name} ({p.count} ℞)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Date Chips (Days on which prescriptions exist) */}
              {availableDates.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Select Date:</span>
                  <button
                    type="button"
                    onClick={() => setRxSelectedDate('')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      !rxSelectedDate
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    All Dates ({availableDates.length})
                  </button>
                  {availableDates.slice(0, 8).map((d) => {
                    const countForDay = doctorPrescriptions.filter((r) => r.date === d).length;
                    const isSelected = rxSelectedDate === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setRxSelectedDate(d);
                          setRxTimeFilter('custom');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200'
                        }`}
                      >
                        <span>{d}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${isSelected ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-600'}`}>
                          {countForDay} ℞
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Filter Results Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Showing <strong>{finalFiltered.length}</strong> prescriptions across <strong>{sortedDates.length}</strong> consultation days</span>
                {(rxTimeFilter !== 'all' || rxSelectedDate || rxSelectedPatientId !== 'all' || rxSearchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setRxTimeFilter('all');
                      setRxSelectedDate('');
                      setRxSelectedPatientId('all');
                      setRxSearchQuery('');
                    }}
                    className="text-teal-700 hover:underline font-bold text-[11px] ml-2 cursor-pointer"
                  >
                    ↺ Reset All Filters
                  </button>
                )}
              </div>
            </div>

            {/* Content: Grouped hierarchically by Date -> Patient -> Prescriptions */}
            {finalFiltered.length === 0 ? (
              <div className="p-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No prescriptions found for the selected date or filter.</p>
                <p className="text-[11px] text-slate-400">
                  Try choosing "All Time" or picking a different consultation date or treated patient from the selector above.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRxTimeFilter('all');
                    setRxSelectedDate('');
                    setRxSelectedPatientId('all');
                  }}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                >
                  View All Prescriptions
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map((dateStr) => {
                  const dayPrescriptions = groupedByDate.get(dateStr) || [];
                  // Group by patient for this day
                  const patientSubgroups = new Map<string, Prescription[]>();
                  dayPrescriptions.forEach((rx) => {
                    const pKey = rx.patientId || rx.patientName;
                    const list = patientSubgroups.get(pKey) || [];
                    list.push(rx);
                    patientSubgroups.set(pKey, list);
                  });

                  return (
                    <div key={dateStr} className="rounded-2xl border-2 border-slate-200 overflow-hidden shadow-xs">
                      {/* Date Header Banner */}
                      <div className="bg-gradient-to-r from-teal-800 to-slate-900 text-white p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-white/10 rounded-xl">
                            <Calendar className="w-4 h-4 text-teal-300" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-teal-200 block">
                              Consultation Date
                            </span>
                            <h4 className="text-sm font-bold text-white">
                              {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-teal-900/80 border border-teal-700 rounded-lg text-xs font-bold text-teal-100">
                            {patientSubgroups.size} Patient{patientSubgroups.size > 1 ? 's' : ''} Treated
                          </span>
                          <span className="px-2.5 py-1 bg-white/15 border border-white/20 rounded-lg text-xs font-bold text-white">
                            {dayPrescriptions.length} ℞ Issued
                          </span>
                        </div>
                      </div>

                      {/* Patients Treated on this Date */}
                      <div className="p-4 bg-slate-50/50 space-y-4 divide-y divide-slate-100">
                        {Array.from(patientSubgroups.entries()).map(([pKey, rxList], pIdx) => {
                          const firstRx = rxList[0];
                          return (
                            <div key={pKey} className={`space-y-3 ${pIdx > 0 ? 'pt-4' : ''}`}>
                              {/* Patient Banner */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                                    {firstRx.patientName?.charAt(0) || 'P'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-bold text-slate-900 text-sm">{firstRx.patientName}</h5>
                                      <span className="text-[11px] text-slate-500 font-mono">
                                        {firstRx.patientAge ? `${firstRx.patientAge} Yrs` : ''} {firstRx.patientGender ? `• ${firstRx.patientGender}` : ''}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">Patient ID: {firstRx.patientId}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-600">
                                    {rxList.length} Prescription{rxList.length > 1 ? 's' : ''} Issued
                                  </span>
                                </div>
                              </div>

                              {/* Prescriptions issued to this patient on this date */}
                              <div className="grid grid-cols-1 gap-3">
                                {rxList.map((rx) => (
                                  <div
                                    key={rx.id}
                                    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-400 transition-all shadow-xs space-y-3"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-xs font-bold text-slate-900">Rx ID: #{rx.id}</span>
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-800 border border-teal-200">
                                            {rx.diagnosis}
                                          </span>
                                        </div>
                                        <span className="text-[11px] text-slate-400">
                                          Issued at: {rx.hospitalName || doctorProfile?.hospitalName}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setViewingPrescription(rx)}
                                          className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                          <span>View / Download PDF ℞</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Vitals Recorded */}
                                    {rx.vitalsRecorded && (
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 text-center text-[11px]">
                                        <div>
                                          <span className="text-[9px] text-slate-400 block uppercase">Blood Pressure</span>
                                          <strong className="text-slate-800 font-mono">{rx.vitalsRecorded.bp || '120/80 mmHg'}</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-400 block uppercase">Heart Rate</span>
                                          <strong className="text-slate-800 font-mono">{rx.vitalsRecorded.heartRate || 72} bpm</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-400 block uppercase">SpO2 Level</span>
                                          <strong className="text-slate-800 font-mono">{rx.vitalsRecorded.spO2 || 98}%</strong>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-400 block uppercase">Temperature</span>
                                          <strong className="text-slate-800 font-mono">{rx.vitalsRecorded.temp || 36.6}°C</strong>
                                        </div>
                                      </div>
                                    )}

                                    {/* Medications List */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                        Prescribed Medications ({rx.medicines?.length || 0}):
                                      </span>
                                      <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                                        {rx.medicines?.map((m, idx) => (
                                          <div key={idx} className="p-2.5 bg-slate-50/50 text-xs flex items-center justify-between gap-2">
                                            <div>
                                              <strong className="text-slate-900 block font-semibold">{m.name}</strong>
                                              <span className="text-[11px] text-slate-500">Dosage: {m.dosage}</span>
                                            </div>
                                            <div className="text-right shrink-0 space-y-0.5">
                                              <span className="inline-block px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold rounded-md">
                                                {m.timingOption || m.frequency}
                                              </span>
                                              <div className="text-[10px] font-mono text-slate-500 font-semibold">
                                                Duration: {m.durationDays ? `${m.durationDays} Days` : m.duration || '7 Days'}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Doctor Advice */}
                                    {rx.advice && (
                                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        💡 <strong>Physician Advice:</strong> {rx.advice}
                                      </p>
                                    )}

                                    {/* Follow-up review badge */}
                                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                                      <span className="text-[11px] text-slate-500">Review Protocol:</span>
                                      {rx.followUpDate ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-800">
                                          📅 Scheduled Follow-Up: {rx.followUpDate}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic">
                                          No follow-up review scheduled
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ================= TAB 4: LEAVE MANAGEMENT (5 Working Days limit by default) ================= */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-indigo-600" />
                <span>Doctor Leave Application & Hospital Approval Workflow</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Apply for planned clinical leaves. Leave requests are sent to Hospital Management to accept or reject.
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs">
              <span className="text-slate-600 font-medium">Hospital Paid Leave Limit:</span>
              <strong className="text-indigo-900 font-bold">{doctorProfile?.maxLeaveAllowance ?? 5} Paid Days / Month</strong>
            </div>
          </div>

          {/* Leave Application Form */}
          <form onSubmit={handleApplyLeave} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Submit New Leave Application to Hospital Management</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={leaveStartDate}
                  onChange={(e) => {
                    setLeaveStartDate(e.target.value);
                    if (!leaveEndDate || leaveEndDate < e.target.value) {
                      setLeaveEndDate(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  min={leaveStartDate}
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Number of Working Days * (Max {doctorProfile?.maxLeaveAllowance ?? 5})
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={doctorProfile?.maxLeaveAllowance ?? 5}
                  value={leaveDaysCount}
                  onChange={(e) => setLeaveDaysCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Capped at {doctorProfile?.maxLeaveAllowance ?? 5} working days policy
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-xs">
                Clinical Reason for Leave *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Annual Medical Continuing Education / Medical Conference / Personal Leave"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={leaveSubmitting}
                className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{leaveSubmitting ? 'Submitting to Hospital...' : 'Submit Leave Request'}</span>
              </button>
            </div>
          </form>

          {/* List of Leave Requests & Hospital Decisions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Leave Requests & Hospital Approvals ({doctorLeaves.length}):
            </h4>

            {doctorLeaves.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl text-center">
                No leave requests submitted yet. Use the form above to apply for leaves within your {doctorProfile?.maxLeaveAllowance ?? 5} working days allowance.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {doctorLeaves.map((l) => (
                  <div key={l.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {l.startDate} to {l.endDate}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 px-2 py-0.5 bg-slate-100 rounded-md">
                          {l.daysCount} working day{l.daysCount > 1 ? 's' : ''}
                        </span>
                        {l.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            Awaiting Hospital Management Approval
                          </span>
                        )}
                        {l.status === 'approved' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Approved by Hospital
                          </span>
                        )}
                        {l.status === 'rejected' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            ✕ Rejected by Hospital
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <strong>Reason:</strong> {l.reason}
                      </p>
                      {l.responseNotes && (
                        <p className="text-[11px] text-slate-500 mt-0.5 italic">
                          Hospital Management Notes: "{l.responseNotes}"
                        </p>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0">
                      Applied: {new Date(l.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 5: SURGERY & SLOT TIMINGS ================= */}
      {activeTab === 'surgery_slots' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Doctor Surgery Mode & Consultation Slot Timings</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                When you are in surgery, your slot timings are automatically hidden from patients, preventing new bookings until you finish operating.
              </p>
            </div>

            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              inSurgery ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}>
              <span>{inSurgery ? '🔴 Surgery Mode Active (Slots Hidden)' : '🟢 Regular Consultation Available'}</span>
            </div>
          </div>

          {/* Surgery Toggle Section */}
          <div className="p-5 bg-gradient-to-r from-rose-50/60 to-amber-50/60 border border-rose-200 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Operating Theater / Surgery Mode Control</span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Toggle this ON when entering surgery. Slot timings will be immediately hidden from patient view.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleSurgery(!inSurgery)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer ${
                  inSurgery ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-700 hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{inSurgery ? '✓ Exit Surgery Mode (Restore Slots)' : '⚡ Enter Surgery Mode (Hide Slots)'}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Surgery Notes / Operating Theater Details (Optional)
              </label>
              <input
                type="text"
                value={surgeryNotes}
                onChange={(e) => setSurgeryNotes(e.target.value)}
                placeholder="e.g., Scheduled Coronary Bypass in OT-2 (Approx. 10:00 AM - 01:30 PM)"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-400 outline-none"
              />
            </div>
          </div>

          {/* Slot Timings Configuration */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Custom Consultation Slot Timings</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure the specific daily consultation time slots visible to patients for booking.
              </p>
            </div>

            {/* Current Active Slots */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase">
                Active Consulting Slots ({customSlotTimings.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {customSlotTimings.map((slot) => (
                  <span
                    key={slot}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <Clock className="w-3 h-3 text-indigo-600" />
                    <span>{slot}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(slot)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                      title="Remove slot"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Add New Slot */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="e.g. 05:00 PM or 06:30 PM"
                value={newSlotInput}
                onChange={(e) => setNewSlotInput(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 outline-none"
              />
              <button
                type="button"
                onClick={handleAddSlot}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Slot</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSlotTimings}
                disabled={savingSurgery}
                className="ml-auto px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{savingSurgery ? 'Saving...' : 'Save Slot Timings Configuration'}</span>
              </button>
            </div>
          </div>

          {/* Planned Surgery Scheduling (Rule: Must be scheduled >= 7 days ahead) */}
          <div className="p-5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-700" />
                  <span>Planned Surgery Schedule (&gt;= 7 Days in Advance)</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md">
                  7-Day Advance Rule Enforced
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Surgeries planned in advance must be scheduled prior at least 7 days ahead. Patient consultation bookings for this date will be automatically blocked.
              </p>
            </div>

            <form onSubmit={handleSchedulePlannedSurgery} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Surgery Date (Min. 7 Days Ahead) *
                </label>
                <input
                  type="date"
                  required
                  min={new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}
                  value={plannedSurgeryDate}
                  onChange={(e) => setPlannedSurgeryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Surgery Time Slot *
                </label>
                <select
                  value={plannedSurgerySlot}
                  onChange={(e) => setPlannedSurgerySlot(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="08:00 AM - 12:00 PM">08:00 AM - 12:00 PM (Morning Session)</option>
                  <option value="09:00 AM - 01:00 PM">09:00 AM - 01:00 PM (Standard OT Slot)</option>
                  <option value="01:00 PM - 05:00 PM">01:00 PM - 05:00 PM (Afternoon Session)</option>
                  <option value="Full Day (08:00 AM - 06:00 PM)">Full Day (Major Surgical Procedure)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Procedure / Surgery Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coronary Artery Bypass Graft"
                  value={plannedProcedure}
                  onChange={(e) => setPlannedProcedure(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Operating Theater (OT)
                </label>
                <input
                  type="text"
                  placeholder="Main OT-1 / Cardiac OT"
                  value={plannedOT}
                  onChange={(e) => setPlannedOT(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Clinical notes, surgical team prep, anesthesia requirements (optional)..."
                  value={plannedSurgeryNotes}
                  onChange={(e) => setPlannedSurgeryNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={schedulingSurgery}
                  className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{schedulingSurgery ? 'Scheduling...' : 'Schedule Surgery'}</span>
                </button>
              </div>
            </form>

            {/* Display Scheduled Surgeries */}
            {doctorProfile?.scheduledSurgeries && doctorProfile.scheduledSurgeries.length > 0 && (
              <div className="mt-3 border-t border-indigo-200/60 pt-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase block mb-2">
                  Confirmed Scheduled Surgeries ({doctorProfile.scheduledSurgeries.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {doctorProfile.scheduledSurgeries.map((surg: any) => (
                    <div key={surg.id} className="p-3 bg-white rounded-xl border border-indigo-200 text-xs shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-indigo-950">
                        <span>{surg.procedureName}</span>
                        <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                          {surg.date}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {surg.timeSlot} • {surg.operatingTheater || 'Main OT'}
                      </p>
                      {surg.notes && <p className="text-[10px] text-slate-400 mt-0.5 italic">"{surg.notes}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Urgent / Immediate Surgery Mode (Reschedule Tomorrow's Appointments to Free Day) */}
          <div className="p-5 bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-300 rounded-2xl space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Immediate / Urgent Surgery Mode (Reschedule Appointments)</span>
                </h4>
                <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-extrabold animate-pulse">
                  Urgent Priority
                </span>
              </div>
              <p className="text-xs text-rose-900 mt-1 leading-relaxed">
                If an immediate surgery occurs (e.g. tomorrow) that is urgent: Enter urgent surgery mode to transfer tomorrow's scheduled patient consultations to your next free slot (e.g. day after tomorrow). <strong>Affected patients will automatically receive an urgent email notice.</strong>
              </p>
            </div>

            <form onSubmit={handleUrgentSurgeryReschedule} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  Urgent Surgery Date (e.g. Tomorrow) *
                </label>
                <input
                  type="date"
                  required
                  value={urgentSurgeryDate}
                  onChange={(e) => setUrgentSurgeryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-400 font-semibold text-rose-950"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  Transfer Date (Next Free Slot) *
                </label>
                <input
                  type="date"
                  required
                  min={urgentSurgeryDate}
                  value={urgentNewDate}
                  onChange={(e) => setUrgentNewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-400 font-semibold text-teal-950"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  Consultation Slot
                </label>
                <select
                  value={urgentNewSlot}
                  onChange={(e) => setUrgentNewSlot(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {customSlotTimings.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={urgentRescheduling}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{urgentRescheduling ? 'Rescheduling & Emailing...' : 'Transfer Appointments & Send Mail'}</span>
                </button>
              </div>

              <div className="sm:col-span-4">
                <input
                  type="text"
                  placeholder="Urgent reason (e.g. Emergency Cardiac Catheterization / Operating Theater Priority)"
                  value={urgentReason}
                  onChange={(e) => setUrgentReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= TAB 7: PATIENT REQUESTS & CAPACITY (10-15 PATIENTS) ================= */}
      {activeTab === 'patient_requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Patient Care Intake Requests & Capacity Quota</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and accept patient requests to be under your medical supervision. Your intake quota capacity is set between 10 to 15 patients.
              </p>
            </div>

            {/* Quota Badge */}
            {(() => {
              const quota = doctorProfile?.patientIntakeQuota || 15;
              const accepted = patientRequests.filter((r) => r.status === 'accepted').length;
              return (
                <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Panel Capacity:</span>
                    <strong className="text-sm font-black text-indigo-900">
                      {accepted} / {quota} Patients Accepted
                    </strong>
                  </div>
                  <div className="w-20 bg-indigo-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (accepted / quota) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Pending Requests Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Incoming Patient Requests ({patientRequests.filter((r) => r.status === 'pending').length} Pending):</span>
            </h4>

            {patientRequests.filter((r) => r.status === 'pending').length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-600">No pending patient intake requests.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  When patients choose you in the Patient Portal directory, their intake applications will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patientRequests
                  .filter((r) => r.status === 'pending')
                  .map((req) => (
                    <div
                      key={req.id}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-indigo-300 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-bold text-slate-900 text-sm">{req.patientName}</h5>
                          <p className="text-xs text-slate-500">{req.patientEmail} • {req.patientPhone || 'No phone'}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                          Pending Review
                        </span>
                      </div>

                      {req.message && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                          "{req.message}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-[10px] text-slate-400">
                          Requested: {new Date(req.requestedAt).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRespondPatientRequest(req.id, 'decline')}
                            disabled={respondingReqId === req.id}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondPatientRequest(req.id, 'accept')}
                            disabled={respondingReqId === req.id}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{respondingReqId === req.id ? 'Accepting...' : 'Accept Patient'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Accepted Patients History */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Accepted Active Patient Panel ({patientRequests.filter((r) => r.status === 'accepted').length}):
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {patientRequests.filter((r) => r.status === 'accepted').length === 0 ? (
                <p className="p-4 text-center text-slate-400">No patients currently accepted into panel.</p>
              ) : (
                patientRequests
                  .filter((r) => r.status === 'accepted')
                  .map((r) => (
                    <div key={r.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <strong className="text-slate-900">{r.patientName}</strong>
                        <span className="text-slate-400 ml-2 font-mono">({r.patientEmail})</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">
                        ✓ Accepted into Panel
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 8: RECENT PATIENTS TREATED & HEALTH VERIFICATION ================= */}
      {activeTab === 'treated_patients' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <span>Recent Patients Treated & Clinical Health Verification</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review completed clinical cases, inspect health information & IoT vitals, and certify whether the patient's health condition is clear and stable.
              </p>
            </div>
            <span className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 font-bold rounded-xl text-xs">
              {treatedPatients.length} Patients Treated
            </span>
          </div>

          {treatedPatients.length === 0 ? (
            <div className="p-10 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              <Stethoscope className="w-8 h-8 text-teal-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-600">No completed patient consultations recorded yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Patients who complete consultations with verified treatment codes or receive prescriptions will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {treatedPatients.map((tp) => (
                <div
                  key={tp.patientId}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-teal-400 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{tp.patientName}</h4>
                        <p className="text-xs text-slate-500">{tp.email || 'No email'} • {tp.phone || 'No phone'}</p>
                      </div>

                      {tp.healthVerification ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          tp.healthVerification.status === 'clear'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : tp.healthVerification.status === 'observation'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {tp.healthVerification.status === 'clear' ? '🟢 Health Condition Clear' : tp.healthVerification.status === 'observation' ? '🟡 Under Observation' : '🔴 Attention Required'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-full border border-slate-200">
                          Verification Pending
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs mt-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Visits</span>
                        <strong className="text-slate-800">{tp.totalVisits}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Last Visit</span>
                        <strong className="text-slate-800">{tp.lastTreatedDate}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Prescriptions</span>
                        <strong className="text-teal-700">{tp.prescriptionsCount}</strong>
                      </div>
                    </div>

                    {tp.profile?.existingConditions?.length > 0 && (
                      <p className="text-[11px] text-slate-600 mt-2">
                        Conditions: <strong>{tp.profile.existingConditions.join(', ')}</strong>
                      </p>
                    )}

                    {/* Prescriptions issued to this patient by this doctor */}
                    {(() => {
                      const patientRxs = doctorPrescriptions.filter((p) => p.patientId === tp.patientId);
                      if (patientRxs.length === 0) return null;
                      const latestRx = patientRxs[0];
                      return (
                        <div className="mt-3 p-2.5 bg-teal-50/70 border border-teal-200 rounded-xl text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-teal-900 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-teal-700" />
                              <span>Prescription: {latestRx.diagnosis}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setViewingPrescription(latestRx)}
                              className="text-[10px] font-bold text-teal-800 hover:text-teal-950 underline cursor-pointer"
                            >
                              View PDF ↗
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-700 line-clamp-1">
                            {latestRx.medicines?.map((m) => `${m.name} (${m.timingOption || m.frequency})`).join(', ')}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Passkey: {tp.lastTreatmentCode || 'Verified'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTreatedPatient(tp);
                        setVerifyStatus(tp.healthVerification?.status || 'clear');
                        setVerifyNotes(tp.healthVerification?.notes || '');
                      }}
                      className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5 text-teal-600" />
                      <span>View Health Dossier & Verify &rarr;</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dossier & Health Verification Modal */}
          {selectedTreatedPatient && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 text-xs animate-in fade-in zoom-in-95 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-teal-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Clinical Health Dossier & Condition Verification: {selectedTreatedPatient.patientName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTreatedPatient(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Patient Profile Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">DOB / Age</span>
                    <strong>{selectedTreatedPatient.profile?.dateOfBirth || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Blood Group</span>
                    <strong>{selectedTreatedPatient.profile?.bloodGroup || 'O+'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">BMI</span>
                    <strong>{selectedTreatedPatient.profile?.bmi || '23.0'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Allergies</span>
                    <strong className="truncate block">{selectedTreatedPatient.profile?.allergies?.join(', ') || 'None'}</strong>
                  </div>
                </div>

                {/* Latest Vitals Stream */}
                {selectedTreatedPatient.latestReadings?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                      Recent IoT Morning Vital Readings:
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 block">Heart Rate</span>
                        <strong className="text-slate-900 font-mono text-sm">{selectedTreatedPatient.latestReadings[0].heartRate} bpm</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 block">BP</span>
                        <strong className="text-slate-900 font-mono text-sm">{selectedTreatedPatient.latestReadings[0].systolicBp}/{selectedTreatedPatient.latestReadings[0].diastolicBp}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 block">SpO2</span>
                        <strong className="text-slate-900 font-mono text-sm">{selectedTreatedPatient.latestReadings[0].spO2}%</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 block">Temp</span>
                        <strong className="text-slate-900 font-mono text-sm">{selectedTreatedPatient.latestReadings[0].temperature}°C</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 block">Glucose</span>
                        <strong className="text-slate-900 font-mono text-sm">{selectedTreatedPatient.latestReadings[0].glucose} mg/dL</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Official Prescriptions History for this Patient */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-800 uppercase flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      <span>Official Prescriptions History ({doctorPrescriptions.filter((p) => p.patientId === selectedTreatedPatient.patientId).length})</span>
                    </span>
                  </div>

                  {doctorPrescriptions.filter((p) => p.patientId === selectedTreatedPatient.patientId).length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      No prescriptions on record for this patient.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {doctorPrescriptions
                        .filter((p) => p.patientId === selectedTreatedPatient.patientId)
                        .map((rx) => (
                          <div key={rx.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="font-serif font-black text-teal-700">℞</span>
                                <span>{rx.diagnosis}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-mono">{rx.date}</span>
                                <button
                                  type="button"
                                  onClick={() => setViewingPrescription(rx)}
                                  className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded font-bold text-[10px] cursor-pointer"
                                >
                                  View PDF
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {rx.medicines?.map((m, mIdx) => (
                                <span key={mIdx} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-700 font-medium">
                                  <strong>{m.name}</strong> ({m.dosage} • {m.timingOption || m.frequency} • {m.durationDays ? `${m.durationDays}d` : m.duration})
                                </span>
                              ))}
                            </div>
                            {rx.advice && (
                              <p className="text-[10px] text-slate-500 italic">Advice: {rx.advice}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Verification Form */}
                <form onSubmit={handleVerifyPatientHealth} className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-teal-950 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Clinical Condition Verification & Clearance Certification</span>
                  </h4>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Verify whether the patient's health condition is clear and stable following treatment. An official clearance notification will be sent to the patient.
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-slate-700 font-bold">Health Condition Status:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <label className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        verifyStatus === 'clear' ? 'bg-emerald-600 text-white border-emerald-700 font-bold' : 'bg-white text-slate-700 border-slate-200'
                      }`}>
                        <input
                          type="radio"
                          name="vstatus"
                          value="clear"
                          checked={verifyStatus === 'clear'}
                          onChange={() => setVerifyStatus('clear')}
                          className="sr-only"
                        />
                        🟢 Nice & Clear (Stable)
                      </label>
                      <label className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        verifyStatus === 'observation' ? 'bg-amber-600 text-white border-amber-700 font-bold' : 'bg-white text-slate-700 border-slate-200'
                      }`}>
                        <input
                          type="radio"
                          name="vstatus"
                          value="observation"
                          checked={verifyStatus === 'observation'}
                          onChange={() => setVerifyStatus('observation')}
                          className="sr-only"
                        />
                        🟡 Under Observation
                      </label>
                      <label className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        verifyStatus === 'critical' ? 'bg-rose-600 text-white border-rose-700 font-bold' : 'bg-white text-slate-700 border-slate-200'
                      }`}>
                        <input
                          type="radio"
                          name="vstatus"
                          value="critical"
                          checked={verifyStatus === 'critical'}
                          onChange={() => setVerifyStatus('critical')}
                          className="sr-only"
                        />
                        🔴 Attention Required
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Doctor's Verification Notes & Clinical Assessment:
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      placeholder="e.g. Post-consultation vitals are within normal biological limits. Blood pressure stabilized with Amlodipine regimen. Cleared for regular daily activity."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTreatedPatient(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={verifyingPatient}
                      className="px-5 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{verifyingPatient ? 'Verifying...' : 'Sign & Certify Health Verification'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: HOSPITAL AFFILIATION & TRANSFER ================= */}
      {activeTab === 'hospital' && (
        <div className="space-y-6">
          {/* Current Affiliated Hospital Overview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Current Official Affiliation
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {doctorProfile?.hospitalName || 'Unassigned Hospital'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Physician: <strong className="text-slate-800">{user?.name}</strong> • Specialization: <strong className="text-indigo-700">{doctorProfile?.specialization}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Request Hospital Transfer</span>
                </button>
              </div>
            </div>

            {/* Status Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Affiliation Status</span>
                {doctorProfile?.approvalStatus === 'approved' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 text-teal-800 font-bold rounded-lg text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Approved & Active</span>
                  </span>
                )}
                {doctorProfile?.approvalStatus === 'on_hold' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Activities on Hold</span>
                  </span>
                )}
                {doctorProfile?.approvalStatus === 'pending_hospital_approval' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg text-xs animate-pulse">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pending Hospital Review</span>
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Medical License Verified</span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {doctorProfile?.medicalLicenseNumber || 'N/A'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Patient Appointments</span>
                <span className="text-xs font-bold text-slate-800">
                  {doctorProfile?.approvalStatus === 'approved'
                    ? 'Enabled (Accepting Bookings)'
                    : doctorProfile?.approvalStatus === 'on_hold'
                    ? 'Paused (Hold active)'
                    : 'Awaiting Hospital Acceptance'}
                </span>
              </div>
            </div>

            {/* If on hold, show reason & guidance */}
            {isOnHold && (
              <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertTriangle className="w-4 h-4" /> Hospital Management Put Activities On Hold
                </p>
                <p className="text-rose-700">
                  Reason / Required Changes: {doctorProfile?.rejectionReason || 'Administrative schedule review or credential audit'}.
                </p>
                <p className="text-[11px] text-rose-600">
                  Please coordinate with {doctorProfile?.hospitalName} management to provide updated certificates or scheduling adjustments. Once the hospital management releases the hold, patient appointments will automatically resume.
                </p>
              </div>
            )}

            {/* If pending transfer */}
            {doctorProfile?.pendingTransfer && (
              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-700" />
                  <span>Transfer Request in Progress to: <strong>{doctorProfile.pendingTransfer.targetHospitalName}</strong></span>
                </p>
                <p className="text-indigo-800 text-[11px]">
                  Reason: <em>"{doctorProfile.pendingTransfer.reason}"</em>
                </p>
                <p className="text-indigo-700/80 text-[11px]">
                  Submitted on: {new Date(doctorProfile.pendingTransfer.requestedAt).toLocaleDateString()}. The target hospital has received this request. As soon as their administration accepts, your affiliation and appointment registry will be automatically transferred.
                </p>
              </div>
            )}
          </div>

          {/* Transfer History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Hospital Transfer Records & Requests</span>
            </h4>

            {myTransfers.length === 0 ? (
              <p className="text-xs text-slate-400">
                No transfer history recorded. If you wish to change your practicing hospital, click "Request Hospital Transfer" above.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {myTransfers.map((tr) => (
                  <div key={tr.id} className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-600">Transfer from</span>
                        <strong className="text-slate-800">{tr.currentHospitalName}</strong>
                        <span className="text-slate-400">&rarr;</span>
                        <strong className="text-indigo-700">{tr.targetHospitalName}</strong>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Reason: {tr.reason} • Requested on {new Date(tr.requestDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      {tr.status === 'accepted' && (
                        <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-full font-bold text-[10px]">
                          Accepted & Transferred
                        </span>
                      )}
                      {tr.status === 'pending' && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px] animate-pulse">
                          Pending Hospital Review
                        </span>
                      )}
                      {tr.status === 'rejected' && (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px]">
                          Declined
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Official Medical Email Policy & Change Authorization Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Official Medical Email Registry & Change Authorization
                  </h4>
                  <p className="text-xs text-slate-500">
                    Registered practitioner medical email linked to your clinical license
                  </p>
                </div>
              </div>

              {!doctorProfile?.pendingEmailChange && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEmailChangeModalOpen(true);
                    setNewMedicalEmail('');
                    setEmailChangeReason('');
                    setEmailChangeError(null);
                  }}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Request Medical Email Change</span>
                </button>
              )}
            </div>

            {/* Current Email Display */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Current Registered Medical Email
                </span>
                <span className="font-mono text-sm font-bold text-slate-900">{user?.email}</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Verified practitioner contact for {doctorProfile?.hospitalName || 'Affiliated Hospital'}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-full font-bold text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-teal-700" />
                  <span>Active & Verified</span>
                </span>
              </div>
            </div>

            {/* Strict Regulatory Policy Explanation */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1 text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Strict Clinical Credentialing Policy:</span>
              </span>
              <p className="leading-relaxed text-[11px]">
                When registering as a physician, doctors must register with their official medical email. There can be no direct change of email by the doctor. If you need to update your email, you must submit a formal request to your affiliated hospital management (<strong>{doctorProfile?.hospitalName}</strong>) for clinical authorization. Once approved by the hospital, your registered email and credentials will be updated.
              </p>
            </div>

            {/* Pending Email Change Notice if active */}
            {doctorProfile?.pendingEmailChange && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold flex items-center gap-1.5 text-amber-900">
                    <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                    <span>Email Change Request Pending Hospital Management Approval</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                    Awaiting Hospital Review
                  </span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-amber-200 text-[11px] space-y-1">
                  <p>
                    Requested New Email: <strong className="font-mono text-indigo-900">{doctorProfile.pendingEmailChange.newEmail}</strong>
                  </p>
                  <p>
                    Clinical Justification: <em>"{doctorProfile.pendingEmailChange.reason}"</em>
                  </p>
                  <p className="text-slate-500">
                    Requested on: {new Date(doctorProfile.pendingEmailChange.requestedAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-[11px] text-amber-800">
                  Your current email ({user?.email}) remains active for all consultations, patients, and credentials until <strong>{doctorProfile?.hospitalName}</strong> accepts your request.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= DOCTOR MEDICAL EMAIL CHANGE MODAL ================= */}
      {isEmailChangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Request Medical Email Change</h3>
                  <p className="text-xs text-slate-500">
                    Submit formal request to {doctorProfile?.hospitalName || 'Affiliated Hospital'} management
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailChangeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestEmailChangeSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-0.5">Current Registered Email:</span>
                <strong className="font-mono text-slate-900 text-xs">{user?.email}</strong>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  New Official Medical Email *
                </label>
                <input
                  type="email"
                  required
                  value={newMedicalEmail}
                  onChange={(e) => setNewMedicalEmail(e.target.value)}
                  placeholder="e.g. dr.name@hospital.org"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Must be a unique email address not registered with any other patient, hospital, or doctor.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Clinical Justification / Reason for Email Change *
                </label>
                <textarea
                  rows={3}
                  required
                  value={emailChangeReason}
                  onChange={(e) => setEmailChangeReason(e.target.value)}
                  placeholder="e.g. Updating to official institutional domain of hospital, or updating communication inbox."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                <strong>Hospital Authority Notice:</strong> This request will be sent directly to <strong>{doctorProfile?.hospitalName}</strong> administration. Only the hospital administration can approve this change.
              </div>

              {emailChangeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  {emailChangeError}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmailChangeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailChangeSubmitting}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>{emailChangeSubmitting ? 'Sending Request...' : 'Submit Request to Hospital'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= TRANSFER MODAL ================= */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Request Hospital Transfer</h3>
                  <p className="text-xs text-slate-500">Apply to transfer your medical affiliation to another registered hospital</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestTransferSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Current Affiliated Center:</span>
                <strong className="text-slate-900 font-bold">{doctorProfile?.hospitalName || 'Current Hospital'}</strong>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Select Target Destination Hospital *
                </label>
                <select
                  required
                  value={transferTargetHospId}
                  onChange={(e) => setTransferTargetHospId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="" disabled>-- Select Destination Hospital --</option>
                  {hospitals
                    .filter((h) => h.id !== doctorProfile?.hospitalId)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.hospitalProfile?.hospitalName || h.name} ({h.hospitalProfile?.city || 'Metro'}, License: {h.hospitalProfile?.licenseNumber || 'REG-LIC'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason for Transfer Request *
                </label>
                <textarea
                  rows={3}
                  required
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Relocating to new region, joining super-specialty cardiology wing, or agreed department terms."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                <strong>How it works:</strong> The same request process will be sent to the selected destination hospital. If they accept your application, your clinical affiliation will be transferred immediately.
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>{transferSubmitting ? 'Submitting Request...' : 'Send Transfer Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription PDF Viewer Modal */}
      <PrescriptionModal
        prescription={viewingPrescription}
        onClose={() => setViewingPrescription(null)}
      />

      {/* Doctor Cancel Appointment with Patient Secret Verification Passkey Modal */}
      {cancelCodeModalApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Cancel Appointment via Patient Verification Code
                  </h3>
                  <p className="text-xs text-slate-500">
                    Slot will immediately reopen and become visible for other patients to book.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelCodeModalApt(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-amber-950">
                <span>Patient: {cancelCodeModalApt.patientName}</span>
                <span className="font-mono text-indigo-700">{cancelCodeModalApt.date} • {cancelCodeModalApt.timeSlot}</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                If the patient called or contacted to cancel before coming, ask for their 6-digit appointment verification code / passkey (e.g. <code>TRT-842910</code>) displayed on their patient portal.
              </p>
            </div>

            <form onSubmit={handleCancelWithPatientCode} className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter Patient's 6-Digit Passkey / Unique Code *
                </label>
                <input
                  type="text"
                  required
                  value={inputCancelVerificationCode}
                  onChange={(e) => setInputCancelVerificationCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TRT-842910"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-wider text-slate-900 focus:outline-teal-600 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cancellation Reason (Optional)
                </label>
                <input
                  type="text"
                  value={cancelReasonText}
                  onChange={(e) => setCancelReasonText(e.target.value)}
                  placeholder="e.g. Patient requested advance cancellation due to travel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {cancelError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{cancelError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelCodeModalApt(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{cancelLoading ? 'Verifying...' : 'Verify Code & Release Slot'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DOCTOR REGISTER PATIENT MODAL ================= */}
      {isRegisterPatientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register Patient & Dispatch Hospital Request</h3>
                  <p className="text-xs text-slate-500">
                    Register clinical records and assign target hospital facility with license verification.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterPatientOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDoctorRegisterPatientSubmit} className="space-y-4 pt-4 text-xs">
              
              {/* Target Hospital Selector (Requirement: Doctor chooses hospital, includes hospital license and ID) */}
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-indigo-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-700" />
                    Target Hospital for Patient Admission / Care Request *
                  </label>
                  <span className="text-[10px] text-indigo-700 font-semibold">License Verified</span>
                </div>

                <select
                  value={patientRegHospitalId}
                  onChange={(e) => setPatientRegHospitalId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.hospitalProfile?.hospitalName || h.name} (License: {h.hospitalProfile?.licenseNumber || 'REG-LIC'})
                    </option>
                  ))}
                </select>

                {(() => {
                  const hospObj = hospitals.find((h) => h.id === patientRegHospitalId);
                  if (!hospObj) return null;
                  return (
                    <div className="pt-1 text-[11px] text-indigo-900 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-indigo-200/60 mt-1">
                      <div>
                        <span className="text-slate-500">Hospital ID:</span>{' '}
                        <strong className="font-mono text-indigo-950">{hospObj.id}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">License #:</span>{' '}
                        <strong className="font-mono text-indigo-950">{hospObj.hospitalProfile?.licenseNumber || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Hotline:</span>{' '}
                        <strong className="text-indigo-950">{hospObj.hospitalProfile?.emergencyHotline || hospObj.phone}</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Patient Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={patientRegName}
                    onChange={(e) => setPatientRegName(e.target.value)}
                    placeholder="e.g. Michael Smith"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Patient Email Address *</label>
                  <input
                    type="email"
                    required
                    value={patientRegEmail}
                    onChange={(e) => setPatientRegEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={patientRegPhone}
                    onChange={(e) => setPatientRegPhone(e.target.value)}
                    placeholder="+1 (555) 765-4321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Govt ID & Demographics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Govt ID Type *</label>
                  <select
                    value={patientRegGovtIdType}
                    onChange={(e) => setPatientRegGovtIdType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Aadhar Card">Aadhar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver License">Driver License</option>
                    <option value="Voter ID">Voter ID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Govt ID Number *</label>
                  <input
                    type="text"
                    required
                    value={patientRegGovtIdNumber}
                    onChange={(e) => setPatientRegGovtIdNumber(e.target.value)}
                    placeholder="8492 1029 3321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={patientRegDob}
                    onChange={(e) => setPatientRegDob(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Gender & Blood *</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={patientRegGender}
                      onChange={(e) => setPatientRegGender(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <select
                      value={patientRegBloodGroup}
                      onChange={(e) => setPatientRegBloodGroup(e.target.value)}
                      className="w-full px-1.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-bold text-rose-700"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Physical & Clinical Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={patientRegHeight}
                    onChange={(e) => setPatientRegHeight(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={patientRegWeight}
                    onChange={(e) => setPatientRegWeight(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Medical Conditions (comma-separated)</label>
                  <input
                    type="text"
                    value={patientRegConditions}
                    onChange={(e) => setPatientRegConditions(e.target.value)}
                    placeholder="Hypertension, Asthma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              {/* India Geographic Location Selector (User Requirement: India only, Country, State, District, Pincode, City, Street) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Residential Address (India Only) *
                  </span>
                  <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    Auto-fetch supported
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Country</label>
                    <select
                      value={patientRegCountry}
                      onChange={(e) => setPatientRegCountry(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      <option value="India">India (IN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">State *</label>
                    <select
                      value={patientRegState}
                      onChange={(e) => {
                        const newState = e.target.value;
                        setPatientRegState(newState);
                        const dists = INDIA_DISTRICTS[newState] || [];
                        if (dists.length > 0) setPatientRegDistrict(dists[0]);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      {INDIA_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">District *</label>
                    <select
                      value={patientRegDistrict}
                      onChange={(e) => setPatientRegDistrict(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      {(INDIA_DISTRICTS[patientRegState] || ['Central', 'North', 'South']).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1 flex items-center justify-between">
                      <span>Pincode (6 digits) *</span>
                      {patientRegPincodeFetching && <span className="text-[10px] text-indigo-600 animate-pulse">Fetching...</span>}
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        maxLength={6}
                        value={patientRegPincode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setPatientRegPincode(val);
                          if (val.length === 6) handlePatientPincodeLookup(val);
                        }}
                        placeholder="500001"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handlePatientPincodeLookup(patientRegPincode)}
                        disabled={patientRegPincode.length !== 6 || patientRegPincodeFetching}
                        className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-bold shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        Auto-fill
                      </button>
                    </div>
                    {patientRegPincodeNotice && (
                      <p className="text-[10px] text-indigo-600 mt-1 font-medium">{patientRegPincodeNotice}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">City / Town *</label>
                    <input
                      type="text"
                      required
                      value={patientRegCity}
                      onChange={(e) => setPatientRegCity(e.target.value)}
                      placeholder="e.g. Hyderabad"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Street Address / House No.</label>
                    <input
                      type="text"
                      value={patientRegStreetAddress}
                      onChange={(e) => setPatientRegStreetAddress(e.target.value)}
                      placeholder="e.g. Flat 302, Green Avenue"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Mandatory Aadhaar / Government ID Document Upload (User Requirement) */}
              <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-rose-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-rose-600" />
                    Government ID / Aadhaar Document Upload (Mandatory) *
                  </label>
                  <span className="text-[10px] text-rose-700 font-bold px-2 py-0.5 bg-rose-100 rounded-full">
                    Required for Registration
                  </span>
                </div>

                <div className="p-3 bg-white border-2 border-dashed border-rose-300 rounded-xl flex flex-col items-center justify-center text-center">
                  <input
                    type="file"
                    id="doctor-pat-id-file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setPatientRegGovtIdFile({
                            name: file.name,
                            type: file.type,
                            dataUrl: reader.result as string,
                            size: (file.size / 1024).toFixed(1) + ' KB',
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {patientRegGovtIdFile ? (
                    <div className="flex items-center justify-between w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-xs truncate max-w-[240px]">{patientRegGovtIdFile.name}</span>
                        <span className="text-[10px] text-emerald-600 font-mono">({patientRegGovtIdFile.size})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPatientRegGovtIdFile(null)}
                        className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="doctor-pat-id-file"
                      className="cursor-pointer flex flex-col items-center gap-1 py-1 text-slate-600 hover:text-indigo-600"
                    >
                      <Upload className="w-6 h-6 text-rose-500" />
                      <span className="text-xs font-bold text-slate-800">Click to upload Aadhaar or Govt ID</span>
                      <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={patientRegEmergencyName}
                    onChange={(e) => setPatientRegEmergencyName(e.target.value)}
                    placeholder="Sarah Smith"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Relationship</label>
                  <input
                    type="text"
                    value={patientRegEmergencyRel}
                    onChange={(e) => setPatientRegEmergencyRel(e.target.value)}
                    placeholder="Spouse"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    value={patientRegEmergencyPhone}
                    onChange={(e) => setPatientRegEmergencyPhone(e.target.value)}
                    placeholder="+1 (555) 999-0000"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsRegisterPatientOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={patientRegSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{patientRegSubmitting ? 'Registering Patient...' : 'Register Patient & Dispatch to Hospital'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= REGISTERED PATIENT CREDENTIALS SUCCESS MODAL (User Requirement) ================= */}
      {registeredPatientSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Patient Authorized & Registered!</h3>
                  <p className="text-xs text-slate-500">Official login credentials generated and dispatched via email</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRegisteredPatientSuccessData(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Patient Name:</span>
                <strong className="text-slate-900">{registeredPatientSuccessData.patient.name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Login Email:</span>
                <strong className="text-slate-900 font-mono">{registeredPatientSuccessData.patient.email}</strong>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-300 rounded-lg">
                <span className="text-emerald-900 font-bold flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-600" />
                  Allocated Password:
                </span>
                <div className="flex items-center gap-2">
                  <strong className="font-mono text-sm text-indigo-700 font-black">
                    {registeredPatientSuccessData.password || 'AVC-PassKey'}
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Email: ${registeredPatientSuccessData.patient.email}\nPassword: ${registeredPatientSuccessData.password}`
                      );
                      setCopiedPatientCredentials(true);
                      setTimeout(() => setCopiedPatientCredentials(false), 3000);
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer text-[10px] flex items-center gap-1"
                    title="Copy Credentials"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedPatientCredentials ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600" />
                Automated Notification Dispatched:
              </p>
              <p className="text-[11px] text-indigo-800">
                A registration confirmation email with their login credentials has been sent to{' '}
                <strong className="font-mono">{registeredPatientSuccessData.patient.email}</strong>.
                The patient can sign in directly through their linked Google account or by entering the email and password above.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setRegisteredPatientSuccessData(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {isSurgeryModeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 text-xs animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Urgent Surgery Mode — Automated Workflow Activation</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSurgeryModeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 space-y-1">
              <p className="font-bold text-xs flex items-center gap-1.5 text-rose-900">
                <Sliders className="w-4 h-4 text-rose-600" />
                <span>Automated Conflict Identification & Patient Reassignment Engine</span>
              </p>
              <p className="text-[11px] leading-relaxed text-rose-800">
                When activated, the system immediately locks consultation slots from patient view, scans upcoming appointments on your urgent surgery date, automatically transfers them to your <strong>next available working day</strong>, and dispatches urgent email notifications to all affected patients.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Select Urgent Surgery Date *
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const t = new Date();
                      t.setDate(t.getDate() + 1);
                      setUrgentSurgeryDate(t.toISOString().split('T')[0]);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs border cursor-pointer ${
                      urgentSurgeryDate === (() => { const t = new Date(); t.setDate(t.getDate() + 1); return t.toISOString().split('T')[0]; })()
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Tomorrow (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const t = new Date();
                      setUrgentSurgeryDate(t.toISOString().split('T')[0]);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs border cursor-pointer ${
                      urgentSurgeryDate === new Date().toISOString().split('T')[0]
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Today (Immediate Priority)
                  </button>
                </div>

                <input
                  type="date"
                  required
                  value={urgentSurgeryDate}
                  onChange={(e) => setUrgentSurgeryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* Real-time Conflicting Appointments Scan */}
              {(() => {
                const conflictingApts = appointments.filter(
                  (a) => a.date === urgentSurgeryDate && (a.status === 'pending' || a.status === 'approved')
                );
                return (
                  <div className={`p-3.5 rounded-xl border ${
                    conflictingApts.length > 0
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                      : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        {conflictingApts.length > 0 ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Conflicting Upcoming Appointments Identified ({conflictingApts.length})</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>No Conflicting Appointments on this Date</span>
                          </>
                        )}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        conflictingApts.length > 0 ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
                      }`}>
                        Date: {urgentSurgeryDate}
                      </span>
                    </div>

                    {conflictingApts.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        <div className="divide-y divide-amber-200/60 max-h-36 overflow-y-auto bg-white/70 rounded-lg p-2 border border-amber-200">
                          {conflictingApts.map((a) => (
                            <div key={a.id} className="py-1.5 flex items-center justify-between text-[11px]">
                              <div>
                                <strong className="text-slate-900">{a.patientName}</strong>
                                <span className="text-slate-500 ml-1 font-mono">({a.timeSlot})</span>
                                <p className="text-[10px] text-slate-600">{a.reasonForVisit}</p>
                              </div>
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                                Will Auto-Transfer ➡️
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-amber-800 leading-relaxed">
                          📌 <strong>Automated Action:</strong> These appointments will be automatically shifted to your next free working day (e.g. day after tomorrow), preserving each patient's Treatment Passkey, and priority emails will be dispatched to each patient.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-800">
                        You have no existing patient consultations booked on {urgentSurgeryDate}. Entering surgery mode will lock your consultation slots to prevent new patient bookings during the surgery period.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Urgent Procedure Reason / Theater Notes
                </label>
                <input
                  type="text"
                  value={urgentReason}
                  onChange={(e) => setUrgentReason(e.target.value)}
                  placeholder="e.g. Emergency Cardiac Stenting / Acute Surgical Theater Priority"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsSurgeryModeModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteAutomatedSurgeryMode}
                disabled={activatingSurgeryWorkflow}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <AlertTriangle className={`w-4 h-4 ${activatingSurgeryWorkflow ? 'animate-spin' : ''}`} />
                <span>
                  {activatingSurgeryWorkflow
                    ? 'Executing Automated Workflow...'
                    : 'Activate Surgery Mode & Execute Workflow'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= WORKFLOW REPORT MODAL ================= */}
      {showWorkflowDetailsModal && surgeryWorkflowResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-xs animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-900 font-black text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Surgery Mode Automated Workflow Execution Report</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkflowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1">
              <p className="font-bold text-xs text-emerald-900">
                ✅ Workflow Executed Successfully
              </p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {surgeryWorkflowResult.message}
              </p>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Reassigned Patients ({surgeryWorkflowResult.reassignedAppointments?.length || 0}):
              </span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-48 overflow-y-auto p-2 bg-slate-50">
                {(surgeryWorkflowResult.reassignedAppointments || []).map((ra: any, idx: number) => (
                  <div key={idx} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <strong className="text-slate-900">{ra.patientName}</strong>
                      <span className="text-slate-400 text-[10px] block">{ra.patientEmail}</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="line-through text-slate-400 text-[10px]">{ra.originalDate}</span>
                        <ArrowRight className="w-3 h-3 text-emerald-600" />
                        <span className="font-black text-emerald-700">{ra.newDate} ({ra.newSlot})</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {ra.emailDispatched ? '📧 Email Sent' : 'Queued'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWorkflowDetailsModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: IN-HOSPITAL SPECIALIST REFERRALS & CROSS-DEPARTMENT BOOKINGS */}
      {/* ========================================================================= */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          {/* Section Header */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-semibold text-indigo-700 mb-2">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>In-Hospital Cross-Specialty Clinical Referrals</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Colleague Physician Referrals & Direct Appointments
                </h2>
                <p className="text-xs text-slate-500 max-w-3xl mt-1">
                  When you consult a patient whose medical condition refers to another department (e.g. Cardiology detecting neurological symptoms, or Orthopedics requiring general medical evaluation), you can choose any verified specialist in this hospital and directly book an appointment for the patient.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (patients.length > 0 && !referralPatientId) {
                    setReferralPatientId(patients[0].id);
                  }
                  if (hospitalDoctors.length > 0 && !referralTargetDoctorId) {
                    setReferralTargetDoctorId(hospitalDoctors[0].id);
                  }
                  setIsReferralModalOpen(true);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create In-Hospital Referral</span>
              </button>
            </div>

            {/* Colleague Physicians Directory in this Hospital */}
            <div className="mt-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Colleague Physicians Available at {doctorProfile?.hospitalName || 'This Hospital'} ({hospitalDoctors.length})
              </h3>
              {hospitalDoctors.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  No other doctors registered in this hospital facility yet. As other specialists register, they will appear here for cross-department referrals.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hospitalDoctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3 hover:border-indigo-300 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-xs text-slate-900">{doc.name}</p>
                        <p className="text-[11px] font-semibold text-indigo-700">
                          {doc.doctorProfile?.specialization || 'Specialist Physician'}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Fee: ${doc.doctorProfile?.consultationFee || 75} • {doc.doctorProfile?.yearsOfExperience || 10}+ yrs exp
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReferralTargetDoctorId(doc.id);
                          if (patients.length > 0 && !referralPatientId) {
                            setReferralPatientId(patients[0].id);
                          }
                          setIsReferralModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 font-bold rounded-lg text-[10px] shadow-2xs transition-colors cursor-pointer shrink-0"
                      >
                        Refer Patient
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Referrals List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Referral Appointments Log (Initiated & Received)
            </h3>

            {(() => {
              const myReferrals = appointments.filter(
                (a) => a.referredByDoctorId === doctorId || (a.doctorId === doctorId && a.referredByDoctorId)
              );

              if (myReferrals.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    <Share2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No cross-department referrals recorded yet.</p>
                    <p className="text-[11px] mt-0.5">
                      Use the "Create In-Hospital Referral" button above or refer any patient directly from your appointment schedule.
                    </p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {myReferrals.map((apt) => {
                    const isOutbound = apt.referredByDoctorId === doctorId;
                    return (
                      <div key={apt.id} className="p-4 bg-white hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                              isOutbound ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'
                            }`}>
                              {isOutbound ? 'Outbound Referral ➡️' : 'Inbound Referral ⬅️'}
                            </span>
                            <span className="font-black text-slate-900 text-sm">{apt.patientName}</span>
                          </div>

                          <p className="text-slate-600 text-[11px]">
                            {isOutbound ? (
                              <span>
                                Referred to: <strong className="text-indigo-900">Dr. {apt.doctorName}</strong> ({apt.doctorSpecialization})
                              </span>
                            ) : (
                              <span>
                                Referred by: <strong className="text-indigo-900">Dr. {apt.referredByDoctorName}</strong> ({apt.referredSpecialization || 'Attending Doctor'})
                              </span>
                            )}
                          </p>

                          <p className="text-slate-500 text-[11px]">
                            Clinical Reason: <em>"{apt.reasonForVisit}"</em>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 text-right self-end md:self-auto">
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">{apt.date}</span>
                            <span className="text-[11px] text-slate-500 block font-mono">{apt.timeSlot}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            apt.status === 'completed'
                              ? 'bg-teal-100 text-teal-800'
                              : apt.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DIAGNOSTIC LAB ORDERS & FREE POST-INVESTIGATION FOLLOW-UP */}
      {/* ========================================================================= */}
      {activeTab === 'lab_tests' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-semibold text-teal-800 mb-2">
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Clinical Diagnostics & Free Investigation Follow-Ups</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Hospital Diagnostic Lab Orders & Free Follow-Up Booking
                </h2>
                <p className="text-xs text-slate-500 max-w-3xl mt-1">
                  As an attending doctor (Orthopedic, Cardiologist, Neurologist, etc.), order hospital-available diagnostic imaging (MRI, CT, X-Ray) or laboratory profiles. Once the tests are carried out, the system lets you book the patient's next follow-up appointment completely free ($0 Fee).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (patients.length > 0 && !labOrderPatientId) {
                    setLabOrderPatientId(patients[0].id);
                  }
                  setIsLabOrderModalOpen(true);
                }}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Prescribe Diagnostic Test (MRI / CT / Labs)</span>
              </button>
            </div>

            {/* Diagnostic Capabilities Overview */}
            <div className="mt-5 space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Laboratory & Imaging Facilities Available at {doctorProfile?.hospitalName || 'This Hospital'}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {hospitalLabTests.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-medium"
                  >
                    🧪 {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Diagnostic Lab Orders List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Diagnostic Investigation Orders ({labOrders.length})
              </h3>
              <span className="text-[11px] text-teal-700 font-semibold">
                Completed tests are eligible for 100% Free Follow-Up Appointments
              </span>
            </div>

            {labOrders.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No diagnostic lab orders created yet.</p>
                <p className="text-[11px] mt-0.5">
                  Click "Prescribe Diagnostic Test (MRI / CT / Labs)" to order tests for any patient.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {labOrders.map((order) => {
                  const isCompleted = order.status === 'completed';
                  return (
                    <div key={order.id} className="p-4 bg-white hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isCompleted ? '✓ Investigation Completed' : '⏳ Pending Investigation'}
                          </span>
                          <span className="font-black text-slate-900 text-sm">{order.patientName}</span>
                          <span className="text-slate-400 text-[10px]">Order ID: {order.id}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-1">
                          {order.testNames.map((tn) => (
                            <span key={tn} className="px-2 py-0.5 bg-teal-50 text-teal-900 font-bold border border-teal-200 rounded text-[10px]">
                              🔬 {tn}
                            </span>
                          ))}
                        </div>

                        <p className="text-slate-600 text-[11px]">
                          Clinical Indication: <em>"{order.clinicalIndication || 'Attending physician evaluation'}"</em>
                        </p>

                        {order.reportNotes && (
                          <div className="p-2 bg-emerald-50/70 border border-emerald-100 rounded-lg text-[11px] text-emerald-950">
                            <strong>Diagnostic Findings / Report:</strong> {order.reportNotes}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 self-start md:self-auto">
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => {
                              setCompletingOrderId(order.id);
                              setCompletingOrderReportNotes('');
                            }}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            Mark Completed & Add Findings
                          </button>
                        )}

                        {isCompleted && !order.freeFollowUpBooked && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForFollowUp(order);
                              setIsFreeFollowUpModalOpen(true);
                            }}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-emerald-200" />
                            <span>Book FREE Follow-Up ($0 Fee)</span>
                          </button>
                        )}

                        {isCompleted && order.freeFollowUpBooked && (
                          <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold rounded-xl text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Free Follow-Up Booked ({order.followUpAppointmentDate || 'Confirmed'})</span>
                          </span>
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

      {/* ========================================================================= */}
      {/* MODAL 1: IN-HOSPITAL SPECIALIST REFERRAL */}
      {/* ========================================================================= */}
      {isReferralModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-2xl">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    In-Hospital Specialist Referral & Direct Booking
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Book an appointment with a colleague doctor at {doctorProfile?.hospitalName || 'this hospital'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReferralModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReferralSubmit} className="space-y-4 text-xs">
              {/* Select Patient */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  1. Select Patient to Refer *
                </label>
                <select
                  required
                  value={referralPatientId}
                  onChange={(e) => setReferralPatientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Colleague Doctor */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  2. Select Colleague Doctor in This Hospital *
                </label>
                <select
                  required
                  value={referralTargetDoctorId}
                  onChange={(e) => setReferralTargetDoctorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Choose Colleague Doctor --</option>
                  {hospitalDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} — {doc.doctorProfile?.specialization || 'Specialist'} (${doc.doctorProfile?.consultationFee || 75})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  (e.g., Cardiology referring to Neurology, Orthopedic, or General Physician)
                </p>
              </div>

              {/* Date & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    3. Appointment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={referralDate}
                    onChange={(e) => setReferralDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Time Slot *
                  </label>
                  <select
                    required
                    value={referralTimeSlot}
                    onChange={(e) => setReferralTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Clinical Referral Reason */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  4. Clinical Referral Notes & Justification *
                </label>
                <textarea
                  rows={3}
                  required
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  placeholder="e.g. Patient presents with progressive cranial headache, unilateral numbness, and tension. Transferred from Cardiology to Neurology for cranial MRI/CT evaluation."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
                ℹ️ <strong>Direct In-Hospital Booking:</strong> Because this is an in-hospital doctor referral, the appointment is automatically pre-approved. The patient and receiving colleague physician will both receive instant email confirmations.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReferralModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={referralSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{referralSubmitting ? 'Booking Referral...' : 'Confirm In-Hospital Referral'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ORDER DIAGNOSTIC LAB TESTS (MRI / CT / LABS) */}
      {/* ========================================================================= */}
      {isLabOrderModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-800 rounded-2xl">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Prescribe Diagnostic Lab & Imaging Tests
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Order MRI, CT Scan, X-Ray, or Blood Panels from {doctorProfile?.hospitalName || 'Hospital'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLabOrderModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLabOrderSubmit} className="space-y-4 text-xs">
              {/* Select Patient */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  1. Select Patient *
                </label>
                <select
                  required
                  value={labOrderPatientId}
                  onChange={(e) => setLabOrderPatientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Tests from Hospital's Available Capabilities */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
                  <span>2. Select Diagnostic Investigations to Perform *</span>
                  <span className="text-[10px] text-teal-700 font-semibold font-mono">
                    {labOrderSelectedTests.length} Selected
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {hospitalLabTests.map((t) => {
                    const isSelected = labOrderSelectedTests.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setLabOrderSelectedTests(labOrderSelectedTests.filter((x) => x !== t));
                          } else {
                            setLabOrderSelectedTests([...labOrderSelectedTests, t]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-teal-700 text-white border-teal-700 shadow-2xs font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate pr-1">{t}</span>
                        {isSelected ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clinical Indication */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  3. Clinical Indication & Investigation Guidance *
                </label>
                <textarea
                  rows={3}
                  required
                  value={labOrderIndication}
                  onChange={(e) => setLabOrderIndication(e.target.value)}
                  placeholder="e.g. As an Orthopedic surgeon, ordering MRI Scan & CT Scan to rule out ligamentous rupture / joint space narrowing. / As a Neurologist, ordering Brain MRI for persistent unilateral headache."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-[11px] text-teal-950 leading-relaxed">
                ✨ <strong>Free Follow-Up Guarantee:</strong> Once this diagnostic order is completed by the laboratory, you will be able to book the patient's next review consultation for <strong>FREE ($0 Fee)</strong>.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLabOrderModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={labOrderSubmitting || labOrderSelectedTests.length === 0}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>{labOrderSubmitting ? 'Ordering...' : 'Prescribe Lab Tests'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BOOK 100% FREE FOLLOW-UP APPOINTMENT ($0 FEE) */}
      {/* ========================================================================= */}
      {isFreeFollowUpModalOpen && selectedOrderForFollowUp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-2xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Book FREE Follow-Up Appointment ($0 Fee)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Post-investigation consultation fee is 100% waived
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFreeFollowUpModalOpen(false);
                  setSelectedOrderForFollowUp(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookFreeFollowUpSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-emerald-950">
                <div className="flex items-center justify-between">
                  <strong className="text-sm font-black">{selectedOrderForFollowUp.patientName}</strong>
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[10px]">
                    100% FREE CONSULTATION
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Investigations Completed: <strong>{selectedOrderForFollowUp.testNames.join(', ')}</strong>
                </p>
                {selectedOrderForFollowUp.reportNotes && (
                  <p className="text-[11px] text-slate-600 italic mt-1">
                    Lab Findings: "{selectedOrderForFollowUp.reportNotes}"
                  </p>
                )}
              </div>

              {/* Date & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Follow-Up Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={freeFollowUpDate}
                    onChange={(e) => setFreeFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Follow-Up Time Slot *
                  </label>
                  <select
                    required
                    value={freeFollowUpSlot}
                    onChange={(e) => setFreeFollowUpSlot(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Follow-Up Review Notes
                </label>
                <textarea
                  rows={2}
                  value={freeFollowUpNotes}
                  onChange={(e) => setFreeFollowUpNotes(e.target.value)}
                  placeholder="e.g. Free follow-up consultation to discuss MRI/CT scan imaging findings and determine therapy."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsFreeFollowUpModalOpen(false);
                    setSelectedOrderForFollowUp(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={freeFollowUpSubmitting}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>{freeFollowUpSubmitting ? 'Booking Free Follow-Up...' : 'Confirm Free Follow-Up ($0 Fee)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MARK LAB TEST COMPLETE WITH REPORT FINDINGS */}
      {/* ========================================================================= */}
      {completingOrderId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Mark Diagnostic Investigation Completed
              </h3>
              <button
                type="button"
                onClick={() => setCompletingOrderId(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-slate-700 font-bold">
                Diagnostic Findings / Report Notes:
              </label>
              <textarea
                rows={3}
                value={completingOrderReportNotes}
                onChange={(e) => setCompletingOrderReportNotes(e.target.value)}
                placeholder="e.g. MRI Brain shows no acute intracranial hemorrhage. Normal ventricles. / CT Chest shows clear lung fields."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Once marked completed, you will be able to book the patient's next consultation for <strong>free ($0 Fee)</strong>.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCompletingOrderId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCompleteLabOrderSubmit(completingOrderId)}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold cursor-pointer"
              >
                Save & Mark Completed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
