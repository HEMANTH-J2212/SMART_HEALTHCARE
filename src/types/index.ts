export type UserRole = 'patient' | 'doctor' | 'hospital' | 'admin';

export type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'pending_admin_approval' | 'on_hold' | 'rejected';

export interface BaseUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  passwordHash?: string; // Cryptographically hashed with PBKDF2 + salt (CIA Triad: Confidentiality & Integrity)
}

export interface PatientProfile {
  // Identification & Government ID
  govtIdType: 'Aadhar Card' | 'Passport' | 'Driver License' | 'Voter ID' | 'National ID';
  govtIdNumber: string; // e.g. 12-digit Aadhar number: 4589 1234 8901
  aadharNumber?: string; // Mandatory Aadhaar Card Number
  aadharDocumentUrl?: string;
  aadharDocumentName?: string;
  additionalDocType?: string; // Optional (Voter ID, Passport, Driver License, PAN Card, etc.)
  additionalDocNumber?: string;
  additionalDocUrl?: string;
  additionalDocName?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup: string;
  
  // Physical & Biometrics
  heightCm: number;
  weightKg: number;
  bmi: number;
  
  // Reliability / Attendance Score (100 is perfect, decreases if patient misses appointment)
  reliabilityScore?: number;
  appointmentsBooked?: number;
  appointmentsAttended?: number;
  appointmentsMissed?: number;
  
  // Uploaded Document
  idDocumentUrl?: string;
  idDocumentName?: string;
  
  // Medical History
  existingConditions: string[]; // e.g. Hypertension, Type 2 Diabetes, Asthma
  allergies: string[];
  currentMedications: string[];
  
  // Address & Contacts
  country?: string;
  district?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  secondaryEmergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  emergencyContactsList?: EmergencyContactEntry[];
  carePathway?: 'cardiac' | 'diabetes' | 'pulmonary' | 'geriatric' | 'general';
  dailyMedications?: DailyMedicationEntry[];

  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedHospitalId?: string;
  assignedHospitalName?: string;
  connectedDevices?: string[]; // IDs of assigned healthcare items bought from app
  iotKitPurchased?: boolean;
  chosenEmergencyHospitalId?: string;
  chosenEmergencyHospitalName?: string;
  chosenEmergencyDoctorId?: string;
  chosenEmergencyDoctorName?: string;
  healthVerification?: {
    status: 'clear' | 'observation' | 'critical';
    notes: string;
    verifiedByDoctorId: string;
    verifiedByDoctorName: string;
    verifiedAt: string;
  };
}

export interface DoctorLeaveRequest {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization?: string;
  hospitalId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
  responseNotes?: string;
}

export interface DoctorProfile {
  // Identification
  govtIdType?: string;
  govtIdNumber?: string;
  doctorIdNumber: string; // e.g., DOC-89412
  medicalLicenseNumber: string; // e.g., REG-MED-2018-9941
  licenseExpiryDate?: string;
  
  // Uploaded Credentials & Documents
  licenseDocumentUrl?: string;
  licenseDocumentName?: string;
  degreeDocumentUrl?: string;
  degreeDocumentName?: string;
  signatureUrl?: string;
  
  // Education & Credentials
  ugDegree: string; // e.g. MBBS, BDS
  pgDegree?: string; // e.g. MD, MS, DM, MCh, DNB
  graduatingCollege: string;
  passingYear: string;
  qualifications: string;

  // Professional
  specialization: string;
  secondarySpecialization?: string;
  subSpecialties?: string[];
  gender?: 'Male' | 'Female' | 'Other';
  languagesSpoken?: string[];
  hospitalId: string; // Affiliated hospital
  hospitalName: string;
  hospitalLogoUrl?: string;
  yearsOfExperience: number;
  consultationFee: number;
  followUpFee?: number;
  consultationType?: 'In-Clinic Physical Visit' | 'Video Consultation' | 'Both (In-Clinic & Video)';
  weeklySchedule?: string;
  slotDurationMinutes?: number;

  // Medical Council & ABDM Trust Fields
  medicalCouncilName?: string;
  registrationCertificateUrl?: string;
  registrationCertificateName?: string;
  highestDegree?: string;
  graduationYear?: string;
  hprId?: string; // 14-digit ABDM Healthcare Professional ID
  isAbdmVerified?: boolean;
  councilRegistrationDetails?: string;
  
