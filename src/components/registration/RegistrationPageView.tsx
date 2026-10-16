import React, { useState, useEffect } from 'react';
import {
  Building2,
  Stethoscope,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Mail,
  Lock,
  Phone,
  MapPin,
  FileText,
  Activity,
  Bed,
  HeartPulse,
  Award,
  Sparkles,
  Info,
  ArrowLeft,
  RefreshCw,
  Key,
  Search,
  Loader2,
  Globe,
  Compass,
  Map,
  Navigation,
  Plus,
  Trash2,
  Clock,
  CreditCard,
  Check,
  Flame,
  ShieldAlert,
  DollarSign,
  Calendar,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { User, UserDocument, MEDICAL_SPECIALIZATIONS } from '../../types';
import { signInWithGooglePopup } from '../../services/firebaseAuth';
import { matchSpecialization } from '../../utils/specializationMatcher';
import { syncUserToFirestore } from '../../services/firestoreSync';
import { INDIA_STATES, INDIA_DISTRICTS, fetchIndiaPincodeDetails } from '../../utils/indiaLocations';
import { LocationMapModal, LocationSelectedData, loadGoogleMapsScript } from '../common/LocationMapModal';
import { SearchableCountrySelect } from '../common/SearchableCountrySelect';
import { LegalTermsModal } from '../common/LegalTermsModal';

export const INDIAN_LANGUAGES = [
  'English',
  'Hindi',
  'Telugu',
  'Tamil',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Bengali',
  'Gujarati',
  'Punjabi',
  'Odia',
  'Urdu',
];

export const INSURANCE_TPAS = [
  'Star Health & Allied Insurance',
  'HDFC ERGO General Insurance',
  'ICICI Lombard General Insurance',
  'Care Health Insurance',
  'Bajaj Allianz General Insurance',
  'Niva Bupa Health Insurance',
  'Reliance General Insurance',
  'New India Assurance',
  'SBI General Insurance',
  'ManipalCigna Health Insurance',
];

export const GOVT_HEALTH_SCHEMES = [
  'Ayushman Bharat / PM-JAY',
  'Aarogyasri / State Health Scheme',
  'Central Government Health Scheme (CGHS)',
  'Ex-Servicemen Contributory Health Scheme (ECHS)',
  'Employees State Insurance (ESI)',
];

export const MEDICAL_COUNCILS = [
  'National Medical Commission (NMC)',
  'Andhra Pradesh Medical Council (APMC)',
  'Telangana State Medical Council (TSMC)',
  'Karnataka Medical Council (KMC)',
  'Maharashtra Medical Council (MMC)',
  'Tamil Nadu Medical Council (TNMC)',
  'Delhi Medical Council (DMC)',
  'West Bengal Medical Council (WBMC)',
  'Kerala State Medical Council (KSMC)',
  'Uttar Pradesh Medical Council (UPMC)',
  'Gujarat Medical Council (GMC)',
];

interface PatientRegEmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

interface RegistrationPageViewProps {
  onOpenSignIn?: () => void;
  defaultRole?: 'hospital' | 'doctor' | 'patient';
  initialGoogleAccount?: { email: string; name: string } | null;
  onRegistrationComplete?: () => void;
}

export const RegistrationPageView: React.FC<RegistrationPageViewProps> = ({
  onOpenSignIn,
  defaultRole = 'hospital',
  initialGoogleAccount,
  onRegistrationComplete,
}) => {
  const { register, login, loginWithGoogle } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'hospital' | 'doctor' | 'patient'>(defaultRole);
  const [availableHospitals, setAvailableHospitals] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pre-load Google Maps SDK on mount for instant geocoding and map rendering
  useEffect(() => {
    loadGoogleMapsScript().catch((err) => console.warn('Google Maps script preload notice:', err));
  }, []);

  // Google Account Linking State
  const [linkedGoogleAccount, setLinkedGoogleAccount] = useState<{ email: string; name: string } | null>(null);

  // Document Upload States
  // Patient Documents (Aadhaar mandatory & optional additional document)
  const [patDocumentFile, setPatDocumentFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [patAadharFile, setPatAadharFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [patAdditionalDocFile, setPatAdditionalDocFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  // Doctor Documents
  const [docGovtIdFile, setDocGovtIdFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [docLicenseFile, setDocLicenseFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [docDegreeFile, setDocDegreeFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  // Hospital Documents (Part 2 Trust & Compliance)
  const [hospLicenseFile, setHospLicenseFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [hospLogoFile, setHospLogoFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [hospAccreditationFile, setHospAccreditationFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [hospPanGstFile, setHospPanGstFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [hospFireNocFile, setHospFireNocFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);
  const [hospPcbFile, setHospPcbFile] = useState<{ name: string; type: string; dataUrl: string; size: string } | null>(null);

  // Legal Terms & Privacy Modal
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'agreement' | 'privacy'>('agreement');
  const [inPageLegalTab, setInPageLegalTab] = useState<'agreement' | 'privacy'>('agreement');

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (doc: { name: string; type: string; dataUrl: string; size: string } | null) => void,
    docType: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.82);
            setter({
              name: file.name,
              type: docType,
              dataUrl: compressedUrl,
              size: `${((compressedUrl.length * 0.75) / 1024).toFixed(1)} KB`,
            });
            return;
          }
          setter({
            name: file.name,
            type: docType,
            dataUrl: reader.result as string,
            size: `${(file.size / 1024).toFixed(1)} KB`,
          });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setter({
          name: file.name,
          type: docType,
          dataUrl: reader.result as string,
          size: `${(file.size / 1024).toFixed(1)} KB`,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 1: 'auth' (Sign Up card / Google account chooser / enter email)
  // Step 2: 'otp' (verify 6-digit OTP sent to email)
  // Step 3: 'form' (fill in complete profile details once email authenticated)
  const [registrationStep, setRegistrationStep] = useState<'auth' | 'otp' | 'form'>(
    initialGoogleAccount?.email ? 'form' : 'auth'
  );
  const [inputEmail, setInputEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  // Common User Credentials
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Handle incoming prefilled Google account
  useEffect(() => {
    if (initialGoogleAccount?.email) {
      setLinkedGoogleAccount(initialGoogleAccount);
      setEmail(initialGoogleAccount.email);
      setInputEmail(initialGoogleAccount.email);
      if (initialGoogleAccount.name) setName(initialGoogleAccount.name);
      setRegistrationStep('form');
    } else {
      setRegistrationStep('auth');
    }
  }, [initialGoogleAccount]);

  const handleRoleChange = (role: 'hospital' | 'doctor' | 'patient') => {
    setSelectedRole(role);
    setError(null);
    setSuccessMessage(null);
    // If email is not yet authenticated, keep user on Stage 1 (the Sign Up page) for that role
    if (!email && !linkedGoogleAccount) {
      setRegistrationStep('auth');
    }
  };

  // Status / Notice Popup Modal
  const [statusPopup, setStatusPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    subtext?: string;
    badge?: string;
    role?: 'hospital' | 'doctor' | 'general';
  } | null>(null);

  // Dedicated Already Registered Account Popup Modal (User Requirement)
  const [alreadyRegisteredPopup, setAlreadyRegisteredPopup] = useState<{
    isOpen: boolean;
    email: string;
    role?: 'hospital' | 'doctor' | 'patient' | 'admin' | string;
    status?: string;
    badge?: string;
    title?: string;
    message: string;
    subtext?: string;
  } | null>(null);

  // Interactive Map and Searchable Country States
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapTargetRole, setMapTargetRole] = useState<'hospital' | 'doctor' | 'patient'>('hospital');
  const [googleLoading, setGoogleLoading] = useState(false);

  // ================= Hospital Fields =================
  const [hospName, setHospName] = useState('');
  const [hospCategory, setHospCategory] = useState<'Private Super-Specialty' | 'Government / Public' | 'Trust / Non-Profit' | 'Multi-Specialty Clinic'>('Private Super-Specialty');
  const [hospLicense, setHospLicense] = useState('');
  const [hospAccreditation, setHospAccreditation] = useState('JCI & NABH Certified Gold');
  // India Geographical Hierarchy
  const [hospCountry, setHospCountry] = useState('India');
  const [hospState, setHospState] = useState('Telangana');
  const [hospDistrict, setHospDistrict] = useState('Hyderabad');
  const [hospCity, setHospCity] = useState('Hyderabad');
  const [hospPincode, setHospPincode] = useState('500001');
  const [hospAddress, setHospAddress] = useState('100 Medical Center Parkway');
  const [pincodeFetching, setPincodeFetching] = useState(false);
  const [pincodeFetchStatus, setPincodeFetchStatus] = useState<string | null>(null);

  const [hospHotline, setHospHotline] = useState('+91 40 2345 6789');
  const [hospAdminRep, setHospAdminRep] = useState('');
  
  // Operational Timings & Facilities (Part 1)
  const [hospEmergencyHours, setHospEmergencyHours] = useState('24/7 Round-the-Clock Emergency Trauma Care');
  const [hospOpdHours, setHospOpdHours] = useState('08:00 AM – 08:00 PM (Monday – Saturday)');
  const [hospHas24x7Emergency, setHospHas24x7Emergency] = useState(true);
  const [hospHasInhousePharmacy, setHospHasInhousePharmacy] = useState(true);
  const [hospBloodBank, setHospBloodBank] = useState(true);
  const [hospOxygenPlant, setHospOxygenPlant] = useState(true);
  const [hospLatitude, setHospLatitude] = useState(17.385044);
  const [hospLongitude, setHospLongitude] = useState(78.486671);

  // Bed Capacities Breakdown (Critical Indian Metric)
  const [hospGeneralBeds, setHospGeneralBeds] = useState('150');
  const [hospSemiPrivateBeds, setHospSemiPrivateBeds] = useState('60');
  const [hospPrivateBeds, setHospPrivateBeds] = useState('40');
  const [hospIcuBeds, setHospIcuBeds] = useState('30');
  const [hospNicuBeds, setHospNicuBeds] = useState('20');
  const [hospOTCount, setHospOTCount] = useState('6');
  const [hospTotalBeds, setHospTotalBeds] = useState('300');

  // Active Clinical Specialties
  const [hospDepts, setHospDepts] = useState<string[]>([
    'Cardiology (Heart & Blood Vessels)',
    'Emergency & Trauma Medicine',
    'Pulmonology (Lungs & Respiratory)',
    'General & Internal Medicine',
    'Pediatrics & Neonatology',
    'Orthopedics & Joint Replacement',
  ]);

  // Financial & Insurance Partners
  const [hospSelectedTPAs, setHospSelectedTPAs] = useState<string[]>([
    'Star Health & Allied Insurance',
    'HDFC ERGO General Insurance',
    'ICICI Lombard General Insurance',
    'Care Health Insurance',
  ]);
  const [hospSelectedGovtSchemes, setHospSelectedGovtSchemes] = useState<string[]>([
    'Ayushman Bharat / PM-JAY',
    'Aarogyasri / State Health Scheme',
  ]);

  // Administrative Spoke (Designated Nodal Officer / Medical Superintendent)
  const [hospNodalName, setHospNodalName] = useState('');
  const [hospNodalEmail, setHospNodalEmail] = useState('');
  const [hospNodalPhone, setHospNodalPhone] = useState('');

  // Part 2: Trust & Compliance Documents
  const [hospCeaRegNo, setHospCeaRegNo] = useState('');
  const [hospCeaStateAuth, setHospCeaStateAuth] = useState('Telangana State Health Authority');
  const [hospNabhCertNo, setHospNabhCertNo] = useState('');
  const [hospNabhValidity, setHospNabhValidity] = useState('');
  const [hospGstin, setHospGstin] = useState('');
  const [hospPan, setHospPan] = useState('');
  const [hospFireNocNo, setHospFireNocNo] = useState('');
  const [hospFireNocValidity, setHospFireNocValidity] = useState('');
  const [hospPcbLicenseNo, setHospPcbLicenseNo] = useState('');
  const [hospPcbValidity, setHospPcbValidity] = useState('');

  // Diagnostic Labs & Imaging Tests
  const [hospLabTests, setHospLabTests] = useState<string[]>([
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
  ]);
  const [customLabTestInput, setCustomLabTestInput] = useState('');
  const [labTestError, setLabTestError] = useState<string | null>(null);
  const [labTestSuccessMsg, setLabTestSuccessMsg] = useState<string | null>(null);

  const handleLabTestToggle = (test: string) => {
    if (hospLabTests.includes(test)) {
      setHospLabTests(hospLabTests.filter((t) => t !== test));
    } else {
      setHospLabTests([...hospLabTests, test]);
    }
  };

  const handleAddCustomLabTest = () => {
    const clean = customLabTestInput.trim();
    if (!clean) {
      setLabTestError('Please enter a valid test name');
      return;
    }
    setLabTestError(null);
    if (!hospLabTests.includes(clean)) {
      setHospLabTests([clean, ...hospLabTests]);
      setLabTestSuccessMsg(`✓ Added test "${clean}" successfully`);
      setTimeout(() => setLabTestSuccessMsg(null), 3500);
    } else {
      setLabTestSuccessMsg(`Notice: "${clean}" is already in your selected list`);
      setTimeout(() => setLabTestSuccessMsg(null), 3500);
    }
    setCustomLabTestInput('');
  };

  // Auto-fetch India address details when Pincode changes
  const handlePincodeLookup = async (pinValue: string) => {
    const cleanPin = pinValue.replace(/\D/g, '').slice(0, 6);
    setHospPincode(cleanPin);
    if (cleanPin.length === 6) {
      setPincodeFetching(true);
      setPincodeFetchStatus('Fetching location for PIN ' + cleanPin + '...');
      try {
        const details = await fetchIndiaPincodeDetails(cleanPin);
        if (details) {
          if (details.state) setHospState(details.state);
          if (details.district) setHospDistrict(details.district);
          if (details.city) setHospCity(details.city);
          setPincodeFetchStatus(`✓ Auto-fetched: ${details.city}, ${details.district}, ${details.state}`);
          setTimeout(() => setPincodeFetchStatus(null), 4500);
        } else {
          setPincodeFetchStatus('PIN code verified. Please confirm District & State.');
          setTimeout(() => setPincodeFetchStatus(null), 3000);
        }
      } catch {
        setPincodeFetchStatus(null);
      } finally {
        setPincodeFetching(false);
      }
    }
  };

  // ================= Doctor Fields (Parts 1, 2, 3) =================
  const [docGovtIdType, setDocGovtIdType] = useState('Aadhar Card');
  const [docGovtIdNumber, setDocGovtIdNumber] = useState('');
  const [docGender, setDocGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [docLanguages, setDocLanguages] = useState<string[]>(['English', 'Hindi', 'Telugu']);
  const [docLicense, setDocLicense] = useState('');
  const [docMedicalCouncil, setDocMedicalCouncil] = useState('National Medical Commission (NMC)');
  const [docSpecialization, setDocSpecialization] = useState<string>(MEDICAL_SPECIALIZATIONS[0]);
  const [docSpecSearch, setDocSpecSearch] = useState('');
  const [docSubSpecialties, setDocSubSpecialties] = useState<string[]>([]);
  const [docNewSubSpecialty, setDocNewSubSpecialty] = useState('');
  const [docSelectedHospitalId, setDocSelectedHospitalId] = useState('');
  const [docHospitalSearch, setDocHospitalSearch] = useState('');
  
  // Education & Credentials
  const [docHighestDegree, setDocHighestDegree] = useState('MBBS');
  const [docUgDegree, setDocUgDegree] = useState('MBBS');
  const [docPgDegree, setDocPgDegree] = useState('MD (Internal Medicine)');
  const [docCollege, setDocCollege] = useState('');
  const [docPassingYear, setDocPassingYear] = useState('2018');
  const [docExperience, setDocExperience] = useState('6');

  // Consultation Economics & Appointment Logic
  const [docFee, setDocFee] = useState('600');
  const [docFollowUpFee, setDocFollowUpFee] = useState('400');
  const [docConsultationType, setDocConsultationType] = useState<'Both (In-Clinic & Video)' | 'In-Clinic Physical Visit' | 'Video Consultation'>('Both (In-Clinic & Video)');
  const [docWeeklySchedule, setDocWeeklySchedule] = useState('Mon - Fri: 10:00 AM - 02:00 PM, 05:00 PM - 08:00 PM');
  const [docSlotDuration, setDocSlotDuration] = useState('15');
  const [docBio, setDocBio] = useState('');

  // ABDM Integration (14-digit Healthcare Professional ID)
  const [docHprId, setDocHprId] = useState('');

  // ================= Patient Fields =================
  // Aadhaar is mandatory for clinical identification & documentation
  const [patAadharNumber, setPatAadharNumber] = useState('');
  // Additional Government ID is optional (Voter ID, Passport, Driver License, etc.)
  const [patAdditionalDocType, setPatAdditionalDocType] = useState<'None' | 'Voter ID' | 'Passport' | 'Driver License' | 'PAN Card' | 'National ID'>('None');
  const [patAdditionalDocNumber, setPatAdditionalDocNumber] = useState('');
  const [patGovtIdType, setPatGovtIdType] = useState<'Aadhar Card' | 'Passport' | 'Driver License' | 'Voter ID' | 'National ID'>('Aadhar Card');
  const [patGovtIdNumber, setPatGovtIdNumber] = useState('');
  const [patDob, setPatDob] = useState('1995-05-15');
  const [patGender, setPatGender] = useState<'male' | 'female' | 'other'>('male');
  const [patBloodGroup, setPatBloodGroup] = useState('O+');
  const [patHeightCm, setPatHeightCm] = useState('175');
  const [patWeightKg, setPatWeightKg] = useState('72');
  const [patCountry, setPatCountry] = useState('India');
  const [patStreet, setPatStreet] = useState('');
  const [patCity, setPatCity] = useState('');
  const [patState, setPatState] = useState('Telangana');
  const [patDistrict, setPatDistrict] = useState('Hyderabad');
  const [patPincode, setPatPincode] = useState('');
  const [patPincodeFetching, setPatPincodeFetching] = useState(false);
  const [patPincodeStatus, setPatPincodeStatus] = useState<string | null>(null);
  const [patConditions, setPatConditions] = useState<string[]>([]);
  const [patNewCondition, setPatNewCondition] = useState('');
  const [patAllergies, setPatAllergies] = useState<string[]>([]);
  const [patNewAllergy, setPatNewAllergy] = useState('');
  
  // User Requirement: Multiple Priority Emergency Contacts with Add Option
  const [patEmergencyContacts, setPatEmergencyContacts] = useState<PatientRegEmergencyContact[]>([
    { id: 'ec-1', name: '', relationship: 'Spouse', phone: '' }
  ]);
  const [patSelectedHospitalId, setPatSelectedHospitalId] = useState('');

  const handleAddPatientEmergencyContact = () => {
    if (patEmergencyContacts.length < 3) {
      setPatEmergencyContacts((prev) => [
        ...prev,
        {
          id: `ec-${Date.now()}`,
          name: '',
          relationship: prev.length === 1 ? 'Parent' : 'Doctor',
          phone: '',
        },
      ]);
    }
  };

  const handleUpdatePatientEmergencyContact = (id: string, field: keyof PatientRegEmergencyContact, val: string) => {
    setPatEmergencyContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  const handleRemovePatientEmergencyContact = (id: string) => {
    if (patEmergencyContacts.length > 1) {
      setPatEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleToggleDocLanguage = (lang: string) => {
    if (docLanguages.includes(lang)) {
      if (docLanguages.length > 1) {
        setDocLanguages(docLanguages.filter((l) => l !== lang));
      }
    } else {
      setDocLanguages([...docLanguages, lang]);
    }
  };

  const handleAddDocSubSpecialty = () => {
    const clean = docNewSubSpecialty.trim();
    if (clean && !docSubSpecialties.includes(clean)) {
      setDocSubSpecialties([...docSubSpecialties, clean]);
      setDocNewSubSpecialty('');
    }
  };

  const handleRemoveDocSubSpecialty = (sub: string) => {
    setDocSubSpecialties(docSubSpecialties.filter((s) => s !== sub));
  };

  const handleToggleTPA = (tpa: string) => {
    if (hospSelectedTPAs.includes(tpa)) {
      if (hospSelectedTPAs.length > 1) {
        setHospSelectedTPAs(hospSelectedTPAs.filter((t) => t !== tpa));
      }
    } else {
      setHospSelectedTPAs([...hospSelectedTPAs, tpa]);
    }
  };

  const handleToggleGovtScheme = (scheme: string) => {
    if (hospSelectedGovtSchemes.includes(scheme)) {
      if (hospSelectedGovtSchemes.length > 1) {
        setHospSelectedGovtSchemes(hospSelectedGovtSchemes.filter((s) => s !== scheme));
      }
    } else {
      setHospSelectedGovtSchemes([...hospSelectedGovtSchemes, scheme]);
    }
  };

  // Handle map selection callback for both Hospital and Patient
  const handleApplyMapLocation = (data: LocationSelectedData) => {
    if (mapTargetRole === 'hospital') {
      if (data.facilityName) {
        setName(data.facilityName);
      }
      if (data.country) setHospCountry(data.country);
      if (data.state) setHospState(data.state);
      if (data.district) setHospDistrict(data.district);
      if (data.city) setHospCity(data.city);
      if (data.pincode) setHospPincode(data.pincode);
      if (data.streetAddress) setHospAddress(data.streetAddress);
      if (data.latitude) setHospLatitude(data.latitude);
      if (data.longitude) setHospLongitude(data.longitude);
      setPincodeFetchStatus(`✓ Location set from Google Maps: ${data.facilityName ? `${data.facilityName} • ` : ''}${data.city || data.district}, ${data.state}`);
      setTimeout(() => setPincodeFetchStatus(null), 4500);
    } else if (mapTargetRole === 'patient') {
      if (data.country) setPatCountry(data.country);
      if (data.state) setPatState(data.state);
      if (data.district) setPatDistrict(data.district);
      if (data.city) setPatCity(data.city);
      if (data.pincode) setPatPincode(data.pincode);
      if (data.streetAddress) setPatStreet(data.streetAddress);
      setPatPincodeStatus(`✓ Location set from Map: ${data.city || data.district}, ${data.state}`);
      setTimeout(() => setPatPincodeStatus(null), 4000);
    }
    setIsMapModalOpen(false);
  };

  // Direct Device GPS Location Detection with Geocoding for Patient Registration
  const [patGpsLocating, setPatGpsLocating] = useState(false);
  const handlePatientDirectGPS = () => {
    setPatGpsLocating(true);
    setPatPincodeStatus('📡 Requesting device GPS live location...');

    const applyLocation = async (lat: number, lng: number) => {
      try {
        setPatPincodeStatus('Resolving location details from coordinates...');
        let resolvedCity = '';
        let resolvedDistrict = '';
        let resolvedState = '';
        let resolvedPin = '';
        let resolvedStreet = '';
        let resolvedCountry = 'India';

        // 1. First try Backend Reverse Geocode proxy (no CORS issues, highly accurate)
        try {
          const revRes = await fetch(`/api/lookup/reverse-geocode?lat=${lat}&lng=${lng}`);
          if (revRes.ok) {
            const data = await revRes.json();
            if (data && data.success) {
              if (data.city) resolvedCity = data.city;
              if (data.district) resolvedDistrict = data.district;
              if (data.state) resolvedState = data.state;
              if (data.pincode) resolvedPin = data.pincode;
              if (data.streetAddress) resolvedStreet = data.streetAddress;
              if (data.country) resolvedCountry = data.country;
            }
          }
        } catch (e) {
          console.warn('Backend reverse geocode attempt:', e);
        }

        // 2. Secondary: If Google Maps Geocoder is available, parse detailed address components
        const google = (window as any).google;
        if (google?.maps?.Geocoder) {
          try {
            const geocoder = new google.maps.Geocoder();
            await new Promise<void>((resolve) => {
              geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
                if (status === 'OK' && results && results[0]) {
                  const res = results[0];
                  let premise = '', route = '', sublocality = '';
                  for (const comp of res.address_components || []) {
                    const types = comp.types || [];
                    if (types.includes('postal_code') && !resolvedPin) resolvedPin = comp.long_name;
                    else if (types.includes('locality') && !resolvedCity) resolvedCity = comp.long_name;
                    else if (types.includes('sublocality_level_1') || types.includes('sublocality')) sublocality = comp.long_name;
                    else if (types.includes('administrative_area_level_2') && !resolvedDistrict) resolvedDistrict = comp.long_name;
                    else if (types.includes('administrative_area_level_1') && !resolvedState) resolvedState = comp.long_name;
                    else if (types.includes('country') && !resolvedCountry) resolvedCountry = comp.long_name;
                    else if (types.includes('route')) route = comp.long_name;
                    else if (types.includes('premise') || types.includes('street_number')) premise = comp.long_name;
                  }
                  if (!resolvedCity && sublocality) resolvedCity = sublocality;
                  if (!resolvedStreet) {
                    resolvedStreet = [premise, route, sublocality, resolvedCity].filter(Boolean).join(', ') || res.formatted_address;
                  }
                }
                resolve();
              });
            });
          } catch (gErr) {
            console.warn('Google geocoder attempt:', gErr);
          }
        }

        // 3. Fallback: If 6-digit Indian PIN code resolved, verify state and district from India postal DB
        if (resolvedPin && /^\d{6}$/.test(resolvedPin)) {
          try {
            const pinDetails = await fetchIndiaPincodeDetails(resolvedPin);
            if (pinDetails) {
              if (pinDetails.state) resolvedState = pinDetails.state;
              if (pinDetails.district) resolvedDistrict = pinDetails.district;
              if (pinDetails.city) resolvedCity = pinDetails.city;
            }
          } catch {}
        }

        // Apply detected values into patient registration state
        const effectiveCity = resolvedCity || resolvedDistrict || 'City Area';
        const effectiveDist = resolvedDistrict || effectiveCity;
        const effectiveState = resolvedState || 'State Area';

        if (resolvedCountry) setPatCountry(resolvedCountry);
        if (resolvedState) setPatState(effectiveState);
        if (resolvedDistrict || resolvedCity) setPatDistrict(effectiveDist);
        if (resolvedCity || resolvedDistrict) setPatCity(effectiveCity);
        if (resolvedPin) setPatPincode(resolvedPin);
        if (resolvedStreet) setPatStreet(resolvedStreet);

        setPatPincodeStatus(`✓ GPS located: ${effectiveCity}${resolvedDistrict && resolvedDistrict !== effectiveCity ? ` (${resolvedDistrict})` : ''}, ${effectiveState} ${resolvedPin ? `• PIN ${resolvedPin}` : ''}`);
        setPatGpsLocating(false);
        setTimeout(() => setPatPincodeStatus(null), 6000);
        return;
      } catch (err) {
        console.warn('Location apply error:', err);
      }
      setPatGpsLocating(false);
      setPatPincodeStatus('Location coordinates captured.');
      setTimeout(() => setPatPincodeStatus(null), 4000);
    };

    const tryNetworkFallback = async () => {
      try {
        setPatPincodeStatus('🛰️ Attempting high-speed network location fallback...');
        const ipRes = await fetch('/api/lookup/ip-location');
        if (ipRes.ok) {
          const data = await ipRes.json();
          if (data?.latitude && data?.longitude) {
            await applyLocation(data.latitude, data.longitude);
            return true;
          }
        }
      } catch (netErr) {
        console.warn('Network location fallback notice:', netErr);
      }
      return false;
    };

    if (!navigator.geolocation) {
      tryNetworkFallback().then((ok) => {
        if (!ok) {
          setPatGpsLocating(false);
          setPatPincodeStatus('⚠️ Geolocation unavailable. Please click "📍 Pick on Interactive Map" to select on map.');
          setTimeout(() => setPatPincodeStatus(null), 6000);
        }
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyLocation(pos.coords.latitude, pos.coords.longitude);
      },
      async (err) => {
        console.warn('GPS initial request notice:', err);
        // Attempt network IP location fallback first
        const ok = await tryNetworkFallback();
        if (ok) return;

        if (err.code === 1) {
          setPatGpsLocating(false);
          setPatPincodeStatus('⚠️ Location access was denied. Please click "📍 Pick on Interactive Map" or enter your PIN.');
          setTimeout(() => setPatPincodeStatus(null), 7000);
          return;
        }
        // Second try with standard accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            applyLocation(pos.coords.latitude, pos.coords.longitude);
          },
          async (err2) => {
            console.warn('Standard geolocation failed:', err2);
            const fallbackOk = await tryNetworkFallback();
            if (!fallbackOk) {
              setPatGpsLocating(false);
              setPatPincodeStatus('⚠️ Could not capture live GPS signal. Click "📍 Pick on Interactive Map" to visually pinpoint your home.');
              setTimeout(() => setPatPincodeStatus(null), 7000);
            }
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // Auto-fetch India address details when Patient Pincode changes
  const handlePatientPincodeLookup = async (pinValue: string) => {
    const cleanPin = pinValue.replace(/\D/g, '').slice(0, 6);
    setPatPincode(cleanPin);
    if (cleanPin.length === 6) {
      setPatPincodeFetching(true);
      setPatPincodeStatus('Fetching location for PIN ' + cleanPin + '...');
      try {
        const details = await fetchIndiaPincodeDetails(cleanPin);
        if (details) {
          if (details.state) setPatState(details.state);
          if (details.district) setPatDistrict(details.district);
          if (details.city) setPatCity(details.city);
          setPatPincodeStatus(`✓ Auto-fetched: ${details.city}, ${details.district}, ${details.state}`);
          setTimeout(() => setPatPincodeStatus(null), 4500);
        } else {
          setPatPincodeStatus('PIN code verified. Please confirm District & State.');
          setTimeout(() => setPatPincodeStatus(null), 3000);
        }
      } catch {
        setPatPincodeStatus(null);
      } finally {
        setPatPincodeFetching(false);
      }
    }
  };

  // Load hospitals for Doctor & Patient association - Lightweight & Instant
  const loadHospitals = async () => {
    try {
      const allHosp = await api.getHospitalDirectory();
      setAvailableHospitals(allHosp);
      if (allHosp.length > 0) {
        if (!docSelectedHospitalId) setDocSelectedHospitalId(allHosp[0].id);
        if (!patSelectedHospitalId) setPatSelectedHospitalId(allHosp[0].id);
      }
    } catch (err) {
      console.error('Failed to load registered hospitals', err);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, []);

  const handleDepartmentToggle = (dept: string) => {
    if (hospDepts.includes(dept)) {
      if (hospDepts.length > 1) {
        setHospDepts(hospDepts.filter((d) => d !== dept));
      }
    } else {
      setHospDepts([...hospDepts, dept]);
    }
  };

  const handleAddCondition = () => {
    if (patNewCondition.trim() && !patConditions.includes(patNewCondition.trim())) {
      setPatConditions([...patConditions, patNewCondition.trim()]);
      setPatNewCondition('');
    }
  };

  const handleAddAllergy = () => {
    if (patNewAllergy.trim() && !patAllergies.includes(patNewAllergy.trim())) {
      setPatAllergies([...patAllergies, patNewAllergy.trim()]);
      setPatNewAllergy('');
    }
  };

  // Selected hospital details for Doctor or Patient
  const selectedDocHospital = availableHospitals.find((h) => h.id === docSelectedHospitalId);
  const selectedPatHospital = availableHospitals.find((h) => h.id === patSelectedHospitalId);

  // User types email in the AWS-style sign up box and clicks Continue
  const handleContinueWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail || !inputEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    const normalized = inputEmail.trim().toLowerCase();
    setSendingOtp(true);
    setError(null);
    try {
      await api.sendOtp(normalized);
      setEmail(normalized);
      setRegistrationStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code');
    } finally {
      setSendingOtp(false);
    }
  };

  // User enters OTP dispatched from aivirtualcare@gmail.com
  const handleVerifyOtpCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length < 4) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setVerifyingOtp(true);
    setError(null);
    try {
      await api.verifyOtp(email, otpInput.trim());

      // Check if this account already exists in the system
      try {
        const check = await api.checkEmail(email);
        if (check.exists && check.user) {
          showExistingAccountPopup(check.user, email.trim().toLowerCase());
          return;
        }
      } catch {
        // Proceed to registration form
      }

      // If new, neatly open the registration portal!
      setRegistrationStep('form');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code. Please check your email.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Helper to present custom, crystal-clear status popup if an account is already registered
  const showExistingAccountPopup = (checkUser: User, accountEmail: string) => {
    if (
      checkUser.role === 'hospital' &&
      (checkUser.status === 'pending_admin_approval' ||
        checkUser.hospitalProfile?.verificationStatus === 'pending_admin_verification' ||
        checkUser.status !== 'active')
    ) {
      setAlreadyRegisteredPopup({
        isOpen: true,
        email: accountEmail,
        role: 'hospital',
        status: checkUser.status,
        badge: 'Pending Admin Approval',
        title: "You're Already Registered",
        message: "You're already registered. Your registration request is being sent to the admin, so please wait.",
        subtext: `Your hospital registration request has already been submitted to System Administrator HEMANTH. Please wait for acceptance. Once the administrator approves your request, you will receive an acceptance confirmation mail prompting you to log in.`,
      });
      return;
    }

    if (
      checkUser.role === 'doctor' &&
      (checkUser.status === 'pending_verification' ||
        checkUser.doctorProfile?.approvalStatus === 'pending_hospital_approval' ||
        checkUser.status !== 'active')
    ) {
      setAlreadyRegisteredPopup({
        isOpen: true,
        email: accountEmail,
        role: 'doctor',
        status: checkUser.status,
        badge: 'Pending Hospital Verification',
        title: "You're Already Registered",
        message: "You're already registered. Your registration request is sent to the particular hospital. Please wait for the accept.",
        subtext: `Your doctor registration and medical credentials have already been submitted to your designated hospital. Please wait for the hospital approval mail.`,
      });
      return;
    }

    setAlreadyRegisteredPopup({
      isOpen: true,
      email: accountEmail,
      role: checkUser.role,
      status: checkUser.status,
      badge: 'Account Already Exists',
      title: 'Account Already Registered',
      message: 'Your account is already registered, so please sign in.',
      subtext: `An active profile is already associated with ${accountEmail}. You do not need to register again. Please sign in to access your portal.`,
    });
  };

  // Resend OTP code from aivirtualcare@gmail.com
  const handleResendOtp = async () => {
    setResendingOtp(true);
    setError(null);
    try {
      await api.sendOtp(email);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setResendingOtp(false);
    }
  };

  // User clicks "Sign up with Google": directly opens Google account chooser popup (accounts.google.com/v3/signin/accountchooser)
  const handleGoogleSignUpClick = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const cred = await signInWithGooglePopup();
      if (cred.user.email) {
        await handleGoogleAccountSelected(
          cred.user.email,
          cred.user.displayName || cred.user.email.split('@')[0]
        );
        return;
      }
    } catch (err: any) {
      console.warn('Firebase Google Sign-In note:', err);
      if (!err.message?.includes('closed-by-user')) {
        setError(err.message || 'Google Sign-In was cancelled or encountered an error.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // When user selects an account from Google modal
  const handleGoogleAccountSelected = async (googleEmail: string, googleName: string) => {
    setLinkedGoogleAccount({ email: googleEmail, name: googleName });
    setEmail(googleEmail);
    setInputEmail(googleEmail);
    if (!name || name.trim() === '') {
      setName(googleName);
    }
    if (selectedRole === 'hospital' && (!hospAdminRep || hospAdminRep.trim() === '')) {
      setHospAdminRep(googleName);
    }
    setError(null);

    // Enforce Unique Email Constraint: If account already exists in the database, show popup!
    try {
      const check = await api.checkEmail(googleEmail);
      if (check.exists && check.user) {
        showExistingAccountPopup(check.user, googleEmail);
        return;
      }
    } catch {
      // Proceed to registration form
    }

    // Neatly open the registration portal for new user!
    setRegistrationStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Basic common validations
    if (!email || !email.includes('@')) {
      setError('Please provide a valid official email address.');
      return;
    }

    // Mandatory Trust & Compliance Documents Enforcement (Part 2)
    if (selectedRole === 'hospital') {
      if (!hospLicenseFile) {
        setError('❌ Clinical Establishment Act Registration document is mandatory. Please upload.');
        return;
      }
      if (!hospAccreditationFile) {
        setError('❌ NABH Accreditation Certificate document is mandatory. Please upload.');
        return;
      }
      if (!hospPanGstFile) {
        setError('❌ Hospital PAN Card & GSTIN document is mandatory. Please upload.');
        return;
      }
      if (!hospFireNocFile) {
        setError('❌ Fire Safety NOC certificate is mandatory. Please upload.');
        return;
      }
      if (!hospPcbFile) {
        setError('❌ Pollution Control Board (Biomedical Waste) License is mandatory. Please upload.');
        return;
      }
      if (!hospLogoFile) {
        setError('❌ Official Hospital Logo is mandatory. Please upload your hospital logo.');
        return;
      }
      if (!hospNodalName.trim()) {
        setError('Please enter the designated Nodal Officer / Medical Superintendent name.');
        return;
      }
    } else if (selectedRole === 'doctor') {
      if (!docGovtIdFile) {
        setError('❌ Doctor Government ID / Aadhaar document is mandatory. Please upload.');
        return;
      }
      if (!docLicenseFile) {
        setError('❌ Medical Council Registration Certificate document is mandatory. Please upload.');
        return;
      }
      if (!docDegreeFile) {
        setError('❌ Highest Medical Degree Certificate is mandatory. Please upload.');
        return;
      }
    } else if (selectedRole === 'patient') {
      if (!patAadharFile) {
        setError('❌ Aadhaar Card document is mandatory for patient clinical registration. Please upload.');
        return;
      }
      const validContacts = patEmergencyContacts.filter(c => c.name.trim() && c.phone.trim());
      if (validContacts.length === 0) {
        setError('❌ Please provide at least one Emergency Contact with Full Name and Phone Number.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = {
        name: selectedRole === 'hospital' ? (hospName.trim() || name.trim()) : name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '+91 98765 00000',
        role: selectedRole,
        avatarUrl: selectedRole === 'hospital' && hospLogoFile ? hospLogoFile.dataUrl : undefined,
      };

      if (selectedRole === 'hospital') {
        if (!hospName.trim()) throw new Error('Official Hospital Legal Name is required.');
        if (!hospAddress.trim()) throw new Error('Complete hospital street address is required.');
        if (!hospPincode.trim() || hospPincode.length !== 6) throw new Error('Valid 6-digit PIN code is required.');

        const computedTotalBeds = (
          (Number(hospGeneralBeds) || 0) +
          (Number(hospSemiPrivateBeds) || 0) +
          (Number(hospPrivateBeds) || 0) +
          (Number(hospIcuBeds) || 0) +
          (Number(hospNicuBeds) || 0)
        ) || Number(hospTotalBeds) || 300;

        payload.hospitalData = {
          hospitalName: hospName.trim(),
          hospitalType: hospCategory,
          licenseNumber: hospLicense.trim() || hospCeaRegNo.trim() || `CEA-REG-${Date.now().toString().slice(-6)}`,
          accreditation: hospAccreditation.trim() || 'NABH Certified & State Health Authority Verified',
          country: hospCountry,
          state: hospState,
          district: hospDistrict,
          city: hospCity,
          pincode: hospPincode,
          address: hospAddress || '100 Medical Center Parkway',
          streetAddress: hospAddress,
          latitude: Number(hospLatitude) || 17.385044,
          longitude: Number(hospLongitude) || 78.486671,
          emergencyHours: hospEmergencyHours,
          opdHours: hospOpdHours,
          has24x7Emergency: hospHas24x7Emergency,
          hasInhousePharmacy: hospHasInhousePharmacy,
          emergencyHotline: hospHotline || phone || '+91 40 2345 6789',
          contactEmail: email.trim().toLowerCase(),
          contactPhone: phone || '+91 98765 00000',
          adminRepresentative: hospAdminRep.trim() || hospNodalName.trim() || name.trim() || 'Medical Superintendent',
          nodalOfficerName: hospNodalName.trim() || hospAdminRep.trim() || name.trim(),
          nodalOfficerEmail: hospNodalEmail.trim() || email.trim().toLowerCase(),
          nodalOfficerPhone: hospNodalPhone.trim() || phone.trim(),
          departments: hospDepts,
          availableLabTests: hospLabTests,
          partneredTPAs: hospSelectedTPAs,
          governmentSchemes: hospSelectedGovtSchemes,
          generalWardBeds: Number(hospGeneralBeds) || 150,
          semiPrivateBeds: Number(hospSemiPrivateBeds) || 60,
          privateBeds: Number(hospPrivateBeds) || 40,
          icuBeds: Number(hospIcuBeds) || 30,
          nicuBeds: Number(hospNicuBeds) || 20,
          operationTheaters: Number(hospOTCount) || 6,
          totalBeds: computedTotalBeds,
          availableBeds: Math.floor(computedTotalBeds * 0.25),
          bloodBankAvailable: hospBloodBank,
          oxygenPlantAvailable: hospOxygenPlant,
          clinicalEstablishmentRegNo: hospCeaRegNo.trim() || hospLicense.trim(),
          clinicalEstablishmentDocUrl: hospLicenseFile?.dataUrl,
          stateHealthAuthority: hospCeaStateAuth.trim(),
          nabhCertificateNo: hospNabhCertNo.trim(),
          nabhDocUrl: hospAccreditationFile?.dataUrl,
          nabhValidity: hospNabhValidity.trim(),
          isNabhAccredited: Boolean(hospNabhCertNo.trim() || hospAccreditationFile),
          hospitalPan: hospPan.trim(),
          hospitalGstin: hospGstin.trim(),
          panGstDocUrl: hospPanGstFile?.dataUrl,
          fireSafetyNocNo: hospFireNocNo.trim(),
          fireSafetyDocUrl: hospFireNocFile?.dataUrl,
          fireSafetyValidity: hospFireNocValidity.trim(),
          pollutionControlLicenseNo: hospPcbLicenseNo.trim(),
          pollutionControlDocUrl: hospPcbFile?.dataUrl,
          pollutionControlValidity: hospPcbValidity.trim(),
          logoUrl: hospLogoFile ? hospLogoFile.dataUrl : undefined,
        };
      } else if (selectedRole === 'doctor') {
        if (!name.trim()) throw new Error('Doctor Full Name is required.');
        if (!docLicense.trim()) throw new Error('Medical Council Registration Number is required.');

        const targetHospital = availableHospitals.find((h) => h.id === docSelectedHospitalId);

        payload.doctorData = {
          govtIdType: docGovtIdType,
          govtIdNumber: docGovtIdNumber.trim(),
          medicalLicenseNumber: docLicense.trim(),
          medicalCouncilName: docMedicalCouncil.trim(),
          registrationCertificateUrl: docLicenseFile?.dataUrl,
          highestDegree: docHighestDegree.trim() || docUgDegree.trim() || 'MBBS',
          graduationYear: docPassingYear.trim() || '2018',
          hprId: docHprId.trim(),
          specialization: docSpecialization,
          subSpecialties: docSubSpecialties,
          gender: docGender,
          languagesSpoken: docLanguages,
          hospitalId: targetHospital?.id || docSelectedHospitalId,
          hospitalName: targetHospital?.hospitalProfile?.hospitalName || targetHospital?.name || 'Affiliated Hospital',
          hospitalLicenseNumber: targetHospital?.hospitalProfile?.licenseNumber || 'HOSP-LIC',
          hospitalLogoUrl: targetHospital?.hospitalProfile?.logoUrl || targetHospital?.avatarUrl || '',
          ugDegree: docUgDegree,
          pgDegree: docPgDegree,
          graduatingCollege: docCollege.trim() || 'Medical College',
          passingYear: docPassingYear,
          qualifications: `${docUgDegree}${docPgDegree ? ', ' + docPgDegree : ''}`,
          yearsOfExperience: Number(docExperience) || 5,
          consultationFee: Number(docFee) || 600,
          followUpFee: Number(docFollowUpFee) || 400,
          consultationType: docConsultationType,
          weeklySchedule: docWeeklySchedule,
          slotDurationMinutes: Number(docSlotDuration) || 15,
          bio: docBio.trim() || `Consultant Specialist in ${docSpecialization}. Areas of clinical focus include patient telemetry evaluation and comprehensive treatment planning.`,
        };
      } else if (selectedRole === 'patient') {
        if (!name.trim()) throw new Error('Patient Full Name is required.');
        if (!patAadharNumber.trim()) throw new Error('Aadhaar Card Number is mandatory for patient clinical registration.');
        if (!patAadharFile) throw new Error('Please upload your Aadhaar Card document (Image or PDF). It is mandatory for identity verification.');

        const validContacts = patEmergencyContacts.filter(c => c.name.trim() && c.phone.trim());
        const primaryContact = validContacts[0] || {
          name: 'Emergency Contact',
          relationship: 'Relative',
          phone: phone || '+91 98765 00000',
        };

        payload.patientData = {
          govtIdType: 'Aadhar Card',
          govtIdNumber: patAadharNumber.trim(),
          aadharNumber: patAadharNumber.trim(),
          aadharDocumentUrl: patAadharFile.dataUrl,
          aadharDocumentName: patAadharFile.name,
          additionalDocType: patAdditionalDocType !== 'None' ? patAdditionalDocType : undefined,
          additionalDocNumber: patAdditionalDocNumber.trim() || undefined,
          additionalDocUrl: patAdditionalDocFile?.dataUrl,
          additionalDocName: patAdditionalDocFile?.name,
          dateOfBirth: patDob,
          gender: patGender,
          bloodGroup: patBloodGroup,
          heightCm: Number(patHeightCm) || 170,
          weightKg: Number(patWeightKg) || 70,
          streetAddress: patStreet || '123 Health Ave',
          city: patCity || 'Hyderabad',
          state: patState || 'Telangana',
          pincode: patPincode || '500001',
          existingConditions: patConditions,
          allergies: patAllergies,
          emergencyContact: {
            name: primaryContact.name,
            relationship: primaryContact.relationship,
            phone: primaryContact.phone,
          },
          emergencyContactsList: validContacts.map((c, idx) => ({
            id: c.id || `ec-${Date.now()}-${idx}`,
            name: c.name,
            relationship: c.relationship,
            phone: c.phone,
            priority: idx === 0 ? 'primary' : idx === 1 ? 'secondary' : 'physician',
            notifySms: true,
            notifyEmail: true,
            shareLiveLocation: true,
          })),
        };
      }

      // Collect uploaded documents for user profile and Firestore persistence
      const uploadedDocs: UserDocument[] = [];
      if (selectedRole === 'patient') {
        if (patAadharFile) {
          uploadedDocs.push({
            id: `doc-pat-aadhar-${Date.now()}`,
            name: patAadharFile.name || 'Aadhaar Card Document (Mandatory)',
            type: 'aadhar',
            url: patAadharFile.dataUrl,
            uploadedAt: new Date().toISOString()
          });
        }
        if (patAdditionalDocFile && patAdditionalDocType !== 'None') {
          uploadedDocs.push({
            id: `doc-pat-add-${Date.now()}`,
            name: patAdditionalDocFile.name || `${patAdditionalDocType} Document (Optional)`,
            type: 'other',
            url: patAdditionalDocFile.dataUrl,
            uploadedAt: new Date().toISOString()
          });
        }
      } else if (selectedRole === 'doctor') {
        if (docGovtIdFile) {
          uploadedDocs.push({
            id: `doc-id-${Date.now()}`,
            name: docGovtIdFile.name || 'Doctor Govt ID / Aadhar',
            type: 'aadhar',
            url: docGovtIdFile.dataUrl,
            uploadedAt: new Date().toISOString()
          });
        }
        if (docLicenseFile) {
          uploadedDocs.push({
            id: `doc-lic-${Date.now()}`,
            name: docLicenseFile.name || 'Medical Council Registration Certificate',
            type: 'medical_license',
            url: docLicenseFile.dataUrl,
            uploadedAt: new Date().toISOString()
          });
        }
        if (docDegreeFile) {
          uploadedDocs.push({
            id: `doc-deg-${Date.now()}`,
            name: docDegreeFile.name || 'Highest Medical Degree Certificate',
            type: 'degree',
            url: docDegreeFile.dataUrl,
            uploadedAt: new Date().toISOString()
          });
        }
      } else if (selectedRole === 'hospital') {
        if (hospLicenseFile) {
          uploadedDocs.push({
            id: `doc-hosp-cea-${Date.now()}`,
            name: hospLicenseFile.name || 'Clinical Establishment Act License',
            type: 'hospital_license',
            url: hospLicenseFile.dataUrl,
            uploadedAt: new Date().toISOString()
          });
        }
        if (hospAccreditationFile) {
          uploadedDocs.push({
            id: `doc-hosp-nabh-${Date.now()}`,
            name: hospAccreditationFile.name || 'NABH Accreditation Certificate',
            type: 'accreditation',
            url: hospAccreditationFile.dataUrl,
            uploadedAt: new Date().toISOString()
          });
        }
        if (hospPanGstFile) {
          uploadedDocs.push({
            id: `doc-hosp-gst-${Date.now()}`,
            name: hospPanGstFile.name || 'Hospital PAN & GSTIN Document',
            type: 'other',
            url: hospPanGstFile.dataUrl,
            uploadedAt: new Date().toISOString()
          });
        }
        if (hospFireNocFile) {
          uploadedDocs.push({
            id: `doc-hosp-fire-${Date.now()}`,
            name: hospFireNocFile.name || 'Fire Safety NOC Certificate',
            type: 'other',
            url: hospFireNocFile.dataUrl,
            uploadedAt: new Date().toISOString()
          });
        }
        if (hospPcbFile) {
          uploadedDocs.push({
            id: `doc-hosp-pcb-${Date.now()}`,
            name: hospPcbFile.name || 'Pollution Control Board Biomedical Waste License',
            type: 'other',
            url: hospPcbFile.dataUrl,
            uploadedAt: new Date().toISOString()
          });
        }
        if (hospLogoFile) {
          uploadedDocs.push({
            id: `doc-hosp-logo-${Date.now()}`,
            name: hospLogoFile.name || 'Official Hospital Logo Emblem',
            type: 'other',
            url: hospLogoFile.dataUrl,
            uploadedAt: new Date().toISOString()
          });
        }
      }
      payload.uploadedDocuments = uploadedDocs;

      const regResult = await register(payload);
      if (regResult?.user) {
        syncUserToFirestore(regResult.user).catch((e) => console.warn('Firestore sync note:', e));
      }

      if (selectedRole === 'hospital') {
        setStatusPopup({
          isOpen: true,
          role: 'hospital',
          title: "Hospital Registered Successfully",
          badge: "Pending Admin Acceptance",
          message: "Your hospital is registered. Please wait until the admin's acceptance.",
          subtext: `A registration confirmation email has been dispatched to ${email.toLowerCase()}. Once System Administrator HEMANTH reviews and accepts your hospital, you will receive an acceptance confirmation mail prompting you to log in and register your doctors.`
        });
      } else if (selectedRole === 'doctor') {
        setStatusPopup({
          isOpen: true,
          role: 'doctor',
          title: "Registration Request Submitted",
          badge: "Pending Acceptance",
          message: "Your registration request is being sent to the doctor. Please wait until the doctor accepts it.",
          subtext: "Your registration details and medical credentials have been forwarded. Please wait until the hospital / doctor management accepts your registration."
        });
      } else {
        setSuccessMessage(
          `🎉 Registration complete! Your Patient account has been securely provisioned. Your access credentials and password have been dispatched to your email (${email}).`
        );
        if (onRegistrationComplete) {
          onRegistrationComplete();
        }
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      if (
        errMsg.toLowerCase().includes('already existed') ||
        errMsg.toLowerCase().includes('already registered') ||
        errMsg.toLowerCase().includes('already exists')
      ) {
        try {
          const check = await api.checkEmail(email.trim().toLowerCase());
          if (check.exists && check.user) {
            showExistingAccountPopup(check.user, email.trim().toLowerCase());
            return;
          }
        } catch {}

        setAlreadyRegisteredPopup({
          isOpen: true,
          email: email.trim().toLowerCase(),
          role: selectedRole,
          badge: selectedRole === 'hospital' ? 'Pending Admin Approval' : 'Account Already Exists',
          title: "You're Already Registered",
          message:
            selectedRole === 'hospital'
              ? "You're already registered. Your registration request is being sent to the admin, so please wait."
              : selectedRole === 'doctor'
              ? "You're already registered. Your registration request is sent to the particular hospital. Please wait for the accept."
              : "Your account is already registered, so please sign in.",
          subtext:
            selectedRole === 'hospital'
              ? "Your hospital registration request has already been submitted to System Administrator HEMANTH. Please wait for acceptance."
              : "Please proceed to sign in to access your portal.",
        });
        return;
      }
      setError(errMsg || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 border border-teal-400/30 rounded-full text-xs font-semibold text-teal-200 mb-3">
            <HeartPulse className="w-4 h-4 text-teal-300" />
            <span>Official Ecosystem Registration Portal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Account Registration & Clinical Onboarding
          </h1>
          <p className="text-teal-100/80 text-xs sm:text-sm max-w-2xl mt-2 leading-relaxed">
            Register your Hospital Facility, Medical Practitioner profile, or Patient Health record. All clinical credentials, licensing numbers, and identification documents are verified and stored directly in the ecosystem database.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Role Selection Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="mb-2 px-2 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Choose What You Want To Register:
          </span>
          <span className="text-[11px] text-slate-500 font-semibold">
            {registrationStep === 'auth' ? 'Step 1 of 2 • Sign Up or Authenticate' : registrationStep === 'otp' ? 'Step 2 of 2 • Verify Email Code' : 'Step 2 of 2 • Complete Detailed Profile'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Hospital Registration Tab */}
          <button
            type="button"
            onClick={() => handleRoleChange('hospital')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              selectedRole === 'hospital'
                ? 'border-amber-600 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              selectedRole === 'hospital' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold">Hospital Facility</p>
                {selectedRole === 'hospital' && (
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.2 rounded-full">ACTIVE</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Establishments, bed infrastructure, emergency trauma centers & department accreditation.
              </p>
            </div>
          </button>

          {/* Doctor Registration Tab */}
          <button
            type="button"
            onClick={() => handleRoleChange('doctor')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              selectedRole === 'doctor'
                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              selectedRole === 'doctor' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
            }`}>
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold">Doctor / Physician</p>
                {selectedRole === 'doctor' && (
                  <span className="text-[10px] bg-indigo-200 text-indigo-900 font-black px-1.5 py-0.2 rounded-full">ACTIVE</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Clinical practitioners, medical license verification & hospital department affiliation.
              </p>
            </div>
          </button>

          {/* Patient Registration Tab */}
          <button
            type="button"
            onClick={() => handleRoleChange('patient')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              selectedRole === 'patient'
                ? 'border-teal-600 bg-teal-50/70 text-teal-950 ring-2 ring-teal-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              selectedRole === 'patient' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'
            }`}>
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold">Patient / Individual</p>
                {selectedRole === 'patient' && (
                  <span className="text-[10px] bg-teal-200 text-teal-900 font-black px-1.5 py-0.2 rounded-full">ACTIVE</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Govt ID, health biometrics, IoT vital telemetry & personal health profile.
              </p>
            </div>
          </button>

        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          {onOpenSignIn && selectedRole !== 'patient' && (
            <button
              onClick={onOpenSignIn}
              className="px-3.5 py-1.5 bg-emerald-700 text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition-colors"
            >
              Go to Sign In
            </button>
          )}
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* STAGE 1: AWS-STYLE SIGN UP CARD (SCREENSHOT 1) */}
      {registrationStep === 'auth' && (
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign up for AI Virtual Care
            </h2>
            <p className="text-xs text-slate-500">
              Registering as <strong className="text-slate-800 uppercase font-bold">{selectedRole}</strong>
            </p>
          </div>

          {/* 1. Google Sign-Up Button */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleGoogleSignUpClick}
              disabled={googleLoading}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-slate-400 rounded-2xl text-xs font-bold text-slate-800 shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
              title="Sign up with Google"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
                  <span>Connecting to Google Accounts...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Sign up with Google</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              Continue securely with your Google account
            </p>
          </div>

          {/* OR Divider */}
          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              or register with email
            </span>
          </div>

          {/* Email input form */}
          <form onSubmit={handleContinueWithEmail} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Official Email
              </label>
              <input
                type="email"
                required
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none font-mono text-slate-800 transition-all font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={sendingOtp || !inputEmail}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{sendingOtp ? 'Sending OTP code...' : 'Continue with Email'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Healthcare Customer Agreement & Privacy Notice Detailed Matter */}
          <div className="pt-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-left shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Healthcare Compliance & Regulatory Matter</span>
              </span>
              <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">
                DISHA & ABDM
              </span>
            </div>

            {/* In-page Matter Tabs */}
            <div className="flex rounded-xl bg-slate-200/80 p-1 gap-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setInPageLegalTab('agreement')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  inPageLegalTab === 'agreement'
                    ? 'bg-white text-teal-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Customer Agreement Matter
              </button>
              <button
                type="button"
                onClick={() => setInPageLegalTab('privacy')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  inPageLegalTab === 'privacy'
                    ? 'bg-white text-teal-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Privacy Notice Matter
              </button>
            </div>

            {/* Matter Content */}
            <div className="text-[11px] text-slate-700 space-y-2 max-h-48 overflow-y-auto pr-1 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
              {inPageLegalTab === 'agreement' ? (
                <div className="space-y-2">
                  <div className="font-bold text-teal-950 text-xs border-b border-teal-100 pb-1">
                    Official Master Healthcare Customer Agreement (Key Provisions)
                  </div>
                  <p>
                    <strong>1. Digital Clinical Platform:</strong> AI Virtual Care provides continuous biometric telemetry, digital prescriptions, OPD appointment management, and emergency response routing compliant with the National Medical Commission (NMC) Telemedicine Practice Guidelines and IT Act 2000.
                  </p>
                  <p>
                    <strong>2. Statutory Medical Licenses:</strong> All clinical practitioners and medical centers warrant active registration under the Indian Clinical Establishments Act and respective State Medical Councils.
                  </p>
                  <p>
                    <strong>3. Emergency Telemetry & SOS Protocol:</strong> Real-time IoT alerts and SOS coordinates are instantly transmitted to designated contacts and nearest verified emergency facilities. In acute emergencies, dial national 108 / 112 services.
                  </p>
                  <p>
                    <strong>4. Pricing & Transparent OPD Economics:</strong> Consultation fees and diagnostic testing charges are published transparently with zero concealed fees.
                  </p>
                  <p>
                    <strong>5. Ayushman Bharat (ABDM) Integration:</strong> User explicit consent authorizes encrypted sharing of longitudinal health records under the ABDM framework.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="font-bold text-teal-950 text-xs border-b border-teal-100 pb-1">
                    Patient & Provider Privacy Notice (Key Governance)
                  </div>
                  <p>
                    <strong>1. Clinical Data Governance:</strong> Protected health data (vital signs, SpO2, heart rate, lab results) is managed under strict Digital Information Security in Healthcare Act (DISHA) and ISO/IEC 27001 standards.
                  </p>
                  <p>
                    <strong>2. Zero Commercial Sale of Health Data:</strong> AI Virtual Care strictly NEVER sells, leases, or provides user medical records or biometric streams to advertisers or third-party marketing companies.
                  </p>
                  <p>
                    <strong>3. End-to-End Cryptographic Security:</strong> All medical data is secured with AES-256 encryption at rest and TLS 1.3 encryption in transit with strict role-based access controls.
                  </p>
                  <p>
                    <strong>4. Patient Privacy Rights:</strong> Users hold unconditional rights to inspect, download standard clinical dumps (JSON/PDF), revoke consent, and request permanent profile deletion.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-500">Need complete statutory details?</span>
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab(inPageLegalTab);
                  setIsLegalModalOpen(true);
                }}
                className="font-bold text-teal-800 hover:text-teal-950 underline cursor-pointer flex items-center gap-1"
              >
                <span>Open Full Legal Modal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="pt-2 text-center border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Already have an account?</span>
            {onOpenSignIn && (
              <button
                type="button"
                onClick={onOpenSignIn}
                className="font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 2: OTP VERIFICATION CARD (Sent from aivirtualcare@gmail.com) */}
      {registrationStep === 'otp' && (
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-5">
          <div>
            <button
              type="button"
              onClick={() => setRegistrationStep('auth')}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 mb-2 cursor-pointer font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to email entry</span>
            </button>
            <h2 className="text-xl font-bold text-slate-900">
              Verify your email address
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              A 6-digit security code was automatically sent to <span className="font-mono font-bold text-slate-800">{email}</span>.
            </p>
          </div>

          {/* Real Email Check Notice (Code is sent to user inbox, never exposed on screen) */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-xs space-y-2 text-slate-700">
            <div className="flex items-center gap-2 text-teal-800 font-bold">
              <Mail className="w-4 h-4 text-teal-700" />
              <span>Verification email sent</span>
            </div>
            <p className="text-[12px] text-slate-700 leading-relaxed">
              We have sent a 6-digit one-time passkey to <strong className="text-slate-900 font-mono">{email}</strong>.
            </p>
            <p className="text-[11px] text-slate-500 italic">
              Please open your email inbox (and check Spam folder if needed) and enter the 6-digit code below to proceed.
            </p>
          </div>

          <form onSubmit={handleVerifyOtpCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Enter 6-Digit Code *
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value.replace(/[^0-9]/g, ''));
                  setError(null);
                }}
                placeholder="• • • • • •"
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-mono tracking-widest font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
                required
                autoFocus
              />
              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                <span>Expires in 10 minutes</span>
                <button
                  type="button"
                  disabled={resendingOtp}
                  onClick={handleResendOtp}
                  className="font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${resendingOtp ? 'animate-spin' : ''}`} />
                  <span>Resend code</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={verifyingOtp || otpInput.length < 4}
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Key className="w-4 h-4" />
              <span>{verifyingOtp ? 'Verifying Code...' : 'Verify Code & Open Registration Portal'}</span>
            </button>
          </form>
        </div>
      )}

      {/* STAGE 3: THE REGISTRATION PORTAL NEATLY OPENED TO FILL DETAILS */}
      {registrationStep === 'form' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in">
          
          {/* Top Verified Identity Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-950">Email Verified & Authenticated</span>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-full">
                    Email Security Verified
                  </span>
                </div>
                <p className="text-emerald-800 font-mono text-[11px] mt-0.5">
                  {email} • Registration details unlocked for {selectedRole.toUpperCase()}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRegistrationStep('auth');
                setOtpInput('');
              }}
              className="text-[11px] font-bold text-emerald-900 hover:underline cursor-pointer self-start sm:self-auto"
            >
              Change Email / Account
            </button>
          </div>

          {/* Section Heading: Complete Basic Details */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Complete {selectedRole === 'hospital' ? 'Hospital Facility' : selectedRole === 'doctor' ? 'Doctor Profile' : 'Patient Health'} Details
              </h3>
              <p className="text-[11px] text-slate-500">
                Fill in the verified facility, licensing, and clinical records below.
              </p>
            </div>
          </div>

        {/* ============================================================== */}
        {/* PARTICUALR FORM 1: HOSPITAL REGISTRATION */}
        {/* ============================================================== */}
        {selectedRole === 'hospital' && (
          <div className="space-y-6">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  Hospital Facility & Clinical Establishment Registration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register your healthcare facility, bed quotas, emergency dispatch hotline, and clinical licensing.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[11px] font-bold rounded-lg border border-amber-200">
                Hospital Node
              </span>
            </div>

            {/* Row 1: Hospital Name & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Official Hospital / Medical Center Name *
                </label>
                <input
                  type="text"
                  required
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                  placeholder="e.g. Saint Jude Memorial Hospital & Research Institute"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hospital Establishment Type *
                </label>
                <select
                  value={hospCategory}
                  onChange={(e) => setHospCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none font-semibold text-slate-800"
                >
                  <option value="Private Super-Specialty">Private Super-Specialty Hospital</option>
                  <option value="Government / Public">Government / Public Civil Hospital</option>
                  <option value="Trust / Non-Profit">Trust / Non-Profit Charitable Trust</option>
                  <option value="Multi-Specialty Clinic">Multi-Specialty Clinic & Daycare</option>
                </select>
              </div>
            </div>

            {/* Row 2: License Number & Accreditation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Medical & Establishment License Number *
                </label>
                <input
                  type="text"
                  required
                  value={hospLicense}
                  onChange={(e) => setHospLicense(e.target.value)}
                  placeholder="e.g. HOSP-LIC-2026-9810 or CEA-REG-884"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none font-mono font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Required for doctor affiliation requests and emergency telemetry dispatching.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Accreditation & Quality Standard *
                </label>
                <input
                  type="text"
                  required
                  value={hospAccreditation}
                  onChange={(e) => setHospAccreditation(e.target.value)}
                  placeholder="e.g. JCI & NABH Certified Gold / State Tier-1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Row 3: Official Contact Email, Phone & Emergency Hotline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hospital Management Official Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="management@hospital.org"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contact Phone / Board *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 345-6789"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  24/7 Emergency Dispatch Hotline *
                </label>
                <input
                  type="tel"
                  required
                  value={hospHotline}
                  onChange={(e) => setHospHotline(e.target.value)}
                  placeholder="+1 (800) 555-9111"
                  className="w-full px-3.5 py-2.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none font-bold text-rose-800"
                />
              </div>
            </div>

            {/* Row 4: Official India Geographical Address Hierarchy (User Requirement) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    Hospital Location & Address Details
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Select country, state, district, or pin on interactive map. PIN code auto-fetches location.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMapTargetRole('hospital');
                      setIsMapModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>📍 Pick on Interactive Map</span>
                  </button>
                  {pincodeFetchStatus && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full animate-in fade-in">
                      {pincodeFetchStatus}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* 1. Country Selection - Full Open List with Search */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Country *
                  </label>
                  <SearchableCountrySelect
                    value={hospCountry}
                    onChange={(c: string) => setHospCountry(c)}
                  />
                </div>

                {/* 2. Pincode with Auto-Fetch */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Pin Code (6-Digits) *
                    </label>
                    <button
                      type="button"
                      disabled={pincodeFetching || hospPincode.length !== 6}
                      onClick={() => handlePincodeLookup(hospPincode)}
                      className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${pincodeFetching ? 'animate-spin' : ''}`} />
                      <span>Auto-Fetch</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={hospPincode}
                    onChange={(e) => handlePincodeLookup(e.target.value)}
                    placeholder="e.g. 500001"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                {/* 3. State Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    State / Union Territory *
                  </label>
                  <select
                    value={hospState}
                    onChange={(e) => {
                      const st = e.target.value;
                      setHospState(st);
                      const dists = INDIA_DISTRICTS[st];
                      if (dists && dists.length > 0) {
                        setHospDistrict(dists[0]);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {INDIA_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* 4. District Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    District *
                  </label>
                  {INDIA_DISTRICTS[hospState] && INDIA_DISTRICTS[hospState].length > 0 ? (
                    <select
                      value={hospDistrict}
                      onChange={(e) => setHospDistrict(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      {INDIA_DISTRICTS[hospState].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={hospDistrict}
                      onChange={(e) => setHospDistrict(e.target.value)}
                      placeholder="District"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  )}
                </div>

                {/* 5. City / Locality */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City / Town / Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={hospCity}
                    onChange={(e) => setHospCity(e.target.value)}
                    placeholder="e.g. Hyderabad / Hitech City"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                {/* 6. Street Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Street Address & Medical Center Campus *
                  </label>
                  <input
                    type="text"
                    required
                    value={hospAddress}
                    onChange={(e) => setHospAddress(e.target.value)}
                    placeholder="e.g. Plot 42, Health Expressway, Phase 2"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 5: Operational Timings & Facilities */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                Operational Timings & Clinical Facilities
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Emergency Service Timings *
                  </label>
                  <input
                    type="text"
                    required
                    value={hospEmergencyHours}
                    onChange={(e) => setHospEmergencyHours(e.target.value)}
                    placeholder="24/7 Round-the-Clock Emergency Trauma Care"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Standard OPD Consultation Hours *
                  </label>
                  <input
                    type="text"
                    required
                    value={hospOpdHours}
                    onChange={(e) => setHospOpdHours(e.target.value)}
                    placeholder="08:00 AM – 08:00 PM (Monday – Saturday)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hospHas24x7Emergency}
                    onChange={(e) => setHospHas24x7Emergency(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>24/7 Emergency</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hospHasInhousePharmacy}
                    onChange={(e) => setHospHasInhousePharmacy(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>In-House Pharmacy</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hospBloodBank}
                    onChange={(e) => setHospBloodBank(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Licensed Blood Bank</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hospOxygenPlant}
                    onChange={(e) => setHospOxygenPlant(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Oxygen Plant</span>
                </label>
              </div>
            </div>

            {/* Row 6: Infrastructure Scope - Room Category Bed Breakdown (Critical Indian Metric) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Bed className="w-4 h-4 text-amber-600" />
                    Infrastructure Scope: Bed Count Breakdown by Room Category *
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Indian patients assess hospital scale through room category metrics. Provide accurate bed distribution.
                  </p>
                </div>
                <div className="px-3 py-1 bg-amber-100/90 text-amber-950 font-extrabold text-xs rounded-xl border border-amber-300 self-start sm:self-auto flex items-center gap-1.5">
                  <span>Total Beds:</span>
                  <span className="font-mono text-sm">
                    {(Number(hospGeneralBeds) || 0) +
                      (Number(hospSemiPrivateBeds) || 0) +
                      (Number(hospPrivateBeds) || 0) +
                      (Number(hospIcuBeds) || 0) +
                      (Number(hospNicuBeds) || 0)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    General Ward *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={hospGeneralBeds}
                    onChange={(e) => setHospGeneralBeds(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Semi-Private *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={hospSemiPrivateBeds}
                    onChange={(e) => setHospSemiPrivateBeds(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Private Rooms *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={hospPrivateBeds}
                    onChange={(e) => setHospPrivateBeds(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Dedicated ICU *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={hospIcuBeds}
                    onChange={(e) => setHospIcuBeds(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none text-rose-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    NICU / PICU *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={hospNicuBeds}
                    onChange={(e) => setHospNicuBeds(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Operation Theaters *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={hospOTCount}
                    onChange={(e) => setHospOTCount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 7: Administrative Spoke (Designated Nodal Officer / Medical Superintendent) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Administrative Spoke: Nodal Officer / Medical Superintendent *
                </span>
                <p className="text-[11px] text-slate-500">
                  Designated official responsible for account management, doctor accreditation, and state compliance.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nodal Officer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={hospNodalName || hospAdminRep}
                    onChange={(e) => {
                      setHospNodalName(e.target.value);
                      setHospAdminRep(e.target.value);
                    }}
                    placeholder="e.g. Dr. Eleanor Vance, Medical Superintendent"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Corporate Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={hospNodalEmail || email}
                    onChange={(e) => setHospNodalEmail(e.target.value)}
                    placeholder="superintendent@hospital.org"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Direct Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={hospNodalPhone || phone}
                    onChange={(e) => setHospNodalPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 8: Departments Checklist */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Active Hospital Clinical Departments (Select all active) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {MEDICAL_SPECIALIZATIONS.map((dept) => {
                  const isSelected = hospDepts.includes(dept);
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleDepartmentToggle(dept)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate pr-2">{dept}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 9: Financial & Insurance Partners (Cashless TPAs & Govt Schemes) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  Financial & Insurance Partners (Cashless Treatment & Govt Schemes) *
                </span>
                <p className="text-[11px] text-slate-500">
                  Select partnered TPAs and government schemes for cashless patient admission and claims processing.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Partnered TPAs & Cashless Insurance Providers:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {INSURANCE_TPAS.map((tpa) => {
                    const isChecked = hospSelectedTPAs.includes(tpa);
                    return (
                      <button
                        key={tpa}
                        type="button"
                        onClick={() => handleToggleTPA(tpa)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-2">{tpa}</span>
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Government Healthcare Schemes Supported:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {GOVT_HEALTH_SCHEMES.map((scheme) => {
                    const isChecked = hospSelectedGovtSchemes.includes(scheme);
                    return (
                      <button
                        key={scheme}
                        type="button"
                        onClick={() => handleToggleGovtScheme(scheme)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-2">{scheme}</span>
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 10: Diagnostic Laboratory & Imaging Capabilities (Fixed Add Test & Active Chips) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    🧪 Hospital Diagnostic Labs & Imaging Tests Offered *
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Select active lab & imaging tests. Doctors in your facility will be able to prescribe these to patients.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 self-start sm:self-auto">
                  {hospLabTests.length} Tests Selected
                </span>
              </div>

              {/* Active Selected Tests Chips */}
              {hospLabTests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-white rounded-xl border border-slate-200">
                  {hospLabTests.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100/90 text-amber-950 font-semibold text-[11px] rounded-lg border border-amber-200 shadow-2xs"
                    >
                      <span>✓ {t}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setHospLabTests(hospLabTests.filter((item) => item !== t));
                        }}
                        className="text-amber-700 hover:text-rose-700 hover:bg-amber-200/60 rounded p-0.5 cursor-pointer font-bold"
                        title="Remove test"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Standard + Custom Test Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {Array.from(new Set([
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
                  'Thyroid Profile (T3, T4, TSH)',
                  'Urine Routine & Microscopy',
                  'Bone Mineral Density (DEXA Scan)',
                  'Diagnostic Endoscopy / Colonoscopy',
                  ...hospLabTests,
                ])).map((testName) => {
                  const isChecked = hospLabTests.includes(testName);
                  return (
                    <button
                      key={testName}
                      type="button"
                      onClick={() => handleLabTestToggle(testName)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate pr-2">{testName}</span>
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Test Input with Error Validation & Feedback */}
              <div className="space-y-1.5 pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom diagnostic or imaging test (e.g. PET CT Scan, Mammography, Biopsy)..."
                    value={customLabTestInput}
                    onChange={(e) => {
                      setCustomLabTestInput(e.target.value);
                      if (labTestError) setLabTestError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomLabTest();
                      }
                    }}
                    className={`flex-1 px-3 py-2 bg-white border rounded-xl text-xs outline-none transition-all ${
                      labTestError
                        ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/30'
                        : 'border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomLabTest}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Test</span>
                  </button>
                </div>

                {labTestError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{labTestError}</span>
                  </div>
                )}

                {labTestSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{labTestSuccessMsg}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Row 11: Part 2 Trust & Compliance Documents (For Admin Verification) */}
            <div className="p-5 bg-gradient-to-r from-amber-50/70 via-slate-50 to-amber-50/70 border border-amber-300/80 rounded-2xl space-y-4 shadow-2xs">
              <div>
                <span className="text-xs font-black text-amber-950 uppercase tracking-wider block flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  Part 2: Trust & Compliance Documents (Mandatory for Admin Verification)
                </span>
                <p className="text-[11px] text-amber-900 mt-0.5">
                  Required under Indian medical laws. System Administrator verifies registration numbers against official state registries before activating the hospital.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Clinical Establishment Act */}
                <div className="p-3.5 bg-white rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      1. Clinical Establishment Act Registration *
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Enables "Verified" Badge
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={hospCeaRegNo || hospLicense}
                    onChange={(e) => {
                      setHospCeaRegNo(e.target.value);
                      setHospLicense(e.target.value);
                    }}
                    placeholder="Reg No. e.g. CEA/TEL/2022/8821"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none"
                  />
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, setHospLicenseFile, 'hospital_license')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                  />
                  {hospLicenseFile && (
                    <span className="text-[10px] text-teal-700 font-semibold block truncate">
                      ✓ {hospLicenseFile.name} ({hospLicenseFile.size})
                    </span>
                  )}
                </div>

                {/* 2. NABH Accreditation */}
                <div className="p-3.5 bg-white rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      2. NABH Accreditation Certificate
                    </label>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Enables "NABH Accredited" Logo
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={hospNabhCertNo}
                      onChange={(e) => setHospNabhCertNo(e.target.value)}
                      placeholder="Certificate # (e.g. NABH-2023-0194)"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none"
                    />
                    <input
                      type="date"
                      value={hospNabhValidity}
                      onChange={(e) => setHospNabhValidity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, setHospAccreditationFile, 'accreditation')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                  />
                  {hospAccreditationFile && (
                    <span className="text-[10px] text-teal-700 font-semibold block truncate">
                      ✓ {hospAccreditationFile.name} ({hospAccreditationFile.size})
                    </span>
                  )}
                </div>

                {/* 3. Hospital PAN & GSTIN */}
                <div className="p-3.5 bg-white rounded-xl border border-amber-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    3. Hospital PAN Card & GSTIN (Legal Entity) *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={hospPan}
                      onChange={(e) => setHospPan(e.target.value.toUpperCase())}
                      placeholder="PAN (e.g. AABCH1234D)"
                      maxLength={10}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase outline-none"
                    />
                    <input
                      type="text"
                      required
                      value={hospGstin}
                      onChange={(e) => setHospGstin(e.target.value.toUpperCase())}
                      placeholder="GSTIN (15 Digits)"
                      maxLength={15}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase outline-none"
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, setHospPanGstFile, 'pan_gst')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                  />
                  {hospPanGstFile && (
                    <span className="text-[10px] text-teal-700 font-semibold block truncate">
                      ✓ {hospPanGstFile.name} ({hospPanGstFile.size})
                    </span>
                  )}
                </div>

                {/* 4. Fire Safety NOC */}
                <div className="p-3.5 bg-white rounded-xl border border-amber-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    4. Municipal Fire Safety NOC *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={hospFireNocNo}
                      onChange={(e) => setHospFireNocNo(e.target.value)}
                      placeholder="NOC # (e.g. FIRE/NOC/2023/112)"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none"
                    />
                    <input
                      type="date"
                      required
                      value={hospFireNocValidity}
                      onChange={(e) => setHospFireNocValidity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, setHospFireNocFile, 'fire_noc')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                  />
                  {hospFireNocFile && (
                    <span className="text-[10px] text-teal-700 font-semibold block truncate">
                      ✓ {hospFireNocFile.name} ({hospFireNocFile.size})
                    </span>
                  )}
                </div>

                {/* 5. Pollution Control Board License */}
                <div className="p-3.5 bg-white rounded-xl border border-amber-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    5. Pollution Control Board (Biomedical Waste) License *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={hospPcbLicenseNo}
                      onChange={(e) => setHospPcbLicenseNo(e.target.value)}
                      placeholder="License # (e.g. PCB/BMW/2022/441)"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none"
                    />
                    <input
                      type="date"
                      required
                      value={hospPcbValidity}
                      onChange={(e) => setHospPcbValidity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, setHospPcbFile, 'pcb_license')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                  />
                  {hospPcbFile && (
                    <span className="text-[10px] text-teal-700 font-semibold block truncate">
                      ✓ {hospPcbFile.name} ({hospPcbFile.size})
                    </span>
                  )}
                </div>

                {/* 6. Hospital Official Logo */}
                <div className="p-3.5 bg-white rounded-xl border border-amber-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    6. Official Hospital Logo / Emblem
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setHospLogoFile, 'hospital_logo')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                  />
                  {hospLogoFile && (
                    <span className="text-[10px] text-teal-700 font-semibold block truncate">
                      ✓ {hospLogoFile.name} ({hospLogoFile.size})
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* PARTICULAR FORM 2: DOCTOR / PHYSICIAN REGISTRATION */}
        {/* ============================================================== */}
        {selectedRole === 'doctor' && (
          <div className="space-y-6">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-indigo-600" />
                  Medical Practitioner & Doctor Registration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register clinical credentials, state medical council license, educational qualifications, consultation economics, and hospital affiliation.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-900 text-[11px] font-bold rounded-lg border border-indigo-200">
                Doctor Node
              </span>
            </div>

            {/* Row 1: Professional Identity - Name, Email, Gender, Phone */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Doctor Full Name (As Registered with Medical Council) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Rohan Sharma, MBBS, MD"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Official Medical Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.org"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Gender *
                </label>
                <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50 gap-1">
                  {(['Male', 'Female', 'Other'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setDocGender(g)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        docGender === g
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Languages Spoken in India (Critical for regional patient comfort) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  Languages Spoken with Patients (Regional Linguistic Comfort) *
                </label>
                <span className="text-[10px] text-slate-500">
                  {docLanguages.length} Languages Selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INDIAN_LANGUAGES.map((lang) => {
                  const isChecked = docLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleToggleDocLanguage(lang)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{lang}</span>
                      {isChecked && <Check className="w-3 h-3 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Medical Council Registration & ABDM Healthcare Professional ID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Registered Medical Council *
                </label>
                <select
                  value={docMedicalCouncil}
                  onChange={(e) => setDocMedicalCouncil(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800"
                >
                  {MEDICAL_COUNCILS.map((council) => (
                    <option key={council} value={council}>{council}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Medical Council Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={docLicense}
                  onChange={(e) => setDocLicense(e.target.value)}
                  placeholder="e.g. KMC-2015-03-8821"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold text-indigo-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    ABDM Healthcare Professional ID (HPR ID)
                  </label>
                  <span className="text-[10px] text-sky-700 font-bold bg-sky-100 px-1.5 py-0.5 rounded">
                    14-Digits
                  </span>
                </div>
                <input
                  type="text"
                  value={docHprId}
                  onChange={(e) => setDocHprId(e.target.value)}
                  placeholder="e.g. 12-3456-7890-1234"
                  maxLength={17}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold text-sky-900"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Grants the official "Verified via ABDM" badge on your profile.
                </span>
              </div>
            </div>

            {/* Row 4: Core Specialization, Sub-Specialties, & Affiliated Hospital */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Core Clinical Specialization *</span>
                  <span className="text-[10px] text-indigo-700 font-semibold">Smart symptom mapping</span>
                </label>
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={docSpecSearch}
                    onChange={(e) => {
                      const q = e.target.value;
                      setDocSpecSearch(q);
                      const res = matchSpecialization(q);
                      if (res.matchedSpec) {
                        setDocSpecialization(res.matchedSpec);
                      }
                    }}
                    placeholder="Search by condition or organ (e.g. heart diseases -> Cardiology)"
                    className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  {docSpecSearch && (() => {
                    const match = matchSpecialization(docSpecSearch);
                    if (match.matchedSpec) {
                      return (
                        <div className="mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded-md text-[10px] font-bold flex items-center gap-1">
                          <span>{match.matchedRule?.icon}</span>
                          <span>Mapped '{docSpecSearch}' ➔ {match.matchedSpec}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <select
                  value={docSpecialization}
                  onChange={(e) => setDocSpecialization(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800"
                >
                  {MEDICAL_SPECIALIZATIONS.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>

                {/* Sub-Specialties Tag Input */}
                <div className="mt-3 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Clinical Sub-Specialties (e.g. Pediatric Cardiology, Electrophysiology)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={docNewSubSpecialty}
                      onChange={(e) => setDocNewSubSpecialty(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDocSubSpecialty();
                        }
                      }}
                      placeholder="Add sub-specialty..."
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddDocSubSpecialty}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  {docSubSpecialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {docSubSpecialties.map((sub) => (
                        <span
                          key={sub}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-900 text-[10px] font-bold rounded"
                        >
                          <span>{sub}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocSubSpecialty(sub)}
                            className="text-indigo-600 hover:text-indigo-950 font-black cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Affiliated Hospital Facility (Select to dispatch request) *
                  </label>
                  <span className="text-[10px] text-indigo-600 font-semibold">
                    {availableHospitals.length} Facilities Available
                  </span>
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={docHospitalSearch}
                    onChange={(e) => setDocHospitalSearch(e.target.value)}
                    placeholder="Search hospitals by name, city, or license #..."
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  {docHospitalSearch && (
                    <button
                      type="button"
                      onClick={() => setDocHospitalSearch('')}
                      className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <select
                  value={docSelectedHospitalId}
                  onChange={(e) => setDocSelectedHospitalId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800"
                >
                  {(() => {
                    const filtered = availableHospitals.filter((h) => {
                      if (!docHospitalSearch.trim()) return true;
                      const q = docHospitalSearch.toLowerCase();
                      const hName = (h.hospitalProfile?.hospitalName || h.name || '').toLowerCase();
                      const hCity = (h.hospitalProfile?.city || '').toLowerCase();
                      const hLic = (h.hospitalProfile?.licenseNumber || '').toLowerCase();
                      return hName.includes(q) || hCity.includes(q) || hLic.includes(q);
                    });
                    if (filtered.length === 0) {
                      return <option disabled value="">No hospital matches "{docHospitalSearch}"</option>;
                    }
                    return filtered.map((hosp) => (
                      <option key={hosp.id} value={hosp.id}>
                        {hosp.hospitalProfile?.hospitalName || hosp.name} (License: {hosp.hospitalProfile?.licenseNumber || 'N/A'} • {hosp.hospitalProfile?.city || 'Metro'})
                      </option>
                    ));
                  })()}
                </select>

                {selectedDocHospital && (
                  <div className="mt-2 p-2 bg-indigo-100/70 rounded-lg text-[11px] text-indigo-950 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Facility ID: <strong className="font-mono">{selectedDocHospital.id}</strong></span>
                    <span>License: <strong className="font-mono">{selectedDocHospital.hospitalProfile?.licenseNumber}</strong></span>
                    <span>Location: {selectedDocHospital.hospitalProfile?.city || 'Metro'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Row 5: Education Credentials, Passing Year, Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Undergraduate Degree *
                </label>
                <input
                  type="text"
                  required
                  value={docUgDegree}
                  onChange={(e) => setDocUgDegree(e.target.value)}
                  placeholder="MBBS"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Postgraduate Degree / Super-Specialty
                </label>
                <input
                  type="text"
                  value={docPgDegree}
                  onChange={(e) => setDocPgDegree(e.target.value)}
                  placeholder="MD (Medicine), DM (Cardiology)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Graduating Medical College *
                </label>
                <input
                  type="text"
                  required
                  value={docCollege}
                  onChange={(e) => setDocCollege(e.target.value)}
                  placeholder="AIIMS New Delhi / CMC Vellore"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Years of Experience Post-Qualification *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={docExperience}
                  onChange={(e) => setDocExperience(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-mono font-bold"
                />
              </div>
            </div>

            {/* Row 6: Consultation Economics & Appointment Logic (Transparent Indian Trust Builder) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Consultation Economics & Appointment Scheduling Logic *
                </span>
                <p className="text-[11px] text-slate-500">
                  Transparent fee structures and automated slot durations build patient trust and drive the booking engine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    First-Time OPD Fee (₹ INR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Follow-Up OPD Fee (₹ INR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={docFollowUpFee}
                    onChange={(e) => setDocFollowUpFee(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Consultation Type *
                  </label>
                  <select
                    value={docConsultationType}
                    onChange={(e: any) => setDocConsultationType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Both (In-Clinic & Video)">Both (In-Clinic & Video)</option>
                    <option value="In-Clinic Physical Visit">In-Clinic Physical Visit</option>
                    <option value="Video Consultation">Video Consultation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Slot Duration (Minutes) *
                  </label>
                  <select
                    value={docSlotDuration}
                    onChange={(e) => setDocSlotDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  >
                    <option value="10">10 Minutes per Patient</option>
                    <option value="15">15 Minutes per Patient</option>
                    <option value="20">20 Minutes per Patient</option>
                    <option value="30">30 Minutes per Patient</option>
                    <option value="45">45 Minutes per Patient</option>
                    <option value="60">60 Minutes per Patient</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Weekly Availability Schedule (Days & Time Ranges) *
                </label>
                <input
                  type="text"
                  required
                  value={docWeeklySchedule}
                  onChange={(e) => setDocWeeklySchedule(e.target.value)}
                  placeholder="e.g. Mon - Fri: 10:00 AM - 02:00 PM, 05:00 PM - 08:00 PM; Sat: 10:00 AM - 01:00 PM"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                />
              </div>
            </div>

            {/* Row 7: Biography & Clinical Focus */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Biography, Surgical Expertise & Clinical Focus Area *
              </label>
              <textarea
                rows={3}
                required
                value={docBio}
                onChange={(e) => setDocBio(e.target.value)}
                placeholder="Overview of clinical focus, surgical expertise, conditions treated, and patient care philosophy."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
              ></textarea>
            </div>

            {/* Row 8: Mandatory Document Uploads (Registration Certificate & Highest Degree) */}
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
              <div>
                <span className="text-xs font-bold text-indigo-950 block">
                  Mandatory Medical Credentials & Verification Uploads *
                </span>
                <p className="text-[11px] text-indigo-800">
                  Upload official copies of your Council Registration Certificate and Highest Medical Degree. Verified by Hospital Administration and NMC Registry.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Medical Council Registration Certificate *
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, setDocLicenseFile, 'medical_license')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-100 file:text-indigo-800 hover:file:bg-indigo-200 cursor-pointer"
                  />
                  {docLicenseFile && (
                    <span className="text-[10px] text-teal-700 font-semibold block truncate">
                      ✓ {docLicenseFile.name} ({docLicenseFile.size})
                    </span>
                  )}
                </div>

                <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Highest Medical Degree Certificate (MBBS/MD/DM/DNB) *
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, setDocDegreeFile, 'degree')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-100 file:text-indigo-800 hover:file:bg-indigo-200 cursor-pointer"
                  />
                  {docDegreeFile && (
                    <span className="text-[10px] text-teal-700 font-semibold block truncate">
                      ✓ {docDegreeFile.name} ({docDegreeFile.size})
                    </span>
                  )}
                </div>

                <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Aadhaar / National ID Document *
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, setDocGovtIdFile, 'aadhar')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-100 file:text-indigo-800 hover:file:bg-indigo-200 cursor-pointer"
                  />
                  {docGovtIdFile && (
                    <span className="text-[10px] text-teal-700 font-semibold block truncate">
                      ✓ {docGovtIdFile.name} ({docGovtIdFile.size})
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* PARTICULAR FORM 3: PATIENT REGISTRATION */}
        {/* ============================================================== */}
        {selectedRole === 'patient' && (
          <div className="space-y-6">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-teal-600" />
                  Patient Health Profile & IoT Telemetry Registration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register your medical identity, biometrics, emergency contacts, and primary care hospital.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-teal-100 text-teal-900 text-[11px] font-bold rounded-lg border border-teal-200">
                Patient Node
              </span>
            </div>

            {/* Row 1: Legal Name, Email, Phone */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Legal Patient Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Account Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.johnson@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Primary Mobile Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 876-5432"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* Row 2: Demographics (DOB, Gender, Blood Group) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={patDob}
                  onChange={(e) => setPatDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Gender *
                </label>
                <select
                  value={patGender}
                  onChange={(e) => setPatGender(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Blood Group *
                </label>
                <select
                  value={patBloodGroup}
                  onChange={(e) => setPatBloodGroup(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none font-bold text-rose-700"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2.5: MANDATORY AADHAAR CARD DETAILS & UPLOAD */}
            <div className="p-4 bg-teal-50/70 border-2 border-teal-500/40 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-700" />
                  <div>
                    <span className="text-xs font-extrabold text-teal-950 block">
                      Aadhaar Card Verification (MANDATORY) *
                    </span>
                    <p className="text-[11px] text-teal-800">
                      Aadhaar number and official Aadhaar card document are strictly mandatory for patient identification and clinical records.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-teal-700 text-white text-[10px] font-black uppercase rounded-full tracking-wider">
                  Mandatory
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Aadhaar Card Number (12 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    value={patAadharNumber}
                    onChange={(e) => setPatAadharNumber(e.target.value)}
                    placeholder="e.g. 4589 1204 8832"
                    className="w-full px-3.5 py-2.5 bg-white border border-teal-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 outline-none font-mono font-bold text-slate-900"
                  />
                  <p className="text-[10px] text-teal-700 mt-1">
                    Enter valid 12-digit UIDAI Aadhaar Card Number
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Aadhaar Card Document (PDF / Image) *
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 border border-teal-300 rounded-xl">
                    <input
                      type="file"
                      required={!patAadharFile}
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, setPatAadharFile, 'Aadhaar Card')}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-teal-700 file:text-white hover:file:bg-teal-800 cursor-pointer"
                    />
                    {patAadharFile && (
                      <span className="text-[11px] text-teal-900 font-bold bg-teal-100 px-2 py-1 rounded-lg border border-teal-300 shrink-0">
                        ✓ {patAadharFile.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Upload front/back Aadhaar card scan or e-Aadhaar PDF
                  </p>
                </div>
              </div>
            </div>

            {/* Row 2.6: OPTIONAL ADDITIONAL IDENTITY DOCUMENTS */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Additional Identity Document (Optional)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    You can optionally provide additional documents such as Voter ID, Passport, Driver's License, or PAN Card.
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded-full">
                  Optional
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={patAdditionalDocType}
                    onChange={(e) => setPatAdditionalDocType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="None">None (Skip Optional Document)</option>
                    <option value="Voter ID">Voter ID Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver License">Driver's License</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="National ID">National ID Card</option>
                  </select>
                </div>

                {patAdditionalDocType !== 'None' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {patAdditionalDocType} Number
                      </label>
                      <input
                        type="text"
                        value={patAdditionalDocNumber}
                        onChange={(e) => setPatAdditionalDocNumber(e.target.value)}
                        placeholder={`e.g. ${patAdditionalDocType} Number`}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Upload {patAdditionalDocType} Copy
                      </label>
                      <div className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-xl">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, setPatAdditionalDocFile, patAdditionalDocType)}
                          className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-700 file:text-white cursor-pointer"
                        />
                        {patAdditionalDocFile && (
                          <span className="text-[10px] text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded shrink-0">
                            ✓ Uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Row 3: Height & Weight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Height (cm) *
                </label>
                <input
                  type="number"
                  min="50"
                  max="250"
                  required
                  value={patHeightCm}
                  onChange={(e) => setPatHeightCm(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  required
                  value={patWeightKg}
                  onChange={(e) => setPatWeightKg(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none font-mono"
                />
              </div>
            </div>

            {/* Row 4: Geographical Address & Interactive Map */}
            <div className="p-4 bg-teal-50/50 border border-teal-200/80 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-teal-700" />
                    Residential Location & Address Details
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Select country, state, district, or pin on interactive map. PIN code auto-fetches location.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMapTargetRole('patient');
                      setIsMapModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>📍 Pick on Interactive Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePatientDirectGPS}
                    disabled={patGpsLocating}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${patGpsLocating ? 'animate-spin' : ''}`} />
                    <span>{patGpsLocating ? 'Locating...' : '🎯 Auto-Locate (GPS)'}</span>
                  </button>
                  {patPincodeStatus && (
                    <span className="text-[11px] font-bold text-teal-800 bg-teal-100/80 px-2.5 py-1 rounded-full animate-in fade-in">
                      {patPincodeStatus}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* 1. Country Selection - Full Open List with Search */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Country *
                  </label>
                  <SearchableCountrySelect
                    value={patCountry}
                    onChange={(c: string) => setPatCountry(c)}
                  />
                </div>

                {/* 2. Pincode with Auto-Fetch */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Pin Code (6-Digits) *
                    </label>
                    <button
                      type="button"
                      disabled={patPincodeFetching || patPincode.length !== 6}
                      onClick={() => handlePatientPincodeLookup(patPincode)}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${patPincodeFetching ? 'animate-spin' : ''}`} />
                      <span>Auto-Fetch</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={patPincode}
                    onChange={(e) => handlePatientPincodeLookup(e.target.value)}
                    placeholder="e.g. 500001"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                {/* 3. State Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    State / Union Territory *
                  </label>
                  <select
                    value={patState}
                    onChange={(e) => {
                      const st = e.target.value;
                      setPatState(st);
                      const dists = INDIA_DISTRICTS[st];
                      if (dists && dists.length > 0) {
                        setPatDistrict(dists[0]);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    {INDIA_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* 4. District Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    District *
                  </label>
                  {INDIA_DISTRICTS[patState] && INDIA_DISTRICTS[patState].length > 0 ? (
                    <select
                      value={patDistrict}
                      onChange={(e) => setPatDistrict(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      {INDIA_DISTRICTS[patState].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={patDistrict}
                      onChange={(e) => setPatDistrict(e.target.value)}
                      placeholder="District"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  )}
                </div>

                {/* 5. City */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City / Town / Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={patCity}
                    onChange={(e) => setPatCity(e.target.value)}
                    placeholder="e.g. Hyderabad / Begumpet"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                {/* 6. Street Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Residential Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={patStreet}
                    onChange={(e) => setPatStreet(e.target.value)}
                    placeholder="e.g. Flat 301, Road 12, Banjara Hills"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 5: Priority Emergency Contacts Directory (Supports up to 3 emergency contacts) */}
            <div className="p-4 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-2.5">
                <div>
                  <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Priority Emergency Contacts Directory *
                  </span>
                  <p className="text-[11px] text-rose-800">
                    Add up to 3 priority emergency contacts for instant telemetry dispatch, SOS distress, and clinical escalation.
                  </p>
                </div>
                {patEmergencyContacts.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddPatientEmergencyContact}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Emergency Contact ({patEmergencyContacts.length}/3)</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {patEmergencyContacts.map((contact, index) => (
                  <div
                    key={contact.id}
                    className="p-3.5 bg-white border border-rose-200/70 rounded-xl space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          index === 0
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : index === 1
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}>
                          {index === 0 ? 'Priority #1 (Primary Emergency)' : index === 1 ? 'Priority #2 (Secondary)' : 'Priority #3 (Alternate)'}
                        </span>
                        {index === 0 && (
                          <span className="text-[10px] font-bold text-rose-700">Required</span>
                        )}
                      </div>

                      {patEmergencyContacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePatientEmergencyContact(contact.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={contact.name}
                          onChange={(e) => handleUpdatePatientEmergencyContact(contact.id, 'name', e.target.value)}
                          placeholder="e.g. Sarah Johnson"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Relationship *
                        </label>
                        <select
                          value={contact.relationship}
                          onChange={(e) => handleUpdatePatientEmergencyContact(contact.id, 'relationship', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
                        >
                          {['Spouse', 'Parent', 'Sibling', 'Child', 'Guardian', 'Doctor', 'Friend', 'Other Relative'].map((rel) => (
                            <option key={rel} value={rel}>{rel}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Emergency Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={contact.phone}
                          onChange={(e) => handleUpdatePatientEmergencyContact(contact.id, 'phone', e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 6: Conditions & Allergies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Existing Medical Conditions
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={patNewCondition}
                    onChange={(e) => setPatNewCondition(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCondition())}
                    placeholder="e.g. Hypertension, Diabetes"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {patConditions.map((cond, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[11px] rounded-lg flex items-center gap-1 font-semibold">
                      {cond}
                      <button type="button" onClick={() => setPatConditions(patConditions.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-600">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Known Drug / Food Allergies
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={patNewAllergy}
                    onChange={(e) => setPatNewAllergy(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllergy())}
                    placeholder="e.g. Penicillin, Sulfa"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {patAllergies.map((allg, i) => (
                    <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 text-[11px] rounded-lg flex items-center gap-1 font-semibold">
                      {allg}
                      <button type="button" onClick={() => setPatAllergies(patAllergies.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-700">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Submit Actions */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Records are stored immediately in the ecosystem database store.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onOpenSignIn && (
              <button
                type="button"
                onClick={onOpenSignIn}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Sign In Instead
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`flex-1 sm:flex-none px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedRole === 'hospital'
                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                  : selectedRole === 'doctor'
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                  : 'bg-teal-700 hover:bg-teal-800 active:bg-teal-900'
              }`}
            >
              <span>{loading ? 'Storing in Database...' : `Complete ${selectedRole.toUpperCase()} Registration`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </form>
      )}

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
                onClick={() => {
                  setStatusPopup(null);
                  if (onOpenSignIn) onOpenSignIn();
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Understood / Go to Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Already Registered Account Popup Modal (Role-specific messaging matching user requirements) */}
      {alreadyRegisteredPopup?.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95">
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner">
              {alreadyRegisteredPopup.role === 'hospital' ? (
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Building2 className="w-9 h-9 text-amber-700" />
                </div>
              ) : alreadyRegisteredPopup.role === 'doctor' ? (
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <Stethoscope className="w-9 h-9 text-indigo-700" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-teal-700" />
                </div>
              )}
            </div>

            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
              alreadyRegisteredPopup.role === 'hospital'
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : alreadyRegisteredPopup.role === 'doctor'
                ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                : 'bg-teal-100 text-teal-900 border-teal-300'
            }`}>
              {alreadyRegisteredPopup.badge || (alreadyRegisteredPopup.role === 'hospital' ? 'Pending Admin Approval' : 'Account Already Exists')}
            </span>

            <h3 className="text-xl font-black text-slate-900 leading-snug">
              {alreadyRegisteredPopup.title || (alreadyRegisteredPopup.role === 'hospital' ? "You're Already Registered" : "Account Already Registered")}
            </h3>

            <p className={`text-xs sm:text-sm font-semibold leading-relaxed p-4 rounded-2xl border ${
              alreadyRegisteredPopup.role === 'hospital'
                ? 'text-amber-950 bg-amber-50/80 border-amber-200'
                : alreadyRegisteredPopup.role === 'doctor'
                ? 'text-indigo-950 bg-indigo-50/80 border-indigo-200'
                : 'text-slate-800 bg-teal-50/70 border-teal-200'
            }`}>
              {alreadyRegisteredPopup.message}
            </p>

            <p className="text-xs text-slate-500 leading-relaxed">
              {alreadyRegisteredPopup.subtext || (
                alreadyRegisteredPopup.role === 'hospital'
                  ? `Your registration request for ${alreadyRegisteredPopup.email} has been sent to the admin. Please wait for approval.`
                  : `An active profile is already associated with ${alreadyRegisteredPopup.email}. You do not need to register again. Please sign in to access your portal.`
              )}
            </p>

            <div className="pt-2 flex flex-col gap-2.5">
              {alreadyRegisteredPopup.role === 'hospital' || alreadyRegisteredPopup.role === 'doctor' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAlreadyRegisteredPopup(null)}
                    className="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Understood / Please Wait for Approval</span>
                  </button>
                  {onOpenSignIn && (
                    <button
                      type="button"
                      onClick={() => {
                        setAlreadyRegisteredPopup(null);
                        onOpenSignIn();
                      }}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Check Sign In Status
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setAlreadyRegisteredPopup(null);
                      if (onOpenSignIn) {
                        onOpenSignIn();
                      }
                    }}
                    className="w-full py-3 bg-teal-800 hover:bg-teal-900 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlreadyRegisteredPopup(null)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Map Picker Modal */}
      <LocationMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onApplyLocation={handleApplyMapLocation}
        initialCountry={mapTargetRole === 'hospital' ? hospCountry : patCountry}
        initialCity={mapTargetRole === 'hospital' ? hospCity : patCity}
        initialState={mapTargetRole === 'hospital' ? hospState : patState}
        initialPincode={mapTargetRole === 'hospital' ? hospPincode : patPincode}
      />

      {/* Healthcare Customer Agreement & Privacy Notice Modal */}
      <LegalTermsModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
};
