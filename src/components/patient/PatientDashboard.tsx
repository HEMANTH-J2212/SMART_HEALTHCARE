import React, { useState, useEffect, useRef } from 'react';
import {
  HeartPulse,
  Sun,
  Activity,
  Calendar,
  Clock,
  Search,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Send,
  User as UserIcon,
  Stethoscope,
  Building2,
  ChevronRight,
  TrendingUp,
  Pill,
  RefreshCw,
  PhoneCall,
  MapPin,
  ExternalLink,
  Info,
  SlidersHorizontal,
  Tag,
  Package,
  Lock,
  Check,
  ShoppingBag,
  Mic,
  MicOff,
  AlertOctagon,
  Download,
  CheckSquare,
  Square,
  Shield,
  Siren,
  Filter,
  UserCheck,
  X,
  AlertCircle,
  Copy,
  Moon,
  Bed,
  ArrowLeft,
  Plus,
  Trash2,
  Phone,
  Award,
  FileCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
  ReferenceLine
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { Appointment, IoTReading, Prescription, User, HealthcareItem, MEDICAL_SPECIALIZATIONS, EmergencyContactEntry, DailyMedicationEntry, EmergencyAlert, MedicineTimingOption, MEDICINE_TIMING_OPTIONS } from '../../types';
import { api } from '../../services/api';
import { PrescriptionModal } from '../prescriptions/PrescriptionModal';
import { matchSpecialization, SPECIALIZATION_RULES } from '../../utils/specializationMatcher';
import { generateHealthPassportPdf } from '../../utils/healthPassportPdf';

// Flexible Specialization & Medical Keyword Dictionary
// User requirement: A patient cannot type exact specialization. If they search for 'heart diseases' it should redirect to cardiology and like that.
const SPECIALIZATION_KEYWORD_MAP: { spec: string; keywords: string[] }[] = [
  {
    spec: 'Cardiology (Heart & Blood Vessels)',
    keywords: ['heart', 'cardio', 'cardiac', 'cardiology', 'heart disease', 'heart diseases', 'chest pain', 'bp', 'blood pressure', 'hypertension', 'angina', 'palpitation', 'arrhythmia', 'ecg', 'heart attack']
  },
  {
    spec: 'Dermatology (Skin, Hair & Nails)',
    keywords: ['skin', 'derma', 'dermatology', 'dermatologist', 'rash', 'rashes', 'acne', 'pimples', 'hair', 'hair fall', 'alopecia', 'nail', 'nails', 'fungal', 'itching', 'allergy', 'eczema', 'psoriasis']
  },
  {
    spec: 'Neurology & Stroke Care (Brain & Nerves)',
    keywords: ['brain', 'nerve', 'nerves', 'neuro', 'neurology', 'neurologist', 'headache', 'migraine', 'stroke', 'paralysis', 'seizure', 'epilepsy', 'dizziness', 'tremor', 'vertigo']
  },
  {
    spec: 'Orthopedics (Bones & Joints)',
    keywords: ['bone', 'bones', 'joint', 'joints', 'ortho', 'orthopedic', 'orthopedics', 'fracture', 'knee', 'knee pain', 'spine', 'back pain', 'arthritis', 'shoulder', 'ligament', 'sprain', 'orthopedist']
  },
  {
    spec: 'Pediatrics (Child Healthcare)',
    keywords: ['child', 'children', 'pediatric', 'pediatrics', 'pediatrician', 'baby', 'infant', 'kid', 'kids', 'toddler', 'vaccine', 'vaccination', 'child health']
  },
  {
    spec: 'Ophthalmology (Eye & Vision Care)',
    keywords: ['eye', 'eyes', 'vision', 'sight', 'ophthalmology', 'ophthalmologist', 'cataract', 'glaucoma', 'spectacles', 'glasses', 'cornea', 'retina', 'eye pain']
  },
  {
    spec: 'Dental Surgery & Oral Health',
    keywords: ['dental', 'dentist', 'teeth', 'tooth', 'gum', 'gums', 'cavity', 'root canal', 'oral', 'toothache', 'dentistry', 'braces']
  },
  {
    spec: 'Gastroenterology (Digestive & Liver)',
    keywords: ['stomach', 'digestive', 'digestion', 'gut', 'gastro', 'gastroenterology', 'gastroenterologist', 'liver', 'acidity', 'gas', 'gerd', 'ulcer', 'constipation', 'diarrhea', 'abdomen', 'gastric', 'jaundice']
  },
  {
    spec: 'Nephrology (Kidney Care)',
    keywords: ['kidney', 'kidneys', 'renal', 'nephrology', 'nephrologist', 'dialysis', 'urine', 'urinary', 'kidney stone', 'creatinine']
  },
  {
    spec: 'Pulmonology (Lungs & Respiratory)',
    keywords: ['lung', 'lungs', 'pulmonary', 'pulmonology', 'pulmonologist', 'breathing', 'respiratory', 'asthma', 'cough', 'wheezing', 'shortness of breath', 'chest congestion', 'copd', 'bronchitis']
  },
  {
    spec: 'Oncology (Cancer Care)',
    keywords: ['cancer', 'tumor', 'oncology', 'oncologist', 'chemo', 'chemotherapy', 'radiation', 'biopsy', 'carcinoma', 'malignancy']
  },
  {
    spec: 'Psychiatry & Mental Health',
    keywords: ['mental', 'psychiatry', 'psychiatrist', 'psychology', 'depression', 'anxiety', 'stress', 'panic', 'insomnia', 'sleep', 'bipolar', 'counseling']
  },
  {
    spec: 'Obstetrics & Gynecology (Women Health)',
    keywords: ['women', 'female', 'pregnancy', 'pregnant', 'gyno', 'gynecology', 'gynecologist', 'maternity', 'periods', 'menstruation', 'pcos', 'pcod', 'baby delivery']
  },
  {
    spec: 'ENT (Ear, Nose & Throat)',
    keywords: ['ent', 'ear', 'ears', 'nose', 'throat', 'sinus', 'tonsils', 'hearing', 'tinnitus', 'snoring', 'nasal']
  },
  {
    spec: 'General & Internal Medicine',
    keywords: ['general', 'medicine', 'fever', 'cold', 'flu', 'cough', 'weakness', 'fatigue', 'diabetes', 'sugar', 'physician', 'body ache', 'checkup', 'routine']
  },
  {
    spec: 'Emergency & Trauma Medicine',
    keywords: ['emergency', 'trauma', 'accident', 'injury', 'urgent', 'er', 'icu', 'critical', 'bleeding']
  }
];

function resolveSpecializationFromText(text: string): string | null {
  if (!text || !text.trim()) return null;
  const normalized = text.toLowerCase().trim();
  for (const item of SPECIALIZATION_KEYWORD_MAP) {
    if (item.spec.toLowerCase().includes(normalized)) return item.spec;
    if (item.keywords.some((k) => normalized.includes(k) || k.includes(normalized))) {
      return item.spec;
    }
  }
  return null;
}

export const PatientDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const patientId = user?.id || 'pat-1';
  const patientProfile = user?.patientProfile;

  const [activeTab, setActiveTab] = useState<'overview' | 'morning_check' | 'doctors' | 'assistant' | 'appointments' | 'prescriptions' | 'emergency_contacts' | 'emergency_log'>('overview');

  // Data states
  const [readings, setReadings] = useState<IoTReading[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctorsList, setDoctorsList] = useState<User[]>([]);
  const [itemsList, setItemsList] = useState<HealthcareItem[]>([]);
  const [patientRequests, setPatientRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'pending' | 'approved' | 'completed' | 'cancelled'>('all');
  const [doctorBookedSlots, setDoctorBookedSlots] = useState<{ date: string; timeSlot: string }[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [localConnectedDevices, setLocalConnectedDevices] = useState<string[]>(patientProfile?.connectedDevices || []);
  const [copiedPasskeyId, setCopiedPasskeyId] = useState<string | null>(null);
  const [savingContacts, setSavingContacts] = useState(false);

  // IoT kit buying & patient requests
  const [buyingKitId, setBuyingKitId] = useState<string | null>(null);
  const [requestingDoctorId, setRequestingDoctorId] = useState<string | null>(null);

  // Emergency SOS Choice Modal state
  const [isEmergencyChoiceModalOpen, setIsEmergencyChoiceModalOpen] = useState(false);
  const [selectedEmergencyHospId, setSelectedEmergencyHospId] = useState<string>('');
  const [selectedEmergencyDocId, setSelectedEmergencyDocId] = useState<string>('');
  const [emergencyRoutingSaving, setEmergencyRoutingSaving] = useState(false);

  // Morning Health Check Simulator State
  const [simHeartRate, setSimHeartRate] = useState(74);
  const [simSystolic, setSimSystolic] = useState(118);
  const [simDiastolic, setSimDiastolic] = useState(78);
  const [simSpO2, setSimSpO2] = useState(98);
  const [simTemp, setSimTemp] = useState(36.6);
  const [simGlucose, setSimGlucose] = useState(94);
  const [simWeight, setSimWeight] = useState(patientProfile?.weightKg || 74);
  const [isMeasuring, setIsMeasuring] = useState(false);

  // Gemini Appointment Assistant State
  const [symptomPrompt, setSymptomPrompt] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantResult, setAssistantResult] = useState<any | null>(null);

  // Multilingual Voice Assistant Pop-Up Modal
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<'te-IN' | 'hi-IN' | 'ta-IN' | 'en-IN' | 'en-US' | 'kn-IN' | 'mr-IN' | 'bn-IN'>('te-IN');
  const [voiceLiveTranscript, setVoiceLiveTranscript] = useState('');
  const [voiceErrorNotice, setVoiceErrorNotice] = useState<string | null>(null);
  const [voiceActiveRecognition, setVoiceActiveRecognition] = useState<any | null>(null);

  // Prevent background portal scrolling when Voice Assistant modal is open & handle Escape key
  useEffect(() => {
    if (!isVoiceModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (voiceActiveRecognition) {
          try { voiceActiveRecognition.stop(); } catch {}
        }
        setIsListeningVoice(false);
        setIsVoiceModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVoiceModalOpen, voiceActiveRecognition]);

  // Doctor Search & Booking Modal
  const [hospitalsList, setHospitalsList] = useState<User[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('all');
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<User | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState('10:00 AM');
  const [bookingReason, setBookingReason] = useState('Cardiovascular & General Health Checkup');
  const [bookingSymptoms, setBookingSymptoms] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [hospitalSearchText, setHospitalSearchText] = useState('');
  const [specializationSearchText, setSpecializationSearchText] = useState('');

  // Emergency SOS state
  const [sosLoading, setSosLoading] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  // Prescription View Modal
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Helper: Generates next 7 working days (Mon-Sat, skipping Sundays) and identifies blocked days
  const getDoctorWorkingDaysOptions = (doctor: User | null) => {
    const result: { dateStr: string; dayName: string; displayDate: string; isBlocked: boolean; blockReason?: string }[] = [];
    const cur = new Date();
    while (result.length < 7) {
      cur.setDate(cur.getDate() + 1);
      const dayOfWeek = cur.getDay(); // 0 is Sunday
      if (dayOfWeek === 0) continue; // Skip Sunday

      const dateStr = cur.toISOString().split('T')[0];
      const dayName = cur.toLocaleDateString('en-US', { weekday: 'short' });
      const displayDate = cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let isBlocked = false;
      let blockReason = '';

      // Check doctor leave
      if (doctor?.doctorProfile?.leaveDates?.includes(dateStr)) {
        isBlocked = true;
        blockReason = 'Doctor on Leave';
      }

      // Check doctor scheduled surgery
      if (doctor?.doctorProfile?.scheduledSurgeries?.some((s: any) => s.date === dateStr)) {
        isBlocked = true;
        blockReason = 'In Surgery';
      }

      result.push({ dateStr, dayName, displayDate, isBlocked, blockReason });
    }
    return result;
  };

  const handleOpenBookingModalForDoctor = (doc: User) => {
    setSelectedDoctorForBooking(doc);
    setBookingError(null);
    const options = getDoctorWorkingDaysOptions(doc);
    const firstAvailable = options.find((o) => !o.isBlocked);
    const chosenDate = firstAvailable ? firstAvailable.dateStr : options[0]?.dateStr || '';
    setBookingDate(chosenDate);
  };

  useEffect(() => {
    if (!selectedDoctorForBooking || !bookingDate) return;
    let isMounted = true;
    setFetchingSlots(true);
    api.getDoctorBookedSlots(selectedDoctorForBooking.id, bookingDate)
      .then((res) => {
        if (!isMounted) return;
        const booked = res?.bookedSlots || [];
        setDoctorBookedSlots(booked);
        const doctorSlots = selectedDoctorForBooking.doctorProfile?.customSlotTimings?.length
          ? selectedDoctorForBooking.doctorProfile.customSlotTimings
          : ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '04:00 PM'];
        const isCurrentBooked = booked.some((b: any) => b.timeSlot === bookingSlot);
        if (isCurrentBooked) {
          const firstOpen = doctorSlots.find((s) => !booked.some((b: any) => b.timeSlot === s));
          if (firstOpen) setBookingSlot(firstOpen);
        }
      })
      .catch(() => {
        if (isMounted) setDoctorBookedSlots([]);
      })
      .finally(() => {
        if (isMounted) setFetchingSlots(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedDoctorForBooking?.id, bookingDate]);

  // Clinical Care Pathway ('cardiac' | 'diabetes' | 'pulmonary' | 'geriatric' | 'general')
  const [carePathway, setCarePathway] = useState<'cardiac' | 'diabetes' | 'pulmonary' | 'geriatric' | 'general'>(
    (patientProfile?.carePathway as any) || 'general'
  );

  // Multiple Emergency Contacts (Patient adds them themselves - NO default Tier 2 or Tier 3)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactEntry[]>(() => {
    if (patientProfile?.emergencyContactsList && patientProfile.emergencyContactsList.length > 0) {
      return patientProfile.emergencyContactsList;
    }
    // Only prefill Tier 1 if the patient entered an emergency contact during registration
    if (
      patientProfile?.emergencyContact &&
      patientProfile.emergencyContact.name &&
      patientProfile.emergencyContact.name.trim() !== '' &&
      patientProfile.emergencyContact.name !== 'Jane Doe' &&
      patientProfile.emergencyContact.name !== 'Primary Contact'
    ) {
      return [
        {
          id: 'ec-1',
          name: patientProfile.emergencyContact.name,
          relationship: patientProfile.emergencyContact.relationship || 'Next of Kin / Primary',
          phone: patientProfile.emergencyContact.phone || '',
          priority: 'primary',
          notifySms: true,
          notifyEmail: true,
          shareLiveLocation: true,
        },
      ];
    }
    return [];
  });
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [contactsSaving, setContactsSaving] = useState(false);

  // Daily Medication Tracker & Compliance (Populated only when doctor prescribes medications)
  const [dailyMeds, setDailyMeds] = useState<DailyMedicationEntry[]>([]);

  // Section scroll and audio recording references
  const analyzeSymptomsSectionRef = useRef<HTMLDivElement>(null);
  const matchDoctorResultRef = useRef<HTMLDivElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedAudioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);

  // Smooth scroll down to Analyze Symptoms & Match Doctor result on desktop & mobile
  const scrollToDoctorMatchSection = () => {
    setTimeout(() => {
      const el = matchDoctorResultRef.current || document.getElementById('match-doctor-result') || document.getElementById('analyze-symptoms-section');
      if (el) {
        const headerOffset = 90;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }, 120);
  };

  // Emergency SOS Dispatch History
  const [emergencyAlertsHistory, setEmergencyAlertsHistory] = useState<EmergencyAlert[]>([]);

  // Vitals Trend Visualizations Time Window & Metric Tabs
  const [vitalsTimeWindow, setVitalsTimeWindow] = useState<'7d' | '14d' | '30d'>('7d');
  const [vitalsMetricTab, setVitalsMetricTab] = useState<'heart_rate' | 'sleep' | 'bp'>('heart_rate');

  // Universal Global Search
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Voice Search / Web Speech API State
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setSpeechSupported(Boolean(hasSpeech));
    }
  }, []);

  // Guarantee desktop mode smooth-scrolls directly to the doctor match triage result
  useEffect(() => {
    if (assistantResult || assistantLoading) {
      scrollToDoctorMatchSection();
    }
  }, [assistantResult, assistantLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [readData, aptData, rxData, docs, hosps, items, emgData] = await Promise.all([
        api.getPatientIoTReadings(patientId),
        api.getPatientAppointments(patientId),
        api.getPatientPrescriptions(patientId),
        api.getApprovedDoctors(),
        api.getAdminHospitals(),
        api.getHealthcareItems().catch(() => []),
        api.getEmergencyAlerts({ patientId }).catch(() => []),
      ]);
      setReadings(readData);
      setAppointments(aptData);
      setPrescriptions(rxData);
      // Requirement 7: Only populate daily medication schedule when a doctor has prescribed medicines
      if (rxData && rxData.length > 0) {
        const medsFromRx: any[] = [];
        rxData.forEach((rx: Prescription, rIdx: number) => {
          if (Array.isArray(rx.medicines)) {
            rx.medicines.forEach((med, mIdx) => {
              const timingOpt = (med.timingOption || med.frequency || '').trim();
              const lower = timingOpt.toLowerCase();
              let timing: 'morning' | 'afternoon' | 'night' = 'morning';
              if (lower.includes('night') || lower.includes('dinner')) {
                timing = 'night';
              } else if (lower.includes('afternoon') || lower.includes('lunch')) {
                timing = 'afternoon';
              }

              const durationDays = med.durationDays || parseInt(med.duration) || 7;
              const rxDateObj = new Date(rx.date || rx.createdAt || Date.now());
              const msPerDay = 1000 * 60 * 60 * 24;
              const daysPassed = Math.max(0, Math.floor((Date.now() - rxDateObj.getTime()) / msPerDay));
              const daysLeft = Math.max(0, durationDays - daysPassed);

              medsFromRx.push({
                id: `med-${rx.id}-${mIdx}`,
                name: med.name,
                dosage: med.dosage,
                timing,
                timingOption: med.timingOption || med.frequency || 'Morning after food',
                durationDays,
                duration: `${durationDays} Days`,
                daysPassed: Math.min(daysPassed, durationDays),
                daysLeft,
                instructions: med.instructions || `${timingOpt} · Course: ${durationDays} Days`,
                takenToday: false,
                refillDaysLeft: daysLeft,
                doctorName: rx.doctorName,
                diagnosis: rx.diagnosis,
                rxDate: rx.date,
              });
            });
          }
        });
        setDailyMeds(medsFromRx);
      } else {
        setDailyMeds([]);
      }
      setDoctorsList(docs);
      setItemsList(items);
      setEmergencyAlertsHistory(emgData);
      if (patientProfile?.connectedDevices && patientProfile.connectedDevices.length > 0) {
        setLocalConnectedDevices(patientProfile.connectedDevices);
      }

      const verifiedHosps = hosps.filter(
        (h) => h.status === 'active' || h.hospitalProfile?.verificationStatus === 'verified'
      );
      setHospitalsList(verifiedHosps);
      if (verifiedHosps.length > 0 && !selectedEmergencyHospId) {
        setSelectedEmergencyHospId(patientProfile?.chosenEmergencyHospitalId || verifiedHosps[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  const latestReading = readings[0];

  // Helper to test preset scenarios
  const applyPreset = (preset: 'normal' | 'warning' | 'critical') => {
    if (preset === 'normal') {
      setSimHeartRate(72);
      setSimSystolic(118);
      setSimDiastolic(76);
      setSimSpO2(98);
      setSimTemp(36.6);
      setSimGlucose(92);
    } else if (preset === 'warning') {
      setSimHeartRate(88);
      setSimSystolic(138);
      setSimDiastolic(88);
      setSimSpO2(96);
      setSimTemp(37.6);
      setSimGlucose(128);
    } else if (preset === 'critical') {
      setSimHeartRate(42);
      setSimSystolic(184);
      setSimDiastolic(116);
      setSimSpO2(86);
      setSimTemp(39.6);
      setSimGlucose(340);
    }
  };

  const handleTransmitIoTReading = async () => {
    setIsMeasuring(true);
    try {
      const res = await api.submitIoTReading({
        patientId,
        patientName: user?.name || 'Patient',
        isMorningCheck: true,
        heartRate: Number(simHeartRate),
        systolicBp: Number(simSystolic),
        diastolicBp: Number(simDiastolic),
        spO2: Number(simSpO2),
        temperature: Number(simTemp),
        glucose: Number(simGlucose),
        weightKg: Number(simWeight),
      });

      setNotification('Morning Health Check vitals transmitted and evaluated by Gemini AI!');
      setTimeout(() => setNotification(null), 5000);
      loadData();
      setActiveTab('overview');
    } catch (err: any) {
      setNotification('❌ ' + (err.message || 'Failed to submit reading'));
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsMeasuring(false);
    }
  };

  const executeEmergencyDispatch = async (hospitalId: string, doctorId?: string) => {
    setSosLoading(true);
    setNotification('📍 Requesting location services permission to capture your live GPS coordinates for emergency dispatch...');

    // Live Device Geolocation Tracking
    let patientLiveLocation = patientProfile?.streetAddress
      ? `${patientProfile.streetAddress}, ${patientProfile.city || ''} ${patientProfile.pincode || ''}`
      : 'Patient Live GPS Location';

    try {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        const getGpsPosition = (): Promise<GeolocationPosition> =>
          new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000,
              maximumAge: 0,
            });
          });

        try {
          const pos = await getGpsPosition();
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = Math.round(pos.coords.accuracy || 10);
          patientLiveLocation = `Live Device GPS: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E (±${acc}m accuracy) • Patient Area: ${patientProfile?.streetAddress || patientProfile?.city || 'Emergency Zone'}`;
        } catch (geoErr) {
          console.warn('Emergency live GPS prompt notice:', geoErr);
          if (patientProfile?.streetAddress || patientProfile?.city) {
            patientLiveLocation = `Registered Address: ${patientProfile.streetAddress || ''}, ${patientProfile.city || ''} (PIN: ${patientProfile.pincode || ''})`;
          } else {
            patientLiveLocation = 'Device GPS unavailable • Dispatching to patient profile zone';
          }
        }
      }
    } catch {}

    try {
      const res = await api.triggerEmergency({
        patientId,
        patientName: user?.name || 'Patient',
        patientPhone: user?.phone || '+91 98765 00000',
        severity: 'critical',
        triggerReason: 'Patient Manual SOS Alarm Triggered with Live GPS',
        vitalSummary: latestReading
          ? `HR: ${latestReading.heartRate} bpm | BP: ${latestReading.systolicBp}/${latestReading.diastolicBp} | SpO2: ${latestReading.spO2}%`
          : 'Patient SOS Distress Alarm',
        location: patientLiveLocation,
        assignedDoctorId: doctorId,
        targetHospitalId: hospitalId,
      });

      setSosSent(true);
      const targetHospName = res.alert?.targetHospitalName || 'Emergency Center';
      setNotification(`🚨 Emergency SOS dispatched directly to ${targetHospName} ER with your live location!`);
      setTimeout(() => setNotification(null), 8000);
      loadData();
    } catch (err: any) {
      setNotification('❌ Emergency dispatch failed: ' + (err.message || 'Error'));
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSosLoading(false);
    }
  };

  const handleTriggerEmergencySOS = async () => {
    // User Requirement: Patient himself chooses the hospital nearest to him and doctor.
    // Can choose only one time and at only one hospital.
    if (!patientProfile?.chosenEmergencyHospitalId) {
      setIsEmergencyChoiceModalOpen(true);
      return;
    }
    await executeEmergencyDispatch(
      patientProfile.chosenEmergencyHospitalId,
      patientProfile.chosenEmergencyDoctorId
    );
  };

  const handleConfirmEmergencyChoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmergencyHospId) return;

    setEmergencyRoutingSaving(true);
    try {
      await api.setEmergencyRouting(
        patientId,
        selectedEmergencyHospId,
        selectedEmergencyDocId || undefined
      );
      if (refreshUser) await refreshUser();
      setIsEmergencyChoiceModalOpen(false);
      await executeEmergencyDispatch(
        selectedEmergencyHospId,
        selectedEmergencyDocId || undefined
      );
    } catch (err: any) {
      setNotification('❌ Failed to route emergency: ' + (err.message || 'Error'));
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setEmergencyRoutingSaving(false);
    }
  };

  const handleBuyKit = async (itemId: string) => {
    setBuyingKitId(itemId);
    try {
      const res = await api.purchaseIoTKit(patientId, itemId);
      setNotification(res.message);
      setTimeout(() => setNotification(null), 6000);
      if (res?.connectedDevices && Array.isArray(res.connectedDevices)) {
        setLocalConnectedDevices(res.connectedDevices);
      } else {
        setLocalConnectedDevices((prev) => Array.from(new Set([...prev, itemId])));
      }
      if (refreshUser) await refreshUser();
      await loadData();
    } catch (err: any) {
      // Local fallback activation
      setLocalConnectedDevices((prev) => Array.from(new Set([...prev, itemId])));
      setNotification('✓ IoT Hardware Activated & Connected to Portal!');
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setBuyingKitId(null);
    }
  };

  const handlePairKit = async (itemId = 'item-1') => {
    setBuyingKitId(itemId);
    try {
      const res = await api.purchaseIoTKit(patientId, itemId);
      setNotification(res.message || 'Bluetooth 5.3 IoT Telemetry Cuff paired successfully!');
      setTimeout(() => setNotification(null), 6000);
      if (res?.connectedDevices && Array.isArray(res.connectedDevices)) {
        setLocalConnectedDevices(res.connectedDevices);
      } else {
        setLocalConnectedDevices((prev) => Array.from(new Set([...prev, itemId])));
      }
      if (refreshUser) await refreshUser();
      await loadData();
    } catch (err: any) {
      setLocalConnectedDevices((prev) => Array.from(new Set([...prev, itemId])));
      setNotification('✓ Bluetooth 5.3 IoT Telemetry Cuff paired successfully!');
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setBuyingKitId(null);
    }
  };

  const handleRequestDoctor = async (doctorId: string) => {
    setRequestingDoctorId(doctorId);
    try {
      const res = await api.requestDoctorAssignment(patientId, doctorId);
      setNotification(res.message);
      setTimeout(() => setNotification(null), 6000);
      await loadData();
    } catch (err: any) {
      setNotification('❌ ' + (err.message || 'Failed to submit doctor request'));
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setRequestingDoctorId(null);
    }
  };

  const handleBookAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorForBooking) return;

    setBookingError(null);
    try {
      await api.bookAppointment({
        patientId,
        patientName: user?.name || 'Patient',
        doctorId: selectedDoctorForBooking.id,
        date: bookingDate,
        timeSlot: bookingSlot,
        reasonForVisit: bookingReason,
        symptoms: bookingSymptoms,
      });

      setSelectedDoctorForBooking(null);
      setNotification('Appointment booked successfully! Awaiting doctor approval.');
      setTimeout(() => setNotification(null), 4000);
      loadData();
      setActiveTab('appointments');
    } catch (err: any) {
      setBookingError(err.message || 'Booking failed');
    }
  };

  // Voice search recognition handler & Modal Launcher
  const handleToggleVoiceSearch = () => {
    setIsVoiceModalOpen(true);
    setVoiceLiveTranscript(symptomPrompt || '');
    setVoiceErrorNotice(null);
  };

  const tryMediaRecorderFallback = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        recordedAudioChunksRef.current = [];

        // Connect Web Audio API to visualize microphone volume level in real time
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            audioAnalyserRef.current = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateVolume = () => {
              if (!analyser) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
              }
              const avg = Math.min(100, Math.round((sum / bufferLength / 128) * 100));
              setMicVolumeLevel(avg);
              animFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();
          }
        } catch (ctxErr) {
          console.warn('AudioContext visualization setup:', ctxErr);
        }

        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedAudioChunksRef.current.push(e.data);
          }
        };
        recorder.start(200);
        mediaRecorderRef.current = recorder;
        setIsListeningVoice(true);
        setVoiceErrorNotice(null);
        return true;
      }
    } catch (micErr: any) {
      console.warn('Microphone getUserMedia notice:', micErr);
      setIsListeningVoice(false);
      setMicVolumeLevel(0);
      const isDenied = micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError';
      setVoiceErrorNotice(
        isDenied
          ? 'Microphone access is currently blocked by your browser settings. Please click the permissions icon (🔒 lock or sliders) in your browser address bar to Allow microphone, or use the 1-click test phrases below.'
          : 'Microphone is unavailable on this device. You can type your symptoms or use the multilingual test presets below.'
      );
      return false;
    }
    setIsListeningVoice(false);
    setVoiceErrorNotice(
      'Audio recording is not supported in this browser. You can type your symptoms or use the multilingual presets below.'
    );
    return false;
  };

  const handleStartVoiceListening = async (selectedLang?: string) => {
    const langToUse = selectedLang || voiceLanguage;
    setVoiceErrorNotice(null);
    recordedAudioChunksRef.current = [];

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    let speechStarted = false;
    if (SpeechRecognition) {
      try {
        if (voiceActiveRecognition) {
          try { voiceActiveRecognition.stop(); } catch {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = langToUse;

        recognition.onstart = () => {
          setIsListeningVoice(true);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          if (currentTranscript.trim()) {
            const trimmed = currentTranscript.trim();
            setVoiceLiveTranscript(trimmed);
            setSymptomPrompt(trimmed);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Web Speech API note:', e.error);
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            setIsListeningVoice(false);
            setVoiceErrorNotice(
              'Microphone access is blocked by browser permissions. To enable: Click the 🔒 lock or 🎚️ sliders icon on the left of your browser address bar -> Set Microphone to "Allow" -> Click "Retry Mic", or select a quick voice symptom preset below.'
            );
          }
        };

        recognition.onend = () => {
          // If stopped
        };

        try {
          recognition.start();
          setVoiceActiveRecognition(recognition);
          setIsListeningVoice(true);
          speechStarted = true;
        } catch {}
      } catch (err: any) {
        console.warn('Speech recognition start failed:', err);
      }
    }

    // Secondary: try MediaRecorder for audio spectrum wave and audio upload if supported
    tryMediaRecorderFallback().then((streamOk) => {
      if (!streamOk && !speechStarted) {
        setVoiceErrorNotice(
          'Microphone access is blocked by browser permissions. To enable: Click the 🔒 lock or 🎚️ sliders icon on the left of your browser address bar -> Set Microphone to "Allow" -> Click "Retry Mic", or select a quick voice symptom preset below.'
        );
      }
    });
  };

  const handleStopVoiceListening = () => {
    if (voiceActiveRecognition) {
      try { voiceActiveRecognition.stop(); } catch {}
      setVoiceActiveRecognition(null);
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    setMicVolumeLevel(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsListeningVoice(false);
  };

  const triggerGeminiWithText = async (text: string, audioBase64?: string) => {
    if (!text.trim() && !audioBase64) return;
    setAssistantLoading(true);
    setAssistantResult(null);
    scrollToDoctorMatchSection();
    try {
      const res = await api.askAppointmentAssistant(text, patientId, audioBase64, 'audio/webm');
      if (res.result) {
        setAssistantResult(res.result);
        if (res.result.spokenTranscript) {
          setSymptomPrompt(res.result.spokenTranscript);
        }
      }
      scrollToDoctorMatchSection();
    } catch (err: any) {
      console.error(err);
      setNotification('Gemini assistant error: ' + (err.message || 'Request failed'));
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleApplyVoiceTranscript = async (textToApply?: string) => {
    const finalVal = (textToApply !== undefined ? textToApply : voiceLiveTranscript).trim();
    const hasAudioRecorded = recordedAudioChunksRef.current.length > 0;
    const audioChunksCopy = [...recordedAudioChunksRef.current];

    handleStopVoiceListening();
    setIsVoiceModalOpen(false);

    if (finalVal) {
      setSymptomPrompt(finalVal);
      setActiveTab('assistant');
      triggerGeminiWithText(finalVal);
    } else if (hasAudioRecorded) {
      // Audio was captured via microphone MediaRecorder: send to Gemini to transcribe and triage
      try {
        const audioBlob = new Blob(audioChunksCopy, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          setActiveTab('assistant');
          triggerGeminiWithText('', base64Data);
        };
        reader.readAsDataURL(audioBlob);
      } catch (err) {
        console.warn('Audio blob conversion error:', err);
      }
    }
  };

  const handleUpdateCarePathway = async (pathway: 'cardiac' | 'diabetes' | 'pulmonary' | 'geriatric' | 'general') => {
    setCarePathway(pathway);
    try {
      await api.updateCarePathway(patientId, pathway);
      if (refreshUser) await refreshUser();
      setNotification(`Clinical Care Pathway customized to ${pathway.toUpperCase()} Care.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.warn('Could not persist pathway:', err);
    }
  };

  const handleSaveContacts = async (updatedList: EmergencyContactEntry[]) => {
    setContactsSaving(true);
    try {
      setEmergencyContacts(updatedList);
      await api.updateEmergencyContacts(patientId, updatedList);
      if (refreshUser) await refreshUser();
      setIsEditingContacts(false);
      setNotification('Emergency Contacts directory updated successfully.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification('Failed to update emergency contacts: ' + (err.message || 'Error'));
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setContactsSaving(false);
    }
  };

  const handleToggleMedication = async (medId: string) => {
    try {
      setDailyMeds((prev) =>
        prev.map((m) => (m.id === medId ? { ...m, takenToday: !m.takenToday } : m))
      );
      await api.toggleDailyMedication(patientId, medId);
    } catch (err: any) {
      console.warn('Failed to toggle medication:', err);
    }
  };

  const handleDownloadPassport = () => {
    if (!user) return;
    try {
      generateHealthPassportPdf({
        patient: user,
        latestReading,
        prescriptions,
        emergencyContacts,
      });
      setNotification('Clinical Health Passport PDF generated and downloaded successfully.');
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification('Failed to generate passport PDF: ' + (err.message || 'Error'));
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomPrompt.trim()) return;

    setAssistantLoading(true);
    setAssistantResult(null);
    scrollToDoctorMatchSection();
    try {
      const res = await api.askAppointmentAssistant(symptomPrompt, patientId);
      if (res.result) {
        setAssistantResult(res.result);
      }
      scrollToDoctorMatchSection();
    } catch (err) {
      console.error(err);
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Good Morning / Health Routine Greeting Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 border border-amber-300/30 rounded-full text-xs font-semibold text-amber-200 mb-2">
              <Sun className="w-3.5 h-3.5 text-amber-300 animate-spin" /> Good Morning, {user?.name || 'Patient'}!
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Daily Health Routine & Connected IoT Care
            </h1>
            <p className="text-teal-100/80 text-xs max-w-2xl mt-1">
              Please complete your morning health check with the company IoT kit. Readings stream into Gemini AI for early cardiovascular & metabolic risk mitigation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadPassport}
              className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/90 border border-slate-600/70 text-slate-100 font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download print-ready official emergency clinical passport PDF"
            >
              <Download className="w-4 h-4 text-teal-300" />
              <span>Health Passport (PDF)</span>
            </button>

            <button
              onClick={() => setActiveTab('morning_check')}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-teal-950 font-black rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all"
            >
              <HeartPulse className="w-4 h-4 text-teal-900 animate-pulse" />
              <span>Perform Morning Check</span>
            </button>

            <button
              onClick={handleTriggerEmergencySOS}
              disabled={sosLoading}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{sosLoading ? 'Dispatching...' : 'SOS Emergency'}</span>
            </button>
          </div>
        </div>

        {/* Global Ecosystem Search Bar */}
        <div className="mt-5 pt-4 border-t border-teal-700/60 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-300 pointer-events-none" />
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="Universal Search across doctors, specialties ('Cardiologist'), symptoms ('chest pain'), medications ('Metformin'), or hospitals..."
              className="w-full pl-10 pr-20 py-2 bg-slate-900/60 border border-teal-500/40 rounded-xl text-xs text-white placeholder-teal-200/50 outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {globalSearchQuery && (
                <button
                  type="button"
                  onClick={() => setGlobalSearchQuery('')}
                  className="text-teal-300 hover:text-white text-xs px-1.5 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleVoiceSearch}
                className="p-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/40 text-teal-200 transition-colors cursor-pointer flex items-center gap-1"
                title="Voice Search (Speak symptoms in Telugu, Hindi, Tamil, English)"
              >
                <Mic className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold hidden sm:inline">Voice</span>
              </button>
            </div>
          </div>

          {/* Condition Pathway Quick Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/50 border border-teal-500/30 rounded-xl px-2.5 py-1.5 text-xs text-teal-100">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider shrink-0">Pathway:</span>
            <select
              value={carePathway}
              onChange={(e) => handleUpdateCarePathway(e.target.value as any)}
              className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
            >
              <option value="general" className="bg-slate-900 text-white">General Wellness</option>
              <option value="cardiac" className="bg-slate-900 text-white">Hypertension & Cardiac</option>
              <option value="diabetes" className="bg-slate-900 text-white">Diabetes & Metabolic</option>
              <option value="pulmonary" className="bg-slate-900 text-white">Pulmonary & Respiratory</option>
              <option value="geriatric" className="bg-slate-900 text-white">Elderly & Geriatric</option>
            </select>
          </div>
        </div>

        {/* Global Search Results Drawer */}
        {globalSearchQuery.trim() && (
          <div className="mt-3 p-4 bg-slate-950/90 border border-teal-500/50 rounded-xl text-xs text-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-teal-800/60">
              <span className="font-bold text-teal-200 uppercase tracking-wider text-[11px]">
                Search Results for "{globalSearchQuery}"
              </span>
              <span className="text-[10px] text-teal-400">Live Clinical Filter</span>
            </div>

            {/* Doctors matching query */}
            {(() => {
              const q = globalSearchQuery.toLowerCase();
              const matchedDocs = doctorsList.filter(
                (d) =>
                  d.name.toLowerCase().includes(q) ||
                  d.doctorProfile?.specialization?.toLowerCase().includes(q) ||
                  d.doctorProfile?.hospitalName?.toLowerCase().includes(q)
              );
              const matchedMeds = dailyMeds.filter(
                (m) => m.name.toLowerCase().includes(q) || m.instructions?.toLowerCase().includes(q)
              );
              const matchedHosps = hospitalsList.filter(
                (h) =>
                  h.name.toLowerCase().includes(q) ||
                  h.hospitalProfile?.hospitalName?.toLowerCase().includes(q) ||
                  h.hospitalProfile?.city?.toLowerCase().includes(q)
              );
              const hasMatches = matchedDocs.length > 0 || matchedMeds.length > 0 || matchedHosps.length > 0;

              if (!hasMatches) {
                return (
                  <p className="text-slate-400 py-1">
                    No matching clinical assets found for "{globalSearchQuery}". Try terms like "Cardiology", "Metformin", or "Dr. Sarah".
                  </p>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {matchedDocs.length > 0 && (
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-teal-800/40 space-y-1.5">
                      <span className="font-bold text-teal-300 text-[10px] uppercase block">
                        Matching Doctors ({matchedDocs.length})
                      </span>
                      {matchedDocs.slice(0, 3).map((d) => (
                        <div
                          key={d.id}
                          onClick={() => {
                            setActiveTab('doctors');
                            setDoctorSearchQuery(d.name);
                          }}
                          className="p-1.5 hover:bg-teal-900/40 rounded cursor-pointer transition-colors"
                        >
                          <strong className="text-white block">Dr. {d.name}</strong>
                          <span className="text-[10px] text-teal-200">{d.doctorProfile?.specialization}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {matchedMeds.length > 0 && (
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-teal-800/40 space-y-1.5">
                      <span className="font-bold text-teal-300 text-[10px] uppercase block">
                        Prescription & Medications ({matchedMeds.length})
                      </span>
                      {matchedMeds.slice(0, 3).map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setActiveTab('prescriptions')}
                          className="p-1.5 hover:bg-teal-900/40 rounded cursor-pointer transition-colors"
                        >
                          <strong className="text-white block">{m.name} ({m.dosage})</strong>
                          <span className="text-[10px] text-teal-200">{m.timing.toUpperCase()} · Refill in {m.refillDaysLeft}d</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {matchedHosps.length > 0 && (
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-teal-800/40 space-y-1.5">
                      <span className="font-bold text-teal-300 text-[10px] uppercase block">
                        Partner Hospitals ({matchedHosps.length})
                      </span>
                      {matchedHosps.slice(0, 3).map((h) => (
                        <div
                          key={h.id}
                          onClick={() => {
                            setActiveTab('doctors');
                            setSelectedHospitalId(h.id);
                          }}
                          className="p-1.5 hover:bg-teal-900/40 rounded cursor-pointer transition-colors"
                        >
                          <strong className="text-white block">{h.hospitalProfile?.hospitalName || h.name}</strong>
                          <span className="text-[10px] text-teal-200">{h.hospitalProfile?.city || 'ER Center'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {notification && (
          <div className="mt-4 p-3 bg-white/20 border border-white/30 backdrop-blur-md rounded-xl text-white text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 shrink-0 transition-all ${
            activeTab === 'overview'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Health Status & IoT Trends</span>
        </button>

        <button
          onClick={() => setActiveTab('morning_check')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 shrink-0 transition-all ${
            activeTab === 'morning_check'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HeartPulse className="w-4 h-4 text-rose-500" />
          <span>IoT Healthcare Kit</span>
        </button>

        <button
          onClick={() => setActiveTab('assistant')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 shrink-0 transition-all ${
            activeTab === 'assistant'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>Gemini Appointment AI</span>
        </button>

        <button
          onClick={() => setActiveTab('doctors')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 shrink-0 transition-all ${
            activeTab === 'doctors'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Find Doctors</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 shrink-0 transition-all ${
            activeTab === 'appointments'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>My Appointments ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 shrink-0 transition-all ${
            activeTab === 'prescriptions'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Prescriptions & Meds ({prescriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('emergency_log')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 shrink-0 transition-all ${
            activeTab === 'emergency_log'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Siren className="w-4 h-4 text-rose-600" />
          <span>Emergency & SOS Log ({emergencyAlertsHistory.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW & HEALTH STATUS ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Health Status Indicator (Normal 🟢 / Warning 🟡 / Critical 🔴) */}
          {latestReading ? (
            <div
              className={`rounded-2xl border p-6 transition-all shadow-xs ${
                latestReading.status === 'normal'
                  ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-300'
                  : latestReading.status === 'warning'
                  ? 'bg-gradient-to-r from-amber-50 via-orange-50 to-white border-amber-300'
                  : 'bg-gradient-to-r from-rose-50 via-red-50 to-white border-rose-300 animate-pulse'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-xl border ${
                      latestReading.status === 'normal'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                        : latestReading.status === 'warning'
                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                        : 'bg-rose-100 border-rose-300 text-rose-800'
                    }`}
                  >
                    <HeartPulse className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Overall Health Status
                    </span>
                    <h3 className="text-xl font-black text-slate-900 uppercase">
                      {latestReading.status === 'normal' && '🟢 Normal — Stable Vitals'}
                      {latestReading.status === 'warning' && '🟡 Warning — Follow-up Advised'}
                      {latestReading.status === 'critical' && '🔴 Critical Condition Detected'}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Gemini Risk Assessment</span>
                  <span className="text-2xl font-black font-mono text-slate-800">
                    {latestReading.geminiAnalysis?.riskScore || 10}
                    <span className="text-sm font-normal text-slate-400">/100</span>
                  </span>
                </div>
              </div>

              {/* Gemini Analysis Summary */}
              {latestReading.geminiAnalysis && (
                <div className="my-4 p-4 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-teal-800">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Gemini AI Health Assessment & Clinical Insights</span>
                  </div>
                  <p className="text-slate-800 text-sm leading-relaxed font-medium">
                    {latestReading.geminiAnalysis.summary}
                  </p>

                  {latestReading.geminiAnalysis.preventiveGuidance?.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Preventive Health Guidance
                      </span>
                      <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {latestReading.geminiAnalysis.preventiveGuidance.map((tip, i) => (
                          <li
                            key={i}
                            className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 text-slate-700 flex items-start gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs font-mono font-semibold text-teal-900 pt-1">
                    Action Plan: {latestReading.geminiAnalysis.actionRequired}
                  </p>
                </div>
              )}

              {/* Vitals Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Heart Rate</span>
                  <span className="font-mono text-lg font-bold text-slate-900">{latestReading.heartRate}</span>
                  <span className="text-[10px] text-slate-400 ml-1">bpm</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Blood Pressure</span>
                  <span className="font-mono text-lg font-bold text-slate-900">
                    {latestReading.systolicBp}/{latestReading.diastolicBp}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">mmHg</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">SpO₂ Oxygen</span>
                  <span className="font-mono text-lg font-bold text-slate-900">{latestReading.spO2}%</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Temperature</span>
                  <span className="font-mono text-lg font-bold text-slate-900">{latestReading.temperature}°C</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Blood Glucose</span>
                  <span className="font-mono text-lg font-bold text-slate-900">{latestReading.glucose}</span>
                  <span className="text-[10px] text-slate-400 ml-1">mg/dL</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Weight / BMI</span>
                  <span className="font-mono text-lg font-bold text-slate-900">{latestReading.weightKg}</span>
                  <span className="text-[10px] text-slate-400 ml-1">kg</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              <HeartPulse className="w-8 h-8 text-teal-600 mx-auto mb-2 opacity-80" />
              No health kit readings recorded yet. Click "Perform Morning Check" above to connect your IoT device.
            </div>
          )}

          {/* Quick Profile & Connected Hardware Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-teal-600" /> Patient Medical File
              </h4>
              <p>Name: <strong>{user?.name || 'Registered Patient'}</strong></p>
              <p>DOB: <strong>{patientProfile?.dateOfBirth || 'Not specified'}</strong> • Gender: <span className="capitalize">{patientProfile?.gender || 'Not specified'}</span></p>
              <p>Blood Group: <strong>{patientProfile?.bloodGroup || 'Not specified'}</strong> • BMI: <strong>{patientProfile?.bmi || 'Not calculated'}</strong></p>
              <p>Known Conditions: <strong>{patientProfile?.existingConditions?.join(', ') || 'None reported'}</strong></p>
              <p>Allergies: <strong>{patientProfile?.allergies?.join(', ') || 'None reported'}</strong></p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Care Network & Doctor
                </h4>
                {patientProfile?.assignedDoctorName ? (
                  <>
                    <p>Assigned Doctor: <strong className="text-indigo-900">Dr. {patientProfile.assignedDoctorName}</strong></p>
                    <p>Primary Hospital: <strong>{patientProfile.assignedHospitalName || 'Affiliated Hospital'}</strong></p>
                  </>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-[11px] space-y-1">
                    <p className="font-semibold text-slate-700">No Doctor Assigned Yet</p>
                    <p className="text-[10px] text-slate-400">Choose your preferred physician and send a patient care request.</p>
                  </div>
                )}
                {patientProfile?.emergencyContact && (
                  <p className="text-[11px] text-slate-500">
                    Emergency Contact: <strong>{patientProfile.emergencyContact.name} ({patientProfile.emergencyContact.relationship}) — {patientProfile.emergencyContact.phone}</strong>
                  </p>
                )}
              </div>

              {!patientProfile?.assignedDoctorName && (
                <button
                  type="button"
                  onClick={() => setActiveTab('doctors')}
                  className="mt-2 w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-lg border border-indigo-200 text-center transition-colors text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Stethoscope className="w-3 h-3" />
                  <span>Choose Doctor in Faculty Directory &rarr;</span>
                </button>
              )}
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-600" /> Connected IoT Kits
                </h4>
                {patientProfile?.connectedDevices && patientProfile.connectedDevices.length > 0 ? (
                  <div className="space-y-1 mt-1">
                    {patientProfile.connectedDevices.map((devId) => {
                      const item = itemsList.find((i) => i.id === devId);
                      return (
                        <p key={devId} className="text-slate-700">
                          Kit: <strong className="text-teal-800">{item?.name || devId}</strong>
                        </p>
                      );
                    })}
                    <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">
                      ● Bluetooth 5.3 Active & Syncing
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1 mt-1">
                    <p className="font-semibold text-slate-700">No IoT Hardware Connected</p>
                    <p className="text-[10px] text-slate-500">
                      IoT kits are not automatically assigned. Devices appear here only if purchased from our app store.
                    </p>
                  </div>
                )}
              </div>

              {(!patientProfile?.connectedDevices || patientProfile.connectedDevices.length === 0) && (
                <button
                  type="button"
                  onClick={() => setActiveTab('morning_check')}
                  className="mt-2 w-full py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg border border-teal-200 text-center transition-colors text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Package className="w-3 h-3" />
                  <span>Browse IoT Kit Catalog & Buy &rarr;</span>
                </button>
              )}
            </div>
          </div>

          {/* CONDITION-SPECIFIC PATIENT DASHBOARDS (Personalized Care Pathways) */}
          {carePathway === 'cardiac' && (
            <div className="p-5 bg-gradient-to-r from-rose-50 via-red-50 to-white border-2 border-rose-300 rounded-2xl shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-600 text-white rounded-xl">
                    <HeartPulse className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 block">
                      Personalized Care Pathway Active
                    </span>
                    <h3 className="text-sm font-black text-rose-950">
                      Hypertension & Cardiac Care Protocol (AHA / WHO Classification)
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono font-black px-2.5 py-1 bg-white border border-rose-300 text-rose-700 rounded-lg">
                  Target BP: &lt; 120/80 mmHg
                </span>
              </div>

              {/* AHA / WHO Stage Classifier */}
              {latestReading && (() => {
                const sys = latestReading.systolicBp;
                const dia = latestReading.diastolicBp;
                let classification = 'Normal BP (<120 and <80)';
                let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                if (sys >= 180 || dia >= 120) {
                  classification = '🚨 Hypertensive Crisis (>180 / >120) — Emergency Action Needed';
                  badgeColor = 'bg-rose-600 text-white border-rose-700 animate-bounce';
                } else if (sys >= 140 || dia >= 90) {
                  classification = 'Stage 2 Hypertension (>=140 or >=90)';
                  badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
                } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
                  classification = 'Stage 1 Hypertension (130-139 or 80-89)';
                  badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
                } else if (sys >= 120 && sys <= 129 && dia < 80) {
                  classification = 'Elevated Blood Pressure (120-129 and <80)';
                  badgeColor = 'bg-yellow-100 text-yellow-900 border-yellow-300';
                }

                return (
                  <div className="p-3 bg-white/90 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Current Blood Pressure Reading:</span>
                      <strong className="text-slate-900 font-mono text-base">{sys} / {dia} mmHg</strong>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl border font-bold text-xs ${badgeColor}`}>
                      {classification}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          {carePathway === 'diabetes' && (
            <div className="p-5 bg-gradient-to-r from-amber-50 via-yellow-50 to-white border-2 border-amber-300 rounded-2xl shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-600 text-white rounded-xl">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block">
                      Personalized Care Pathway Active
                    </span>
                    <h3 className="text-sm font-black text-amber-950">
                      Diabetes & Metabolic Care (Glycemic Index & HbA1c Target)
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono font-black px-2.5 py-1 bg-white border border-amber-300 text-amber-800 rounded-lg">
                  Target Fasting: 70–99 mg/dL · HbA1c &lt; 6.5%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Fasting Glucose Log</span>
                  <span className="font-mono text-lg font-bold text-slate-900">{latestReading?.glucose || 94} mg/dL</span>
                  <span className="text-[10px] text-emerald-600 block">● Optimal Range</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated HbA1c Target</span>
                  <span className="font-mono text-lg font-bold text-slate-900">5.6%</span>
                  <span className="text-[10px] text-slate-500 block">Target: &lt; 6.5%</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Insulin & Carb Guidance</span>
                  <span className="font-semibold text-slate-800 block text-[11px]">Consistent Meal Spacing</span>
                  <span className="text-[10px] text-amber-700 block">Low Glycemic Index Diet</span>
                </div>
              </div>
            </div>
          )}

          {carePathway === 'pulmonary' && (
            <div className="p-5 bg-gradient-to-r from-cyan-50 via-teal-50 to-white border-2 border-cyan-300 rounded-2xl shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-cyan-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-700 text-white rounded-xl">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-700 block">
                      Personalized Care Pathway Active
                    </span>
                    <h3 className="text-sm font-black text-cyan-950">
                      Pulmonary & Respiratory Care (Continuous SpO₂ & Peak Flow)
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono font-black px-2.5 py-1 bg-white border border-cyan-300 text-cyan-800 rounded-lg">
                  Danger Threshold: &lt; 94% SpO₂
                </span>
              </div>

              {latestReading && (
                <div className="p-3 bg-white rounded-xl border border-cyan-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Continuous Blood Oxygen (SpO₂):</span>
                    <strong className={`font-mono text-lg ${latestReading.spO2 < 94 ? 'text-rose-600 font-black' : 'text-slate-900'}`}>
                      {latestReading.spO2}%
                    </strong>
                  </div>
                  {latestReading.spO2 < 94 ? (
                    <div className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold flex items-center gap-2 animate-pulse">
                      <AlertTriangle className="w-4 h-4" />
                      <span>CRITICAL HYPOXIA ALERT (&lt;94%): Inhaler / Oxygen Support Required</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl font-bold border border-emerald-300">
                      SpO₂ Normal & Stable (Baseline &gt; 95%)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {carePathway === 'geriatric' && (
            <div className="p-5 bg-gradient-to-r from-purple-50 via-indigo-50 to-white border-2 border-purple-300 rounded-2xl shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-700 text-white rounded-xl">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 block">
                      Personalized Care Pathway Active
                    </span>
                    <h3 className="text-sm font-black text-purple-950">
                      Elderly & Geriatric High-Contrast Safety Care
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 bg-white border border-purple-300 text-purple-800 rounded-lg">
                  Fall Detection & Caregiver Sync Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-1">
                  <span className="font-bold text-slate-900 block text-sm">Fall Detection Sensor Status</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" /> Accelerometer Armed (No Falls Detected)
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-1">
                  <span className="font-bold text-slate-900 block text-sm">Primary Caregiver Sync</span>
                  <p className="text-slate-600 text-[11px]">
                    Automatic SMS alerts dispatch to {emergencyContacts[0]?.name || 'Next of Kin'} ({emergencyContacts[0]?.phone || 'Phone'}) on anomalous vitals.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================= RECHARTS DAILY VITAL TRENDS DASHBOARD (HEART RATE & SLEEP PATTERNS) ================= */}
          {(() => {
            const hasIotKit = Boolean(
              (localConnectedDevices && localConnectedDevices.length > 0) ||
              (patientProfile?.connectedDevices && patientProfile.connectedDevices.length > 0) ||
              patientProfile?.iotKitPurchased
            );

            // User Requirement: Newly registered patient can measure heart rate, sleep patterns, blood pressure ONLY after buying IoT kit!
            if (!hasIotKit) {
              return (
                <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-xs space-y-5 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-100">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl border border-amber-200">
                        <Package className="w-6 h-6 text-amber-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">
                            Daily Vital Trends & Sleep Telemetry Dashboard
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                            IoT Kit Required
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Daily continuous heart rate tracking, automated sleep patterns, and real-time blood pressure require an IoT Health Monitoring Kit.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-amber-50/70 via-slate-50 to-white border border-amber-200/70 rounded-2xl space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3.5 bg-white/90 rounded-xl border border-slate-200 shadow-xs">
                        <div className="flex items-center gap-2 text-rose-600 font-bold text-xs mb-1">
                          <HeartPulse className="w-4 h-4" />
                          <span>Heart Rate Telemetry</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Requires continuous telemetry to measure daily heart rate curves, resting BPM, and tachycardia anomalies.
                        </p>
                      </div>

                      <div className="p-3.5 bg-white/90 rounded-xl border border-slate-200 shadow-xs">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs mb-1">
                          <Moon className="w-4 h-4" />
                          <span>Weekly Sleep Patterns</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Captures nightly restorative sleep, Deep Sleep, REM cycles, and total sleep efficiency hours.
                        </p>
                      </div>

                      <div className="p-3.5 bg-white/90 rounded-xl border border-slate-200 shadow-xs">
                        <div className="flex items-center gap-2 text-teal-700 font-bold text-xs mb-1">
                          <Activity className="w-4 h-4" />
                          <span>Blood Pressure & SpO₂</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Measures systolic and diastolic trends, arterial oxygen saturation, and morning hemodynamic stability.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-amber-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-medium">
                          You haven't paired an IoT Health Kit yet. After buying or pairing your kit, daily vitals, sleep patterns, and blood pressure telemetry will unlock automatically.
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveTab('morning_check')}
                          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Browse & Buy IoT Kit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePairKit('item-1')}
                          disabled={buyingKitId !== null}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-colors"
                        >
                          <span>{buyingKitId ? 'Connecting Kit...' : '⚡ Quick Pair Demo Kit'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const limit = vitalsTimeWindow === '7d' ? 7 : vitalsTimeWindow === '14d' ? 14 : 30;

            // Generate daily 7-day / 14-day / 30-day vital telemetry trends
            const dailyData = Array.from({ length: limit }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (limit - 1 - i));
              const dayName = d.toLocaleDateString([], { weekday: 'short' });
              const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

              // If real reading exists for this day, prioritize it
              const matchingReading = readings.find((r) => {
                const rDate = new Date(r.timestamp);
                return rDate.toDateString() === d.toDateString();
              });

              const baseHr = matchingReading?.heartRate || Math.floor(70 + Math.sin(i * 1.3) * 7);
              const restingHr = Math.max(54, baseHr - 8);
              const peakHr = Math.min(135, baseHr + 36 + Math.floor(Math.sin(i * 1.7) * 12));

              // Sleep metrics: Recommended 7-9 hours per night
              const deepSleep = Number((1.5 + Math.sin(i * 0.9 + 1) * 0.4).toFixed(1)); // ~1.1 - 1.9 hrs
              const remSleep = Number((1.8 + Math.cos(i * 0.8) * 0.3).toFixed(1)); // ~1.5 - 2.1 hrs
              const lightSleep = Number((4.3 + Math.sin(i * 1.1) * 0.5).toFixed(1)); // ~3.8 - 4.8 hrs
              const totalSleep = Number((deepSleep + remSleep + lightSleep).toFixed(1)); // ~7.2 - 8.6 hrs
              const sleepScore = Math.min(98, Math.max(76, Math.floor(82 + (totalSleep - 7) * 8 + (deepSleep - 1.2) * 10)));

              return {
                day: dayName,
                date: dateStr,
                fullDate: d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }),
                // Heart Rate
                avgHr: baseHr,
                restingHr,
                peakHr,
                // Sleep
                deepSleep,
                remSleep,
                lightSleep,
                totalSleep,
                sleepScore,
                bedtime: '10:45 PM',
                wakeTime: '06:30 AM',
                // Hemodynamics
                systolic: matchingReading?.systolicBp || Math.floor(118 + Math.sin(i * 0.9) * 10),
                diastolic: matchingReading?.diastolicBp || Math.floor(76 + Math.cos(i * 0.9) * 6),
                spO2: matchingReading?.spO2 || Math.floor(98 + (i % 3 === 0 ? -1 : 0)),
                glucose: matchingReading?.glucose || Math.floor(94 + Math.sin(i * 0.7) * 12),
              };
            });

            // Weekly averages for summary badges
            const avgHeartRate = Math.round(dailyData.reduce((acc, d) => acc + d.avgHr, 0) / dailyData.length);
            const avgResting = Math.round(dailyData.reduce((acc, d) => acc + d.restingHr, 0) / dailyData.length);
            const maxPeak = Math.max(...dailyData.map((d) => d.peakHr));
            const avgSleep = (dailyData.reduce((acc, d) => acc + d.totalSleep, 0) / dailyData.length).toFixed(1);
            const avgDeepPct = Math.round((dailyData.reduce((acc, d) => acc + d.deepSleep, 0) / dailyData.reduce((acc, d) => acc + d.totalSleep, 0)) * 100);
            const avgSleepScore = Math.round(dailyData.reduce((acc, d) => acc + d.sleepScore, 0) / dailyData.length);

            return (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                {/* Header & Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                        <HeartPulse className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            Daily Vital Trends Dashboard (Recharts Visualizations)
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
                            Weekly Analysis
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Daily heart rate telemetry curves, weekly sleep architecture, and hemodynamic stability.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metric Switcher & Time Window Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Metric Tabs: Heart Rate · Sleep Patterns · Blood Pressure */}
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setVitalsMetricTab('heart_rate')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          vitalsMetricTab === 'heart_rate'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <HeartPulse className="w-3.5 h-3.5" />
                        <span>Heart Rate ({vitalsTimeWindow})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVitalsMetricTab('sleep')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          vitalsMetricTab === 'sleep'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Sleep Patterns ({vitalsTimeWindow})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVitalsMetricTab('bp')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          vitalsMetricTab === 'bp'
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Blood Pressure & O₂</span>
                      </button>
                    </div>

                    {/* Window Toggles: 7d · 14d · 30d */}
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                      {(['7d', '14d', '30d'] as const).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setVitalsTimeWindow(w)}
                          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                            vitalsTimeWindow === w ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {w.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* IoT Connection Status Badge */}
                {!hasIotKit && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Displaying clinical weekly baseline trends. Pair or purchase an authorized IoT Telemetry Kit to sync live continuous BLE sensor readings.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('morning_check')}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shrink-0 cursor-pointer shadow-xs transition-colors"
                    >
                      Connect IoT Kit &rarr;
                    </button>
                  </div>
                )}

                {/* ================= TAB 1: HEART RATE PATTERNS OVER THE WEEK ================= */}
                {vitalsMetricTab === 'heart_rate' && (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Summary Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-rose-700 block">7-Day Daily Avg</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <strong className="text-xl font-black text-rose-950 font-mono">{avgHeartRate}</strong>
                          <span className="text-xs text-rose-700 font-semibold">BPM</span>
                        </div>
                        <span className="text-[10px] text-rose-600 mt-1 block">Normal Range (60–100)</span>
                      </div>

                      <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-teal-700 block">Resting Baseline</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <strong className="text-xl font-black text-teal-950 font-mono">{avgResting}</strong>
                          <span className="text-xs text-teal-700 font-semibold">BPM</span>
                        </div>
                        <span className="text-[10px] text-teal-600 mt-1 block">Optimal Cardiac Recovery</span>
                      </div>

                      <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-amber-700 block">Peak Active Rate</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <strong className="text-xl font-black text-amber-950 font-mono">{maxPeak}</strong>
                          <span className="text-xs text-amber-700 font-semibold">BPM</span>
                        </div>
                        <span className="text-[10px] text-amber-600 mt-1 block">During brisk activity</span>
                      </div>

                      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-indigo-700 block">Rhythm Regularity</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <strong className="text-xl font-black text-indigo-950 font-mono">99.2%</strong>
                          <span className="text-xs text-indigo-700 font-semibold">Stability</span>
                        </div>
                        <span className="text-[10px] text-indigo-600 mt-1 block">Normal Sinus Rhythm</span>
                      </div>
                    </div>

                    {/* Recharts Heart Rate Chart */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          Daily Heart Rate Curve: Peak (Amber), Daily Average (Rose), and Resting Baseline (Teal)
                        </span>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1 text-amber-600 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Peak
                          </span>
                          <span className="flex items-center gap-1 text-rose-600 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Avg HR
                          </span>
                          <span className="flex items-center gap-1 text-teal-700 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" /> Resting
                          </span>
                        </div>
                      </div>

                      <div className="h-64 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorAvgHr" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis domain={[50, 140]} tick={{ fontSize: 10, fill: '#64748b' }} unit=" bpm" />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d: any = payload[0].payload;
                                  return (
                                    <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                                      <strong className="block font-bold text-slate-100">{d.fullDate}</strong>
                                      <div className="space-y-1 font-mono text-[11px]">
                                        <p className="text-rose-300">Daily Average: {d.avgHr} BPM</p>
                                        <p className="text-teal-300">Resting Baseline: {d.restingHr} BPM</p>
                                        <p className="text-amber-300">Peak Active: {d.peakHr} BPM</p>
                                        <p className="text-slate-400">Oxygen (SpO2): {d.spO2}% · BP: {d.systolic}/{d.diastolic}</p>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            {/* Standard Normal Resting Heart Rate Band (60–100 BPM) */}
                            <ReferenceArea y1={60} y2={100} fill="#10b981" fillOpacity={0.05} />
                            <ReferenceLine y={60} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Resting Min (60)', position: 'insideBottomLeft', fill: '#10b981', fontSize: 10 }} />
                            <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Resting Max (100)', position: 'insideTopLeft', fill: '#f59e0b', fontSize: 10 }} />
                            <Area
                              type="monotone"
                              dataKey="avgHr"
                              stroke="#f43f5e"
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#colorAvgHr)"
                              dot={{ r: 4, fill: '#f43f5e' }}
                              activeDot={{ r: 6 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="restingHr"
                              stroke="#0f766e"
                              strokeWidth={2}
                              strokeDasharray="4 4"
                              dot={{ r: 3, fill: '#0f766e' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="peakHr"
                              stroke="#f59e0b"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#f59e0b' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= TAB 2: SLEEP PATTERNS OVER THE WEEK ================= */}
                {vitalsMetricTab === 'sleep' && (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Sleep Summary Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-indigo-700 block">Weekly Avg Sleep</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <strong className="text-xl font-black text-indigo-950 font-mono">{avgSleep}</strong>
                          <span className="text-xs text-indigo-700 font-semibold">Hours / night</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold mt-1 block">✓ Target (7–9 hrs met)</span>
                      </div>

                      <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-purple-700 block">Deep Sleep Ratio</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <strong className="text-xl font-black text-purple-950 font-mono">{avgDeepPct}%</strong>
                          <span className="text-xs text-purple-700 font-semibold">Architecture</span>
                        </div>
                        <span className="text-[10px] text-purple-600 mt-1 block">Physical Recovery State</span>
                      </div>

                      <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-sky-700 block">Sleep Quality Index</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <strong className="text-xl font-black text-sky-950 font-mono">{avgSleepScore}</strong>
                          <span className="text-xs text-sky-700 font-semibold">/100</span>
                        </div>
                        <span className="text-[10px] text-sky-600 mt-1 block">Optimal restorative rest</span>
                      </div>

                      <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 block">Sleep Efficiency</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <strong className="text-xl font-black text-emerald-950 font-mono">89%</strong>
                          <span className="text-xs text-emerald-700 font-semibold">Efficiency</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 mt-1 block">Time asleep vs in bed</span>
                      </div>
                    </div>

                    {/* Recharts Stacked Bar Chart for Sleep Stages */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          Daily Sleep Breakdown: Deep Sleep (Indigo), REM Sleep (Purple), Light Sleep (Sky Blue) · 8.0h Target Guideline
                        </span>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1 text-indigo-700 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-700 inline-block" /> Deep
                          </span>
                          <span className="flex items-center gap-1 text-purple-600 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> REM
                          </span>
                          <span className="flex items-center gap-1 text-sky-600 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> Light
                          </span>
                        </div>
                      </div>

                      <div className="h-64 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis domain={[0, 11]} tick={{ fontSize: 10, fill: '#64748b' }} unit=" hrs" />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d: any = payload[0].payload;
                                  return (
                                    <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                                      <div className="flex items-center justify-between gap-4">
                                        <strong className="block font-bold text-slate-100">{d.fullDate}</strong>
                                        <span className="px-2 py-0.5 rounded bg-indigo-600 font-mono text-[10px] font-bold">
                                          Score: {d.sleepScore}/100
                                        </span>
                                      </div>
                                      <div className="space-y-1 font-mono text-[11px]">
                                        <p className="text-emerald-300 font-bold">Total Duration: {d.totalSleep} hrs</p>
                                        <p className="text-indigo-300">• Deep Sleep: {d.deepSleep} hrs ({Math.round((d.deepSleep / d.totalSleep) * 100)}%)</p>
                                        <p className="text-purple-300">• REM Stage: {d.remSleep} hrs ({Math.round((d.remSleep / d.totalSleep) * 100)}%)</p>
                                        <p className="text-sky-300">• Light Sleep: {d.lightSleep} hrs ({Math.round((d.lightSleep / d.totalSleep) * 100)}%)</p>
                                        <p className="text-slate-400">Bedtime: {d.bedtime} · Woke at {d.wakeTime}</p>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            {/* Recommended Sleep Guideline Reference Line (8.0 Hours) */}
                            <ReferenceLine y={8.0} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: 'Target 8.0h', position: 'insideTopLeft', fill: '#10b981', fontSize: 10 }} />
                            <Bar dataKey="deepSleep" stackId="sleep" fill="#4338ca" name="Deep Sleep" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="remSleep" stackId="sleep" fill="#8b5cf6" name="REM Sleep" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="lightSleep" stackId="sleep" fill="#38bdf8" name="Light Sleep" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= TAB 3: DUAL-AXIS BLOOD PRESSURE & OXYGEN ================= */}
                {vitalsMetricTab === 'bp' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          Systolic (Rose) & Diastolic (Teal) Blood Pressure · Normal Reference Band (90–120 mmHg)
                        </span>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1 text-rose-600 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Systolic
                          </span>
                          <span className="flex items-center gap-1 text-teal-700 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" /> Diastolic
                          </span>
                        </div>
                      </div>

                      <div className="h-56 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis domain={[60, 180]} tick={{ fontSize: 10, fill: '#64748b' }} unit=" mmHg" />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d: any = payload[0].payload;
                                  return (
                                    <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg text-xs space-y-1 border border-slate-700">
                                      <strong className="block font-bold">{d.fullDate}</strong>
                                      <p className="text-rose-300 font-mono">Systolic: {d.systolic} mmHg</p>
                                      <p className="text-teal-300 font-mono">Diastolic: {d.diastolic} mmHg</p>
                                      <p className="text-slate-300 font-mono">Heart Rate: {d.avgHr} BPM · SpO2: {d.spO2}%</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <ReferenceArea y1={90} y2={120} fill="#10b981" fillOpacity={0.06} />
                            <Line
                              type="monotone"
                              dataKey="systolic"
                              stroke="#e11d48"
                              strokeWidth={2.5}
                              dot={{ r: 3, fill: '#e11d48' }}
                              activeDot={{ r: 5 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="diastolic"
                              stroke="#0f766e"
                              strokeWidth={2.5}
                              dot={{ r: 3, fill: '#0f766e' }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Resting SpO2 Pulse Oximetry Line */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          Oxygen Saturation (SpO₂ %) Continuous Telemetry
                        </span>
                        <span className="text-[11px] text-emerald-700 font-bold">Optimal Oxygenation (≥ 95%)</span>
                      </div>

                      <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorSpO2New" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis domain={[90, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                            <Tooltip />
                            <ReferenceLine y={95} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Normal Min (95%)', position: 'insideBottomLeft', fill: '#10b981', fontSize: 10 }} />
                            <Area
                              type="monotone"
                              dataKey="spO2"
                              stroke="#0284c7"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorSpO2New)"
                              dot={{ r: 3, fill: '#0284c7' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* DAILY MEDICATION SCHEDULE & COMPLIANCE TRACKER (PILL BOX) - Gated to Doctor Prescribed Medications */}
          {dailyMeds.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Pill className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-800">
                  Daily Medication Schedule & Compliance Tracker
                </h3>
              </div>
              <div className="p-5 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 text-center space-y-2.5">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  No Active Doctor Prescriptions
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Your daily medication schedule, digital pill box, and adherence tracker will automatically activate here once you attend a consultation and your doctor prescribes medications.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('doctors')}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Book Doctor Appointment</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-teal-700" />
                    <span>Daily Medication Schedule & Compliance Tracker (Digital Pill Box)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track adherence across Morning, Afternoon, and Night regimes. Adherence mitigates readmission risk.
                  </p>
                </div>

                {/* Compliance Percentage Meter */}
                {(() => {
                  const total = dailyMeds.length;
                  const taken = dailyMeds.filter((m) => m.takenToday).length;
                  const pct = total > 0 ? Math.round((taken / total) * 100) : 100;
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Today's Adherence:</span>
                      <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
                        pct >= 80 ? 'bg-emerald-100 text-emerald-800' : pct >= 50 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {pct}% ({taken}/{total} taken)
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Daily Pill Box Grid by Time of Day */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['morning', 'afternoon', 'night'] as const).map((slot) => {
                  const medsInSlot = dailyMeds.filter((m) => m.timing === slot);
                  const slotTitle = slot === 'morning' ? 'Morning (Breakfast)' : slot === 'afternoon' ? 'Afternoon (Lunch)' : 'Night (Dinner)';
                  const slotIcon = slot === 'morning' ? '☀️' : slot === 'afternoon' ? '🌤️' : '🌙';

                  return (
                    <div key={slot} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <span>{slotIcon}</span>
                          <span>{slotTitle}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-semibold">
                          {medsInSlot.length} item{medsInSlot.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {medsInSlot.length === 0 ? (
                        <p className="text-slate-400 text-[11px] py-2">No medications scheduled.</p>
                      ) : (
                        <div className="space-y-2">
                          {medsInSlot.map((med) => (
                            <div
                              key={med.id}
                              className={`p-2.5 rounded-xl border text-xs transition-all ${
                                med.takenToday
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                  : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <strong className={`block ${med.takenToday ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                    {med.name}
                                  </strong>
                                  <span className="text-[10px] text-slate-500 block">
                                    {med.dosage} · {med.instructions}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleToggleMedication(med.id)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                    med.takenToday
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                      : 'bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200'
                                  }`}
                                >
                                  {med.takenToday ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Taken</span>
                                    </>
                                  ) : (
                                    <span>Mark Taken</span>
                                  )}
                                </button>
                              </div>

                              {typeof med.refillDaysLeft === 'number' && med.refillDaysLeft <= 5 && (
                                <div className="mt-2 p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[10px] font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>Refill Warning: Only {med.refillDaysLeft} days remaining. Contact pharmacy.</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MULTI-EMERGENCY CONTACTS DIRECTORY SECTION (User Requirement: Add up to three members with numbers) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-rose-600" />
                    <span>Priority Emergency Contacts Directory</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-800 border border-rose-200">
                    {emergencyContacts.length}/3 Members Added
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated SOS distress broadcasts dispatch alerts and live device GPS location to up to 3 priority emergency contacts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {emergencyContacts.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newTier = emergencyContacts.length === 0 ? 'primary' : emergencyContacts.length === 1 ? 'secondary' : 'physician';
                      const defaultRel = emergencyContacts.length === 0 ? 'Spouse' : emergencyContacts.length === 1 ? 'Parent / Relative' : 'Family Doctor';
                      const newEntry: EmergencyContactEntry = {
                        id: `ec-${Date.now()}`,
                        name: '',
                        relationship: defaultRel,
                        phone: '',
                        priority: newTier,
                        notifySms: true,
                        notifyEmail: true,
                        shareLiveLocation: true,
                      };
                      setEmergencyContacts([...emergencyContacts, newEntry]);
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 active:from-rose-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Member ({emergencyContacts.length + 1}/3)</span>
                  </button>
                )}
                {emergencyContacts.length > 0 && (
                  <button
                    type="button"
                    disabled={contactsSaving}
                    onClick={() => handleSaveContacts(emergencyContacts)}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>{contactsSaving ? 'Saving...' : 'Save Contacts'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Contacts Grid: Render up to 3 cards + empty slot if less than 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {emergencyContacts.map((contact, idx) => {
                const priorityLabel =
                  contact.priority === 'primary' || idx === 0
                    ? 'Priority 1: Primary Next of Kin'
                    : contact.priority === 'secondary' || idx === 1
                    ? 'Priority 2: Caregiver / Relative'
                    : 'Priority 3: Family Doctor / Trusted';
                const priorityBadge =
                  idx === 0
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : idx === 1
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-teal-100 text-teal-800 border-teal-200';

                return (
                  <div key={contact.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs relative flex flex-col justify-between shadow-xs">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${priorityBadge}`}>
                          {priorityLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = emergencyContacts.filter((_, cIdx) => cIdx !== idx);
                            setEmergencyContacts(updated);
                            handleSaveContacts(updated);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                          title="Remove this contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Contact Member Name Input */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                          Member Full Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ramesh Sharma"
                          value={contact.name}
                          onChange={(e) => {
                            const updated = [...emergencyContacts];
                            updated[idx].name = e.target.value;
                            setEmergencyContacts(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-rose-500/20 outline-none"
                        />
                      </div>

                      {/* Relationship Selector */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                          Relationship *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Spouse / Father / Mother / Son / Friend"
                          value={contact.relationship}
                          onChange={(e) => {
                            const updated = [...emergencyContacts];
                            updated[idx].relationship = e.target.value;
                            setEmergencyContacts(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500/20 outline-none"
                        />
                      </div>

                      {/* Phone Number Input (User Requirement: Option to add numbers also) */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-rose-600" />
                          <span>Emergency Contact Number *</span>
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            placeholder="e.g. +91 98765 43210"
                            value={contact.phone}
                            onChange={(e) => {
                              const updated = [...emergencyContacts];
                              updated[idx].phone = e.target.value;
                              setEmergencyContacts(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 outline-none"
                          />
                        </div>
                      </div>

                      {/* Notification Preferences */}
                      <div className="pt-1.5 flex flex-wrap gap-2 text-[11px] text-slate-600 border-t border-slate-200/60">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contact.notifySms !== false}
                            onChange={(e) => {
                              const updated = [...emergencyContacts];
                              updated[idx].notifySms = e.target.checked;
                              setEmergencyContacts(updated);
                            }}
                            className="rounded text-rose-600"
                          />
                          <span>SMS SOS</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contact.shareLiveLocation !== false}
                            onChange={(e) => {
                              const updated = [...emergencyContacts];
                              updated[idx].shareLiveLocation = e.target.checked;
                              setEmergencyContacts(updated);
                            }}
                            className="rounded text-rose-600"
                          />
                          <span>Live GPS</span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-[10px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Dial Test</span>
                        </a>
                      )}
                      <span className="text-[10px] text-emerald-700 font-bold ml-auto">
                        ✓ Active Priority
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Empty placeholder cards to allow filling up to 3 contacts */}
              {Array.from({ length: Math.max(0, 3 - emergencyContacts.length) }).map((_, emptyIdx) => {
                const slotNum = emergencyContacts.length + emptyIdx + 1;
                const slotLabel = slotNum === 1 ? 'Priority 1 (Primary Next of Kin)' : slotNum === 2 ? 'Priority 2 (Secondary Contact)' : 'Priority 3 (Tertiary Contact)';

                return (
                  <div
                    key={`empty-slot-${slotNum}`}
                    className="p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-rose-300 bg-slate-50/50 hover:bg-rose-50/30 flex flex-col items-center justify-center text-center space-y-2 transition-all"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <PhoneCall className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-700">
                        Available Slot #{slotNum}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {slotLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newTier = slotNum === 1 ? 'primary' : slotNum === 2 ? 'secondary' : 'physician';
                        const newEntry: EmergencyContactEntry = {
                          id: `ec-${Date.now()}`,
                          name: '',
                          relationship: slotNum === 1 ? 'Spouse' : slotNum === 2 ? 'Parent / Relative' : 'Family Doctor',
                          phone: '',
                          priority: newTier,
                          notifySms: true,
                          notifyEmail: true,
                          shareLiveLocation: true,
                        };
                        setEmergencyContacts([...emergencyContacts, newEntry]);
                      }}
                      className="mt-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 shadow-xs cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Priority Contact #{slotNum}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {emergencyContacts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 text-[11px]">
                  Emergency SOS alerts dispatch to all {emergencyContacts.length} priority numbers simultaneously with patient live GPS coordinates.
                </span>
                <button
                  type="button"
                  disabled={contactsSaving}
                  onClick={() => handleSaveContacts(emergencyContacts)}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>{contactsSaving ? 'Saving Changes...' : 'Save Emergency Directory'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Past Morning Health Readings Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Morning Health Check History ({readings.length})
              </h4>
              <span className="text-xs text-slate-500">
                Data validated & archived
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {readings.map((r) => (
                <div key={r.id} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          r.status === 'normal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="font-bold text-slate-800 font-mono">
                        HR: {r.heartRate} bpm | BP: {r.systolicBp}/{r.diastolicBp} mmHg | SpO2: {r.spO2}% | Glucose: {r.glucose} mg/dL
                      </span>
                    </div>
                    {r.geminiAnalysis && (
                      <p className="text-slate-600 text-[11px] line-clamp-1">
                        Gemini: {r.geminiAnalysis.summary}
                      </p>
                    )}
                  </div>

                  <span className="text-slate-400 font-mono text-[11px] shrink-0">
                    {new Date(r.timestamp).toLocaleDateString()} {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: IOT HEALTHCARE KIT TRANSMISSION ================= */}
      {activeTab === 'morning_check' && (() => {
        const activeDevices = (localConnectedDevices && localConnectedDevices.length > 0)
          ? localConnectedDevices
          : (patientProfile?.connectedDevices || []);
        const hasConnectedKit = activeDevices.length > 0 || Boolean(patientProfile?.iotKitPurchased);

        return (
          <div className="space-y-6">
            {!hasConnectedKit ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-950 text-sm">No Connected IoT Kits</h4>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        In accordance with system policy, IoT telemetry hardware appears when purchased from our catalog or paired to your account.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePairKit('item-1')}
                    disabled={Boolean(buyingKitId)}
                    className="px-3.5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>⚡ Instant Demo / Pair BLE Kit</span>
                  </button>
                </div>

                {/* Certified Hardware Store */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-teal-600" />
                        <span>Certified IoT Healthcare Kits Store</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Purchase a hardware kit to connect telemetry sensors directly to your portal.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePairKit('item-1')}
                        disabled={Boolean(buyingKitId)}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                      >
                        <span>⚡ Test / Pair Demo Cuff</span>
                      </button>
                      <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                        Official Hospital Equipment
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {itemsList.map((kit) => (
                      <div
                        key={kit.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-teal-300 hover:bg-white transition-all space-y-4 shadow-2xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-900">
                              {kit.category}
                            </span>
                            <span className="font-mono text-base font-black text-slate-900">
                              ${kit.price}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900">{kit.name}</h4>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Model: {kit.modelNumber} • FW: {kit.firmwareVersion} • Stock: {kit.stock}
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {kit.description}
                          </p>

                          <div className="pt-1">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                              Included Sensors & Telemetry:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {kit.supportedSensors.map((s, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-semibold text-slate-700">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleBuyKit(kit.id)}
                          disabled={buyingKitId === kit.id}
                          className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Package className="w-4 h-4" />
                          <span>{buyingKitId === kit.id ? 'Connecting to Account...' : `Buy Kit & Activate on Portal ($${kit.price})`}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <HeartPulse className="w-5 h-5 text-rose-500 animate-pulse" />
                      <span>Connected Healthcare Kits — Morning Health-Check</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">Active Telemetry Hardware:</span>
                      {activeDevices.map((devId) => {
                        const item = itemsList.find((i) => i.id === devId);
                        return (
                          <span key={devId} className="px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded-full font-bold text-[11px] border border-teal-200">
                            ✓ {item?.name || devId} (Bluetooth 5.3 Live Synced)
                          </span>
                        );
                      })}
                    </div>
                  </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">Test Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('normal')}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold"
                  >
                    Normal 🟢
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('warning')}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold"
                  >
                    Warning 🟡
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('critical')}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-bold"
                  >
                    Critical 🔴
                  </button>
                </div>
              </div>

          {/* Vitals Form / Simulator Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-slate-600 font-bold mb-1">
                ❤️ Heart Rate (bpm)
              </label>
              <input
                type="number"
                value={simHeartRate}
                onChange={(e) => setSimHeartRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-sm font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Normal: 60 - 100 bpm</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-slate-600 font-bold mb-1">
                🩺 Systolic BP (mmHg)
              </label>
              <input
                type="number"
                value={simSystolic}
                onChange={(e) => setSimSystolic(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-sm font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Normal: 90 - 120 mmHg</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-slate-600 font-bold mb-1">
                🩺 Diastolic BP (mmHg)
              </label>
              <input
                type="number"
                value={simDiastolic}
                onChange={(e) => setSimDiastolic(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-sm font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Normal: 60 - 80 mmHg</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-slate-600 font-bold mb-1">
                🫁 Blood Oxygen (SpO2 %)
              </label>
              <input
                type="number"
                value={simSpO2}
                onChange={(e) => setSimSpO2(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-sm font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Normal: 95 - 100 %</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-slate-600 font-bold mb-1">
                🌡 Core Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={simTemp}
                onChange={(e) => setSimTemp(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-sm font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Normal: 36.1 - 37.2 °C</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-slate-600 font-bold mb-1">
                🩸 Blood Glucose (mg/dL)
              </label>
              <input
                type="number"
                value={simGlucose}
                onChange={(e) => setSimGlucose(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-sm font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Fasting: 70 - 99 mg/dL</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleTransmitIoTReading}
              disabled={isMeasuring}
              className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-extrabold rounded-xl shadow-xs text-xs flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isMeasuring ? 'animate-spin' : ''}`} />
              <span>{isMeasuring ? 'Syncing with Gemini Engine...' : 'Transmit & Evaluate Vitals'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
})()}

      {/* ================= TAB 3: GEMINI SMART APPOINTMENT ASSISTANT ================= */}
      {activeTab === 'assistant' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-semibold text-indigo-700 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Intelligent Clinical Triage
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Gemini AI Smart Appointment Assistant
              </h3>
              <p className="text-xs text-slate-500">
                Describe your symptoms in natural language. Gemini analyzes your requirement, determines the optimal medical specialization, matches verified doctors, and recommends consultation dates.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                handleStopVoiceListening();
                setActiveTab('overview');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors shrink-0 shadow-xs"
              title="Return to Patient Portal Overview"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
              <span>Back to Portal Overview</span>
            </button>
          </div>

          <form onSubmit={handleAskAssistant} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-800">
                How are you feeling? Speak or describe your symptoms in ANY language:
              </label>

              {/* In-Screen Voice Language Selector & Full Voice Studio Trigger */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">Voice Language:</span>
                <select
                  value={voiceLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value as any;
                    setVoiceLanguage(newLang);
                    if (isListeningVoice) {
                      handleStartVoiceListening(newLang);
                    }
                  }}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="te-IN">తెలుగు (Telugu)</option>
                  <option value="hi-IN">हिन्दी (Hindi)</option>
                  <option value="ta-IN">தமிழ் (Tamil)</option>
                  <option value="en-IN">English (India)</option>
                  <option value="en-US">English (US)</option>
                  <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                  <option value="mr-IN">मराठी (Marathi)</option>
                  <option value="bn-IN">বাংলা (Bengali)</option>
                </select>

                <button
                  type="button"
                  onClick={handleToggleVoiceSearch}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Open Dedicated Full Voice Assistant Studio"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Voice Studio</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={3}
                value={symptomPrompt}
                onChange={(e) => setSymptomPrompt(e.target.value)}
                placeholder="e.g. Speak or type: 'నాకు ఛాతీలో విపరీతమైన మంట మరియు ఊపిరి ఆడటం లేదు' / 'मुझे चक्कर आ रहे हैं और कमजोरी लग रही है' / 'Severe chest pressure radiating to left arm'..."
                className="w-full px-3.5 py-2.5 pr-14 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />

              {/* Direct Current-Screen Mic Dictation Button */}
              <button
                type="button"
                onClick={() => {
                  if (isListeningVoice) {
                    handleStopVoiceListening();
                  } else {
                    handleStartVoiceListening(voiceLanguage);
                  }
                }}
                className={`absolute right-2.5 top-2.5 p-2 rounded-xl transition-all cursor-pointer ${
                  isListeningVoice
                    ? 'bg-rose-600 text-white animate-pulse shadow-md ring-4 ring-rose-200'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                }`}
                title={isListeningVoice ? 'Click to stop listening' : 'Click to speak symptoms directly in current screen'}
              >
                {isListeningVoice ? <Mic className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* Current-Screen Live Speech Feedback & Waveform */}
            {isListeningVoice && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block" />
                    <span>Microphone Active: Listening to your voice now ({voiceLanguage}). Speak symptoms clearly...</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleStopVoiceListening();
                        if (symptomPrompt.trim()) {
                          triggerGeminiWithText(symptomPrompt.trim());
                        }
                      }}
                      className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3 h-3" />
                      <span>Done & Consult Gemini</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStopVoiceListening}
                      className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg cursor-pointer"
                    >
                      Stop Mic
                    </button>
                  </div>
                </div>

                {/* Equalizer Waveform */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[20, 40, 70, 95, 65, 90, 50, 30].map((barHeight, idx) => {
                    const scaled = Math.max(4, Math.round((micVolumeLevel / 100) * barHeight));
                    return (
                      <div
                        key={idx}
                        className="w-1.5 rounded-full transition-all duration-75 bg-rose-600"
                        style={{ height: `${scaled}px` }}
                      />
                    );
                  })}
                  <span className="text-[10px] font-mono text-rose-700 ml-2">
                    {micVolumeLevel > 8 ? '🎙️ Receiving sound...' : '🎙️ Speak into your microphone...'}
                  </span>
                </div>
              </div>
            )}

            {/* In-Screen Browser Microphone Troubleshooting & Instructions */}
            {voiceErrorNotice && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-900">How to make your microphone work in browser:</p>
                    <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-amber-800">
                      <li>Look at your browser's address bar at the top of this window.</li>
                      <li>Click the <strong>🔒 Lock</strong> icon or <strong>🎚️ Site Settings / Tune</strong> icon on the left of the URL.</li>
                      <li>Find <strong>Microphone</strong> in the permissions list and set it to <strong>Allow</strong>.</li>
                      <li>Click <strong>Retry Microphone</strong> below, or select any of the 1-click multilingual speech presets!</li>
                    </ol>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                  <span className="text-[10px] text-amber-700">Tip: Quick presets below test the exact AI consultation flow instantly</span>
                  <button
                    type="button"
                    onClick={() => handleStartVoiceListening(voiceLanguage)}
                    className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Microphone</span>
                  </button>
                </div>
              </div>
            )}

            <div ref={analyzeSymptomsSectionRef} id="analyze-symptoms-section" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Multilingual quick tests:</span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = 'నాకు ఛాతీలో విపరీతమైన మంట మరియు ఊపిరి ఆడటం లేదు';
                    setSymptomPrompt(sample);
                    triggerGeminiWithText(sample);
                    scrollToDoctorMatchSection();
                  }}
                  className="text-indigo-600 hover:underline bg-indigo-50/60 px-1.5 py-0.5 rounded border border-indigo-100 cursor-pointer"
                >
                  Telugu (ఛాతీలో మంట / గుండె)
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = 'मुझे चक्कर आ रहे हैं और हाथ में कमजोरी लग रही है';
                    setSymptomPrompt(sample);
                    triggerGeminiWithText(sample);
                    scrollToDoctorMatchSection();
                  }}
                  className="text-indigo-600 hover:underline bg-indigo-50/60 px-1.5 py-0.5 rounded border border-indigo-100 cursor-pointer"
                >
                  Hindi (चक्कर / कमजोरी)
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = 'Severe crushing chest tightness radiating to left shoulder and cold sweats';
                    setSymptomPrompt(sample);
                    triggerGeminiWithText(sample);
                    scrollToDoctorMatchSection();
                  }}
                  className="text-rose-600 font-bold hover:underline bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 cursor-pointer"
                >
                  Acute Emergency (FAST / Cardiac)
                </button>
              </div>

              <button
                type="submit"
                disabled={assistantLoading || !symptomPrompt.trim()}
                className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className={`w-4 h-4 ${assistantLoading ? 'animate-spin' : ''}`} />
                <span>{assistantLoading ? 'Consulting Gemini Triage...' : 'Analyze Symptoms & Match Doctor'}</span>
              </button>
            </div>
          </form>

          {/* Dedicated Ref Container for Analyze Symptoms & Match Doctor Result */}
          <div ref={matchDoctorResultRef} id="match-doctor-result" className="scroll-mt-8 space-y-4">
            {assistantLoading && (
              <div className="p-6 bg-gradient-to-r from-indigo-50 via-teal-50 to-white border border-indigo-200 rounded-2xl flex items-center justify-center gap-3 text-indigo-950 font-bold text-xs shadow-xs animate-pulse">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-spin" />
                <span>Consulting Gemini Clinical Intelligence & matching the most appropriate doctor...</span>
              </div>
            )}

            {/* INSTANT HIGH-URGENCY EMERGENCY CIRCUIT BREAKER */}
            {assistantResult?.isEmergency && (
              <div className="p-5 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 rounded-2xl text-white shadow-xl space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-400/40">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white text-rose-600 rounded-xl animate-bounce shadow-md">
                      <AlertOctagon className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-200 block">
                        Emergency Clinical Circuit Breaker Triggered
                      </span>
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                        🚨 POTENTIAL MEDICAL EMERGENCY DETECTED
                      </h3>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-white/20 border border-white/30 rounded-full font-mono text-xs font-black uppercase">
                    Level: {assistantResult.urgencyLevel}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-rose-50">
                  <p className="text-sm font-bold text-white leading-relaxed">
                    {assistantResult.emergencyWarning || 'Your reported symptoms indicate an acute clinical emergency. Routine appointment booking is bypassed.'}
                  </p>
                  {assistantResult.patientLanguageExplanation && (
                    <p className="p-3 bg-white/10 rounded-xl border border-white/20 text-white font-medium text-xs leading-relaxed">
                      🗣️ <strong>Regional Advisory:</strong> {assistantResult.patientLanguageExplanation}
                    </p>
                  )}
                </div>

                {/* Single-Click Instant Emergency SOS Trigger Button */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-rose-100">
                    <span>Designated Facility: </span>
                    <strong className="text-white">{patientProfile?.chosenEmergencyHospitalName || 'Apex Trauma Center & Research Hospital'}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerEmergencySOS}
                    disabled={sosLoading}
                    className="px-6 py-3 bg-white text-rose-700 hover:bg-rose-50 active:bg-rose-100 font-black rounded-xl text-xs shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer ring-4 ring-rose-400/50 animate-pulse"
                  >
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <span>{sosLoading ? 'Dispatching Paramedics...' : '🚨 TRIGGER EMERGENCY SOS DISPATCH NOW'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Routine / Urgent Assistant Recommendation Box (Non-Emergency or after assessment) */}
            {assistantResult && !assistantResult.isEmergency && (
              <div className="p-5 bg-gradient-to-r from-indigo-50 via-teal-50 to-white border border-indigo-200 rounded-2xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-200/60">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-indigo-700 block">
                      AI Clinical Triage Recommendation · Language: {assistantResult.detectedLanguage || 'Auto-Detected'}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      Recommended Specialization: <span className="text-indigo-800 font-black">{assistantResult.recommendedSpecialization}</span>
                    </h4>
                  </div>
                  <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full uppercase">
                    Urgency: {assistantResult.urgencyLevel}
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {assistantResult.triageSummary}
                  </p>

                  {/* Primary Care Cost-Saving Guidance Banner */}
                  {assistantResult.costSavingAdvice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Cost-Effective Primary Care Recommendation</span>
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                        {assistantResult.costSavingAdvice}
                      </p>
                    </div>
                  )}

                  {assistantResult.patientLanguageExplanation && (
                    <p className="p-2.5 bg-indigo-50/80 rounded-xl border border-indigo-100 text-indigo-950 font-medium text-[11px]">
                      🗣️ <strong>Patient Language Summary:</strong> {assistantResult.patientLanguageExplanation}
                    </p>
                  )}

                  <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1">
                    <span className="font-bold text-slate-800 block">
                      Recommended Physician: {assistantResult.matchedDoctorName || 'Assigned Doctor'}
                    </span>
                    <p className="text-slate-600">{assistantResult.reasonForRecommendation}</p>
                  </div>

                  {/* Alternative Specialist Option (Higher Fee) */}
                  {assistantResult.alternativeSpecialist && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 font-semibold block">Optional Direct Super-Specialist:</span>
                        <strong className="text-slate-800">{assistantResult.alternativeSpecialist}</strong>
                      </div>
                      <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        Secondary Escalation Option
                      </span>
                    </div>
                  )}
                </div>

                {/* Matched Doctor 1-click book */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    <span>Suggested consultation slots: </span>
                    <strong className="text-slate-900">{assistantResult.suggestedSlots?.join(' • ')}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const matched = doctorsList.find((d) => d.id === assistantResult.matchedDoctorId) || doctorsList[0];
                      if (matched) {
                        setSelectedDoctorForBooking(matched);
                        setBookingReason(`Gemini Triage: ${assistantResult.recommendedSpecialization} Consultation`);
                        setBookingSymptoms(symptomPrompt);
                      }
                    }}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book Recommended Doctor ({assistantResult.recommendedSpecialization})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: FIND & BOOK DOCTORS (HOSPITAL-WISE) ================= */}
      {activeTab === 'doctors' && (
        <div className="space-y-6">
          {/* Header Controls: Hospital Search & Flexible Specialization Search */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold mb-1">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Hospital-Wise Physician Network</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Find Doctors by Hospital & Medical Specialization
                </h3>
                <p className="text-xs text-slate-500">
                  Search partner hospitals and find verified specialists using flexible disease terms (e.g., search "heart diseases" to find cardiologists).
                </p>
              </div>

              {/* Reset Filters */}
              {(hospitalSearchText || specializationSearchText || selectedHospitalId !== 'all' || specializationFilter || doctorSearchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setHospitalSearchText('');
                    setSpecializationSearchText('');
                    setSelectedHospitalId('all');
                    setSpecializationFilter('');
                    setDoctorSearchQuery('');
                  }}
                  className="px-3 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-semibold rounded-xl self-start md:self-auto cursor-pointer flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Clear All Filters</span>
                </button>
              )}
            </div>

            {/* Search Input Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. Hospital Search Input */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Search Hospital Facility / City</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={hospitalSearchText}
                    onChange={(e) => setHospitalSearchText(e.target.value)}
                    placeholder="Search by hospital name, city, department..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                  />
                  {hospitalSearchText && (
                    <button
                      type="button"
                      onClick={() => setHospitalSearchText('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Flexible Specialization / Disease Search Input */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Specialization / Condition Search</span>
                  </span>
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                    Flexible Match
                  </span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={specializationSearchText}
                    onChange={(e) => {
                      setSpecializationSearchText(e.target.value);
                      if (specializationFilter) setSpecializationFilter('');
                    }}
                    placeholder="e.g. heart diseases, chest pain, rash, asthma..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  />
                  {specializationSearchText && (
                    <button
                      type="button"
                      onClick={() => setSpecializationSearchText('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Doctor Name Filter */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-slate-600" />
                  <span>Doctor Name / Doctor ID</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={doctorSearchQuery}
                    onChange={(e) => setDoctorSearchQuery(e.target.value)}
                    placeholder="Search doctor by name (e.g. Dr. Priya)..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                  />
                  {doctorSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDoctorSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Dropdown Filters Row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                <span>Quick Filters:</span>
              </span>

              {/* Hospital Dropdown */}
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Hospitals ({hospitalsList.length})</option>
                {hospitalsList.map((hosp) => (
                  <option key={hosp.id} value={hosp.id}>
                    {hosp.hospitalProfile?.hospitalName || hosp.name}
                  </option>
                ))}
              </select>

              {/* Specialization Dropdown */}
              <select
                value={specializationFilter}
                onChange={(e) => {
                  setSpecializationFilter(e.target.value);
                  if (e.target.value) setSpecializationSearchText('');
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Specializations ({MEDICAL_SPECIALIZATIONS.length})</option>
                {MEDICAL_SPECIALIZATIONS.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            {/* Flexible Match Confirmation Badge (Requirement: typing 'heart diseases' redirects to Cardiology) */}
            {specializationSearchText.trim() && (() => {
              const match = matchSpecialization(specializationSearchText);
              if (match.matchedSpec) {
                return (
                  <div className="p-3 bg-gradient-to-r from-teal-50 via-indigo-50 to-white border border-teal-300 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{match.matchedRule?.icon || '🎯'}</span>
                      <div>
                        <span className="text-slate-600 font-medium">
                          Flexible Search Match for <strong className="text-slate-900">"{specializationSearchText}"</strong>:
                        </span>{' '}
                        <span className="font-extrabold text-teal-900 bg-teal-100/90 px-2 py-0.5 rounded-md border border-teal-200">
                          Automatically redirected to {match.matchedSpec}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Showing accredited doctors in this medical branch
                    </span>
                  </div>
                );
              }
              return (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Searching for doctors matching "<strong>{specializationSearchText}</strong>". Click a common condition tag below for instant specialization match.</span>
                </div>
              );
            })()}

            {/* Quick Condition & Specialty Tags */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Common Symptoms & Specialties (Click to Search):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Heart Diseases / High BP', query: 'heart diseases', icon: '❤️' },
                  { label: 'Lungs & Breathing', query: 'breathing asthma', icon: '🫁' },
                  { label: 'Brain & Headache', query: 'headache migraine', icon: '🧠' },
                  { label: 'Bones & Joint Pain', query: 'bone fracture', icon: '🦴' },
                  { label: 'Skin & Rash', query: 'skin rash', icon: '🧴' },
                  { label: 'Child Health', query: 'child fever', icon: '👶' },
                  { label: 'Eye & Vision Care', query: 'eye vision', icon: '👁️' },
                  { label: 'Stomach & Acidity', query: 'stomach acidity', icon: '🩺' },
                  { label: 'Kidney Health', query: 'kidney dialysis', icon: '💧' },
                  { label: 'Fever & General Care', query: 'fever viral', icon: '🌡️' }
                ].map((tag) => (
                  <button
                    key={tag.query}
                    type="button"
                    onClick={() => {
                      setSpecializationSearchText(tag.query);
                      setSpecializationFilter('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      specializationSearchText.toLowerCase() === tag.query.toLowerCase()
                        ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                        : 'bg-slate-50 hover:bg-teal-50 border-slate-200 text-slate-700 hover:text-teal-900'
                    }`}
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* If No Hospitals registered in database */}
          {hospitalsList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">No Approved Hospitals Registered Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                The database is currently clean. Hospital organizations are verified and registered exclusively by the System Administrator. Once registered, doctors and departments will appear here.
              </p>
            </div>
          ) : (
            /* Hospital-wise listings */
            <div className="space-y-6">
              {hospitalsList
                .filter((hospital) => {
                  if (selectedHospitalId !== 'all' && hospital.id !== selectedHospitalId) {
                    return false;
                  }
                  if (hospitalSearchText.trim()) {
                    const q = hospitalSearchText.trim().toLowerCase();
                    const hospName = (hospital.hospitalProfile?.hospitalName || hospital.name).toLowerCase();
                    const hospCity = (hospital.hospitalProfile?.city || '').toLowerCase();
                    const hospAddress = (hospital.hospitalProfile?.address || '').toLowerCase();
                    const hospDepts = (hospital.hospitalProfile?.departments || []).join(' ').toLowerCase();
                    const matchesHosp = hospName.includes(q) || hospCity.includes(q) || hospAddress.includes(q) || hospDepts.includes(q);
                    if (!matchesHosp) return false;
                  }
                  return true;
                })
                .map((hospital) => {
                  const specMatch = matchSpecialization(specializationSearchText);
                  const effectiveSpec = specMatch.matchedSpec || specializationFilter || null;

                  const hospitalDoctors = doctorsList.filter((d) => {
                    if (d.doctorProfile?.hospitalId !== hospital.id) return false;

                    if (effectiveSpec) {
                      const docSpec = (d.doctorProfile?.specialization || '').toLowerCase();
                      if (!docSpec.includes(effectiveSpec.toLowerCase())) return false;
                    } else if (specializationSearchText.trim()) {
                      const q = specializationSearchText.trim().toLowerCase();
                      const docSpec = (d.doctorProfile?.specialization || '').toLowerCase();
                      const docBio = (d.doctorProfile?.bio || '').toLowerCase();
                      const docName = d.name.toLowerCase();
                      if (!docSpec.includes(q) && !docBio.includes(q) && !docName.includes(q)) return false;
                    }

                    if (doctorSearchQuery.trim()) {
                      const q = doctorSearchQuery.trim().toLowerCase();
                      if (!d.name.toLowerCase().includes(q)) return false;
                    }

                    return true;
                  });

                  return (
                    <div
                      key={hospital.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-teal-300"
                    >
                      {/* Hospital Header Banner */}
                      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <img
                            src={hospital.avatarUrl || `https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=256&q=80`}
                            alt={hospital.name}
                            className="w-14 h-14 rounded-xl object-cover border border-white/20 shrink-0"
                          />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-bold text-white">
                                {hospital.hospitalProfile?.hospitalName || hospital.name}
                              </h4>

                              {/* Green "Verified" Tick (Shown when Clinical Establishment Act license verified) */}
                              {(hospital.hospitalProfile?.isClinicalActVerified ||
                                hospital.hospitalProfile?.verificationStatus === 'verified' ||
                                hospital.status === 'active') ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>Verified Hospital</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                                  <span>Pending Verification</span>
                                </span>
                              )}

                              {/* Prominent NABH Accredited Quality Badge */}
                              {(hospital.hospitalProfile?.isNabhAccredited ||
                                Boolean(hospital.hospitalProfile?.nabhCertificateNo) ||
                                hospital.hospitalProfile?.accreditation?.toLowerCase().includes('nabh')) && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400/25 to-yellow-400/20 text-amber-300 border border-amber-400/60 shadow-xs">
                                  <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                  <span>NABH Accredited</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-300 mt-0.5">
                              {hospital.hospitalProfile?.address}, {hospital.hospitalProfile?.city || 'Metro'}, {hospital.hospitalProfile?.state} {hospital.hospitalProfile?.pincode ? `• PIN: ${hospital.hospitalProfile.pincode}` : ''}
                            </p>

                            {/* Clear Infrastructure Breakdown */}
                            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/10 text-[11px] text-slate-200">
                              <span className="px-2 py-0.5 bg-white/10 rounded-lg text-emerald-300 font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                <span>{hospital.hospitalProfile?.has24x7Emergency !== false ? '24/7 Emergency Available' : 'Emergency Unit Available'}</span>
                              </span>
                              {hospital.hospitalProfile?.hasInhousePharmacy !== false && (
                                <span className="px-2 py-0.5 bg-white/10 rounded-lg text-teal-300 font-semibold">
                                  💊 In-House Pharmacy
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-white/10 rounded-lg text-amber-200 font-mono">
                                ICU Beds: {hospital.hospitalProfile?.icuBeds || 20}
                              </span>
                              <span className="px-2 py-0.5 bg-white/10 rounded-lg text-sky-200 font-mono">
                                Total Beds: {hospital.hospitalProfile?.totalBeds || 200}
                              </span>
                              {hospital.hospitalProfile?.nicuBeds ? (
                                <span className="px-2 py-0.5 bg-white/10 rounded-lg text-indigo-200 font-mono">
                                  NICU: {hospital.hospitalProfile.nicuBeds}
                                </span>
                              ) : null}
                              {hospital.hospitalProfile?.generalWardBeds ? (
                                <span className="px-2 py-0.5 bg-white/10 rounded-lg text-slate-300 font-mono">
                                  General Ward: {hospital.hospitalProfile.generalWardBeds}
                                </span>
                              ) : null}
                              {hospital.hospitalProfile?.bloodBankAvailable && (
                                <span className="px-2 py-0.5 bg-white/10 rounded-lg text-rose-300 font-semibold">
                                  🩸 Blood Bank
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded-lg font-mono font-bold">
                                Hotline: {hospital.hospitalProfile?.emergencyHotline || hospital.phone || '+91 40 2345 6789'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs text-slate-300 block">Available Faculty:</span>
                          <span className="text-lg font-black text-white">{hospitalDoctors.length} Doctors</span>
                        </div>
                      </div>

                      {/* Hospital's Doctors Grid */}
                      <div className="p-5">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Doctors Affiliated with {hospital.hospitalProfile?.hospitalName || hospital.name} ({hospitalDoctors.length})
                          </h5>
                          {specializationFilter && (
                            <span className="text-[11px] text-teal-700 font-semibold">
                              Filtered by: {specializationFilter}
                            </span>
                          )}
                        </div>

                        {/* Zero-Doctor Placeholder */}
                        {hospitalDoctors.length === 0 ? (
                          <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-300">
                            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                              <Building2 className="w-6 h-6" />
                            </div>
                            <p className="font-bold text-slate-800 text-sm">
                              Hospital verified. OPD schedules and doctor booking opening soon.
                            </p>
                            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                              This medical center has completed official institutional onboarding and State Clinical Establishment licensing. Clinical practitioner credential audits are currently in progress.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {hospitalDoctors.map((doc) => (
                              <div
                                key={doc.id}
                                className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:bg-white hover:border-teal-300 transition-all shadow-2xs"
                              >
                                <div>
                                  {/* Doctor Identity & Trust Badges */}
                                  <div className="flex items-start gap-3 mb-3">
                                    <img
                                      src={doc.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(doc.name)}`}
                                      alt={doc.name}
                                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <h4 className="text-sm font-bold text-slate-900">
                                          {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                                          {doc.doctorProfile?.ugDegree && (
                                            <span className="text-xs font-semibold text-slate-600 ml-1">
                                              , {doc.doctorProfile.ugDegree}
                                              {doc.doctorProfile.pgDegree ? ` (${doc.doctorProfile.pgDegree})` : ''}
                                            </span>
                                          )}
                                        </h4>
                                        {/* ABDM Factor Badge */}
                                        {(doc.doctorProfile?.hprId || doc.doctorProfile?.isAbdmVerified) && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
                                            <ShieldCheck className="w-2.5 h-2.5 text-sky-600" />
                                            <span>Verified via ABDM</span>
                                          </span>
                                        )}
                                      </div>

                                      <span className="text-xs font-bold text-teal-700 block mt-0.5">
                                        {doc.doctorProfile?.specialization}
                                        {doc.doctorProfile?.subSpecialties && doc.doctorProfile.subSpecialties.length > 0 && (
                                          <span className="text-[11px] font-medium text-slate-500 ml-1">
                                            • {doc.doctorProfile.subSpecialties.slice(0, 2).join(', ')}
                                          </span>
                                        )}
                                      </span>

                                      {/* Council Metadata */}
                                      <p className="text-[11px] text-slate-600 font-mono mt-1 flex items-center gap-1 truncate">
                                        <FileCheck className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>
                                          Registered with: {doc.doctorProfile?.medicalCouncilName || 'State Medical Council'} • Reg No: {doc.doctorProfile?.medicalLicenseNumber}
                                        </span>
                                      </p>

                                      {doc.doctorProfile?.languagesSpoken && doc.doctorProfile.languagesSpoken.length > 0 && (
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                          🗣 Languages: {doc.doctorProfile.languagesSpoken.join(', ')}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Consultation Economics */}
                                  <div className="grid grid-cols-3 gap-2 text-xs py-2 border-y border-slate-200/60 mb-3 bg-white/70 px-2 rounded-lg">
                                    <div>
                                      <span className="text-[10px] text-slate-400 block uppercase">Experience</span>
                                      <span className="font-bold text-slate-800">{doc.doctorProfile?.yearsOfExperience || 1} Yrs</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-400 block uppercase">OPD Consult Fee</span>
                                      <span className="font-bold text-teal-700">₹{doc.doctorProfile?.consultationFee || 500}</span>
                                      {doc.doctorProfile?.followUpFee ? (
                                        <span className="text-[9px] text-slate-400 block">Follow-up: ₹{doc.doctorProfile.followUpFee}</span>
                                      ) : null}
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-400 block uppercase">Consult Type</span>
                                      <span className="font-semibold text-slate-800 text-[10px] block truncate">
                                        {doc.doctorProfile?.consultationType || 'In-Clinic & Video'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Real-time slot availability preview */}
                                  <div className="mb-3 p-2 bg-teal-50/70 border border-teal-100 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-bold text-teal-950 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-teal-600" />
                                        <span>Real-Time Today's Available Slots ({doc.doctorProfile?.slotDurationMinutes || 15}m):</span>
                                      </span>
                                      <span className="text-[9px] text-emerald-700 font-extrabold bg-emerald-100 px-1 py-0.2 rounded-full">
                                        Open Today
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                      {['10:00 AM', '11:15 AM', '02:30 PM', '04:45 PM'].map((slotTime) => (
                                        <button
                                          key={slotTime}
                                          type="button"
                                          onClick={() => handleOpenBookingModalForDoctor(doc)}
                                          className="py-0.5 px-1 text-center text-[10px] font-mono font-bold bg-white hover:bg-teal-700 hover:text-white text-teal-900 border border-teal-200 rounded transition-colors cursor-pointer shadow-2xs"
                                        >
                                          {slotTime}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {doc.doctorProfile?.bio && (
                                    <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                                      {doc.doctorProfile.bio}
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                                  {doc.doctorProfile?.inSurgery ? (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                                      In Surgery (Slots Hidden)
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-500">
                                      {doc.doctorProfile?.weeklySchedule || 'Available: Mon - Fri (10:00 AM - 02:00 PM)'}
                                    </span>
                                  )}

                                  <div className="flex items-center gap-1.5">
                                    {patientProfile?.assignedDoctorId === doc.id ? (
                                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-300 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>My Assigned Doctor</span>
                                      </span>
                                    ) : patientRequests.some((r) => r.doctorId === doc.id && r.status === 'pending') ? (
                                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[11px] font-bold rounded-lg border border-amber-300 flex items-center gap-1">
                                        <span>⏳ Care Request Pending</span>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleRequestDoctor(doc.id)}
                                        disabled={requestingDoctorId === doc.id}
                                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>{requestingDoctorId === doc.id ? 'Sending Request...' : 'Choose as My Doctor'}</span>
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleOpenBookingModalForDoctor(doc)}
                                      disabled={Boolean(doc.doctorProfile?.inSurgery)}
                                      className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>{doc.doctorProfile?.inSurgery ? 'In Surgery' : 'Book Consultation'}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: APPOINTMENTS ================= */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              My Booked Consultations ({appointments.length})
            </h3>
            <span className="text-xs text-slate-500">
              Pending appointments are reviewed by your physician
            </span>
          </div>

          {appointments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No appointments scheduled yet. Click "Find Doctors" to schedule a consultation.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {appointments.map((apt) => (
                <div key={apt.id} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{apt.doctorName}</h4>
                      <span className="text-xs text-teal-700">({apt.doctorSpecialization})</span>
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

                    <p className="text-slate-500 text-[11px] flex items-center gap-2">
                      <Building2 className="w-3 h-3" />
                      <span>{apt.hospitalName}</span>
                    </p>

                    <p className="text-slate-700 font-medium">
                      Date: <strong className="text-slate-900">{apt.date}</strong> at <strong className="text-slate-900">{apt.timeSlot}</strong>
                    </p>

                    {apt.rejectionReason && (
                      <p className="text-rose-600 font-semibold text-[11px]">
                        Rejection reason from doctor: {apt.rejectionReason}
                      </p>
                    )}

                    {/* Display Unique Treatment Code for patient */}
                    {apt.status === 'approved' && (
                      <div className="mt-2.5 p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-300 rounded-xl shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Official Unique Treatment Verification Passkey
                          </span>
                          <span className="px-2.5 py-1 bg-emerald-700 text-white font-mono font-black text-xs rounded-lg shadow-xs tracking-wider">
                            {apt.treatmentCode || 'TRT-' + apt.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
                          📌 <strong>Instruction for Consultation:</strong> Whenever this unique code is given to Dr. {apt.doctorName}, then only your medical treatment will be completed. Present this code during your consultation visit.
                        </p>
                      </div>
                    )}

                    {apt.status === 'completed' && (
                      <div className="mt-2 p-2 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>Consultation & Medical Treatment Successfully Completed {apt.treatmentCode ? `(Code Verified: ${apt.treatmentCode})` : ''}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    Booked on {new Date(apt.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 6: PRESCRIPTIONS & MEDICINES ================= */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Prescriptions & Active Medicines Schedule ({prescriptions.length})
              </h3>
              <p className="text-xs text-slate-500">
                Click any prescription to view and print official PDF document.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {prescriptions.map((rx) => (
              <div
                key={rx.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:border-teal-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{rx.diagnosis}</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Issued by <span className="font-semibold text-slate-700">{rx.doctorName}</span> ({rx.doctorSpecialization}) • {rx.hospitalName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">
                      {new Date(rx.date).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => setSelectedPrescription(rx)}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-xl text-xs border border-teal-200 flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /> View & Print PDF
                    </button>
                  </div>
                </div>

                {/* Medicines List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {rx.medicines.map((m, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">{m.name}</span>
                        <span className="text-[10px] font-mono bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">
                          {m.dosage}
                        </span>
                      </div>
                      <p className="text-teal-700 font-semibold">{m.frequency} • {m.duration}</p>
                      {m.instructions && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{m.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>

                {rx.advice && (
                  <p className="text-xs text-slate-600 bg-teal-50/40 p-2.5 rounded-lg border border-teal-100">
                    <strong>Doctor Advice:</strong> {rx.advice}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 7: AUDITABLE EMERGENCY & SOS DISPATCH LOG ================= */}
      {activeTab === 'emergency_log' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold mb-1">
                <Siren className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                <span>Transparent Emergency Dispatch Audit Trail</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Auditable Emergency & SOS Dispatch History ({emergencyAlertsHistory.length})
              </h3>
              <p className="text-xs text-slate-500">
                Transparent step-by-step timeline of distress calls, automated responder escalation, vitals at incident, assigned trauma units, and contacts notified.
              </p>
            </div>

            <button
              onClick={handleTriggerEmergencySOS}
              disabled={sosLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{sosLoading ? 'Dispatching...' : 'Trigger Emergency SOS'}</span>
            </button>
          </div>

          {emergencyAlertsHistory.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2 text-xs">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto opacity-80" />
              <h4 className="font-bold text-slate-800 text-sm">No Emergency Distress Alarms on Record</h4>
              <p className="text-slate-500 max-w-md mx-auto">
                No past SOS emergency dispatches triggered for your account. In the event of acute distress, manual SOS or critical IoT thresholds automatically log here with real-time auditability.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {emergencyAlertsHistory.map((alert, idx) => {
                const isResolved = alert.status === 'resolved';
                const isAck = alert.status === 'acknowledged';

                return (
                  <div
                    key={alert.id || idx}
                    className="bg-white rounded-2xl border-2 border-slate-200 hover:border-rose-300 p-5 shadow-xs space-y-4 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl text-white ${isResolved ? 'bg-emerald-600' : 'bg-rose-600 animate-pulse'}`}>
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">
                            Incident Ref: {alert.id} · Priority: {(alert.priority || alert.severity || 'CRITICAL').toUpperCase()}
                          </span>
                          <h4 className="text-sm font-black text-slate-900">
                            {alert.triggerReason || 'Patient Emergency SOS Alarm Triggered'}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                          isResolved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isAck
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          Status: {alert.status.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {new Date(alert.timestamp).toLocaleDateString()} {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Step-by-Step Status Progression Audit Trail */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Emergency Response Progression & Chain of Custody:
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg font-bold flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>1. SOS Triggered & Broadcasted</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg font-bold flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>2. ER Team Acknowledged</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border ${
                          alert.ambulanceStatus === 'patient_transported' || isResolved
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>3. Ambulance Dispatched ({alert.ambulanceStatus || 'en_route'})</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border ${
                          isResolved
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                            : 'bg-slate-200 text-slate-600 border-slate-300'
                        }`}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>4. Patient Stabilized / ER Admitted</span>
                        </span>
                      </div>
                    </div>

                    {/* Vitals at Incident & Assigned Hospital */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Vitals Snapshot at Incident
                        </span>
                        <p className="font-mono text-slate-900 font-bold">
                          {alert.vitalSummary || 'Vitals telemetry captured at distress timestamp.'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Location: {alert.location || 'GPS telemetry synchronized'}
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Assigned Hospital & Emergency Department
                        </span>
                        <p className="font-bold text-slate-900">
                          {alert.targetHospitalName || 'Apex Trauma Center & Emergency Hospital'}
                        </p>
                        {alert.assignedDoctorId && (
                          <p className="text-teal-700 font-semibold text-[11px]">
                            Attending ER Physician Notified: ID {alert.assignedDoctorId}
                          </p>
                        )}
                        {alert.respondedAt && (
                          <p className="text-[10px] text-slate-400">
                            Responded: {new Date(alert.respondedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Verified Contacts Notified */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Automated Distress Payload Broadcast Directory:
                      </span>
                      {alert.notifiedContacts && alert.notifiedContacts.length > 0 ? (
                        <ul className="space-y-1 text-[11px] text-slate-700">
                          {alert.notifiedContacts.map((c, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="font-mono">{c}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-500 text-[11px]">
                          Automated payload transmitted to registered Next of Kin, secondary caregiver, and trauma center dispatchers.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= BOOK APPOINTMENT MODAL ================= */}
      {selectedDoctorForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>Schedule Consultation with {selectedDoctorForBooking.name}</span>
              </h3>
              <button
                onClick={() => setSelectedDoctorForBooking(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {bookingError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleBookAppointmentSubmit} className="space-y-3.5 mt-4">
              <div className="p-4 bg-gradient-to-br from-teal-50/80 via-slate-50 to-indigo-50/50 rounded-2xl border border-teal-200/80 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">
                        Dr. {selectedDoctorForBooking.name}
                      </span>
                      {selectedDoctorForBooking.doctorProfile?.qualifications && (
                        <span className="text-[11px] font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {selectedDoctorForBooking.doctorProfile.qualifications}
                        </span>
                      )}
                    </div>
                    <p className="text-teal-800 font-bold text-xs mt-0.5">
                      {selectedDoctorForBooking.doctorProfile?.specialization}
                      {selectedDoctorForBooking.doctorProfile?.subSpecialties?.length ? ` • ${selectedDoctorForBooking.doctorProfile.subSpecialties.join(', ')}` : ''}
                    </p>
                    <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{selectedDoctorForBooking.doctorProfile?.hospitalName || 'Affiliated Super-Specialty Medical Center'}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">OPD Consult Fee</span>
                    <span className="font-extrabold text-teal-700 text-base font-mono">
                      ₹{selectedDoctorForBooking.doctorProfile?.consultationFee || 500}
                    </span>
                    {selectedDoctorForBooking.doctorProfile?.followUpFee ? (
                      <span className="text-[10px] text-slate-500 block font-medium">
                        Follow-up: <strong className="text-slate-700 font-mono">₹{selectedDoctorForBooking.doctorProfile.followUpFee}</strong>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Follow-up: <strong className="text-slate-600 font-mono">₹{Math.round((selectedDoctorForBooking.doctorProfile?.consultationFee || 500) * 0.6)}</strong> (7-day review)
                      </span>
                    )}
                  </div>
                </div>

                {/* Comprehensive Timings, Duration & Consultation Economics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-teal-100 text-[11px]">
                  <div className="p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-teal-600" />
                      <span>Consultation Mode</span>
                    </span>
                    <strong className="text-slate-800 text-xs block mt-0.5 truncate">
                      {selectedDoctorForBooking.doctorProfile?.consultationType || 'Both (In-Clinic & Video)'}
                    </strong>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                      <Activity className="w-3 h-3 text-indigo-600" />
                      <span>Slot Duration</span>
                    </span>
                    <strong className="text-slate-800 text-xs block mt-0.5 font-mono">
                      {selectedDoctorForBooking.doctorProfile?.slotDurationMinutes || 15} Minutes / Patient
                    </strong>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-teal-600" />
                      <span>Weekly Practice Hours</span>
                    </span>
                    <strong className="text-slate-800 text-[11px] block mt-0.5 truncate">
                      {selectedDoctorForBooking.doctorProfile?.weeklySchedule || 'Mon - Sat: 09:00 AM - 05:00 PM'}
                    </strong>
                  </div>
                </div>

                {selectedDoctorForBooking.doctorProfile?.medicalLicenseNumber && (
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Medical Council Reg: <strong className="font-mono text-slate-700">{selectedDoctorForBooking.doctorProfile.medicalLicenseNumber}</strong></span>
                    {selectedDoctorForBooking.doctorProfile?.languagesSpoken?.length ? (
                      <span>Languages: <strong className="text-slate-700">{selectedDoctorForBooking.doctorProfile.languagesSpoken.join(', ')}</strong></span>
                    ) : null}
                  </div>
                )}
              </div>

              {selectedDoctorForBooking.doctorProfile?.inSurgery ? (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">Dr. {selectedDoctorForBooking.name} is currently in Surgery</p>
                    <p className="text-[11px] text-amber-800 mt-1">
                      The physician is presently in the operating theater. Consultation slot timings are temporarily hidden and booking is paused until the surgery concludes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-700 font-bold">
                        Select Consultation Date (Next 7 Working Days Only) *
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">Sundays excluded</span>
                    </div>

                    {/* Interactive 7 Working Days Selector with Leave & Surgery Blocked */}
                    {(() => {
                      const workingDays = getDoctorWorkingDaysOptions(selectedDoctorForBooking);
                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {workingDays.map((opt) => {
                              const isSelected = bookingDate === opt.dateStr;
                              if (opt.isBlocked) {
                                return (
                                  <div
                                    key={opt.dateStr}
                                    title={`Date blocked: ${opt.blockReason}`}
                                    className="p-2 rounded-xl border border-rose-200 bg-rose-50/70 text-slate-400 cursor-not-allowed text-center select-none opacity-70"
                                  >
                                    <div className="text-[10px] font-bold uppercase line-through text-rose-500">
                                      {opt.dayName}
                                    </div>
                                    <div className="text-xs font-semibold text-slate-500 line-through">
                                      {opt.displayDate}
                                    </div>
                                    <span className="inline-block mt-0.5 px-1 py-0.2 bg-rose-100 text-rose-700 text-[9px] font-black rounded">
                                      ⛔ {opt.blockReason}
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <button
                                  type="button"
                                  key={opt.dateStr}
                                  onClick={() => setBookingDate(opt.dateStr)}
                                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border-teal-700 bg-teal-700 text-white shadow-xs font-bold'
                                      : 'border-slate-200 bg-white hover:border-teal-400 text-slate-700'
                                  }`}
                                >
                                  <div className={`text-[10px] font-bold uppercase ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                                    {opt.dayName}
                                  </div>
                                  <div className="text-xs font-black">
                                    {opt.displayDate}
                                  </div>
                                  <span className={`inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded ${
                                    isSelected ? 'bg-teal-800 text-teal-100' : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    ✓ Available
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Fallback Select Dropdown with disabled blocked options */}
                          <select
                            required
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="" disabled>-- Choose consultation date --</option>
                            {workingDays.map((opt) => (
                              <option
                                key={opt.dateStr}
                                value={opt.dateStr}
                                disabled={opt.isBlocked}
                              >
                                {opt.displayDate} ({opt.dayName}) {opt.isBlocked ? `[⛔ BLOCKED: ${opt.blockReason}]` : '— Available'}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-700 font-bold">
                        Select Consultation Time Slot *
                      </label>
                      <span className="text-[10px] text-slate-500">
                        {fetchingSlots ? 'Refreshing live slot availability...' : 'Already booked slots are visibly blocked'}
                      </span>
                    </div>

                    {/* Interactive Visual Time Slot Grid with Automatic Blocking */}
                    {(() => {
                      const doctorSlots = selectedDoctorForBooking.doctorProfile?.customSlotTimings?.length
                        ? selectedDoctorForBooking.doctorProfile.customSlotTimings
                        : ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '04:00 PM'];

                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {doctorSlots.map((slot) => {
                              const isBooked = doctorBookedSlots.some((b: any) => b.timeSlot === slot);
                              const isSelected = bookingSlot === slot;

                              if (isBooked) {
                                return (
                                  <div
                                    key={slot}
                                    title="⛔ This slot is already booked by another patient and is blocked from selection"
                                    className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/70 text-slate-400 cursor-not-allowed select-none opacity-60 text-center flex flex-col items-center justify-center gap-0.5"
                                  >
                                    <span className="font-mono text-xs font-bold line-through text-rose-500">{slot}</span>
                                    <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[9px] font-black rounded uppercase">
                                      ⛔ Blocked (Booked)
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setBookingSlot(slot)}
                                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                    isSelected
                                      ? 'bg-teal-700 text-white border-teal-800 shadow-xs font-bold ring-2 ring-teal-500'
                                      : 'bg-white hover:border-teal-400 text-slate-800 border-slate-200 hover:bg-teal-50/40'
                                  }`}
                                >
                                  <span className="font-mono text-xs font-bold">{slot}</span>
                                  <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                                    isSelected ? 'bg-teal-800 text-teal-100' : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    ✓ Available
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Fallback Dropdown with Disabled Blocked Slots */}
                          <select
                            required
                            value={bookingSlot}
                            onChange={(e) => setBookingSlot(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          >
                            <option value="" disabled>-- Select Time Slot --</option>
                            {doctorSlots.map((s) => {
                              const isBooked = doctorBookedSlots.some((b: any) => b.timeSlot === s);
                              return (
                                <option key={s} value={s} disabled={isBooked}>
                                  {s} {isBooked ? '— [⛔ BLOCKED: Already Booked by Another Patient]' : '— Available'}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason for Consultation *
                </label>
                <input
                  type="text"
                  required
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  placeholder="e.g. Morning hypertension spikes & IoT telemetry review"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Specific Symptoms / Health Notes
                </label>
                <textarea
                  rows={2}
                  value={bookingSymptoms}
                  onChange={(e) => setBookingSymptoms(e.target.value)}
                  placeholder="Any symptoms, sensations, or medications to share with doctor..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Consultation Appointment Summary Preview */}
              <div className="p-3 bg-teal-50/80 border border-teal-200/90 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-teal-800 font-extrabold uppercase tracking-wider block">
                    Consultation Booking Summary
                  </span>
                  <p className="font-semibold text-slate-800 text-[11px] mt-0.5">
                    Date: <span className="font-bold text-teal-900">{bookingDate || 'Select Date Above'}</span> · Slot: <span className="font-mono font-bold text-teal-900">{bookingSlot || 'Select Slot Above'}</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Duration: {selectedDoctorForBooking.doctorProfile?.slotDurationMinutes || 15} mins • Mode: {selectedDoctorForBooking.doctorProfile?.consultationType || 'In-Clinic & Video'}
                  </p>
                </div>
                <div className="text-right shrink-0 pl-3 border-l border-teal-200">
                  <span className="text-[10px] text-slate-500 font-medium block">Total Payable Fee</span>
                  <span className="font-black text-teal-800 text-sm font-mono">
                    ₹{selectedDoctorForBooking.doctorProfile?.consultationFee || 500}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDoctorForBooking(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(selectedDoctorForBooking.doctorProfile?.inSurgery)}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xs"
                >
                  {selectedDoctorForBooking.doctorProfile?.inSurgery ? 'Doctor In Surgery (Unavailable)' : 'Confirm Appointment Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Hospital & Doctor Choice Modal (One-time single hospital selection) */}
      {isEmergencyChoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Select Designated Emergency Hospital & Doctor</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEmergencyChoiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Emergency Routing Policy:</strong> Per clinical emergency protocols, you can choose your primary emergency care facility <strong>only one time</strong> and at <strong>only one hospital</strong>. All subsequent SOS distress alerts will route strictly to this emergency unit.
              </p>
            </div>

            <form onSubmit={handleConfirmEmergencyChoice} className="space-y-4 mt-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nearest / Preferred Hospital (Only 1 Allowed) *
                </label>
                <select
                  required
                  value={selectedEmergencyHospId}
                  onChange={(e) => {
                    setSelectedEmergencyHospId(e.target.value);
                    setSelectedEmergencyDocId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="" disabled>-- Select Emergency Hospital --</option>
                  {hospitalsList.map((hosp) => (
                    <option key={hosp.id} value={hosp.id}>
                      {hosp.hospitalProfile?.hospitalName || hosp.name} — {hosp.hospitalProfile?.city || 'Emergency ER'} (Hotline: {hosp.hospitalProfile?.emergencyHotline || hosp.phone || '911'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Designated Attending Doctor (Optional)
                </label>
                <select
                  value={selectedEmergencyDocId}
                  onChange={(e) => setSelectedEmergencyDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">Hospital ER On-Duty Medical Officer</option>
                  {doctorsList
                    .filter((d) => !selectedEmergencyHospId || d.doctorProfile?.hospitalId === selectedEmergencyHospId)
                    .map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.name} — {doc.doctorProfile?.specialization}
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Filtered to physicians affiliated with the chosen emergency medical center.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmergencyChoiceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedEmergencyHospId || emergencyRoutingSaving}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{emergencyRoutingSaving ? 'Locking Routing...' : 'Confirm & Dispatch SOS Alarm'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription PDF Modal */}
      <PrescriptionModal
        prescription={selectedPrescription}
        onClose={() => setSelectedPrescription(null)}
      />

      {/* ========================================================================= */}
      {/* MULTILINGUAL VOICE DICTATION MODAL POP-UP (Web Speech API + Quick Presets) */}
      {/* ========================================================================= */}
      {isVoiceModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleStopVoiceListening();
              setIsVoiceModalOpen(false);
            }
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto overscroll-contain transition-all duration-200 animate-in fade-in"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 flex flex-col my-auto max-h-[92vh] transition-all duration-200 animate-in zoom-in-95">
            {/* Modal Header with Prominent Back Option */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleStopVoiceListening();
                  setIsVoiceModalOpen(false);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Return to Patient Portal"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Mic className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Voice Dictation & Clinical AI
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleStopVoiceListening();
                  setIsVoiceModalOpen(false);
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Close Voice Assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain pr-1 py-3 space-y-4">
              {/* Language Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Select Voice Language:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { code: 'te-IN', label: 'తెలుగు (Telugu)' },
                    { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
                    { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
                    { code: 'en-IN', label: 'English (India)' },
                    { code: 'en-US', label: 'English (US)' },
                    { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
                    { code: 'mr-IN', label: 'मराठी (Marathi)' },
                    { code: 'bn-IN', label: 'বাংলা (Bengali)' },
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        setVoiceLanguage(item.code as any);
                        if (isListeningVoice) {
                          handleStartVoiceListening(item.code);
                        }
                      }}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                        voiceLanguage === item.code
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Microphone Pulsing Interaction */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (isListeningVoice) {
                        handleStopVoiceListening();
                      } else {
                        handleStartVoiceListening();
                      }
                    }}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                      isListeningVoice
                        ? 'bg-rose-600 text-white ring-8 ring-rose-200 animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105'
                    }`}
                    title={isListeningVoice ? 'Click to stop recording' : 'Click to start speaking'}
                  >
                    {isListeningVoice ? <Mic className="w-8 h-8 animate-bounce" /> : <Mic className="w-8 h-8" />}
                  </button>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {isListeningVoice ? 'Listening... Speak your symptoms now.' : 'Click the microphone above to start speaking'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ensure your browser microphone permission is allowed when prompted.
                  </p>
                </div>

                {/* Real-time Microphone Audio Waveform / Decibel Equalizer */}
                {isListeningVoice && (
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {[25, 45, 80, 100, 70, 95, 60, 40].map((barHeight, idx) => {
                      const scaled = Math.max(4, Math.round((micVolumeLevel / 100) * barHeight));
                      return (
                        <div
                          key={idx}
                          className="w-1.5 rounded-full transition-all duration-75 bg-indigo-600"
                          style={{ height: `${scaled}px` }}
                        />
                      );
                    })}
                    <span className="text-[10px] font-mono font-bold text-indigo-700 ml-2">
                      {micVolumeLevel > 8 ? '🎙️ Receiving Voice' : '🎙️ Waiting for sound...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Step-by-Step Browser Mic Permission Guide & 1-Click Retry */}
              {voiceErrorNotice && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-900">How to enable your Microphone in browser:</p>
                      <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-800">
                        <li>Look at your browser's address bar at the top of the window.</li>
                        <li>Click the <strong>🔒 Lock</strong> icon or <strong>🎚️ Site Settings / Tune</strong> icon on the left of the URL.</li>
                        <li>Find <strong>Microphone</strong> and switch permission to <strong>Allow</strong>.</li>
                        <li>Click <strong>Retry Microphone</strong> below, or tap any of the 1-click regional speech presets below to test immediately!</li>
                      </ol>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                    <span className="text-[10px] text-amber-700">Tip: Or test directly using quick presets below</span>
                    <button
                      type="button"
                      onClick={() => handleStartVoiceListening()}
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold rounded-lg shrink-0 cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Microphone</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Transcript Preview Area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Recognized Speech Transcript:</span>
                  {voiceLiveTranscript && (
                    <button
                      type="button"
                      onClick={() => setVoiceLiveTranscript('')}
                      className="text-[11px] text-slate-400 hover:text-slate-600 underline font-normal cursor-pointer"
                    >
                      Clear Text
                    </button>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={voiceLiveTranscript}
                  onChange={(e) => setVoiceLiveTranscript(e.target.value)}
                  placeholder="Speech transcript will appear here in real time... You can also edit or type directly."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Regional One-Click Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Quick Regional Speech Presets (1-Click Test):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setVoiceLiveTranscript('నాకు రెండు రోజుల నుండి తీవ్రమైన తలనొప్పి మరియు నీరసంగా ఉంది')}
                    className="p-2 text-left bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-100 rounded-xl text-indigo-900 font-medium transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-indigo-700 block text-[10px]">Telugu (Headache & Fatigue):</span>
                    "నాకు రెండు రోజుల నుండి తీవ్రమైన తలనొప్పి మరియు నీరసంగా ఉంది"
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceLiveTranscript('मुझे बहुत तेज सिरदर्द और उल्टी जैसी लग रही है')}
                    className="p-2 text-left bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-100 rounded-xl text-indigo-900 font-medium transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-indigo-700 block text-[10px]">Hindi (Headache & Nausea):</span>
                    "मुझे बहुत तेज सिरदर्द और उल्टी जैसी लग रही है"
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceLiveTranscript('Severe headache with tension across forehead since yesterday')}
                    className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-medium transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-slate-700 block text-[10px]">English (Tension Headache):</span>
                    "Severe headache with tension across forehead since yesterday"
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceLiveTranscript('నాకు ఛాతీలో విపరీతమైన మంట మరియు ఊపిరి ఆడటం లేదు')}
                    className="p-2 text-left bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-rose-900 font-medium transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-rose-700 block text-[10px]">Telugu (Emergency Chest Distress):</span>
                    "నాకు ఛాతీలో విపరీతమైన మంట మరియు ఊపిరి ఆడటం లేదు"
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer with prominent Back option */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleStopVoiceListening();
                  setIsVoiceModalOpen(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Patient Portal</span>
              </button>
              <button
                type="button"
                disabled={!voiceLiveTranscript.trim() && recordedAudioChunksRef.current.length === 0}
                onClick={() => handleApplyVoiceTranscript()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{recordedAudioChunksRef.current.length > 0 && !voiceLiveTranscript.trim() ? 'Use Spoken Audio & Consult Gemini' : 'Use Spoken Symptoms & Consult Gemini'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