  // Surgery Mode & Slot Timings
  inSurgery?: boolean;
  surgeryNotes?: string;
  customSlotTimings?: string[]; // Custom consulting slots
  scheduledSurgeries?: ScheduledSurgery[]; // Scheduled surgery timings (planned >= 7 days ahead or urgent)

  // Patient Intake Capacity (Doctor can accept minimum 10 to 15 patient requests)
  patientIntakeQuota?: number; // Default 15, range 10-15+
  
  // Leave Management (Default limit: 5 working days, hospital management can adjust)
  maxLeaveAllowance?: number; // e.g. 5 days
  leaveDates: string[]; // Approved leave dates YYYY-MM-DD
  leaveRequests?: DoctorLeaveRequest[];
  
  // Hospital Approval Status (Only hospital management approves/holds)
  approvalStatus: 'pending_hospital_approval' | 'pending' | 'approved' | 'active' | 'rejected' | 'on_hold';
  rejectionReason?: string;
  bio?: string;
  pendingTransfer?: {
    requestId: string;
    targetHospitalId: string;
    targetHospitalName: string;
    reason: string;
    requestedAt: string;
  };
  pendingEmailChange?: {
    newEmail: string;
    reason: string;
    requestedAt: string;
    status: 'pending';
  };
}

export interface HospitalProfile {
  hospitalName: string;
  hospitalType: 'Government / Public' | 'Private Super-Specialty' | 'Trust / Non-Profit' | 'Multi-Specialty Clinic';
  licenseNumber: string; // Clinical Establishment Act / Govt License
  licenseExpiryDate?: string;
  accreditation: string; // NABH, JCI, NABL, State Board
  logoUrl?: string; // Official Hospital Logo
  licenseDocumentUrl?: string;
  licenseDocumentName?: string;
  
  // Address & Map Coordinates
  country?: string;
  district?: string;
  address: string;
  streetAddress?: string;
  city: string;
  state: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;

  // Operational Timings
  emergencyHours?: string; // e.g. "24/7 Round-the-Clock Emergency Trauma Care"
  opdHours?: string; // e.g. "08:00 AM - 08:00 PM (Mon - Sat)"
  has24x7Emergency?: boolean;
  hasInhousePharmacy?: boolean;
  
  // Emergency Contacts & Nodal Administrative Spoke
  emergencyHotline: string;
  ambulanceContact?: string;
  contactEmail: string;
  contactPhone: string;
  adminRepresentative: string;
  nodalOfficerName?: string;
  nodalOfficerEmail?: string;
  nodalOfficerPhone?: string;
  
  // Capacity & Clinical Infrastructure Breakdown
  departments: string[];
  totalBeds: number;
  availableBeds: number;
  generalWardBeds?: number;
  semiPrivateBeds?: number;
  privateBeds?: number;
  icuBeds: number;
  nicuBeds?: number;
  operationTheaters?: number;
  bloodBankAvailable?: boolean;
  oxygenPlantAvailable?: boolean;
  availableLabTests?: string[]; // Lab tests and diagnostic imaging this hospital can perform

  // Financial & Insurance Partners
  partneredTPAs?: string[];
  governmentSchemes?: string[];

  // Trust & Compliance Documents (Part 2)
  clinicalEstablishmentRegNo?: string;
  clinicalEstablishmentDocUrl?: string;
  clinicalEstablishmentDocName?: string;
  stateHealthAuthority?: string;
  isClinicalActVerified?: boolean; // Controls green "Verified" badge

  nabhCertificateNo?: string;
  nabhDocUrl?: string;
  nabhDocName?: string;
  nabhValidity?: string;
  isNabhAccredited?: boolean; // Controls NABH Accredited badge

  hospitalPan?: string;
  hospitalGstin?: string;
  panGstDocUrl?: string;
  panGstDocName?: string;

  fireSafetyNocNo?: string;
  fireSafetyDocUrl?: string;
  fireSafetyDocName?: string;
  fireSafetyValidity?: string;

  pollutionControlLicenseNo?: string;
  pollutionControlDocUrl?: string;
  pollutionControlDocName?: string;
  pollutionControlValidity?: string;
  
  // Verification by Admin
  verificationStatus: 'pending_admin_verification' | 'verified' | 'rejected' | 'on_hold';
  verificationNotes?: string;
}

export interface UserDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: string;
  dataUrl?: string;
  uploadedAt: string;
}

export interface BaseUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  passwordHash?: string;
  uploadedDocuments?: UserDocument[];
}

export interface User extends BaseUser {
  patientProfile?: PatientProfile;
  doctorProfile?: DoctorProfile;
  hospitalProfile?: HospitalProfile;
}

export interface IoTReading {
  id: string;
  patientId: string;
  patientName: string;
  timestamp: string;
  isMorningCheck: boolean;
  heartRate: number; // bpm (normal: 60-100)
  systolicBp: number; // mmHg (normal: 90-120)
  diastolicBp: number; // mmHg (normal: 60-80)
  spO2: number; // % (normal: 95-100)
  temperature: number; // °C (normal: 36.1 - 37.2)
  glucose: number; // mg/dL (normal fasting: 70-99, random: <140)
  weightKg: number;
  status: 'normal' | 'warning' | 'critical';
  geminiAnalysis?: {
    summary: string;
    riskScore: number; // 0-100
    riskLevel: 'normal' | 'warning' | 'critical';
    concerningFactors: string[];
    preventiveGuidance: string[];
    actionRequired: string;
    recommendedSpecialist?: string;
  };
}

export interface HealthcareItem {
  id: string;
  name: string;
  category: 'Patient IoT Kit' | 'Driver Safety Kit' | 'Hospital Monitor' | 'Emergency Telekit';
  modelNumber: string;
  firmwareVersion: string;
  supportedSensors: string[];
  price: number;
  stock: number;
  description: string;
  status: 'available' | 'low_stock' | 'discontinued';
  imageUrl?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  hospitalId: string;
  hospitalName: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:30 AM"
  reasonForVisit: string;
  symptoms?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'no_show';
  rejectionReason?: string;
  patientReliabilityScore?: number;
  treatmentCode?: string; // Unique verification code generated when appointment is accepted
  treatmentCompletedAt?: string;
  cancelledAt?: string;
  reassignedFrom?: string;
  rescheduleReason?: string;
  isDoctorBooking?: boolean;
  isFreeFollowUp?: boolean; // Doctor booked free appointment after lab tests
  freeConsultationReason?: string;
  referredByDoctorId?: string; // Inter-departmental doctor referral
  referredByDoctorName?: string;
  referredSpecialization?: string;
  prescribedLabTests?: string[]; // Lab tests ordered during this consultation
  prescriptionId?: string; // Attached medical prescription ID
  createdAt: string;
}

export interface LabTestOrder {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  hospitalId: string;
  hospitalName: string;
  testNames: string[]; // e.g. ["MRI Scan (Spine)", "CT Scan", "Complete Blood Count (CBC)"]
  clinicalIndication: string;
  status: 'ordered' | 'sample_collected' | 'completed' | 'reviewed';
  reportNotes?: string;
  completedAt?: string;
  freeFollowUpBooked?: boolean;
  followUpAppointmentDate?: string;
  followUpAppointmentSlot?: string;
  createdAt: string;
}

export type MedicineTimingOption =
  | 'Morning after food'
  | 'Morning before food'
  | 'Afternoon after food'
  | 'Afternoon before food'
  | 'Night after food'
  | 'Night before food';

export const MEDICINE_TIMING_OPTIONS: MedicineTimingOption[] = [
  'Morning after food',
  'Morning before food',
  'Afternoon after food',
  'Afternoon before food',
  'Night after food',
  'Night before food',
];

export interface PrescriptionMedicine {
  name: string;
  dosage: string; // e.g., "500 mg"
  frequency: string; // e.g., "Morning after food"
  timingOption?: MedicineTimingOption;
  duration: string; // e.g., "5 Days"
  durationDays?: number; // e.g. 5
  instructions: string; // e.g., "Take with plenty of warm water"
}

export interface Prescription {
  id: string;
  appointmentId?: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorLicenseNumber?: string;
  doctorSignature?: string;
  hospitalId?: string;
  hospitalName: string;
  date: string;
  diagnosis: string;
  vitalsRecorded?: {
    bp?: string;
    heartRate?: number;
    spO2?: number;
    temp?: number;
  };
  vitalsSnapshot?: {
    bloodPressure?: string;
    heartRate?: number;
    spO2?: number;
    temperature?: number;
  };
  medicines: PrescriptionMedicine[];
  advice?: string;
  generalAdvice?: string;
  followUpDate?: string;
  followUpTimeSlot?: string;
  createdAt: string;
}

export interface DriverSafetyReading {
  id: string;
  driverId: string;
  driverName: string;
  timestamp: string;
  heartRate: number;
  heartRateVariability?: number; // ms
  blinkFrequencyPerMin?: number;
  eyeClosureDurationMs?: number; // PERCLOS indicator
  steeringStability?: number; // 0-100%
  steeringVariability?: number;
  fatigueIndex?: number; // 0-100
  drowsinessScore?: number;
  vehicleSpeedKmh?: number;
  status?: string;
  alertIssued?: boolean;
  geminiAdvisory?: string;
  riskLevel?: 'safe' | 'moderate' | 'danger';
  geminiWarning?: string;
  suggestedAction?: string;
}

export interface EmergencyContactEntry {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  priority: 'primary' | 'secondary' | 'physician' | 'other';
  notifySms?: boolean;
  notifyEmail?: boolean;
  shareLiveLocation?: boolean;
}

export interface DailyMedicationEntry {
  id: string;
  name: string;
  dosage: string;
  timing: 'morning' | 'afternoon' | 'night';
  timingOption?: MedicineTimingOption;
  instructions?: string;
  takenToday?: boolean;
  refillDaysLeft?: number;
  durationDays?: number;
  prescribedDate?: string;
  daysRemaining?: number;
}

export interface EmergencyAlert {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  timestamp: string;
  severity?: 'warning' | 'critical';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  triggerReason: string;
  vitalSummary?: string;
  vitalsSnapshot?: {
    heartRate?: number;
    systolicBp?: number;
    diastolicBp?: number;
    spO2?: number;
    glucose?: number;
  };
  location: string;
  assignedDoctorId?: string;
  targetHospitalId?: string;
  targetHospitalName?: string;
  dispatchedAmbulanceId?: string;
  etaMinutes?: number;
  status: 'dispatched' | 'acknowledged' | 'resolved';
  respondedAt?: string;
  notifiedContacts?: string[];
  ambulanceStatus?: 'assigned' | 'en_route' | 'on_scene' | 'patient_transported' | 'completed';
}

export const MEDICAL_SPECIALIZATIONS = [
  'Cardiology (Heart & Blood Vessels)',
  'Pulmonology (Lungs & Respiratory)',
  'Neurology & Stroke Care (Brain & Nerves)',
  'General & Internal Medicine',
  'Orthopedics (Bones & Joints)',
  'Endocrinology & Diabetology (Hormones & Blood Sugar)',
  'Gastroenterology (Digestive Health)',
  'Nephrology (Kidney Care)',
  'Dermatology (Skin Care)',
  'Pediatrics (Child Health)',
  'Emergency & Trauma Medicine',
  'Psychiatry & Mental Health',
  'ENT (Ear, Nose & Throat)',
  'Ophthalmology (Eye Care)',
  'Gynecology & Obstetrics (Women\'s Health)',
  'Oncology (Cancer Care)'
] as const;

export interface DatabaseSnapshot {
  users: User[];
  hospitals: User[];
  doctors: User[];
  patients: User[];
  healthcareItems: HealthcareItem[];
  iotReadings: IoTReading[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  emergencyAlerts: EmergencyAlert[];
  driverReadings: DriverSafetyReading[];
}

export interface DoctorTransferRequest {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  specialization: string;
  medicalLicenseNumber: string;
  currentHospitalId: string;
  currentHospitalName: string;
  targetHospitalId: string;
  targetHospitalName: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  requestDate: string;
  responseDate?: string;
  notes?: string;
}

export interface ScheduledSurgery {
  id: string;
  doctorId: string;
  doctorName: string;
  hospitalId: string;
  hospitalName: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g., "09:00 AM - 01:00 PM"
  procedureName: string;
  operatingTheater?: string;
  isUrgent?: boolean;
  notes?: string;
  createdAt: string;
}

export interface PatientDoctorRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  hospitalId: string;
  hospitalName: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  requestedAt: string;
  respondedAt?: string;
}

export interface HealthVerification {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  verifiedAt: string;
  status: 'clear' | 'stable' | 'attention_required';
  vitalsCondition: 'excellent' | 'normal' | 'concerning';
  clinicalNotes: string;
}

export interface KitPaymentOrder {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  itemId: string;
  itemName: string;
  itemPrice: number;
  itemImage?: string;
  itemCategory?: string;
  amount: number;
  paymentMethod: 'UPI / QR Code' | 'Credit / Debit Card' | 'Net Banking' | 'Digital Wallet';
  transactionId: string;
  paymentStatus: 'received' | 'pending' | 'verified';
  fulfillmentStatus: 'processing' | 'dispatched' | 'delivered';
  shippingAddress: string;
  trackingNumber?: string;
  orderedAt: string;
  verifiedAt?: string;
  adminNotes?: string;
}

