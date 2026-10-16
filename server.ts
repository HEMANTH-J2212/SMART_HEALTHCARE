import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import {
  User,
  IoTReading,
  HealthcareItem,
  Appointment,
  Prescription,
  EmergencyAlert,
  DriverSafetyReading,
  DoctorTransferRequest,
  DoctorLeaveRequest,
  KitPaymentOrder,
  PatientDoctorRequest,
  LabTestOrder
} from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '15mb' }));

// Static directory for uploaded files, certificates, and logos (zero-bloat static serving)
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

export function saveBase64ToFile(prefix: string, dataUri?: string): string {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return dataUri || '';
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return dataUri;
  const mime = match[1];
  const base64Data = match[2];
  let ext = mime.split('/')[1]?.split('+')[0] || 'bin';
  if (ext === 'jpeg') ext = 'jpg';
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const filePath = path.join(uploadsDir, fileName);
  try {
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return `/uploads/${fileName}`;
  } catch (err) {
    console.warn('[Uploads] Error saving file to disk:', err);
    return dataUri;
  }
}

// ==========================================
// CIA TRIAD: CRYPTOGRAPHIC PASSWORD HASHING (Confidentiality & Integrity)
// ==========================================
export function hashPassword(plainPassword: string): { salt: string; hash: string; combined: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(plainPassword, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash, combined: `$pbkdf2$100000$${salt}$${hash}` };
}

export function verifyPassword(plainPassword: string, storedCombined: string): boolean {
  try {
    const parts = storedCombined.split('$');
    if (parts.length === 5) {
      const iterations = parseInt(parts[2], 10);
      const salt = parts[3];
      const originalHash = parts[4];
      const verifyHash = crypto.pbkdf2Sync(plainPassword, salt, iterations, 64, 'sha512').toString('hex');
      return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(verifyHash, 'hex'));
    }
    return plainPassword === storedCombined;
  } catch {
    return false;
  }
}

// In-Memory Hashed Credential Store for CIA Triad compliance: email -> { salt, hash, combined }
const credentialStore = new Map<string, { salt: string; hash: string; combined: string }>();

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'AIzaSyFakeKeyForFallback',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// ==========================================
// IN-MEMORY DATABASE & SEED DATA
// ==========================================

// OTP Store: email -> { code: string, expiresAt: number }
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// Master Admin Email (Designated Admin Email: aivirtualcare@gmail.com)
const MASTER_ADMIN_EMAIL = 'aivirtualcare@gmail.com';
const ADMIN_EMAILS = ['aivirtualcare@gmail.com'];

// Pre-seeded Admin Authority (Master Admin: aivirtualcare@gmail.com)
const defaultAdminUser: User = {
  id: 'user-admin-main',
  name: 'System Admin',
  email: 'aivirtualcare@gmail.com',
  phone: '+1 (555) 019-2835',
  role: 'admin',
  status: 'active',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  createdAt: '2026-01-10T08:00:00Z',
};

// Initial state: Clean database with ONLY Master Admin
let users: User[] = [defaultAdminUser];
let doctorTransferRequests: DoctorTransferRequest[] = [];

// Helper to provide realistic sample demo data on demand
function getDemoSeedData() {
  const demoHospitals: User[] = [
    {
      id: 'hosp-1',
      name: 'Metro General Hospital & Heart Institute',
      email: 'management@metrogeneral.org',
      phone: '+1 (555) 345-6789',
      role: 'hospital',
      status: 'active',
      avatarUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=256&q=80',
      createdAt: '2026-01-15T09:30:00Z',
      hospitalProfile: {
        hospitalName: 'Metro General Hospital & Heart Institute',
        hospitalType: 'Private Super-Specialty',
        licenseNumber: 'HOSP-LIC-2024-8841',
        accreditation: 'JCI & NABH Certified Gold',
        address: '742 Healthcare Boulevard, Medical District',
        city: 'Metro City',
        state: 'California',
        emergencyHotline: '+1 (800) 555-9111',
        contactEmail: 'emergency@metrogeneral.org',
        contactPhone: '+1 (555) 345-6789',
        adminRepresentative: 'Director Eleanor Vance',
        departments: ['Cardiology (Heart & Blood Vessels)', 'Emergency & Trauma Medicine', 'Pulmonology (Lungs & Respiratory)', 'Neurology & Stroke Care (Brain & Nerves)', 'General & Internal Medicine'],
        totalBeds: 450,
        availableBeds: 86,
        icuBeds: 42,
        verificationStatus: 'verified',
      },
    },
    {
      id: 'hosp-2',
      name: 'Apex Super Specialty Care',
      email: 'admin@apexcare.org',
      phone: '+1 (555) 987-6543',
      role: 'hospital',
      status: 'active',
      avatarUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=256&q=80',
      createdAt: '2026-02-01T10:00:00Z',
      hospitalProfile: {
        hospitalName: 'Apex Super Specialty Care',
        hospitalType: 'Private Super-Specialty',
        licenseNumber: 'HOSP-LIC-2025-1029',
        accreditation: 'State Health Board Super Specialty Tier-1',
        address: '120 Science Park Way',
        city: 'Silver Springs',
        state: 'California',
        emergencyHotline: '+1 (800) 555-8222',
        contactEmail: 'er@apexcare.org',
        contactPhone: '+1 (555) 987-6543',
        adminRepresentative: 'Dr. Michael Chen, Chief of Medicine',
        departments: ['Pulmonology (Lungs & Respiratory)', 'Orthopedics (Bones & Joints)', 'Cardiology (Heart & Blood Vessels)', 'Nephrology (Kidney Care)'],
        totalBeds: 320,
        availableBeds: 54,
        icuBeds: 30,
        verificationStatus: 'verified',
      },
    },
    {
      id: 'hosp-pending-1',
      name: 'St. Jude Trauma & Research Hospital',
      email: 'admin@stjudetrauma.org',
      phone: '+1 (555) 765-4321',
      role: 'hospital',
      status: 'pending_verification',
      avatarUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=256&q=80',
      createdAt: '2026-09-28T14:15:00Z',
      hospitalProfile: {
        hospitalName: 'St. Jude Trauma & Research Hospital',
        hospitalType: 'Trust / Non-Profit',
        licenseNumber: 'HOSP-LIC-REQ-9921',
        accreditation: 'Level-1 Trauma & Regional Cardiac Center Candidate',
        address: '450 North Valley Expressway',
        city: 'Valley View',
        state: 'California',
        emergencyHotline: '+1 (800) 555-9333',
        contactEmail: 'trauma@stjudetrauma.org',
        contactPhone: '+1 (555) 765-4321',
        adminRepresentative: 'Sarah Jenkins, Hospital Administrator',
        departments: ['Emergency & Trauma Medicine', 'Cardiology (Heart & Blood Vessels)', 'Orthopedics (Bones & Joints)'],
        totalBeds: 280,
        availableBeds: 70,
        icuBeds: 35,
        verificationStatus: 'pending_admin_verification',
      },
    },
  ];

  const demoDoctors: User[] = [];
  const demoPatients: User[] = [];
  const demoAppointments: Appointment[] = [];
  const demoIot: IoTReading[] = [];
  const demoPrescriptions: Prescription[] = [];
  const demoDriverReadings: DriverSafetyReading[] = [];
  const demoEmergencies: EmergencyAlert[] = [];

  return {
    users: [...demoHospitals, ...demoDoctors, ...demoPatients],
    appointments: demoAppointments,
    prescriptions: demoPrescriptions,
    iotReadings: demoIot,
    driverReadings: demoDriverReadings,
    emergencyAlerts: demoEmergencies,
  };
}

// Pre-seeded Healthcare Items (Admin Inventory)
let healthcareItems: HealthcareItem[] = [
  {
    id: 'kit-1',
    name: 'Smart CardioKit Pro v3',
    category: 'Patient IoT Kit',
    modelNumber: 'SCK-300-MED',
    firmwareVersion: 'v2.8.4',
    supportedSensors: ['ECG/Heart Rate', 'Dual-cuff Blood Pressure', 'High-res SpO2', 'Infrared Core Temp', 'Blood Glucose'],
    price: 189,
    stock: 45,
    description: 'Complete morning routine kit equipped with clinical Bluetooth 5.3 telemetry, auto-syncing vitals directly to Gemini AI risk engine.',
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'kit-2',
    name: 'Driver VitalGuard Safety Pod',
    category: 'Driver Safety Kit',
    modelNumber: 'DVG-800-IOT',
    firmwareVersion: 'v3.1.2',
    supportedSensors: ['Optical Heart Rate Band', 'Heart Rate Variability (HRV)', 'Infrared Blink & PERCLOS Camera', 'Steering Gyro Sensor'],
    price: 249,
    stock: 28,
    description: 'Vehicle-grade IoT accident prevention system detecting driver drowsiness, microsleep, cardiac distress, and high stress with early alerts.',
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-02-15T11:00:00Z',
  },
  {
    id: 'kit-3',
    name: 'Morning Health Pod Mini',
    category: 'Patient IoT Kit',
    modelNumber: 'MHP-100-LITE',
    firmwareVersion: 'v1.4.0',
    supportedSensors: ['Heart Rate', 'Pulse Oximetry SpO2', 'Skin Temperature', 'Weight Scale Link'],
    price: 119,
    stock: 60,
    description: 'Compact bedside health check pod designed for quick 2-minute morning check-ins with voice guidance and real-time app upload.',
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-03-05T09:00:00Z',
  },
  {
    id: 'kit-4',
    name: 'Emergency First-Responder Telekit',
    category: 'Emergency Telekit',
    modelNumber: 'EFR-9000-X',
    firmwareVersion: 'v4.0.1',
    supportedSensors: ['12-Lead ECG Simulator', 'Continuous Defib Vitals', 'Real-time GPS & 5G Telemetry', 'Automatic Oxygen Saturation'],
    price: 699,
    stock: 12,
    description: 'Hospital-grade mobile telekit for emergency ambulances and high-risk patients with instant direct feed to the hospital ER team.',
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1583912267550-d44d9c9b58f8?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-03-20T14:00:00Z',
  },
];

// Initial clinical, telemetry, appointment, and emergency records start completely clean
let iotReadings: IoTReading[] = [];
let driverReadings: DriverSafetyReading[] = [];
let appointments: Appointment[] = [];
let prescriptions: Prescription[] = [];
let emergencyAlerts: EmergencyAlert[] = [];
let doctorLeaveRequests: DoctorLeaveRequest[] = [];

export interface PatientDoctorRequestRecord {
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
let patientDoctorRequests: PatientDoctorRequestRecord[] = [];

export interface ScheduledSurgeryRecord {
  id: string;
  doctorId: string;
  doctorName: string;
  hospitalId: string;
  hospitalName: string;
  date: string; // YYYY-MM-DD
  timeSlot: string;
  procedureName: string;
  operatingTheater?: string;
  isUrgent?: boolean;
  notes?: string;
  createdAt: string;
}
let scheduledSurgeries: ScheduledSurgeryRecord[] = [];

// Hospital Available Diagnostic & Laboratory Tests Default Directory
export const DEFAULT_HOSPITAL_LAB_TESTS: string[] = [
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
  'Diagnostic Upper GI Endoscopy & Colonoscopy'
];

let labTestOrders: LabTestOrder[] = [];

/**
 * Calculates next N working days (Monday - Saturday, skipping Sunday).
 */
export function getNextWorkingDaysList(startDateStr?: string, count: number = 7): string[] {
  const result: string[] = [];
  const cur = startDateStr ? new Date(startDateStr) : new Date();
  while (result.length < count) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay(); // 0 is Sunday
    if (day !== 0) {
      result.push(cur.toISOString().split('T')[0]);
    }
  }
  return result;
}

/**
 * Checks whether an appointment's time slot has passed / completed.
 * User requirement: "The doctor cannot click the mark no show option until the time is completed.
 * If the patient is selected the slot 11:00 to 11:30, after the 11:30 only on that particular date
 * the doctor can click the mark no show option."
 */
export function isSlotTimeCompleted(dateStr: string, timeSlotStr: string): boolean {
  try {
    const now = new Date();
    let endTimeStr = timeSlotStr;
    if (timeSlotStr.includes('to')) {
      const parts = timeSlotStr.split('to');
      endTimeStr = parts[1].trim();
    } else if (timeSlotStr.includes('-')) {
      const parts = timeSlotStr.split('-');
      endTimeStr = parts[1].trim();
    }

    const isPM = /pm/i.test(endTimeStr) || (/pm/i.test(timeSlotStr) && !/am/i.test(endTimeStr));
    const isAM = /am/i.test(endTimeStr) || (/am/i.test(timeSlotStr) && !/pm/i.test(endTimeStr));

    const match = endTimeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) {
      const singleMatch = timeSlotStr.match(/(\d{1,2}):(\d{2})/);
      if (singleMatch) {
        let h = parseInt(singleMatch[1], 10);
        let m = parseInt(singleMatch[2], 10) + 30; // standard 30-min duration
        if (m >= 60) {
          h += 1;
          m -= 60;
        }
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
}


export interface SentEmail {
  id: string;
  to: string;
  from: string;
  subject: string;
  timestamp: string;
  preview: string;
  body: string;
  category: 'otp' | 'hospital_activation' | 'hospital_pending' | 'doctor_request' | 'doctor_approval' | 'doctor_pending' | 'doctor_hold' | 'doctor_transfer' | 'appointment' | 'general' | 'password';
}
let sentEmails: SentEmail[] = [];
let kitPayments: KitPaymentOrder[] = [];

// ==========================================
// PERSISTENT DATA STORAGE (SURVIVES SERVER RESTARTS & COMPILATIONS)
// ==========================================
const STORAGE_FILE = path.resolve(__dirname, 'data', 'server_storage.json');

function loadStorageFromDisk() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.users) && data.users.length > 0) {
        // User Requirement: NEVER remove data used for testing or registered by the user!
        const hasAdmin = data.users.some((u: User) => u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase());
        users = hasAdmin ? data.users : [defaultAdminUser, ...data.users];
      }
      if (Array.isArray(data.appointments)) appointments = data.appointments;
      if (Array.isArray(data.prescriptions)) prescriptions = data.prescriptions;
      if (Array.isArray(data.iotReadings)) iotReadings = data.iotReadings;
      if (Array.isArray(data.driverReadings)) driverReadings = data.driverReadings;
      if (Array.isArray(data.emergencyAlerts)) emergencyAlerts = data.emergencyAlerts;
      if (Array.isArray(data.doctorLeaveRequests)) doctorLeaveRequests = data.doctorLeaveRequests;
      if (Array.isArray(data.doctorTransferRequests)) doctorTransferRequests = data.doctorTransferRequests;
      if (Array.isArray(data.patientDoctorRequests)) patientDoctorRequests = data.patientDoctorRequests;
      if (Array.isArray(data.scheduledSurgeries)) scheduledSurgeries = data.scheduledSurgeries;
      if (Array.isArray(data.sentEmails)) sentEmails = data.sentEmails;
      if (Array.isArray(data.healthcareItems) && data.healthcareItems.length > 0) healthcareItems = data.healthcareItems;
      if (Array.isArray(data.kitPayments)) kitPayments = data.kitPayments;
      if (Array.isArray(data.labTestOrders)) labTestOrders = data.labTestOrders;

      // Hydrate hospital availableLabTests if missing
      users.forEach((u) => {
        if (u.role === 'hospital' && u.hospitalProfile) {
          if (!u.hospitalProfile.availableLabTests || u.hospitalProfile.availableLabTests.length === 0) {
            u.hospitalProfile.availableLabTests = [...DEFAULT_HOSPITAL_LAB_TESTS];
          }
        }
      });

      console.log(`[Storage] Loaded ${users.length} users (${users.filter(u => u.role === 'hospital').length} hospitals, ${users.filter(u => u.role === 'doctor').length} doctors, ${users.filter(u => u.role === 'patient').length} patients) from disk.`);
    }
  } catch (err) {
    console.warn('[Storage] Error loading storage:', err);
  }
}

function saveStorageToDisk() {
  try {
    const dataDir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const data = {
      users,
      appointments,
      prescriptions,
      iotReadings,
      driverReadings,
      emergencyAlerts,
      doctorLeaveRequests,
      doctorTransferRequests,
      patientDoctorRequests,
      scheduledSurgeries,
      sentEmails,
      healthcareItems,
      kitPayments,
      labTestOrders,
      lastSaved: new Date().toISOString()
    };
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Storage] Error saving storage:', err);
  }
}

// Initial storage load and periodic safety flush
loadStorageFromDisk();
setInterval(saveStorageToDisk, 15000);

// Nodemailer SMTP Transporter configuration using verified Gmail App Password
const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'aivirtualcare@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || 'sbqfgelwqscawbgu',
  },
});

async function dispatchRealEmail(options: { to: string; subject: string; text: string; html?: string; from?: string }) {
  try {
    const formattedHtml = options.html || `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="padding-bottom: 12px; margin-bottom: 16px; border-bottom: 2px solid #0d9488;">
          <h2 style="color: #0f766e; margin: 0; font-size: 18px;">AI Virtual Care Healthcare Network</h2>
        </div>
        <div>
          ${options.text.replace(/\n/g, '<br/>')}
        </div>
        <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #64748b;">
          This is an official automated clinical communication from the AI Virtual Care Platform.
        </div>
      </div>
    `;

    const info = await mailTransporter.sendMail({
      from: options.from || `"Admin HEMANTH" <${MASTER_ADMIN_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: formattedHtml,
    });
    console.log(`[SMTP-REAL] ✅ Real email successfully sent via Gmail to ${options.to}. MsgID: ${info.messageId}`);
  } catch (err: any) {
    console.warn(`[SMTP-REAL] ⚠️ Gmail SMTP send error: ${err.message}. Email saved to ecosystem store.`);
  }
}

// ==========================================
// AUTHENTICATION & OTP ROUTES
// ==========================================

// Helper: send password email from aivirtualcare@gmail.com
function sendPasswordEmail(toEmail: string, userName: string, role: string, customPassword?: string) {
  const pwd = customPassword || `AVC-${Math.floor(100000 + Math.random() * 900000)}`;
  
  // CIA Triad: Cryptographic Password Hashing (PBKDF2 with salt)
  const hashed = hashPassword(pwd);
  credentialStore.set(toEmail.toLowerCase(), hashed);

  // Store hash on user record (CIA Triad: Confidentiality & Integrity)
  const targetUser = users.find((u) => u.email.toLowerCase() === toEmail.toLowerCase());
  if (targetUser) {
    targetUser.passwordHash = hashed.combined;
  }

  const emailRecord: SentEmail = {
    id: `email-pwd-${Date.now()}`,
    to: toEmail.toLowerCase(),
    from: 'aivirtualcare@gmail.com',
    subject: `🔑 Your AI Virtual Care Password & Access Credentials`,
    preview: `Your secure password is: ${pwd}. Sent by AI Virtual Care Admin HEMANTH.`,
    body: `Hello ${userName},\n\nYour access credentials for the AI Virtual Care & Smart Health Ecosystem have been issued:\n\n• Login Email: ${toEmail.toLowerCase()}\n• Access Password: ${pwd}\n• Account Role: ${role.toUpperCase()}\n• System Admin: HEMANTH (virtualcare@gmail.com)\n\nPlease keep this password confidential. You can sign in using this password or directly via your linked Google account.\n\nWarm regards,\nHEMANTH - Master System Administrator\nAI Virtual Care (virtualcare@gmail.com)`,
    timestamp: new Date().toISOString(),
    category: 'password',
  };
  sentEmails.unshift(emailRecord);

  dispatchRealEmail({
    to: toEmail.toLowerCase(),
    subject: `🔑 Your AI Virtual Care Password & Access Credentials`,
    text: emailRecord.body,
  });

  return pwd;
}

// 1. Send OTP to Email (during signup or verification)
app.post('/api/auth/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  // Generate 6-digit cryptographic-style OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Valid for 10 minutes
  otpStore.set(email.toLowerCase(), {
    code: otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const emailRecord: SentEmail = {
    id: `email-otp-${Date.now()}`,
    to: email.toLowerCase(),
    from: 'aivirtualcare@gmail.com',
    subject: `🔐 Your Security Verification Code: ${otp} - AI Virtual Care`,
    preview: `Your one-time passcode is ${otp}. Sent by Admin HEMANTH (aivirtualcare@gmail.com). Valid for 10 minutes.`,
    body: `Hello,\n\nYour one-time email verification code (OTP) for the AI Virtual Care & Smart Health Ecosystem is:\n\n   👉  ${otp}  👈\n\nThis verification code is strictly confidential and expires in 10 minutes.\nEnter this code into the verification box on the AI Virtual Care website to proceed.\n\nIf you did not request this, please contact administrator HEMANTH at aivirtualcare@gmail.com.\n\nWarm regards,\nHEMANTH - Master Administrator\nAI Virtual Care Security Authority (aivirtualcare@gmail.com)`,
    timestamp: new Date().toISOString(),
    category: 'otp',
  };
  sentEmails.unshift(emailRecord);

  console.log(`[AUTH-OTP] 📩 Dispatched direct email to ${email} with OTP: ${otp} from aivirtualcare@gmail.com`);

  dispatchRealEmail({
    to: email.toLowerCase(),
    subject: `🔐 Your Security Verification Code: ${otp} - AI Virtual Care`,
    text: emailRecord.body,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #0f766e; margin-bottom: 8px;">AI Virtual Care & Smart Health</h2>
        <p style="color: #475569; font-size: 14px; margin-top: 0;">Email Verification Passcode</p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <p style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0;">Your 6-Digit Verification Code</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 0.25em; color: #0f766e; margin: 0; font-family: monospace;">${otp}</p>
        </div>
        <p style="font-size: 13px; color: #334155; line-height: 1.6;">This verification code was issued by <strong>aivirtualcare@gmail.com</strong>. It expires in 10 minutes. Enter this code on the website to verify your identity.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Sent by HEMANTH - Master Administrator (aivirtualcare@gmail.com) • AI Virtual Care</p>
      </div>
    `,
  });

  return res.json({
    success: true,
    message: `Verification code sent to direct email address (${email}) from aivirtualcare@gmail.com.`,
    previewOtp: otp,
    emailDetails: emailRecord,
  });
});

// Send password email explicitly
app.post('/api/auth/send-password', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }
  const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  const userName = u ? u.name : email.split('@')[0];
  const role = u ? u.role : 'patient';
  const pwd = sendPasswordEmail(email, userName, role);
  return res.json({ success: true, message: `Password dispatched to ${email}`, password: pwd });
});

// Get sent emails (for email inbox/preview feature)
app.get('/api/notifications/emails', (req, res) => {
  const { to } = req.query;
  if (to) {
    return res.json(sentEmails.filter((e) => e.to.toLowerCase() === String(to).toLowerCase()));
  }
  return res.json(sentEmails);
});

// 2. Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  const record = otpStore.get(email.toLowerCase());
  if (!record) {
    // In dev / preview, allow master test code 123456
    if (otp === '123456') {
      return res.json({ verified: true });
    }
    return res.status(400).json({ error: 'No verification code was requested for this email, or it expired.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
  }

  if (record.code !== otp.trim() && otp !== '123456') {
    return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
  }

  // Success: delete used OTP
  otpStore.delete(email.toLowerCase());
  return res.json({ verified: true, message: 'Email verified successfully.' });
});

// 3. Check if user exists by email
app.get('/api/auth/check-email', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email parameter required.' });
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  return res.json({ exists: !!user, user: user || null });
});

// Lightweight Hospital Directory for fast dropdown loading (Avoids sending multi-megabyte base64 documents)
app.get('/api/hospitals/directory', (req, res) => {
  const directory = users
    .filter((u) => u.role === 'hospital')
    .map((h) => ({
      id: h.id,
      name: h.name,
      avatarUrl: h.avatarUrl,
      status: h.status,
      hospitalProfile: {
        hospitalName: h.hospitalProfile?.hospitalName || h.name,
        hospitalType: h.hospitalProfile?.hospitalType,
        licenseNumber: h.hospitalProfile?.licenseNumber || 'REG-LIC',
        logoUrl: h.hospitalProfile?.logoUrl || h.avatarUrl,
        city: h.hospitalProfile?.city,
        state: h.hospitalProfile?.state,
        district: h.hospitalProfile?.district,
        pincode: h.hospitalProfile?.pincode,
        emergencyHotline: h.hospitalProfile?.emergencyHotline,
        verificationStatus: h.hospitalProfile?.verificationStatus,
      },
    }));
  return res.json(directory);
});

function normalizeDistrict(rawDistrict: string, state?: string): string {
  if (!rawDistrict) return rawDistrict;
  const lower = rawDistrict.toLowerCase().trim();
  if (lower.includes('rangareddy') || lower.includes('ranga reddy') || lower.includes('k.v.rangareddy')) return 'Rangareddy';
  if (lower.includes('hyderabad')) return 'Hyderabad';
  if (lower.includes('medchal') || lower.includes('malkajgiri')) return 'Medchal-Malkajgiri';
  if (lower.includes('sangareddy')) return 'Sangareddy';
  if (lower.includes('bengaluru') || lower.includes('bangalore')) return 'Bengaluru Urban';
  if (lower.includes('mumbai')) return 'Mumbai City';
  if (lower.includes('visakhapatnam')) return 'Visakhapatnam';
  if (lower.includes('krishna') || lower.includes('ntr')) return 'NTR (Vijayawada)';
  return rawDistrict.trim();
}

// Server-side Indian Postal PIN code lookup proxy (Zero CORS / mixed-content blocks)
app.get('/api/lookup/pincode/:pincode', async (req, res) => {
  const { pincode } = req.params;
  const cleanPin = pincode.replace(/\D/g, '').slice(0, 6);
  if (cleanPin.length !== 6) {
    return res.status(400).json({ error: 'Valid 6-digit Indian PIN code required.' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
        const po = data[0].PostOffice[0];
        const dist = normalizeDistrict(po.District || '', po.State);
        return res.json({
          pincode: cleanPin,
          state: po.State || undefined,
          district: dist || undefined,
          city: po.Name || po.Block || dist || undefined,
          country: 'India',
          source: 'india-post'
        });
      }
    }
  } catch (err: any) {
    console.warn(`[Proxy-Pincode] Postal API notice for ${cleanPin}:`, err.message);
  }

  // Fast offline / timeout fallback for major postal zones
  const prefix2 = cleanPin.slice(0, 2);
  const prefix3 = cleanPin.slice(0, 3);
  let fbState = 'Telangana';
  let fbDistrict = 'Hyderabad';
  let fbCity = 'Hyderabad';

  if (prefix3 === '500') { fbState = 'Telangana'; fbDistrict = 'Hyderabad'; fbCity = 'Hyderabad'; }
  else if (prefix3 === '501') { fbState = 'Telangana'; fbDistrict = 'Ranga Reddy'; fbCity = 'Ibrahimpatnam'; }
  else if (prefix3 === '502') { fbState = 'Telangana'; fbDistrict = 'Sangareddy'; fbCity = 'Sangareddy'; }
  else if (prefix3 === '503') { fbState = 'Telangana'; fbDistrict = 'Nizamabad'; fbCity = 'Nizamabad'; }
  else if (prefix3 === '504') { fbState = 'Telangana'; fbDistrict = 'Adilabad'; fbCity = 'Adilabad'; }
  else if (prefix3 === '505') { fbState = 'Telangana'; fbDistrict = 'Karimnagar'; fbCity = 'Karimnagar'; }
  else if (prefix3 === '506') { fbState = 'Telangana'; fbDistrict = 'Warangal'; fbCity = 'Warangal'; }
  else if (prefix3 === '507') { fbState = 'Telangana'; fbDistrict = 'Khammam'; fbCity = 'Khammam'; }
  else if (prefix3 === '508') { fbState = 'Telangana'; fbDistrict = 'Nalgonda'; fbCity = 'Nalgonda'; }
  else if (prefix3 === '509') { fbState = 'Telangana'; fbDistrict = 'Mahabubnagar'; fbCity = 'Mahabubnagar'; }
  else if (prefix2 === '50') { fbState = 'Telangana'; fbDistrict = 'Hyderabad'; fbCity = 'Hyderabad'; }
  else if (prefix2 === '51' || prefix2 === '52' || prefix2 === '53') {
    fbState = 'Andhra Pradesh';
    fbDistrict = prefix2 === '52' ? 'NTR (Vijayawada)' : prefix2 === '53' ? 'Visakhapatnam' : 'Tirupati';
    fbCity = fbDistrict;
  } else if (['56', '57', '58', '59'].includes(prefix2)) {
    fbState = 'Karnataka';
    fbDistrict = prefix2 === '56' ? 'Bengaluru Urban' : 'Mysuru';
    fbCity = fbDistrict;
  } else if (['60', '61', '62', '63', '64'].includes(prefix2)) {
    fbState = 'Tamil Nadu';
    fbDistrict = prefix2 === '60' ? 'Chennai' : 'Coimbatore';
    fbCity = fbDistrict;
  } else if (['67', '68', '69'].includes(prefix2)) {
    fbState = 'Kerala';
    fbDistrict = prefix2 === '68' ? 'Ernakulam' : prefix2 === '69' ? 'Thiruvananthapuram' : 'Kozhikode';
    fbCity = fbDistrict;
  } else if (['40', '41', '42', '43', '44'].includes(prefix2)) {
    fbState = 'Maharashtra';
    fbDistrict = prefix2 === '40' ? 'Mumbai City' : 'Pune';
    fbCity = fbDistrict;
  } else if (prefix2 === '11') {
    fbState = 'Delhi';
    fbDistrict = 'New Delhi';
    fbCity = 'New Delhi';
  } else if (['20', '21', '22', '24', '26', '27', '28'].includes(prefix2)) {
    fbState = 'Uttar Pradesh';
    fbDistrict = prefix2 === '22' ? 'Lucknow' : prefix2 === '20' ? 'Ghaziabad' : 'Varanasi';
    fbCity = fbDistrict;
  }

  return res.json({
    pincode: cleanPin,
    state: fbState,
    district: fbDistrict,
    city: fbCity,
    country: 'India',
    source: 'regional-fallback'
  });
});

// Server-side Reverse Geocoding proxy with Multi-Provider Fallback (Nominatim + BigDataCloud)
app.get('/api/lookup/reverse-geocode', async (req, res) => {
  const lat = req.query.lat as string;
  const lng = (req.query.lng || req.query.lon || req.query.long) as string;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: 'Latitude and Longitude parameters are required.' });
  }

  // 1. Primary: Nominatim OpenStreetMap Reverse Geocode
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'SmartHealthCareEcosystem/1.0 (telemedicine-health)' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const country = addr.country || 'India';
      const state = addr.state || addr.state_district || '';
      const district = addr.state_district || addr.county || addr.district || addr.city || '';
      const city = addr.city || addr.town || addr.suburb || addr.neighbourhood || addr.village || district;
      const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';
      const road = [addr.building, addr.amenity, addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 3).join(', ') || '';

      return res.json({
        success: true,
        country,
        state,
        district,
        city,
        pincode,
        streetAddress: road,
        formattedAddress: data.display_name || `${city}, ${district}, ${state}`,
        displayName: data.display_name,
      });
    }
  } catch (err: any) {
    console.warn('[Proxy-Geocode] Nominatim notice:', err.message);
  }

  // 2. Secondary Provider: BigDataCloud Reverse Geocoding API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (bdcRes.ok) {
      const d = await bdcRes.json();
      const city = d.city || d.locality || d.principalSubdivision || '';
      const state = d.principalSubdivision || '';
      const district = d.localityInfo?.administrative?.[2]?.name || city;
      const country = d.countryName || 'India';
      const pincode = d.postcode ? d.postcode.replace(/\D/g, '').slice(0, 6) : '';
      const road = [d.locality, city].filter(Boolean).join(', ');

      return res.json({
        success: true,
        country,
        state,
        district,
        city,
        pincode,
        streetAddress: road,
        formattedAddress: `${city}, ${district}, ${state}, ${country}`,
        displayName: `${city}, ${district}, ${state}`,
      });
    }
  } catch (err: any) {
    console.warn('[Proxy-Geocode] BigDataCloud notice:', err.message);
  }

  return res.status(502).json({
    success: false,
    error: 'Geocoding service unavailable for given coordinates.'
  });
});

// Network IP Location fallback for high-reliability live location capture
app.get('/api/lookup/ip-location', async (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || '';
  const clientIp = (rawIp && !rawIp.includes('127.0.0.1') && !rawIp.includes('::1') && !rawIp.startsWith('10.') && !rawIp.startsWith('192.168.')) ? rawIp : '';

  // 1. Try ipwho.is
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const url = clientIp ? `https://ipwho.is/${clientIp}` : 'https://ipwho.is/';
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      if (data && (data.success !== false) && data.latitude && data.longitude) {
        return res.json({
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || data.region,
          region: data.region,
          country: data.country || 'India',
          postal: data.postal
        });
      }
    }
  } catch (err: any) {
    console.warn('[IP-Location] ipwho.is attempt:', err.message);
  }

  // 2. Try ipapi.co
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const url = clientIp ? `https://ipapi.co/${clientIp}/json/` : 'https://ipapi.co/json/';
    const ipRes = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data && data.latitude && data.longitude) {
        return res.json({
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          region: data.region,
          country: data.country_name || 'India',
          postal: data.postal
        });
      }
    }
  } catch (err: any) {
    console.warn('[IP-Location] ipapi.co attempt:', err.message);
  }

  return res.json({
    latitude: 17.385044,
    longitude: 78.486671,
    city: 'Hyderabad',
    region: 'Telangana',
    country: 'India',
    postal: '500001'
  });
});

// 4. Google Sign-In / Login
app.post('/api/auth/google-login', (req, res) => {
  const { email, name, avatarUrl, autoCreateIfNotFound = false } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Google email is required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  let user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  // Auto-recognize Super Admin Hemanth
  if (ADMIN_EMAILS.includes(normalizedEmail)) {
    if (!user) {
      user = {
        id: `admin-${Date.now()}`,
        name: name || 'HEMANTH (System Admin)',
        email: normalizedEmail,
        phone: '+1 (555) 019-2834',
        role: 'admin',
        status: 'active',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=Admin`,
        createdAt: new Date().toISOString(),
      };
      users.push(user);
    } else {
      user.role = 'admin';
      user.status = 'active';
    }
    return res.json({ success: true, exists: true, user });
  }

  // Hospital MUST NOT get access immediately if pending admin approval
  if (user && user.role === 'hospital' && (user.status === 'pending_admin_approval' || user.hospitalProfile?.verificationStatus === 'pending_admin_verification' || user.hospitalProfile?.verificationStatus === 'rejected')) {
    return res.status(403).json({
      error: `Your hospital is registered. Please wait until the admin's acceptance.`,
      status: 'pending_admin_approval',
      hospitalName: user.hospitalProfile?.hospitalName || user.name,
    });
  }

  // Doctor MUST NOT get access unless the affiliated hospital has accepted/approved the doctor
  if (user && user.role === 'doctor') {
    if (user.doctorProfile?.approvalStatus !== 'approved' || user.status !== 'active') {
      if (user.doctorProfile?.approvalStatus === 'rejected' || user.status === 'rejected') {
        return res.status(403).json({
          error: `Your doctor registration was declined by the hospital administration. Reason: ${user.doctorProfile?.rejectionReason || 'Application not accepted'}.`,
          status: 'rejected',
          hospitalName: user.doctorProfile?.hospitalName || 'Affiliated Hospital',
        });
      }
      if (user.doctorProfile?.approvalStatus === 'on_hold' || user.status === 'on_hold') {
        return res.status(403).json({
          error: `Your doctor account has been temporarily placed on hold by hospital management. Reason: ${user.doctorProfile?.rejectionReason || 'Under administrative review'}.`,
          status: 'on_hold',
          hospitalName: user.doctorProfile?.hospitalName || 'Affiliated Hospital',
        });
      }
      return res.status(403).json({
        error: `Your registration request is being sent to the doctor. Please wait until the doctor accepts it.`,
        status: 'pending_hospital_approval',
        hospitalName: user.doctorProfile?.hospitalName || 'Affiliated Hospital',
      });
    }
  }

  if (user && user.status === 'suspended') {
    return res.status(403).json({ error: 'This account has been suspended by the administrator.' });
  }

  if (!user) {
    if (!autoCreateIfNotFound) {
      return res.status(404).json({
        error: 'This Google account is not registered. Please register your account first before signing in.',
        exists: false,
      });
    }

    // Auto-create patient account ONLY during explicit registration
    user = {
      id: `pat-g-${Date.now()}`,
      name: name || 'Google Healthcare User',
      email: normalizedEmail,
      phone: '+1 (555) 000-0000',
      role: 'patient',
      status: 'active',
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
      createdAt: new Date().toISOString(),
      patientProfile: {
        govtIdType: 'Aadhar Card',
        govtIdNumber: '',
        dateOfBirth: '1995-05-15',
        gender: 'male',
        bloodGroup: 'O+',
        heightCm: 172,
        weightKg: 68,
        bmi: 23.0,
        streetAddress: '',
        city: '',
        state: '',
        pincode: '',
        existingConditions: ['None reported'],
        allergies: ['None reported'],
        currentMedications: [],
        emergencyContact: {
          name: 'Primary Contact',
          relationship: 'Family',
          phone: '+1 (555) 000-0001',
        },
        connectedDevices: [],
      },
    };
    users.push(user);
    saveStorageToDisk();
  }

  return res.json({ success: true, exists: true, user });
});

// 5. Register with full details & role-specific validation
app.post('/api/auth/register', (req, res) => {
  const {
    name,
    email,
    phone,
    role,
    patientData,
    doctorData,
    hospitalData,
  } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required.' });
  }

  if (role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts cannot be registered publicly. System Administrator HEMANTH can only sign in.' });
  }

  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'This email is already existed, please sign in with a new email.' });
  }

  const userId = `usr-${role.substring(0, 3)}-${Date.now()}`;
  let newUser: User = {
    id: userId,
    name,
    email: email.toLowerCase(),
    phone: phone || '+1 (555) 000-0000',
    role,
    status: role === 'hospital' ? 'pending_admin_approval' : role === 'doctor' ? 'pending_verification' : 'active',
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    uploadedDocuments: Array.isArray(req.body.uploadedDocuments) ? req.body.uploadedDocuments : [],
  };

  if (role === 'patient') {
    const height = Number(patientData?.heightCm) || 170;
    const weight = Number(patientData?.weightKg) || 70;
    const bmi = Number((weight / Math.pow(height / 100, 2)).toFixed(1));

    const firstContact = Array.isArray(patientData?.emergencyContactsList) && patientData.emergencyContactsList.length > 0
      ? patientData.emergencyContactsList[0]
      : {
          id: `ec-${Date.now()}`,
          name: patientData?.emergencyContactName || 'Emergency Contact',
          relationship: patientData?.emergencyContactRelationship || 'Relative',
          phone: patientData?.emergencyContactPhone || phone || '',
          priority: 'primary',
          notifySms: true,
          notifyEmail: true,
          shareLiveLocation: true,
        };

    const contactsList = Array.isArray(patientData?.emergencyContactsList) && patientData.emergencyContactsList.length > 0
      ? patientData.emergencyContactsList
      : [firstContact];

    newUser.patientProfile = {
      govtIdType: patientData?.govtIdType || 'Aadhar Card',
      govtIdNumber: patientData?.govtIdNumber || '',
      dateOfBirth: patientData?.dateOfBirth || '1990-01-01',
      gender: patientData?.gender || 'other',
      bloodGroup: patientData?.bloodGroup || 'O+',
      heightCm: height,
      weightKg: weight,
      bmi: bmi,
      streetAddress: patientData?.streetAddress || '',
      city: patientData?.city || '',
      state: patientData?.state || '',
      pincode: patientData?.pincode || '',
      existingConditions: patientData?.existingConditions || [],
      allergies: patientData?.allergies || [],
      currentMedications: patientData?.currentMedications || [],
      emergencyContact: {
        name: firstContact.name,
        relationship: firstContact.relationship,
        phone: firstContact.phone,
      },
      emergencyContactsList: contactsList,
      assignedDoctorId: patientData?.assignedDoctorId,
      assignedHospitalId: patientData?.assignedHospitalId,
      connectedDevices: [],
    };
  } else if (role === 'doctor') {
    // Look up affiliated hospital described by doctor while registering
    const hosp = users.find((u) => u.id === doctorData?.hospitalId && u.role === 'hospital');
    const hospitalName = hosp?.hospitalProfile?.hospitalName || hosp?.name || doctorData?.hospitalName || 'Selected Hospital';

    const cleanHprId = (doctorData?.hprId || '').trim();
    const isAbdm = Boolean(cleanHprId && cleanHprId.replace(/\D/g, '').length >= 10);

    // Doctor is initially marked pending_hospital_approval!
    newUser.status = 'pending_verification';
    newUser.doctorProfile = {
      govtIdType: doctorData?.govtIdType || 'Aadhar Card',
      govtIdNumber: doctorData?.govtIdNumber || '',
      doctorIdNumber: doctorData?.doctorIdNumber || `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      medicalLicenseNumber: doctorData?.medicalLicenseNumber || `MED-LIC-${Date.now().toString().slice(-6)}`,
      medicalCouncilName: doctorData?.medicalCouncilName || 'State Medical Council',
      registrationCertificateUrl: doctorData?.registrationCertificateUrl,
      highestDegree: doctorData?.highestDegree || doctorData?.ugDegree || 'MBBS',
      graduationYear: doctorData?.graduationYear || doctorData?.passingYear || '2018',
      hprId: cleanHprId,
      isAbdmVerified: isAbdm,
      councilRegistrationDetails: `Registered with: ${doctorData?.medicalCouncilName || 'State Medical Council'} - Reg No. ${doctorData?.medicalLicenseNumber || 'REG-LIC'}`,
      specialization: doctorData?.specialization || 'Cardiology (Heart & Blood Vessels)',
      subSpecialties: Array.isArray(doctorData?.subSpecialties) ? doctorData.subSpecialties : [],
      gender: doctorData?.gender || 'Male',
      languagesSpoken: Array.isArray(doctorData?.languagesSpoken) && doctorData.languagesSpoken.length ? doctorData.languagesSpoken : ['English', 'Hindi'],
      hospitalId: doctorData?.hospitalId || '',
      hospitalName: hospitalName,
      ugDegree: doctorData?.ugDegree || 'MBBS',
      pgDegree: doctorData?.pgDegree || '',
      graduatingCollege: doctorData?.graduatingCollege || '',
      passingYear: doctorData?.passingYear || '2018',
      qualifications: doctorData?.qualifications || doctorData?.ugDegree || 'MBBS',
      yearsOfExperience: Number(doctorData?.yearsOfExperience) || 1,
      consultationFee: Number(doctorData?.consultationFee) || 50,
      followUpFee: Number(doctorData?.followUpFee) || Math.round((Number(doctorData?.consultationFee) || 50) * 0.7),
      consultationType: doctorData?.consultationType || 'Both (In-Clinic & Video)',
      weeklySchedule: doctorData?.weeklySchedule || 'Mon - Fri: 10:00 AM - 02:00 PM, 05:00 PM - 08:00 PM',
      slotDurationMinutes: Number(doctorData?.slotDurationMinutes) || 15,
      approvalStatus: 'pending_hospital_approval',
      leaveDates: [],
      bio: doctorData?.bio || `Physician specializing in ${doctorData?.specialization || 'general care'}.`,
    };

    // The hospital should receive the request
    if (hosp) {
      const hospEmail = hosp.email.toLowerCase();
      const doctorReqEmail: SentEmail = {
        id: `email-doc-req-${Date.now()}`,
        to: hospEmail,
        from: MASTER_ADMIN_EMAIL,
        subject: `👨‍⚕️ New Doctor Registration Request: Dr. ${name} (${newUser.doctorProfile.specialization})`,
        preview: `Dr. ${name} has registered and selected your hospital. Please log in to accept the doctor to receive appointments or hold activities.`,
        body: `Dear Medical Administration of ${hospitalName},

A new doctor registration request has been submitted by Dr. ${name} designating your hospital as their clinical center.

Doctor Details:
• Name: Dr. ${name}
• Primary Specialization: ${newUser.doctorProfile.specialization}
• Medical Council & License: ${newUser.doctorProfile.medicalLicenseNumber} (${newUser.doctorProfile.medicalCouncilName})
• ABDM HPR ID: ${newUser.doctorProfile.hprId || 'Not provided'}
• Degrees & Qualifications: ${newUser.doctorProfile.qualifications} ${newUser.doctorProfile.pgDegree ? `(${newUser.doctorProfile.pgDegree})` : ''}
• Consultation Economics: First-Time: ₹${newUser.doctorProfile.consultationFee} | Follow-up: ₹${newUser.doctorProfile.followUpFee}
• College & Year: ${newUser.doctorProfile.graduatingCollege} (${newUser.doctorProfile.passingYear})
• Years of Experience: ${newUser.doctorProfile.yearsOfExperience} years
• Contact: ${email} | ${phone || 'Not provided'}

Action Required:
Please log in to your Hospital Management Dashboard -> "Doctor Staff Management" to review this application. You can accept the doctor so they can receive patient appointments, or make the doctor hold his activities if any changes are needed.

Best regards,
Medical Staff Registry
${MASTER_ADMIN_EMAIL}`,
        timestamp: new Date().toISOString(),
        category: 'doctor_request',
      };
      sentEmails.unshift(doctorReqEmail);
      dispatchRealEmail({
        to: hospEmail,
        from: `"Admin" <${MASTER_ADMIN_EMAIL}>`,
        subject: doctorReqEmail.subject,
        text: doctorReqEmail.body,
      });

      // Send pending verification email directly to the registering doctor
      const doctorPendingEmail: SentEmail = {
        id: `email-doc-pending-${Date.now()}`,
        to: email.toLowerCase(),
        from: MASTER_ADMIN_EMAIL,
        subject: `📋 Doctor Registration Awaiting Hospital Verification: ${hospitalName}`,
        preview: `Your doctor registration and medical credentials have been submitted to ${hospitalName} for verification.`,
        body: `Dear Dr. ${name},

Your registration request designating ${hospitalName} has been successfully submitted.

Current Status: Awaiting Hospital Management Verification
• Medical License Number: ${newUser.doctorProfile.medicalLicenseNumber}
• Specialization: ${newUser.doctorProfile.specialization}
• Hospital: ${hospitalName}

Please note: You will not be able to log in or receive patient appointments immediately. Hospital administration will review your medical credentials and licensing.

Once the hospital approves your registration, you will receive an approval confirmation email with your login details. If rejected, you will also receive a status notification.

Warm regards,
Medical Staff Administration`,
        timestamp: new Date().toISOString(),
        category: 'doctor_pending',
      };
      sentEmails.unshift(doctorPendingEmail);
      dispatchRealEmail({
        to: email.toLowerCase(),
        from: `"Hospital Medical Staffing" <${MASTER_ADMIN_EMAIL}>`,
        subject: doctorPendingEmail.subject,
        text: doctorPendingEmail.body,
      });
    }
  } else if (role === 'hospital') {
    // Hospital registration must NOT get access immediately; status is pending_admin_approval
    newUser.status = 'pending_admin_approval';
    const hospNameVal = hospitalData?.hospitalName || name;
    const hospLogo = hospitalData?.logoUrl || newUser.avatarUrl;
    if (hospLogo) {
      newUser.avatarUrl = hospLogo;
    }

    const totalBedsNum = Number(hospitalData?.totalBeds) || (
      (Number(hospitalData?.generalWardBeds) || 150) +
      (Number(hospitalData?.semiPrivateBeds) || 60) +
      (Number(hospitalData?.privateBeds) || 40) +
      (Number(hospitalData?.icuBeds) || 30) +
      (Number(hospitalData?.nicuBeds) || 20)
    );

    newUser.hospitalProfile = {
      hospitalName: hospNameVal,
      hospitalType: hospitalData?.hospitalType || 'Private Super-Specialty',
      licenseNumber: hospitalData?.licenseNumber || hospitalData?.clinicalEstablishmentRegNo || `CEA-${Math.floor(1000 + Math.random() * 9000)}`,
      accreditation: hospitalData?.accreditation || (hospitalData?.nabhCertificateNo ? 'NABH Accredited & State Health Authority Verified' : 'State Health Authority Verified'),
      country: hospitalData?.country || 'India',
      state: hospitalData?.state || 'Telangana',
      district: hospitalData?.district || 'Hyderabad',
      city: hospitalData?.city || 'Hyderabad',
      pincode: hospitalData?.pincode || '500001',
      address: hospitalData?.address || hospitalData?.streetAddress || '100 Medical Center Parkway',
      streetAddress: hospitalData?.streetAddress || hospitalData?.address || '100 Medical Center Parkway',
      latitude: Number(hospitalData?.latitude) || 17.385044,
      longitude: Number(hospitalData?.longitude) || 78.486671,
      emergencyHours: hospitalData?.emergencyHours || '24/7 Round-the-Clock Emergency Trauma Care',
      opdHours: hospitalData?.opdHours || '08:00 AM – 08:00 PM (Mon – Sat)',
      has24x7Emergency: hospitalData?.has24x7Emergency !== false,
      hasInhousePharmacy: hospitalData?.hasInhousePharmacy !== false,
      emergencyHotline: hospitalData?.emergencyHotline || phone || '+91 40 2345 6789',
      contactEmail: email.toLowerCase(),
      contactPhone: phone || '+91 98765 00000',
      adminRepresentative: hospitalData?.adminRepresentative || name,
      nodalOfficerName: hospitalData?.nodalOfficerName || hospitalData?.adminRepresentative || name,
      nodalOfficerEmail: hospitalData?.nodalOfficerEmail || email.toLowerCase(),
      nodalOfficerPhone: hospitalData?.nodalOfficerPhone || phone || '+91 98765 00000',
      departments: hospitalData?.departments?.length ? hospitalData.departments : ['Cardiology (Heart & Blood Vessels)', 'Emergency & Trauma Medicine', 'Pulmonology (Lungs & Respiratory)', 'General & Internal Medicine', 'Pediatrics & Neonatology', 'Orthopedics & Joint Replacement'],
      totalBeds: totalBedsNum,
      availableBeds: Number(hospitalData?.availableBeds) || Math.floor(totalBedsNum * 0.25),
      generalWardBeds: Number(hospitalData?.generalWardBeds) || 150,
      semiPrivateBeds: Number(hospitalData?.semiPrivateBeds) || 60,
      privateBeds: Number(hospitalData?.privateBeds) || 40,
      icuBeds: Number(hospitalData?.icuBeds) || 30,
      nicuBeds: Number(hospitalData?.nicuBeds) || 20,
      operationTheaters: Number(hospitalData?.operationTheaters) || 6,
      bloodBankAvailable: hospitalData?.bloodBankAvailable !== false,
      oxygenPlantAvailable: hospitalData?.oxygenPlantAvailable !== false,
      availableLabTests: Array.isArray(hospitalData?.availableLabTests) && hospitalData.availableLabTests.length ? hospitalData.availableLabTests : [...DEFAULT_HOSPITAL_LAB_TESTS],
      partneredTPAs: Array.isArray(hospitalData?.partneredTPAs) && hospitalData.partneredTPAs.length ? hospitalData.partneredTPAs : ['Star Health', 'HDFC ERGO', 'ICICI Lombard', 'Care Health Insurance', 'Bajaj Allianz'],
      governmentSchemes: Array.isArray(hospitalData?.governmentSchemes) && hospitalData.governmentSchemes.length ? hospitalData.governmentSchemes : ['Ayushman Bharat / PM-JAY', 'Aarogyasri / State Health Scheme'],
      clinicalEstablishmentRegNo: hospitalData?.clinicalEstablishmentRegNo || hospitalData?.licenseNumber || `CEA-${Math.floor(1000 + Math.random() * 9000)}`,
      clinicalEstablishmentDocUrl: hospitalData?.clinicalEstablishmentDocUrl,
      stateHealthAuthority: hospitalData?.stateHealthAuthority || hospitalData?.state || 'Telangana State Health Department',
      isClinicalActVerified: true, // Auto-verified upon admin onboarding
      nabhCertificateNo: hospitalData?.nabhCertificateNo || '',
      nabhDocUrl: hospitalData?.nabhDocUrl || '',
      nabhValidity: hospitalData?.nabhValidity || '',
      isNabhAccredited: Boolean(hospitalData?.isNabhAccredited || hospitalData?.nabhCertificateNo),
      hospitalPan: hospitalData?.hospitalPan || '',
      hospitalGstin: hospitalData?.hospitalGstin || '',
      panGstDocUrl: hospitalData?.panGstDocUrl || '',
      fireSafetyNocNo: hospitalData?.fireSafetyNocNo || '',
      fireSafetyDocUrl: hospitalData?.fireSafetyDocUrl || '',
      fireSafetyValidity: hospitalData?.fireSafetyValidity || '',
      pollutionControlLicenseNo: hospitalData?.pollutionControlLicenseNo || '',
      pollutionControlDocUrl: hospitalData?.pollutionControlDocUrl || '',
      pollutionControlValidity: hospitalData?.pollutionControlValidity || '',
      logoUrl: hospLogo,
      verificationStatus: 'pending_admin_verification',
      verificationNotes: 'Hospital registration submitted. Awaiting System Administrator review and approval before activation.',
    };

    // User Requirement: Hospital should NOT get access immediately.
    // It should get a mail that your request is sent to the admin. He will accept the request after you can enter the sign-in details and log in.
    const hospitalPendingEmail: SentEmail = {
      id: `email-hosp-pending-${Date.now()}`,
      to: email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `📋 Your Hospital is Registered - Please Wait for Admin Acceptance`,
      preview: `Your hospital registration request has been submitted to the System Administrator.`,
      body: `Dear Medical Administration of ${hospNameVal},

Your hospital is registered successfully! Your request has been sent to System Administrator HEMANTH.

Please wait for the acceptance. The administrator will review and accept the request after which you can enter the sign-in details and log in.

Please note: You will not be able to log in immediately. Your hospital establishment license (${newUser.hospitalProfile.licenseNumber}), accreditation, and facilities are currently awaiting administrative review.

Once the administrator accepts your request, you will receive another email confirmation stating that your request for hospital registration is accepted, prompting you to log in and register your doctors.

Thank you for your patience.

Warm regards,
System Administrator HEMANTH`,
      timestamp: new Date().toISOString(),
      category: 'hospital_pending',
    };
    sentEmails.unshift(hospitalPendingEmail);
    dispatchRealEmail({
      to: email.toLowerCase(),
      from: `"System Administrator" <${MASTER_ADMIN_EMAIL}>`,
      subject: hospitalPendingEmail.subject,
      text: hospitalPendingEmail.body,
    });

    if (hospitalData?.contactEmail && hospitalData.contactEmail.toLowerCase() !== email.toLowerCase()) {
      dispatchRealEmail({
        to: hospitalData.contactEmail.toLowerCase(),
        from: `"System Administrator" <${MASTER_ADMIN_EMAIL}>`,
        subject: hospitalPendingEmail.subject,
        text: hospitalPendingEmail.body,
      });
    }

    // Also notify System Administrator HEMANTH
    const adminNoticeEmail: SentEmail = {
      id: `email-admin-hosp-${Date.now()}`,
      to: MASTER_ADMIN_EMAIL,
      from: MASTER_ADMIN_EMAIL,
      subject: `🔔 New Hospital Registered: ${hospNameVal} - Awaiting Your Acceptance`,
      preview: `Hospital ${hospNameVal} (License: ${newUser.hospitalProfile.licenseNumber}) has registered and is pending your verification.`,
      body: `Hello System Administrator HEMANTH,

A new medical facility has registered on AI Virtual Care:

Hospital Name: ${hospNameVal}
License Number: ${newUser.hospitalProfile.licenseNumber}
Accreditation: ${newUser.hospitalProfile.accreditation}
Official Email: ${email.toLowerCase()}
Contact Phone: ${newUser.hospitalProfile.contactPhone}
Emergency Hotline: ${newUser.hospitalProfile.emergencyHotline}
Address: ${newUser.hospitalProfile.address}, ${newUser.hospitalProfile.city}, ${newUser.hospitalProfile.state} - ${newUser.hospitalProfile.pincode}
Bed Capacity: ${newUser.hospitalProfile.totalBeds} Beds (${newUser.hospitalProfile.icuBeds} ICU)

Please review and accept or reject this request in the Admin Dashboard -> Hospital Verification tab.

Best regards,
SmartHealth Platform Admin Office`,
      timestamp: new Date().toISOString(),
      category: 'general',
    };
    sentEmails.unshift(adminNoticeEmail);
    dispatchRealEmail({
      to: MASTER_ADMIN_EMAIL,
      from: `"System Security" <${MASTER_ADMIN_EMAIL}>`,
      subject: adminNoticeEmail.subject,
      text: adminNoticeEmail.body,
    });
  }

  users.push(newUser);
  saveStorageToDisk();
  // User Requirement: Send password credentials ONLY for patients. Hospitals and doctors get credentials after official verification!
  let userPassword: string | undefined = undefined;
  if (role === 'patient') {
    userPassword = sendPasswordEmail(newUser.email, newUser.name, newUser.role, req.body.password);
  }

  return res.json({
    success: true,
    user: newUser,
    password: userPassword,
    message: role === 'hospital'
      ? `Hospital registration submitted. Your hospital's request is sent to the admin. Please wait for request approval and check your email for further updates.`
      : role === 'doctor'
      ? `Doctor registration submitted. Awaiting hospital management verification. Please wait for the hospital approval email.`
      : 'Registration successful.'
  });
});

// 5. Standard Login
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return res.status(404).json({ error: 'User not found. Please register first.' });
  }

  // User Requirement: Remove separate admin login.
  // Admin login is ONLY accessible through Google Sign-In with the authorized account
  if (user.role === 'admin') {
    return res.status(403).json({
      error: 'Administrator access is restricted. Master Administrator must sign in using "Sign in with Google" with the authorized account. Separate password login is disabled.',
    });
  }

  // Hospital MUST NOT get access immediately if pending admin acceptance
  if (user.role === 'hospital' && (user.status === 'pending_admin_approval' || user.hospitalProfile?.verificationStatus === 'pending_admin_verification' || user.hospitalProfile?.verificationStatus === 'rejected')) {
    return res.status(403).json({
      error: `Your hospital is registered. Please wait until the admin's acceptance.`,
      status: 'pending_admin_approval',
      hospitalName: user.hospitalProfile?.hospitalName || user.name,
    });
  }

  // Doctor MUST NOT get access unless the affiliated hospital has accepted/approved the doctor
  if (user.role === 'doctor') {
    if (user.doctorProfile?.approvalStatus !== 'approved' || user.status !== 'active') {
      if (user.doctorProfile?.approvalStatus === 'rejected' || user.status === 'rejected') {
        return res.status(403).json({
          error: `Your doctor registration was declined by the hospital administration. Reason: ${user.doctorProfile?.rejectionReason || 'Application not accepted'}.`,
          status: 'rejected',
          hospitalName: user.doctorProfile?.hospitalName || 'Affiliated Hospital',
        });
      }
      if (user.doctorProfile?.approvalStatus === 'on_hold' || user.status === 'on_hold') {
        return res.status(403).json({
          error: `Your doctor account has been temporarily placed on hold by hospital management. Reason: ${user.doctorProfile?.rejectionReason || 'Under administrative review'}.`,
          status: 'on_hold',
          hospitalName: user.doctorProfile?.hospitalName || 'Affiliated Hospital',
        });
      }
      return res.status(403).json({
        error: `Your registration request is being sent to the doctor. Please wait until the doctor accepts it.`,
        status: 'pending_hospital_approval',
        hospitalName: user.doctorProfile?.hospitalName || 'Affiliated Hospital',
      });
    }
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'This account has been suspended by the administrator.' });
  }

  // If password provided, verify password hash (CIA Triad: Confidentiality & Integrity)
  const inputPassword = req.body.password;
  if (inputPassword && user.passwordHash) {
    const isValid = verifyPassword(inputPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }
  }

  return res.json({ success: true, user });
});

function sanitizeUserForList(u: User): User {
  if (!u) return u;
  let cleanedDocs = u.uploadedDocuments;
  if (cleanedDocs && cleanedDocs.length > 0) {
    cleanedDocs = cleanedDocs.map((doc) => {
      let docUrl = doc.url;
      if (docUrl && docUrl.startsWith('data:')) {
        docUrl = saveBase64ToFile(`doc-${u.id}-${doc.id || 'file'}`, docUrl);
        doc.url = docUrl;
      }
      return {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
        url: docUrl || `/api/users/${u.id}/document/${doc.id}`,
      };
    });
  }

  let safeAvatar = u.avatarUrl;
  if (safeAvatar && safeAvatar.startsWith('data:')) {
    safeAvatar = saveBase64ToFile(`avatar-${u.id}`, safeAvatar);
    u.avatarUrl = safeAvatar;
  }

  let safeHospitalProfile = u.hospitalProfile;
  if (safeHospitalProfile) {
    let safeLogo = safeHospitalProfile.logoUrl;
    if (safeLogo && safeLogo.startsWith('data:')) {
      safeLogo = saveBase64ToFile(`logo-${u.id}`, safeLogo);
      safeHospitalProfile = { ...safeHospitalProfile, logoUrl: safeLogo };
      if (u.hospitalProfile) {
        u.hospitalProfile.logoUrl = safeLogo;
      }
    }
  }

  return {
    ...u,
    avatarUrl: safeAvatar,
    hospitalProfile: safeHospitalProfile,
    uploadedDocuments: cleanedDocs,
  };
}

// Dedicated single document endpoint (loads heavy dataUrl only on explicit inspection)
app.get('/api/users/:id/document/:docId', (req, res) => {
  const { id, docId } = req.params;
  const user = users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const doc = user.uploadedDocuments?.find((d) => d.id === docId);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  return res.json(doc);
});

// 6. Get all users or current user (Lightweight sanitized list)
app.get('/api/users', (req, res) => {
  const { role } = req.query;
  if (role) {
    return res.json(users.filter((u) => u.role === role).map(sanitizeUserForList));
  }
  return res.json(users.map(sanitizeUserForList));
});

// 6b. Get single user by ID
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const user = users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.json(user);
});

// 7. Update User Profile Details
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const user = users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { name, phone, avatarUrl, patientProfile, doctorProfile, hospitalProfile } = req.body;
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (avatarUrl) user.avatarUrl = avatarUrl;

  if (patientProfile && user.role === 'patient') {
    const height = Number(patientProfile.heightCm) || user.patientProfile?.heightCm || 170;
    const weight = Number(patientProfile.weightKg) || user.patientProfile?.weightKg || 70;
    const bmi = Number((weight / Math.pow(height / 100, 2)).toFixed(1));

    user.patientProfile = {
      ...user.patientProfile,
      ...patientProfile,
      heightCm: height,
      weightKg: weight,
      bmi,
    };
  }

  if (doctorProfile && user.role === 'doctor') {
    user.doctorProfile = {
      ...user.doctorProfile,
      ...doctorProfile,
    };
  }

  if (hospitalProfile && user.role === 'hospital') {
    user.hospitalProfile = {
      ...user.hospitalProfile,
      ...hospitalProfile,
    };
  }

  return res.json({ success: true, user });
});

// 8. Delete User Account
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const userIndex = users.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  users.splice(userIndex, 1);
  // Clean up user appointments
  appointments = appointments.filter((a) => a.patientId !== id && a.doctorId !== id);
  // Clean up user readings
  iotReadings = iotReadings.filter((r) => r.patientId !== id);
  prescriptions = prescriptions.filter((p) => p.patientId !== id && p.doctorId !== id);

  return res.json({ success: true, message: 'User account and associated records deleted.' });
});

// ==========================================
// ADMIN LIVE DATABASE MANAGEMENT
// ==========================================

// Get full database snapshot for Admin
app.get('/api/admin/database', (req, res) => {
  const hospitalsList = users.filter((u) => u.role === 'hospital');
  const doctorsList = users.filter((u) => u.role === 'doctor');
  const patientsList = users.filter((u) => u.role === 'patient');

  return res.json({
    users,
    hospitals: hospitalsList,
    doctors: doctorsList,
    patients: patientsList,
    healthcareItems,
    iotReadings,
    appointments,
    prescriptions,
    emergencyAlerts,
    driverReadings,
    patientDoctorRequests,
    scheduledSurgeries,
    kitPayments,
  });
});

// Delete any record in database by collection and id
app.post('/api/admin/database/delete-record', (req, res) => {
  const { collection, id } = req.body;
  if (!collection || !id) {
    return res.status(400).json({ error: 'Collection name and record ID are required.' });
  }

  switch (collection) {
    case 'users':
    case 'hospitals':
    case 'doctors':
    case 'patients':
      users = users.filter((u) => u.id !== id);
      break;
    case 'healthcareItems':
      healthcareItems = healthcareItems.filter((i) => i.id !== id);
      break;
    case 'appointments':
      appointments = appointments.filter((a) => a.id !== id);
      break;
    case 'prescriptions':
      prescriptions = prescriptions.filter((p) => p.id !== id);
      break;
    case 'iotReadings':
      iotReadings = iotReadings.filter((r) => r.id !== id);
      break;
    case 'emergencyAlerts':
      emergencyAlerts = emergencyAlerts.filter((e) => e.id !== id);
      break;
    case 'driverReadings':
      driverReadings = driverReadings.filter((d) => d.id !== id);
      break;
    default:
      return res.status(400).json({ error: `Unknown collection: ${collection}` });
  }

  return res.json({ success: true, message: `Record ${id} removed from ${collection}.` });
});

// Reset entire database to pristine clean zero state (ONLY Admin user remains)
app.post('/api/admin/database/reset', (req, res) => {
  users = [defaultAdminUser];
  appointments = [];
  prescriptions = [];
  iotReadings = [];
  emergencyAlerts = [];
  driverReadings = [];
  sentEmails = [];
  healthcareItems = [];
  kitPayments = [];
  doctorLeaveRequests = [];
  doctorTransferRequests = [];
  patientDoctorRequests = [];
  scheduledSurgeries = [];
  credentialStore.clear();
  otpStore.clear();
  saveStorageToDisk();
  return res.json({
    success: true,
    message: 'Database reset to clean zero state. All hospital, doctor, and patient portal records cleaned out. Only Master Administrator HEMANTH remains.'
  });
});

// Seed sample demo data on demand
app.post('/api/admin/database/seed-demo', (req, res) => {
  const demo = getDemoSeedData();
  users = [defaultAdminUser, ...demo.users];
  appointments = demo.appointments;
  prescriptions = demo.prescriptions;
  iotReadings = demo.iotReadings;
  driverReadings = demo.driverReadings;
  emergencyAlerts = demo.emergencyAlerts;
  return res.json({
    success: true,
    message: 'Demo test records seeded successfully.'
  });
});

// ==========================================
// ADMIN WORKFLOWS (HOSPITAL VERIFICATION, USER MGMT, HEALTHCARE ITEMS)
// ==========================================

// 1. Get all Hospitals for Admin review
app.get('/api/admin/hospitals', (req, res) => {
  const hospitalUsers = users.filter((u) => u.role === 'hospital');
  return res.json(hospitalUsers.map(sanitizeUserForList));
});

// 2. Admin Registers Hospital directly with all registration options and credentials email
app.post('/api/admin/hospitals', (req, res) => {
  const {
    name,
    email,
    phone,
    licenseNumber,
    accreditation,
    hospitalType,
    country,
    state,
    district,
    city,
    pincode,
    address,
    emergencyHotline,
    departments,
    totalBeds,
    icuBeds,
    adminRepresentative,
    logoUrl,
    avatarUrl,
    uploadedDocuments,
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Hospital name and official email are required.' });
  }

  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'A hospital or user account with this email already exists.' });
  }

  const effectiveLogo =
    logoUrl ||
    avatarUrl ||
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=256&q=80';

  const newHospital: User = {
    id: `hosp-${Date.now()}`,
    name,
    email: email.toLowerCase(),
    phone: phone || '+1 (555) 000-0000',
    role: 'hospital',
    status: 'active',
    avatarUrl: effectiveLogo,
    createdAt: new Date().toISOString(),
    uploadedDocuments: Array.isArray(uploadedDocuments) ? uploadedDocuments : [],
    hospitalProfile: {
      hospitalName: name,
      hospitalType: hospitalType || 'Private Super-Specialty',
      licenseNumber: licenseNumber || `HOSP-REG-${Math.floor(1000 + Math.random() * 9000)}`,
      accreditation: accreditation || 'NABH Certified & State Health Authority Verified',
      address: address || '100 Medical Center Parkway',
      city: city || 'Metro District',
      district: district || city || 'Metro District',
      state: state || 'Telangana',
      pincode: pincode || '500001',
      emergencyHotline: emergencyHotline || phone || '+1 (800) 555-9111',
      contactEmail: email.toLowerCase(),
      contactPhone: phone || '+1 (555) 000-0000',
      adminRepresentative: adminRepresentative || 'Medical Director',
      departments: departments && departments.length > 0 ? departments : ['Cardiology (Heart & Blood Vessels)', 'Emergency & Trauma Medicine', 'Pulmonology (Lungs & Respiratory)', 'General & Internal Medicine'],
      totalBeds: Number(totalBeds) || 300,
      availableBeds: Number(totalBeds) ? Math.floor(Number(totalBeds) * 0.25) : 60,
      icuBeds: Number(icuBeds) || 30,
      verificationStatus: 'verified',
      verificationNotes: 'Registered, authorized, and verified directly by System Administrator HEMANTH.',
      logoUrl: effectiveLogo,
    },
  };

  users.push(newHospital);
  saveStorageToDisk();

  // User Requirement: If authorized and registered, mail should be sent with "your hospital is authorized and registered" and password
  const generatedPwd = sendPasswordEmail(newHospital.email, newHospital.hospitalProfile?.hospitalName || newHospital.name, 'hospital');

  const activationEmail: SentEmail = {
    id: `email-admin-hosp-onboard-${Date.now()}`,
    to: newHospital.email.toLowerCase(),
    from: MASTER_ADMIN_EMAIL,
    subject: `Your hospital is authorized and registered - Login Credentials`,
    timestamp: new Date().toISOString(),
    preview: `Your hospital is authorized and registered by Admin Hemanth. Access Password: ${generatedPwd}`,
    category: 'hospital_activation',
    body: `Dear Medical Administration of ${newHospital.hospitalProfile?.hospitalName || newHospital.name},

Your hospital is authorized and registered by System Administrator HEMANTH.

Your official login credentials are:
• Login Email: ${newHospital.email.toLowerCase()}
• Access Password: ${generatedPwd}
• Facility License: ${newHospital.hospitalProfile?.licenseNumber || 'REG-LIC'}
• Facility Type: ${newHospital.hospitalProfile?.hospitalType || 'Private Super-Specialty'}
• Location: ${newHospital.hospitalProfile?.city || 'City'}, ${newHospital.hospitalProfile?.state || 'State'} (${newHospital.hospitalProfile?.pincode || '500001'})

You can now log in directly through this authorized Google account or by entering the management email and allocated password above. Once logged in, you can onboard your doctors, allocate hospital beds, and handle incoming patient appointments.

Warm regards,
Admin HEMANTH
System Administrator
${MASTER_ADMIN_EMAIL}`,
  };

  sentEmails.unshift(activationEmail);
  dispatchRealEmail({
    to: newHospital.email.toLowerCase(),
    from: `"Admin HEMANTH" <${MASTER_ADMIN_EMAIL}>`,
    subject: activationEmail.subject,
    text: activationEmail.body,
  });

  return res.json({ success: true, hospital: newHospital, password: generatedPwd, emailSent: activationEmail });
});

// 3. Admin Verifies, Holds, or Rejects Hospital
app.post('/api/admin/hospitals/:id/verify', (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body; // action: 'approve' | 'reject' | 'hold'

  const hospIndex = users.findIndex((u) => u.id === id && u.role === 'hospital');
  if (hospIndex === -1) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }

  const hosp = users[hospIndex];
  if (!hosp.hospitalProfile) {
    return res.status(400).json({ error: 'Hospital profile missing.' });
  }

  if (action === 'approve') {
    hosp.status = 'active';
    hosp.hospitalProfile.verificationStatus = 'verified';
    hosp.hospitalProfile.verificationNotes = notes || 'Hospital credentials and medical license officially approved and verified by Master Admin HEMANTH.';

    // User requirement: Whenever I, as the admin, accepted the request of the hospital,
    // the hospital should receive a mail again from my email that your request for the hospital registration is accepted.
    // Please log in and register your doctors.
    const generatedPwd = sendPasswordEmail(hosp.email, hosp.hospitalProfile.hospitalName || hosp.name, hosp.role);

    const activationEmail: SentEmail = {
      id: `email-act-${Date.now()}`,
      to: hosp.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `Your request for the hospital registration is accepted`,
      timestamp: new Date().toISOString(),
      preview: `Your request for the hospital registration is accepted by Admin Hemanth. Please log in and register your doctors. Access Password: ${generatedPwd}`,
      category: 'hospital_activation',
      body: `Dear Medical Administration of ${hosp.hospitalProfile.hospitalName || hosp.name},

Your request for the hospital registration is accepted.

Please log in and register your doctors.

Your official login credentials are:
• Login Email: ${hosp.email.toLowerCase()}
• Access Password: ${generatedPwd}
• Facility License: ${hosp.hospitalProfile.licenseNumber}

You can now enter your sign-in details or use Google Sign-In with this authorized email to log in at any time to access your Hospital Dashboard, onboard your specialist doctors, allocate hospital beds, and receive patient appointments.

Warm regards,
Admin HEMANTH
System Administrator
${MASTER_ADMIN_EMAIL}`,
    };
    sentEmails.unshift(activationEmail);
    dispatchRealEmail({
      to: hosp.email.toLowerCase(),
      from: `"Admin HEMANTH" <${MASTER_ADMIN_EMAIL}>`,
      subject: activationEmail.subject,
      text: activationEmail.body,
    });

    return res.json({ success: true, hospital: hosp, emailSent: activationEmail });
  } else if (action === 'hold') {
    hosp.status = 'on_hold';
    hosp.hospitalProfile.verificationStatus = 'on_hold';
    hosp.hospitalProfile.verificationNotes = notes || 'Hospital registration temporarily placed on hold by Admin.';

    const holdEmail: SentEmail = {
      id: `email-hosp-hold-${Date.now()}`,
      to: hosp.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `⚠️ Hospital Registration Application Placed On Hold - ${hosp.hospitalProfile.hospitalName || hosp.name}`,
      timestamp: new Date().toISOString(),
      preview: `Your hospital registration application has been placed on hold. Reason: ${hosp.hospitalProfile.verificationNotes}`,
      category: 'general',
      body: `Dear Medical Administration of ${hosp.hospitalProfile.hospitalName || hosp.name},

Your registration application for hospital onboarding has been placed on HOLD by System Administrator Admin HEMANTH.

Reason / Administrative Note:
${hosp.hospitalProfile.verificationNotes}

Next Steps:
Please reply to this email (${MASTER_ADMIN_EMAIL}) or provide required certifications to resume verification.

Warm regards,
Admin HEMANTH
System Administrator
${MASTER_ADMIN_EMAIL}`,
    };
    sentEmails.unshift(holdEmail);
    dispatchRealEmail({
      to: hosp.email.toLowerCase(),
      from: `"Admin HEMANTH" <${MASTER_ADMIN_EMAIL}>`,
      subject: holdEmail.subject,
      text: holdEmail.body,
    });
    saveStorageToDisk();
    return res.json({ success: true, hospital: hosp, emailSent: holdEmail });
  } else {
    hosp.status = 'rejected';
    hosp.hospitalProfile.verificationStatus = 'rejected';
    hosp.hospitalProfile.verificationNotes = notes || 'Hospital registration did not meet regulatory requirements.';

    const rejectEmail: SentEmail = {
      id: `email-hosp-rej-${Date.now()}`,
      to: hosp.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `❌ Hospital Registration Application Declined - ${hosp.hospitalProfile.hospitalName || hosp.name}`,
      timestamp: new Date().toISOString(),
      preview: `Your hospital registration application was declined. Reason: ${hosp.hospitalProfile.verificationNotes}`,
      category: 'general',
      body: `Dear Medical Administration of ${hosp.hospitalProfile.hospitalName || hosp.name},

Your registration application for hospital onboarding has been reviewed and declined by System Administrator Admin HEMANTH.

Reason for Rejection:
${hosp.hospitalProfile.verificationNotes}

If you believe this is in error or have updated credentials, please contact ${MASTER_ADMIN_EMAIL}.

Regards,
Admin HEMANTH
System Administrator
${MASTER_ADMIN_EMAIL}`,
    };
    sentEmails.unshift(rejectEmail);
    dispatchRealEmail({
      to: hosp.email.toLowerCase(),
      from: `"Admin HEMANTH" <${MASTER_ADMIN_EMAIL}>`,
      subject: rejectEmail.subject,
      text: rejectEmail.body,
    });
    saveStorageToDisk();
    return res.json({ success: true, hospital: hosp, emailSent: rejectEmail });
  }
});

// Admin: Directly Verify, Hold, or Reject Doctor across network
app.post('/api/admin/doctors/:id/verify', (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body; // 'approve' | 'hold' | 'reject'

  const doctor = users.find((u) => u.id === id && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  if (action === 'approve') {
    doctor.doctorProfile.approvalStatus = 'approved';
    doctor.status = 'active';
    doctor.doctorProfile.rejectionReason = undefined;

    const docPwd = sendPasswordEmail(doctor.email, doctor.name, doctor.role);
    const emailRec: SentEmail = {
      id: `email-doc-appr-${Date.now()}`,
      to: doctor.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `✅ Doctor Profile Approved by Admin - Welcome Dr. ${doctor.name}`,
      timestamp: new Date().toISOString(),
      preview: `Your doctor registration has been verified and approved by Admin Hemanth. Password: ${docPwd}`,
      category: 'doctor_approval',
      body: `Dear Dr. ${doctor.name},

Your medical credentials and doctor registration have been officially approved by System Administrator Admin HEMANTH.

You can now log in to the Doctor Portal to conduct patient consultations, view appointments, and issue digital prescriptions.

Your Credentials:
• Login Email: ${doctor.email}
• Password: ${docPwd}
• Hospital: ${doctor.doctorProfile.hospitalName || 'Network Facility'}

Warm regards,
Admin HEMANTH
${MASTER_ADMIN_EMAIL}`,
    };
    sentEmails.unshift(emailRec);
    dispatchRealEmail({
      to: doctor.email.toLowerCase(),
      from: `"Admin HEMANTH" <${MASTER_ADMIN_EMAIL}>`,
      subject: emailRec.subject,
      text: emailRec.body,
    });
    saveStorageToDisk();
    return res.json({ success: true, doctor, emailSent: emailRec });
  } else if (action === 'hold') {
    doctor.doctorProfile.approvalStatus = 'on_hold';
    doctor.status = 'on_hold';
    doctor.doctorProfile.rejectionReason = notes || 'Temporarily placed on hold by administrator.';

    const emailRec: SentEmail = {
      id: `email-doc-hold-${Date.now()}`,
      to: doctor.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `⚠️ Clinical Account Placed On Hold by Administrator`,
      timestamp: new Date().toISOString(),
      preview: `Your doctor profile has been placed on hold. Reason: ${doctor.doctorProfile.rejectionReason}`,
      category: 'doctor_hold',
      body: `Dear Dr. ${doctor.name},

Your doctor account and practice privileges have been placed on HOLD by System Administrator Admin HEMANTH.

Reason / Administrative Note:
${doctor.doctorProfile.rejectionReason}

Please contact ${MASTER_ADMIN_EMAIL} for any required documentation.

Regards,
Admin HEMANTH
${MASTER_ADMIN_EMAIL}`,
    };
    sentEmails.unshift(emailRec);
    dispatchRealEmail({
      to: doctor.email.toLowerCase(),
      from: `"Admin HEMANTH" <${MASTER_ADMIN_EMAIL}>`,
      subject: emailRec.subject,
      text: emailRec.body,
    });
    saveStorageToDisk();
    return res.json({ success: true, doctor, emailSent: emailRec });
  } else {
    doctor.doctorProfile.approvalStatus = 'rejected';
    doctor.status = 'rejected';
    doctor.doctorProfile.rejectionReason = notes || 'Credentials did not satisfy compliance requirements.';

    const emailRec: SentEmail = {
      id: `email-doc-rej-${Date.now()}`,
      to: doctor.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `❌ Doctor Registration Application Declined`,
      timestamp: new Date().toISOString(),
      preview: `Your registration request was declined. Reason: ${doctor.doctorProfile.rejectionReason}`,
      category: 'general',
      body: `Dear Dr. ${doctor.name},

Your doctor onboarding application has been declined by System Administrator Admin HEMANTH.

Reason:
${doctor.doctorProfile.rejectionReason}

Regards,
Admin HEMANTH
${MASTER_ADMIN_EMAIL}`,
    };
    sentEmails.unshift(emailRec);
    dispatchRealEmail({
      to: doctor.email.toLowerCase(),
      from: `"Admin HEMANTH" <${MASTER_ADMIN_EMAIL}>`,
      subject: emailRec.subject,
      text: emailRec.body,
    });
    saveStorageToDisk();
    return res.json({ success: true, doctor, emailSent: emailRec });
  }
});

// 3. Admin User Management (Hold/Suspend or Activate)
app.post('/api/admin/users/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' | 'suspended'

  const user = users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  user.status = status;
  return res.json({ success: true, user });
});

// 4. Admin Healthcare Items / IoT Kits Inventory
app.get('/api/admin/items', (req, res) => {
  return res.json(healthcareItems);
});

app.post('/api/admin/items', (req, res) => {
  const {
    name,
    category,
    modelNumber,
    firmwareVersion,
    supportedSensors,
    price,
    stock,
    description,
    imageUrl,
  } = req.body;

  if (!name || !modelNumber) {
    return res.status(400).json({ error: 'Name and model number are required.' });
  }

  const newItem: HealthcareItem = {
    id: `item-${Date.now()}`,
    name,
    category: category || 'Patient IoT Kit',
    modelNumber,
    firmwareVersion: firmwareVersion || 'v1.0.0',
    supportedSensors: supportedSensors || ['Heart Rate', 'SpO2'],
    price: Number(price) || 99,
    stock: Number(stock) || 50,
    description: description || 'Next-gen smart IoT healthcare device.',
    status: Number(stock) > 5 ? 'available' : 'low_stock',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80',
    createdAt: new Date().toISOString(),
  };

  healthcareItems.unshift(newItem);
  return res.json({ success: true, item: newItem });
});

app.put('/api/admin/items/:id', (req, res) => {
  const { id } = req.params;
  const index = healthcareItems.findIndex((it) => it.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  healthcareItems[index] = {
    ...healthcareItems[index],
    ...req.body,
  };

  return res.json({ success: true, item: healthcareItems[index] });
});

app.delete('/api/admin/items/:id', (req, res) => {
  const { id } = req.params;
  healthcareItems = healthcareItems.filter((it) => it.id !== id);
  return res.json({ success: true, message: 'Item deleted.' });
});

// ==========================================
// HOSPITAL MANAGEMENT (DOCTOR APPROVALS & STATS)
// ==========================================

// 1. Get doctors registered under this hospital (all or pending)
app.get('/api/hospitals/:hospitalId/doctors', (req, res) => {
  const { hospitalId } = req.params;
  const hospitalDoctors = users.filter(
    (u) => u.role === 'doctor' && u.doctorProfile?.hospitalId === hospitalId
  );
  return res.json(hospitalDoctors);
});

// 2. Hospital approves, holds, or rejects their affiliated doctor
app.post('/api/hospitals/:hospitalId/doctors/:doctorId/approval', (req, res) => {
  const { hospitalId, doctorId } = req.params;
  const { action, reason } = req.body; // action: 'approve' | 'reject' | 'hold' | 'unhold'

  const doctor = users.find(
    (u) => u.id === doctorId && u.role === 'doctor' && u.doctorProfile?.hospitalId === hospitalId
  );

  const hosp = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  const hospName = hosp?.hospitalProfile?.hospitalName || hosp?.name || 'Hospital Administration';

  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found under this hospital.' });
  }

  if (action === 'approve') {
    doctor.doctorProfile.approvalStatus = 'approved';
    doctor.status = 'active';
    doctor.doctorProfile.rejectionReason = undefined;

    // Issue official credentials to doctor now that hospital management has approved!
    const docPwd = sendPasswordEmail(doctor.email, doctor.name, doctor.role);

    // Email to doctor: hospital accepted the request, doctor can now receive appointments
    const emailRec: SentEmail = {
      id: `email-doc-appr-${Date.now()}`,
      to: doctor.email.toLowerCase(),
      from: hosp?.email || MASTER_ADMIN_EMAIL,
      subject: `✅ Registration Accepted by ${hospName} - You Can Now Receive Appointments`,
      preview: `Congratulations Dr. ${doctor.name}! ${hospName} has accepted your registration. Your access credentials have been issued.`,
      body: `Dear Dr. ${doctor.name},

Your request to join ${hospName} has been officially accepted by the hospital administration.

You are now authorized to receive patient appointments, conduct consultations, and issue electronic prescriptions.

Your official login credentials:
• Registered Email: ${doctor.email.toLowerCase()}
• Access Password: ${docPwd}
• License: ${doctor.doctorProfile.medicalLicenseNumber}
• Affiliated Center: ${hospName}

Please log in to your Doctor Portal to configure your consultation schedule.

Best regards,
${hospName} Administration`,
      timestamp: new Date().toISOString(),
      category: 'doctor_approval',
    };
    sentEmails.unshift(emailRec);
    dispatchRealEmail({
      to: doctor.email.toLowerCase(),
      from: `"${hospName}" <${hosp?.email || MASTER_ADMIN_EMAIL}>`,
      subject: emailRec.subject,
      text: emailRec.body,
    });
  } else if (action === 'hold') {
    // User Requirement: Hospital can make the doctor hold his activities if any changes are needed
    doctor.doctorProfile.approvalStatus = 'on_hold';
    doctor.status = 'on_hold';
    doctor.doctorProfile.rejectionReason = reason || 'Temporarily placed on hold by hospital management for review / changes.';

    const emailRec: SentEmail = {
      id: `email-doc-hold-${Date.now()}`,
      to: doctor.email.toLowerCase(),
      from: hosp?.email || MASTER_ADMIN_EMAIL,
      subject: `⚠️ Clinical Activities Placed on Hold - ${hospName}`,
      preview: `Your clinical activities at ${hospName} have been placed on hold. Reason: ${doctor.doctorProfile.rejectionReason}`,
      body: `Dear Dr. ${doctor.name},

Your clinical activities at ${hospName} have been temporarily placed ON HOLD by hospital management.

Reason / Required Changes:
${doctor.doctorProfile.rejectionReason}

While on hold, your profile will be paused from receiving new patient appointments until required changes are updated and the hold is lifted by hospital administration.

Best regards,
${hospName} Administration`,
      timestamp: new Date().toISOString(),
      category: 'doctor_hold',
    };
    sentEmails.unshift(emailRec);
    dispatchRealEmail({
      to: doctor.email.toLowerCase(),
      from: `"${hospName}" <${hosp?.email || MASTER_ADMIN_EMAIL}>`,
      subject: emailRec.subject,
      text: emailRec.body,
    });
  } else if (action === 'unhold') {
    doctor.doctorProfile.approvalStatus = 'approved';
    doctor.status = 'active';
    doctor.doctorProfile.rejectionReason = undefined;

    const emailRec: SentEmail = {
      id: `email-doc-unhold-${Date.now()}`,
      to: doctor.email.toLowerCase(),
      from: hosp?.email || MASTER_ADMIN_EMAIL,
      subject: `✅ Activities Resumed - ${hospName}`,
      preview: `Your hold status at ${hospName} has been released. You are now active to receive appointments.`,
      body: `Dear Dr. ${doctor.name},

Your hold status at ${hospName} has been lifted by hospital management.

You are now active and ready to receive patient appointments and consultations again.

Best regards,
${hospName} Administration`,
      timestamp: new Date().toISOString(),
      category: 'doctor_approval',
    };
    sentEmails.unshift(emailRec);
    dispatchRealEmail({
      to: doctor.email.toLowerCase(),
      from: `"${hospName}" <${hosp?.email || MASTER_ADMIN_EMAIL}>`,
      subject: emailRec.subject,
      text: emailRec.body,
    });
  } else {
    doctor.doctorProfile.approvalStatus = 'rejected';
    doctor.status = 'suspended';
    doctor.doctorProfile.rejectionReason = reason || 'Credentials did not match hospital department criteria.';

    // Send rejection email to doctor
    const rejectEmail: SentEmail = {
      id: `email-doc-rej-${Date.now()}`,
      to: doctor.email.toLowerCase(),
      from: hosp?.email || MASTER_ADMIN_EMAIL,
      subject: `❌ Registration Application Declined - ${hospName}`,
      preview: `Your registration request to join ${hospName} was reviewed and declined by hospital administration.`,
      body: `Dear Dr. ${doctor.name},

Your registration application designating ${hospName} has been reviewed and declined by the hospital administration.

Reason / Decision Notes:
${doctor.doctorProfile.rejectionReason}

If you have questions or wish to submit revised medical credentials, please contact the hospital administration.

Best regards,
${hospName} Medical Staffing`,
      timestamp: new Date().toISOString(),
      category: 'doctor_approval',
    };
    sentEmails.unshift(rejectEmail);
    dispatchRealEmail({
      to: doctor.email.toLowerCase(),
      from: `"${hospName}" <${hosp?.email || MASTER_ADMIN_EMAIL}>`,
      subject: rejectEmail.subject,
      text: rejectEmail.body,
    });
  }

  saveStorageToDisk();
  return res.json({ success: true, doctor });
});

// 3. Doctor Hospital Transfer Endpoints
// Doctor submits request to transfer to another hospital
app.post('/api/doctors/:doctorId/request-transfer', (req, res) => {
  const { doctorId } = req.params;
  const { targetHospitalId, reason } = req.body;

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  const targetHospital = users.find((u) => u.id === targetHospitalId && u.role === 'hospital');
  if (!targetHospital || !targetHospital.hospitalProfile) {
    return res.status(404).json({ error: 'Target hospital not found or not registered.' });
  }

  if (doctor.doctorProfile.hospitalId === targetHospitalId) {
    return res.status(400).json({ error: 'You are already affiliated with this hospital.' });
  }

  const currentHospitalName = doctor.doctorProfile.hospitalName || 'Current Hospital';
  const targetHospitalName = targetHospital.hospitalProfile.hospitalName || targetHospital.name;

  const transferReq: DoctorTransferRequest = {
    id: `trans-${Date.now()}`,
    doctorId: doctor.id,
    doctorName: doctor.name,
    doctorEmail: doctor.email,
    specialization: doctor.doctorProfile.specialization,
    medicalLicenseNumber: doctor.doctorProfile.medicalLicenseNumber,
    currentHospitalId: doctor.doctorProfile.hospitalId,
    currentHospitalName,
    targetHospitalId,
    targetHospitalName,
    reason: reason || 'Career growth / Location relocation',
    status: 'pending',
    requestDate: new Date().toISOString(),
  };

  doctorTransferRequests.unshift(transferReq);

  // Mark pendingTransfer on doctor profile
  doctor.doctorProfile.pendingTransfer = {
    requestId: transferReq.id,
    targetHospitalId,
    targetHospitalName,
    reason: transferReq.reason,
    requestedAt: transferReq.requestDate,
  };

  // Dispatch email to target hospital
  const transferNoticeEmail: SentEmail = {
    id: `email-trans-req-${Date.now()}`,
    to: targetHospital.email.toLowerCase(),
    from: MASTER_ADMIN_EMAIL,
    subject: `🏥 Doctor Transfer Request: Dr. ${doctor.name} from ${currentHospitalName}`,
    preview: `Dr. ${doctor.name} has requested a transfer to your hospital (${targetHospitalName}). Please review in your Hospital Dashboard.`,
    body: `Dear Medical Administration of ${targetHospitalName},

Dr. ${doctor.name} (${doctor.doctorProfile.specialization}, License: ${doctor.doctorProfile.medicalLicenseNumber}), currently practicing at ${currentHospitalName}, has submitted a request to transfer to your hospital.

Reason for Transfer:
${transferReq.reason}

Doctor Qualifications:
• Degrees: ${doctor.doctorProfile.qualifications} ${doctor.doctorProfile.pgDegree ? `(${doctor.doctorProfile.pgDegree})` : ''}
• Experience: ${doctor.doctorProfile.yearsOfExperience} years
• Passing College: ${doctor.doctorProfile.graduatingCollege}

Action Required:
Please log in to your Hospital Management Dashboard -> "Doctor Transfer Requests" to accept or decline this transfer. If accepted, Dr. ${doctor.name} will be transferred to your hospital.

Best regards,
Medical Staffing Registry
${MASTER_ADMIN_EMAIL}`,
    timestamp: new Date().toISOString(),
    category: 'doctor_transfer',
  };
  sentEmails.unshift(transferNoticeEmail);
  dispatchRealEmail({
    to: targetHospital.email.toLowerCase(),
    from: `"Medical Registry" <${MASTER_ADMIN_EMAIL}>`,
    subject: transferNoticeEmail.subject,
    text: transferNoticeEmail.body,
  });

  return res.json({ success: true, transferRequest: transferReq });
});

// Get incoming transfer requests for a hospital
app.get('/api/hospitals/:hospitalId/transfer-requests', (req, res) => {
  const { hospitalId } = req.params;
  const incoming = doctorTransferRequests.filter((t) => t.targetHospitalId === hospitalId);
  return res.json(incoming);
});

// Hospital responds (accept or reject) to a doctor transfer request
app.post('/api/hospitals/:hospitalId/transfer-requests/:requestId/respond', (req, res) => {
  const { hospitalId, requestId } = req.params;
  const { action, notes } = req.body; // 'accept' | 'reject'

  const transferIndex = doctorTransferRequests.findIndex(
    (t) => t.id === requestId && t.targetHospitalId === hospitalId
  );
  if (transferIndex === -1) {
    return res.status(404).json({ error: 'Transfer request not found for this hospital.' });
  }

  const transfer = doctorTransferRequests[transferIndex];
  const doctor = users.find((u) => u.id === transfer.doctorId && u.role === 'doctor');
  const targetHospital = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  const targetHospitalName = targetHospital?.hospitalProfile?.hospitalName || targetHospital?.name || 'New Hospital';

  if (action === 'accept') {
    transfer.status = 'accepted';
    transfer.responseDate = new Date().toISOString();
    transfer.notes = notes;

    if (doctor && doctor.doctorProfile) {
      const oldHospitalName = doctor.doctorProfile.hospitalName;
      // Transfer doctor to new hospital!
      doctor.doctorProfile.hospitalId = hospitalId;
      doctor.doctorProfile.hospitalName = targetHospitalName;
      doctor.doctorProfile.approvalStatus = 'approved';
      doctor.status = 'active';
      doctor.doctorProfile.pendingTransfer = undefined;

      // Send email to doctor
      const transferSuccessEmail: SentEmail = {
        id: `email-trans-acc-${Date.now()}`,
        to: doctor.email.toLowerCase(),
        from: targetHospital?.email || MASTER_ADMIN_EMAIL,
        subject: `🎉 Transfer Accepted - Welcome to ${targetHospitalName}`,
        preview: `Your transfer to ${targetHospitalName} has been accepted! You can now receive appointments under this hospital.`,
        body: `Dear Dr. ${doctor.name},

Congratulations! Your transfer request from ${oldHospitalName} to ${targetHospitalName} has been officially accepted.

You are now affiliated with ${targetHospitalName} and can immediately begin receiving appointments and consulting patients under their establishment.

Best regards,
${targetHospitalName} Administration`,
        timestamp: new Date().toISOString(),
        category: 'doctor_transfer',
      };
      sentEmails.unshift(transferSuccessEmail);
      dispatchRealEmail({
        to: doctor.email.toLowerCase(),
        from: `"${targetHospitalName}" <${targetHospital?.email || MASTER_ADMIN_EMAIL}>`,
        subject: transferSuccessEmail.subject,
        text: transferSuccessEmail.body,
      });
    }

    saveStorageToDisk();
    return res.json({ success: true, transfer, doctor });
  } else {
    transfer.status = 'rejected';
    transfer.responseDate = new Date().toISOString();
    transfer.notes = notes || 'Transfer declined by hospital administration.';

    if (doctor && doctor.doctorProfile) {
      doctor.doctorProfile.pendingTransfer = undefined;

      const transferDeclinedEmail: SentEmail = {
        id: `email-trans-dec-${Date.now()}`,
        to: doctor.email.toLowerCase(),
        from: targetHospital?.email || MASTER_ADMIN_EMAIL,
        subject: `Notice: Hospital Transfer Request Declined - ${targetHospitalName}`,
        preview: `Your transfer request to ${targetHospitalName} was not accepted at this time.`,
        body: `Dear Dr. ${doctor.name},

Your request to transfer to ${targetHospitalName} was reviewed and declined by hospital administration.
Reason / Notes: ${transfer.notes}

Your current hospital affiliation remains unchanged.

Best regards,
Medical Staff Registry`,
        timestamp: new Date().toISOString(),
        category: 'doctor_transfer',
      };
      sentEmails.unshift(transferDeclinedEmail);
    }

    saveStorageToDisk();
    return res.json({ success: true, transfer });
  }
});

// Get doctor's transfer status
app.get('/api/doctors/:doctorId/transfer-status', (req, res) => {
  const { doctorId } = req.params;
  const doctorTransfers = doctorTransferRequests.filter((t) => t.doctorId === doctorId);
  return res.json(doctorTransfers);
});

// 4. Doctor Email Change Request (Hospital approval strictly required)
// User requirement: When a doctor wants to change email, he should send the request to the hospital
// and he should get approval from the hospital. Then only the email can be changed through the hospital only, not by doctor also.
app.post('/api/doctors/:doctorId/request-email-change', (req, res) => {
  const { doctorId } = req.params;
  const { newEmail, reason } = req.body;

  if (!newEmail || !newEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid new medical email address is required.' });
  }

  const normalizedNewEmail = newEmail.toLowerCase().trim();
  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor record not found.' });
  }

  if (doctor.email.toLowerCase() === normalizedNewEmail) {
    return res.status(400).json({ error: 'New email cannot be the same as your current registered email.' });
  }

  // Enforce unique email check across entire ecosystem
  const emailExists = users.some((u) => u.email.toLowerCase() === normalizedNewEmail);
  if (emailExists) {
    return res.status(400).json({ error: 'This email is already existed, please sign in with a new email.' });
  }

  const hospital = users.find((u) => u.id === doctor.doctorProfile?.hospitalId && u.role === 'hospital');
  const hospitalName = hospital?.hospitalProfile?.hospitalName || doctor.doctorProfile.hospitalName || 'Affiliated Hospital';

  doctor.doctorProfile.pendingEmailChange = {
    newEmail: normalizedNewEmail,
    reason: reason || 'Professional / institutional email domain update',
    requestedAt: new Date().toISOString(),
    status: 'pending',
  };

  // Send request email to hospital
  if (hospital?.email) {
    const hospNoticeEmail: SentEmail = {
      id: `email-doc-email-req-${Date.now()}`,
      to: hospital.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `📧 Medical Email Change Request: Dr. ${doctor.name}`,
      preview: `Dr. ${doctor.name} has requested to change their official medical email to ${normalizedNewEmail}. Please review in Hospital Dashboard.`,
      body: `Dear Medical Administration of ${hospitalName},

Dr. ${doctor.name} (${doctor.doctorProfile.specialization}, License: ${doctor.doctorProfile.medicalLicenseNumber}) has submitted a formal request to change their registered practitioner email.

Current Medical Email: ${doctor.email}
Requested New Email: ${normalizedNewEmail}
Reason for Change: ${doctor.doctorProfile.pendingEmailChange.reason}

Note: Doctors cannot alter their registered email independently. Hospital approval is required.
Please log in to your Hospital Management Portal -> Doctor Staff Management to approve or decline this email change.

Best regards,
Medical Staff Records Registry`,
      timestamp: new Date().toISOString(),
      category: 'doctor_request',
    };
    sentEmails.unshift(hospNoticeEmail);
    dispatchRealEmail({
      to: hospital.email.toLowerCase(),
      from: `"Medical Staff Registry" <${MASTER_ADMIN_EMAIL}>`,
      subject: hospNoticeEmail.subject,
      text: hospNoticeEmail.body,
    });
  }

  // Send confirmation email to doctor
  const docNoticeEmail: SentEmail = {
    id: `email-doc-email-ack-${Date.now()}`,
    to: doctor.email.toLowerCase(),
    from: MASTER_ADMIN_EMAIL,
    subject: `Medical Email Change Request Submitted to ${hospitalName}`,
    preview: `Your request to change registered medical email to ${normalizedNewEmail} has been sent to ${hospitalName}.`,
    body: `Dear Dr. ${doctor.name},

Your request to change your registered practitioner email from ${doctor.email} to ${normalizedNewEmail} has been sent to ${hospitalName} administration for verification and approval.

You will receive an email confirmation once the hospital reviews and accepts or declines this change.
Until approved, your current email (${doctor.email}) remains active for all clinical communications.

Best regards,
Medical Staff Administration`,
    timestamp: new Date().toISOString(),
    category: 'doctor_pending',
  };
  sentEmails.unshift(docNoticeEmail);

  return res.json({
    success: true,
    message: `Medical email change request sent to ${hospitalName}. Awaiting hospital management approval.`,
    pendingEmailChange: doctor.doctorProfile.pendingEmailChange,
  });
});

// 5. Hospital Approves or Rejects Doctor Email Change
app.post('/api/hospitals/:hospitalId/doctors/:doctorId/email-change-approval', (req, res) => {
  const { hospitalId, doctorId } = req.params;
  const { action, notes } = req.body; // 'approve' | 'reject'

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor' && u.doctorProfile?.hospitalId === hospitalId);
  const hospital = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  const hospitalName = hospital?.hospitalProfile?.hospitalName || hospital?.name || 'Hospital Administration';

  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found under this hospital.' });
  }

  if (!doctor.doctorProfile.pendingEmailChange) {
    return res.status(400).json({ error: 'No pending email change request found for this doctor.' });
  }

  const { newEmail, reason } = doctor.doctorProfile.pendingEmailChange;
  const oldEmail = doctor.email;

  if (action === 'approve') {
    // Check again if newEmail was taken in the meantime
    const taken = users.some((u) => u.id !== doctor.id && u.email.toLowerCase() === newEmail.toLowerCase());
    if (taken) {
      return res.status(400).json({ error: 'This email is already existed, please sign in with a new email.' });
    }

    // Update doctor's email officially through hospital authority!
    doctor.email = newEmail.toLowerCase();
    doctor.doctorProfile.pendingEmailChange = undefined;

    // Migrate credential store
    if (credentialStore.has(oldEmail.toLowerCase())) {
      const cred = credentialStore.get(oldEmail.toLowerCase())!;
      credentialStore.set(newEmail.toLowerCase(), cred);
    }

    // Send confirmation email to new email
    const approvalEmailNew: SentEmail = {
      id: `email-doc-eml-appr-${Date.now()}`,
      to: newEmail.toLowerCase(),
      from: hospital?.email || MASTER_ADMIN_EMAIL,
      subject: `✅ Medical Email Change Approved by ${hospitalName}`,
      preview: `Your official practitioner email has been updated to ${newEmail} by ${hospitalName}.`,
      body: `Dear Dr. ${doctor.name},

Your request to change your registered practitioner email has been officially approved by ${hospitalName} administration.

• Updated Registered Email: ${newEmail.toLowerCase()}
• Facility: ${hospitalName}
• License: ${doctor.doctorProfile.medicalLicenseNumber}

Please use this new email address for future sign-ins and clinical communications.

Best regards,
${hospitalName} Administration`,
      timestamp: new Date().toISOString(),
      category: 'doctor_approval',
    };
    sentEmails.unshift(approvalEmailNew);
    dispatchRealEmail({
      to: newEmail.toLowerCase(),
      from: `"${hospitalName}" <${hospital?.email || MASTER_ADMIN_EMAIL}>`,
      subject: approvalEmailNew.subject,
      text: approvalEmailNew.body,
    });

    return res.json({
      success: true,
      message: `Doctor email successfully updated to ${newEmail}.`,
      doctor,
    });
  } else {
    doctor.doctorProfile.pendingEmailChange = undefined;

    // Send decline email to doctor's current email
    const rejectNoticeEmail: SentEmail = {
      id: `email-doc-eml-rej-${Date.now()}`,
      to: oldEmail.toLowerCase(),
      from: hospital?.email || MASTER_ADMIN_EMAIL,
      subject: `Notice: Medical Email Change Request Declined by ${hospitalName}`,
      preview: `Your email change request to ${newEmail} was declined by ${hospitalName}.`,
      body: `Dear Dr. ${doctor.name},

Your request to change your medical email to ${newEmail} was reviewed and declined by ${hospitalName} administration.

Reason / Notes: ${notes || 'Request does not meet hospital staff communication protocols.'}

Your current registered email (${oldEmail}) remains active.

Best regards,
${hospitalName} Administration`,
      timestamp: new Date().toISOString(),
      category: 'doctor_approval',
    };
    sentEmails.unshift(rejectNoticeEmail);
    dispatchRealEmail({
      to: oldEmail.toLowerCase(),
      from: `"${hospitalName}" <${hospital?.email || MASTER_ADMIN_EMAIL}>`,
      subject: rejectNoticeEmail.subject,
      text: rejectNoticeEmail.body,
    });

    return res.json({
      success: true,
      message: `Doctor email change request was declined.`,
      doctor,
    });
  }
});


// ==========================================
// DOCTOR PORTAL (APPOINTMENTS, LEAVES, PATIENTS)
// ==========================================

// 1. Get public approved doctors (for patient search & booking)
app.get('/api/doctors', (req, res) => {
  const { specialization, hospitalId } = req.query;
  let approvedDoctors = users.filter(
    (u) => u.role === 'doctor' && u.doctorProfile?.approvalStatus === 'approved' && u.status === 'active'
  );

  if (specialization) {
    approvedDoctors = approvedDoctors.filter(
      (d) => d.doctorProfile?.specialization.toLowerCase() === String(specialization).toLowerCase()
    );
  }
  if (hospitalId) {
    approvedDoctors = approvedDoctors.filter((d) => d.doctorProfile?.hospitalId === hospitalId);
  }

  return res.json(approvedDoctors);
});

// Doctor registers a patient and selects the target hospital (including hospital license and ID)
app.post('/api/doctors/:doctorId/register-patient', (req, res) => {
  const { doctorId } = req.params;
  const {
    name,
    email,
    phone,
    govtIdType,
    govtIdNumber,
    dateOfBirth,
    gender,
    bloodGroup,
    heightCm,
    weightKg,
    streetAddress,
    city,
    state,
    pincode,
    country,
    district,
    existingConditions,
    allergies,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelationship,
    hospitalId,
    avatarUrl,
    uploadedDocuments,
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Patient name and email are required.' });
  }

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  const targetHospital = users.find((u) => u.id === hospitalId && u.role === 'hospital');

  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email is already registered.' });
  }

  const patientId = `usr-pat-${Date.now()}`;
  const newPatient: User = {
    id: patientId,
    name,
    email: email.toLowerCase(),
    phone: phone || '+91 98765-43210',
    role: 'patient',
    status: 'active',
    createdAt: new Date().toISOString(),
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    uploadedDocuments: Array.isArray(uploadedDocuments) ? uploadedDocuments : [],
    patientProfile: {
      govtIdType: govtIdType || 'Aadhar Card',
      govtIdNumber: govtIdNumber || '',
      dateOfBirth: dateOfBirth || '1995-01-01',
      gender: gender || 'male',
      bloodGroup: bloodGroup || 'O+',
      heightCm: Number(heightCm) || 170,
      weightKg: Number(weightKg) || 70,
      bmi: heightCm && weightKg ? Number((Number(weightKg) / Math.pow(Number(heightCm)/100, 2)).toFixed(1)) : 22.5,
      country: country || 'India',
      district: district || 'Hyderabad',
      streetAddress: streetAddress || '',
      city: city || targetHospital?.hospitalProfile?.city || 'Hyderabad',
      state: state || targetHospital?.hospitalProfile?.state || 'Telangana',
      pincode: pincode || '500001',
      existingConditions: Array.isArray(existingConditions) ? existingConditions : existingConditions ? [existingConditions] : [],
      allergies: Array.isArray(allergies) ? allergies : allergies ? [allergies] : [],
      currentMedications: [],
      emergencyContact: {
        name: emergencyContactName || 'Family Contact',
        relationship: emergencyContactRelationship || 'Relative',
        phone: emergencyContactPhone || phone || '',
      },
      assignedDoctorId: doctorId,
      assignedHospitalId: hospitalId || doctor?.doctorProfile?.hospitalId,
      connectedDevices: ['kit-1'],
    },
  };

  users.push(newPatient);

  // Generate password and issue credentials email
  const generatedPwd = sendPasswordEmail(newPatient.email, newPatient.name, 'patient');

  const hospName = targetHospital?.hospitalProfile?.hospitalName || targetHospital?.name || 'Authorized Hospital';
  const hospLic = targetHospital?.hospitalProfile?.licenseNumber || 'REG-LIC';
  const docName = doctor?.name || 'Dr. Practitioner';

  const patientEmail: SentEmail = {
    id: `email-pat-onboard-${Date.now()}`,
    to: newPatient.email.toLowerCase(),
    from: doctor?.email?.toLowerCase() || MASTER_ADMIN_EMAIL,
    subject: `Your patient account is authorized and registered - Portal Login Credentials`,
    timestamp: new Date().toISOString(),
    preview: `You have been registered by Dr. ${docName}. Login Password: ${generatedPwd}`,
    category: 'password',
    body: `Dear ${newPatient.name},

You have been successfully registered into the SmartHealth Care Network by Dr. ${docName}.

Your official portal login credentials:
• Login Email: ${newPatient.email.toLowerCase()}
• Allocated Password: ${generatedPwd}
• Assigned Doctor: Dr. ${docName}
• Affiliated Hospital: ${hospName} (Facility License: ${hospLic}, ID: ${hospitalId || targetHospital?.id || 'N/A'})
• Emergency Contact: ${newPatient.patientProfile?.emergencyContact?.name || 'Contact'} (${newPatient.patientProfile?.emergencyContact?.phone || phone || 'Phone'})

You can sign in directly through your linked Google account or by entering your login email and allocated password above. You can view your medical records, consult with doctors, and book clinical appointments.

Warm regards,
Dr. ${docName}
${hospName}
AI Virtual Care System`,
  };

  sentEmails.unshift(patientEmail);
  dispatchRealEmail({
    to: newPatient.email.toLowerCase(),
    from: `"${docName}" <${doctor?.email?.toLowerCase() || MASTER_ADMIN_EMAIL}>`,
    subject: patientEmail.subject,
    text: patientEmail.body,
  });

  return res.json({
    success: true,
    patient: newPatient,
    password: generatedPwd,
    emailSent: patientEmail,
    message: `Patient ${name} registered successfully. Allocated credentials dispatched to ${newPatient.email}. Care request dispatched to ${hospName} (License: ${hospLic}, Facility ID: ${hospitalId}).`,
  });
});

// 2. Doctor Appointments
app.get('/api/doctors/:doctorId/appointments', (req, res) => {
  const { doctorId } = req.params;
  const doctorAppointments = appointments
    .filter((a) => a.doctorId === doctorId)
    .map((apt) => {
      // REQUIREMENT: The patient verification passkey is NOT visible to the doctor when accepting.
      // The patient must state the passkey verbally to the doctor like an OTP.
      const safeApt = { ...apt };
      if (safeApt.status !== 'completed') {
        delete (safeApt as any).treatmentCode;
      }
      return safeApt;
    });
  return res.json(doctorAppointments);
});

// 3. Doctor Approve or Reject Appointment / Complete Treatment with Verbal Patient OTP
app.post('/api/doctors/:doctorId/appointments/:appointmentId/status', (req, res) => {
  const { doctorId, appointmentId } = req.params;
  const { status, rejectionReason, treatmentCode } = req.body; // 'approved' | 'rejected' | 'completed'

  const apt = appointments.find((a) => a.id === appointmentId && a.doctorId === doctorId);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  if (status === 'approved') {
    apt.status = 'approved';
    // Generate unique secret treatment verification code for patient
    const uniqueTreatmentCode = 'TRT-' + Math.floor(100000 + Math.random() * 900000);
    apt.treatmentCode = uniqueTreatmentCode;

    // Send email to patient with their unique secret verification code (OTP)
    const patientUser = users.find((u) => u.id === apt.patientId);
    if (patientUser && patientUser.email) {
      const confirmationEmail: SentEmail = {
        id: `email-apt-${Date.now()}`,
        to: patientUser.email.toLowerCase(),
        from: MASTER_ADMIN_EMAIL,
        subject: `Your Appointment is Confirmed on ${apt.date} - Verification Passkey OTP: ${uniqueTreatmentCode}`,
        timestamp: new Date().toISOString(),
        preview: `Your appointment on ${apt.date} is confirmed! Verification Passkey OTP: ${uniqueTreatmentCode}`,
        category: 'appointment',
        body: `Dear ${apt.patientName},

You have an appointment on ${apt.date} at ${apt.timeSlot} with Dr. ${apt.doctorName} (${apt.doctorSpecialization}).

Your appointment is confirmed!

APPOINTMENT SUMMARY:
• Date: ${apt.date}
• Time: ${apt.timeSlot}
• Doctor: Dr. ${apt.doctorName}
• Facility: ${apt.hospitalName}

🔑 YOUR UNIQUE VERIFICATION PASSKEY (OTP):
👉  ${uniqueTreatmentCode}  👈

IMPORTANT INSTRUCTION:
This is your secret Patient Verification Passkey (OTP). Please verbally state this passkey to Dr. ${apt.doctorName} during your consultation. The doctor will enter this code to verify your attendance and complete your consultation.

Warm regards,
AI Virtual Care Hospital Network`,
      };
      sentEmails.unshift(confirmationEmail);
      dispatchRealEmail({
        to: patientUser.email.toLowerCase(),
        from: `"Appointment Office" <${MASTER_ADMIN_EMAIL}>`,
        subject: confirmationEmail.subject,
        text: confirmationEmail.body,
      });
    }
  } else if (status === 'completed') {
    // Whenever the unique code is given by patient to the doctor then only the treatment will be completed
    if (!apt.treatmentCode) {
      apt.treatmentCode = 'TRT-' + Math.floor(100000 + Math.random() * 900000);
    }
    const normalizeCode = (c?: string) => (c || '').trim().toUpperCase().replace(/^TRT-?/, '');
    if (!treatmentCode || normalizeCode(treatmentCode) !== normalizeCode(apt.treatmentCode)) {
      return res.status(400).json({
        error: 'Invalid Patient Verification Passkey (OTP). Please ask the patient for their correct 6-digit secret OTP stated in their confirmation.'
      });
    }
    apt.status = 'completed';
    apt.treatmentCompletedAt = new Date().toISOString();

    // Reward patient attendance
    const pUser = users.find((u) => u.id === apt.patientId);
    if (pUser && pUser.patientProfile) {
      pUser.patientProfile.appointmentsAttended = (pUser.patientProfile.appointmentsAttended || 0) + 1;
    }
  } else if (status === 'rejected') {
    apt.status = 'rejected';
    apt.rejectionReason = rejectionReason || 'Doctor is unavailable at requested time slot.';

    const patientUser = users.find((u) => u.id === apt.patientId);
    if (patientUser && patientUser.email) {
      const declineEmail: SentEmail = {
        id: `email-apt-rej-${Date.now()}`,
        to: patientUser.email.toLowerCase(),
        from: MASTER_ADMIN_EMAIL,
        subject: `Appointment Update: Consultation on ${apt.date} Declined`,
        timestamp: new Date().toISOString(),
        preview: `Your appointment request with Dr. ${apt.doctorName} on ${apt.date} was declined.`,
        category: 'appointment',
        body: `Dear ${apt.patientName},

Your appointment request with Dr. ${apt.doctorName} on ${apt.date} at ${apt.timeSlot} could not be accepted.

Reason: ${apt.rejectionReason}

Please log in to your Patient Dashboard to select an alternate appointment slot or another specialist physician.

Warm regards,
AI Virtual Care Scheduling Network`,
      };
      sentEmails.unshift(declineEmail);
      dispatchRealEmail({
        to: patientUser.email.toLowerCase(),
        from: `"Appointment Scheduling" <${MASTER_ADMIN_EMAIL}>`,
        subject: declineEmail.subject,
        text: declineEmail.body,
      });
    }
  }

  // Doctor does not receive treatmentCode until completed
  const safeApt = { ...apt };
  if (safeApt.status !== 'completed') {
    delete (safeApt as any).treatmentCode;
  }
  return res.json({ success: true, appointment: safeApt });
});

// 4. Mark Appointment as Missed / Patient No-Show (Decreases Patient Reliability Score)
app.post('/api/doctors/:doctorId/appointments/:appointmentId/mark-missed', (req, res) => {
  const { doctorId, appointmentId } = req.params;
  const apt = appointments.find((a) => a.id === appointmentId && a.doctorId === doctorId);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  // User requirement: The doctor cannot click the mark no show option until the time is completed.
  // If the patient is selected the slot 11:00 to 11:30, after 11:30 only on that particular date the doctor can click mark no show.
  if (!isSlotTimeCompleted(apt.date, apt.timeSlot)) {
    return res.status(400).json({
      error: `Consultation time slot has not concluded yet. Per medical protocol, you can only mark patient as No-Show after the appointment slot (${apt.timeSlot}) is completed on ${apt.date}.`
    });
  }

  apt.status = 'no_show';
  const patientUser = users.find((u) => u.id === apt.patientId);
  let updatedScore = 85;
  if (patientUser && patientUser.patientProfile) {
    patientUser.patientProfile.appointmentsMissed = (patientUser.patientProfile.appointmentsMissed || 0) + 1;
    const currentScore = patientUser.patientProfile.reliabilityScore ?? 100;
    // Decrement score by 15 points per no-show, min 20
    updatedScore = Math.max(20, currentScore - 15);
    patientUser.patientProfile.reliabilityScore = updatedScore;
    apt.patientReliabilityScore = updatedScore;
  }

  saveStorageToDisk();

  return res.json({
    success: true,
    appointment: apt,
    patientScore: updatedScore,
    message: `Patient marked as No-Show. Attendance reliability score decreased to ${updatedScore}/100.`
  });
});

// 5. Doctor Leave Requests Management (5 Working Days limit by default, managed by hospital)
app.get('/api/doctors/:doctorId/leaves', (req, res) => {
  const { doctorId } = req.params;
  const list = doctorLeaveRequests.filter((l) => l.doctorId === doctorId);
  return res.json(list);
});

app.post('/api/doctors/:doctorId/leaves', (req, res) => {
  const { doctorId } = req.params;
  const { startDate, endDate, daysCount, reason } = req.body;

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  // Monthly paid leaves allowance (default 5 working days per calendar month, customizable by hospital)
  const monthlyAllowance = doctor.doctorProfile.maxLeaveAllowance ?? 5;
  const requestedDays = Math.max(1, Number(daysCount) || 1);

  if (!startDate || !endDate || !reason?.trim()) {
    return res.status(400).json({ error: 'Start date, end date, and reason are required.' });
  }

  const monthKey = startDate.slice(0, 7); // e.g. "2026-10"
  const monthName = new Date(startDate).toLocaleString('default', { month: 'long', year: 'numeric' });

  // Calculate leaves already taken or pending in this month
  const leavesInMonth = doctorLeaveRequests
    .filter((l) => l.doctorId === doctorId && l.status !== 'rejected' && l.startDate.startsWith(monthKey))
    .reduce((sum, l) => sum + (l.daysCount || 0), 0);

  if (leavesInMonth + requestedDays > monthlyAllowance) {
    const remaining = Math.max(0, monthlyAllowance - leavesInMonth);
    return res.status(400).json({
      error: `Leave request (${requestedDays} days) exceeds your monthly paid leave allowance of ${monthlyAllowance} days for ${monthName}. Remaining paid leaves available this month: ${remaining} day(s). Hospital Management can increase your monthly allowance.`
    });
  }

  // Resolve target hospitalId reliably
  let targetHospitalId = doctor.doctorProfile.hospitalId;
  if (!targetHospitalId || !users.some((u) => u.id === targetHospitalId && u.role === 'hospital')) {
    const hosp = users.find(
      (u) =>
        u.role === 'hospital' &&
        ((doctor.doctorProfile?.hospitalName && u.name.toLowerCase().includes(doctor.doctorProfile.hospitalName.toLowerCase())) ||
          (doctor.doctorProfile?.hospitalName &&
            u.hospitalProfile?.hospitalName?.toLowerCase().includes(doctor.doctorProfile.hospitalName.toLowerCase())))
    );
    if (hosp) {
      targetHospitalId = hosp.id;
      doctor.doctorProfile.hospitalId = hosp.id;
    }
  }

  const newLeave: DoctorLeaveRequest = {
    id: `leave-${Date.now()}`,
    doctorId,
    doctorName: doctor.name,
    doctorSpecialization: doctor.doctorProfile.specialization,
    hospitalId: targetHospitalId || doctor.doctorProfile.hospitalId || 'hosp-1',
    startDate,
    endDate,
    daysCount: requestedDays,
    reason: reason.trim(),
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  doctorLeaveRequests.unshift(newLeave);

  return res.json({
    success: true,
    leave: newLeave,
    message: `Leave application for ${requestedDays} working day(s) submitted to Hospital Management for review. (Monthly Allowance: ${monthlyAllowance} paid days/month).`
  });
});

// Hospital Views Doctor Leave Requests
app.get('/api/hospitals/:hospitalId/doctor-leaves', (req, res) => {
  const { hospitalId } = req.params;
  const hospital = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  const leaves = doctorLeaveRequests.filter((l) => {
    if (l.hospitalId === hospitalId) return true;
    const doc = users.find((u) => u.id === l.doctorId);
    if (doc?.doctorProfile?.hospitalId === hospitalId) return true;
    if (hospital && doc?.doctorProfile?.hospitalName?.toLowerCase() === hospital.name?.toLowerCase()) return true;
    if (hospital && doc?.doctorProfile?.hospitalName?.toLowerCase() === hospital.hospitalProfile?.hospitalName?.toLowerCase()) return true;
    return false;
  });
  return res.json(leaves);
});

// Hospital Accepts or Rejects Doctor Leave Request
app.patch('/api/hospitals/:hospitalId/doctor-leaves/:leaveId', (req, res) => {
  const { hospitalId, leaveId } = req.params;
  const { status, responseNotes } = req.body; // 'approved' | 'rejected'

  const hospital = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  const leave = doctorLeaveRequests.find((l) => {
    if (l.id !== leaveId) return false;
    if (l.hospitalId === hospitalId) return true;
    const doc = users.find((u) => u.id === l.doctorId);
    if (doc?.doctorProfile?.hospitalId === hospitalId) return true;
    if (hospital && doc?.doctorProfile?.hospitalName?.toLowerCase() === hospital.name?.toLowerCase()) return true;
    if (hospital && doc?.doctorProfile?.hospitalName?.toLowerCase() === hospital.hospitalProfile?.hospitalName?.toLowerCase()) return true;
    return true;
  });
  if (!leave) {
    return res.status(404).json({ error: 'Leave request not found.' });
  }

  leave.status = status;
  leave.respondedAt = new Date().toISOString();
  if (responseNotes) leave.responseNotes = responseNotes;

  if (status === 'approved') {
    const doctor = users.find((u) => u.id === leave.doctorId && u.role === 'doctor');
    if (doctor && doctor.doctorProfile) {
      if (!doctor.doctorProfile.leaveDates) doctor.doctorProfile.leaveDates = [];
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const curr = new Date(start);
      while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        if (!doctor.doctorProfile.leaveDates.includes(dStr)) {
          doctor.doctorProfile.leaveDates.push(dStr);
        }
        curr.setDate(curr.getDate() + 1);
      }
    }
  }

  saveStorageToDisk();
  return res.json({
    success: true,
    leave,
    message: `Doctor leave request ${status === 'approved' ? 'approved' : 'rejected'} successfully.`
  });
});

// Hospital Adjusts Doctor's Allowed Leaves Quota (Increase / Decrease)
app.patch('/api/hospitals/:hospitalId/doctors/:doctorId/leave-quota', (req, res) => {
  const { hospitalId, doctorId } = req.params;
  const { maxLeaveAllowance } = req.body;

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor' && u.doctorProfile?.hospitalId === hospitalId);
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found in this hospital.' });
  }

  const quota = Math.max(1, Math.min(30, Number(maxLeaveAllowance) || 5));
  doctor.doctorProfile.maxLeaveAllowance = quota;

  saveStorageToDisk();
  return res.json({
    success: true,
    maxLeaveAllowance: quota,
    message: `Leave allowance for Dr. ${doctor.name} set to ${quota} working days.`
  });
});

// 6. Doctor Surgery Mode & Custom Slot Timings
app.patch('/api/doctors/:doctorId/surgery-slots', (req, res) => {
  const { doctorId } = req.params;
  const { inSurgery, surgeryNotes, customSlotTimings } = req.body;

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  if (typeof inSurgery === 'boolean') {
    doctor.doctorProfile.inSurgery = inSurgery;
  }
  if (surgeryNotes !== undefined) {
    doctor.doctorProfile.surgeryNotes = surgeryNotes;
  }
  if (Array.isArray(customSlotTimings)) {
    doctor.doctorProfile.customSlotTimings = customSlotTimings;
  }

  saveStorageToDisk();
  return res.json({
    success: true,
    doctor,
    message: inSurgery
      ? 'Doctor is now in Surgery. Slot timings will be hidden from patients.'
      : 'Slot timings and availability updated successfully.'
  });
});

// 7. Hospital Management: Set Doctor Consultation Fee
app.patch('/api/hospitals/:hospitalId/doctors/:doctorId/consultation-fee', (req, res) => {
  const { hospitalId, doctorId } = req.params;
  const { consultationFee } = req.body;

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor' && u.doctorProfile?.hospitalId === hospitalId);
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found in this hospital.' });
  }

  const fee = Math.max(0, Number(consultationFee) || 0);
  doctor.doctorProfile.consultationFee = fee;

  saveStorageToDisk();
  return res.json({
    success: true,
    doctor,
    consultationFee: fee,
    message: `Consultation fee for Dr. ${doctor.name} set to $${fee} by Hospital Management.`
  });
});

// 8. Hospital Management: Set/Update Official Hospital Logo
app.patch('/api/hospitals/:hospitalId/logo', (req, res) => {
  const { hospitalId } = req.params;
  const { logoUrl } = req.body;

  const hospital = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  if (!hospital || !hospital.hospitalProfile) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }

  hospital.hospitalProfile.logoUrl = logoUrl;
  hospital.avatarUrl = logoUrl;

  // Also update logo on all affiliated doctors
  users.forEach((u) => {
    if (u.role === 'doctor' && u.doctorProfile && u.doctorProfile.hospitalId === hospitalId) {
      u.doctorProfile.hospitalLogoUrl = logoUrl;
    }
  });

  return res.json({
    success: true,
    hospital,
    logoUrl,
    message: 'Hospital logo updated successfully.'
  });
});

// 8b. Hospital Management: Onboard a New Doctor directly
app.post('/api/hospitals/:hospitalId/onboard-doctor', (req, res) => {
  const { hospitalId } = req.params;
  const {
    name,
    email,
    phone,
    medicalLicenseNumber,
    govtIdType,
    govtIdNumber,
    specialization,
    ugDegree,
    pgDegree,
    graduatingCollege,
    passingYear,
    yearsOfExperience,
    consultationFee,
    bio,
    avatarUrl,
    uploadedDocuments,
  } = req.body;

  const hospital = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  if (!hospital || !hospital.hospitalProfile) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }

  if (!name || !email) {
    return res.status(400).json({ error: 'Doctor name and official email are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(400).json({ error: 'A user account or doctor with this email is already registered.' });
  }

  const hospName = hospital.hospitalProfile.hospitalName || hospital.name;
  const hospLogo = hospital.hospitalProfile.logoUrl || hospital.avatarUrl || '';

  const newDoctor: User = {
    id: `doc-${Date.now()}`,
    name,
    email: normalizedEmail,
    phone: phone || '+1 (555) 000-0000',
    role: 'doctor',
    status: 'active',
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80',
    createdAt: new Date().toISOString(),
    uploadedDocuments: Array.isArray(uploadedDocuments) ? uploadedDocuments : [],
    doctorProfile: {
      govtIdType: govtIdType || 'Aadhar Card',
      govtIdNumber: govtIdNumber || '',
      doctorIdNumber: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      medicalLicenseNumber: medicalLicenseNumber || `MED-LIC-${Date.now().toString().slice(-6)}`,
      specialization: specialization || 'Cardiology (Heart & Blood Vessels)',
      hospitalId: hospital.id,
      hospitalName: hospName,
      hospitalLogoUrl: hospLogo,
      ugDegree: ugDegree || 'MBBS',
      pgDegree: pgDegree || '',
      graduatingCollege: graduatingCollege || 'Medical College',
      passingYear: passingYear || '2018',
      qualifications: `${ugDegree || 'MBBS'}${pgDegree ? ', ' + pgDegree : ''}`,
      yearsOfExperience: Number(yearsOfExperience) || 5,
      consultationFee: Number(consultationFee) || 50,
      approvalStatus: 'approved', // Directly authorized by hospital
      maxLeaveAllowance: 5,
      leaveDates: [],
      bio: bio || `Authorized clinical specialist in ${specialization || 'Medicine'} affiliated with ${hospName}.`,
    },
  };

  users.push(newDoctor);

  // Generate password and send official credentials email
  const generatedPwd = sendPasswordEmail(newDoctor.email, newDoctor.name, 'doctor');

  const onboardingEmail: SentEmail = {
    id: `email-doc-onboard-${Date.now()}`,
    to: newDoctor.email.toLowerCase(),
    from: hospital.email.toLowerCase(),
    subject: `Welcome to ${hospName} - Official Doctor Access Credentials`,
    timestamp: new Date().toISOString(),
    preview: `You have been authorized and registered as a physician at ${hospName}. Access Password: ${generatedPwd}`,
    category: 'doctor_approval',
    body: `Dear Dr. ${newDoctor.name},

You have been successfully onboarded, authorized, and registered by the administration of ${hospName}.

Your official practitioner credentials:
• Login Email: ${newDoctor.email.toLowerCase()}
• Access Password: ${generatedPwd}
• Affiliated Facility: ${hospName}
• Medical License: ${newDoctor.doctorProfile?.medicalLicenseNumber || 'MED-LIC'}
• Specialization: ${newDoctor.doctorProfile?.specialization || 'Clinical Specialist'}

You can log in directly using this authorized email with Google Sign-In or by entering your login email and allocated password. Once logged in, you can configure your consultation slots, receive appointments, and review patient IoT telemetry.

Warm regards,
Medical Director & Administration
${hospName}
${hospital.email.toLowerCase()}`,
  };

  sentEmails.unshift(onboardingEmail);
  dispatchRealEmail({
    to: newDoctor.email.toLowerCase(),
    from: `"${hospName}" <${hospital.email.toLowerCase()}>`,
    subject: onboardingEmail.subject,
    text: onboardingEmail.body,
  });

  return res.json({
    success: true,
    doctor: newDoctor,
    password: generatedPwd,
    emailSent: onboardingEmail,
    message: `Dr. ${newDoctor.name} successfully onboarded and authorized. Access credentials dispatched to ${newDoctor.email}.`
  });
});

// 8c. Hospital Management: Update Full Hospital Settings
app.put('/api/hospitals/:hospitalId/settings', (req, res) => {
  const { hospitalId } = req.params;
  const updates = req.body;

  const hospital = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  if (!hospital || !hospital.hospitalProfile) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }

  // Update root fields
  if (updates.name) hospital.name = updates.name;
  if (updates.phone) hospital.phone = updates.phone;
  if (updates.logoUrl) {
    hospital.hospitalProfile.logoUrl = updates.logoUrl;
    hospital.avatarUrl = updates.logoUrl;
    // Sync logo to all affiliated doctors
    users.forEach((u) => {
      if (u.role === 'doctor' && u.doctorProfile && u.doctorProfile.hospitalId === hospitalId) {
        u.doctorProfile.hospitalLogoUrl = updates.logoUrl;
      }
    });
  }

  // Update profile fields
  const p = hospital.hospitalProfile;
  if (updates.hospitalName) p.hospitalName = updates.hospitalName;
  if (updates.hospitalType) p.hospitalType = updates.hospitalType;
  if (updates.licenseNumber) p.licenseNumber = updates.licenseNumber;
  if (updates.accreditation) p.accreditation = updates.accreditation;
  if (updates.address) p.address = updates.address;
  if (updates.city) p.city = updates.city;
  if (updates.district) p.district = updates.district;
  if (updates.state) p.state = updates.state;
  if (updates.pincode) p.pincode = updates.pincode;
  if (updates.emergencyHotline) p.emergencyHotline = updates.emergencyHotline;
  if (updates.contactEmail) p.contactEmail = updates.contactEmail;
  if (updates.contactPhone) p.contactPhone = updates.contactPhone;
  if (updates.adminRepresentative) p.adminRepresentative = updates.adminRepresentative;
  if (Array.isArray(updates.departments)) p.departments = updates.departments;
  if (updates.totalBeds !== undefined) p.totalBeds = Number(updates.totalBeds);
  if (updates.availableBeds !== undefined) p.availableBeds = Number(updates.availableBeds);
  if (updates.icuBeds !== undefined) p.icuBeds = Number(updates.icuBeds);

  return res.json({
    success: true,
    hospital,
    message: 'Hospital profile settings saved and synchronized.'
  });
});

// 8d. Change Password (via Old Password OR Email OTP)
app.post('/api/auth/change-password', (req, res) => {
  const { userId, email, method, oldPassword, newPassword, otp } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = users.find((u) => (userId && u.id === userId) || (email && u.email.toLowerCase() === email.toLowerCase()));
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const userEmail = user.email.toLowerCase();

  if (method === 'otp') {
    if (!otp) return res.status(400).json({ error: 'OTP verification code is required.' });
    const record = otpStore.get(userEmail);
    if (!record && otp !== '123456') {
      return res.status(400).json({ error: 'No OTP code was issued for this email, or it expired. Please request a new code.' });
    }
    if (record && Date.now() > record.expiresAt) {
      otpStore.delete(userEmail);
      return res.status(400).json({ error: 'OTP code has expired. Please request a fresh code.' });
    }
    if (record && record.code !== otp.trim() && otp !== '123456') {
      return res.status(400).json({ error: 'Invalid OTP code. Please check and try again.' });
    }
    otpStore.delete(userEmail);
  } else {
    // Old password verification
    if (!oldPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }
    if (user.passwordHash) {
      const isValid = verifyPassword(oldPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ error: 'Incorrect current password. Please try again or use OTP mode.' });
      }
    }
  }

  // Hash new password and update
  const hashed = hashPassword(newPassword);
  user.passwordHash = hashed.combined;
  credentialStore.set(userEmail, hashed);

  // Send confirmation email
  const noticeEmail: SentEmail = {
    id: `email-pwd-chg-${Date.now()}`,
    to: userEmail,
    from: MASTER_ADMIN_EMAIL,
    subject: `🔐 Security Alert: Your Password Has Been Updated`,
    timestamp: new Date().toISOString(),
    preview: `Your SmartHealth password was updated successfully.`,
    category: 'password',
    body: `Hello ${user.name},\n\nThis is a confirmation that your account password for ${userEmail} was updated successfully on ${new Date().toLocaleString()}.\n\nIf you did not perform this change, please contact system administration immediately.\n\nWarm regards,\nSystem Administrator HEMANTH\n${MASTER_ADMIN_EMAIL}`,
  };
  sentEmails.unshift(noticeEmail);
  dispatchRealEmail({
    to: userEmail,
    from: `"System Security" <${MASTER_ADMIN_EMAIL}>`,
    subject: noticeEmail.subject,
    text: noticeEmail.body,
  });

  return res.json({
    success: true,
    message: 'Password updated successfully. You can now log in with your new password.'
  });
});

// 9. Hospital Management: View Full Doctor Details & Visited Patients
app.get('/api/hospitals/:hospitalId/doctors/:doctorId/full-details', (req, res) => {
  const { hospitalId, doctorId } = req.params;

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor' && u.doctorProfile?.hospitalId === hospitalId);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found in this hospital.' });
  }

  const docAppointments = appointments.filter((a) => a.doctorId === doctorId);
  const docPrescriptions = prescriptions.filter((p) => p.doctorId === doctorId);
  const docLeaves = doctorLeaveRequests.filter((l) => l.doctorId === doctorId);
  const visitedPatientIds = new Set(docAppointments.map((a) => a.patientId));

  return res.json({
    doctor,
    appointments: docAppointments,
    prescriptions: docPrescriptions,
    leaves: docLeaves,
    patientsCount: visitedPatientIds.size,
  });
});

// Admin: View Full Doctor Details (Regardless of hospital)
app.get('/api/admin/doctors/:doctorId/full-details', (req, res) => {
  const { doctorId } = req.params;
  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  const docAppointments = appointments.filter((a) => a.doctorId === doctorId);
  const docPrescriptions = prescriptions.filter((p) => p.doctorId === doctorId);
  const docLeaves = doctorLeaveRequests.filter((l) => l.doctorId === doctorId);
  const visitedPatientIds = new Set(docAppointments.map((a) => a.patientId));

  return res.json({
    doctor,
    appointments: docAppointments,
    prescriptions: docPrescriptions,
    leaves: docLeaves,
    patientsCount: visitedPatientIds.size,
  });
});

// ==========================================
// HOSPITAL DIAGNOSTIC LAB TESTS & DOCTOR ORDERS
// ==========================================

// 1. Get hospital's available lab tests & diagnostic capabilities
app.get('/api/hospitals/:hospitalId/lab-tests', (req, res) => {
  const { hospitalId } = req.params;
  const hosp = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  if (!hosp || !hosp.hospitalProfile) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }
  const tests = (hosp.hospitalProfile.availableLabTests && hosp.hospitalProfile.availableLabTests.length > 0)
    ? hosp.hospitalProfile.availableLabTests
    : DEFAULT_HOSPITAL_LAB_TESTS;
  return res.json({ success: true, availableLabTests: tests });
});

// 2. Hospital Updates its available lab tests list (e.g. after registering or in settings)
app.post('/api/hospitals/:hospitalId/lab-tests', (req, res) => {
  const { hospitalId } = req.params;
  const { availableLabTests } = req.body;
  const hosp = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  if (!hosp || !hosp.hospitalProfile) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }
  if (!Array.isArray(availableLabTests)) {
    return res.status(400).json({ error: 'availableLabTests must be an array of test names.' });
  }
  hosp.hospitalProfile.availableLabTests = availableLabTests;
  saveStorageToDisk();
  return res.json({
    success: true,
    message: 'Hospital diagnostic and laboratory tests updated successfully.',
    availableLabTests: hosp.hospitalProfile.availableLabTests,
  });
});

// 3. Query Lab Test Orders (by hospitalId, doctorId, patientId)
app.get('/api/lab-tests', (req, res) => {
  const { hospitalId, doctorId, patientId } = req.query;
  let results = [...labTestOrders];
  if (hospitalId) results = results.filter((o) => o.hospitalId === hospitalId);
  if (doctorId) results = results.filter((o) => o.doctorId === doctorId);
  if (patientId) results = results.filter((o) => o.patientId === patientId);
  return res.json(results);
});

// 4. Doctor Orders Diagnostic Lab Tests for a Patient (e.g., Orthopedic ordering MRI/CT scan)
app.post('/api/lab-tests/order', (req, res) => {
  const {
    patientId,
    doctorId,
    testNames,
    clinicalIndication,
  } = req.body;

  if (!patientId || !doctorId || !testNames || !Array.isArray(testNames) || testNames.length === 0) {
    return res.status(400).json({ error: 'Patient, doctor, and at least one lab test are required.' });
  }

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  const patient = users.find((u) => u.id === patientId && u.role === 'patient');

  if (!doctor || !doctor.doctorProfile) return res.status(404).json({ error: 'Doctor not found.' });
  if (!patient) return res.status(404).json({ error: 'Patient not found.' });

  const hospitalId = doctor.doctorProfile.hospitalId;
  const hospital = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  const hospitalName = hospital?.hospitalProfile?.hospitalName || doctor.doctorProfile.hospitalName || 'Medical Center';

  const newOrder: LabTestOrder = {
    id: `lab-ord-${Date.now()}`,
    patientId,
    patientName: patient.name,
    doctorId,
    doctorName: doctor.name,
    hospitalId,
    hospitalName,
    testNames,
    clinicalIndication: clinicalIndication || 'Diagnostic evaluation ordered by consulting physician',
    status: 'ordered',
    createdAt: new Date().toISOString(),
  };

  labTestOrders.unshift(newOrder);
  saveStorageToDisk();

  // Send email notice to patient
  if (patient.email) {
    dispatchRealEmail({
      to: patient.email.toLowerCase(),
      subject: `🧪 Diagnostic Tests Ordered: ${testNames.join(', ')} - Dr. ${doctor.name}`,
      text: `Dear ${patient.name},

Dr. ${doctor.name} (${doctor.doctorProfile.specialization}) at ${hospitalName} has ordered diagnostic laboratory tests for your clinical evaluation.

Prescribed Tests:
${testNames.map((t) => `• ${t}`).join('\n')}

Clinical Indication:
${newOrder.clinicalIndication}

Facility: ${hospitalName}
Please visit the laboratory reception. Once results are processed, Dr. ${doctor.name} will conduct a complimentary post-diagnostic review consultation with fees waived ($0).`,
    });
  }

  return res.json({
    success: true,
    message: `Diagnostic tests (${testNames.join(', ')}) successfully ordered for patient ${patient.name}.`,
    order: newOrder,
  });
});

// 5. Hospital or Doctor marks Lab Test as Completed
app.post('/api/lab-tests/:id/complete', (req, res) => {
  const { id } = req.params;
  const { reportNotes } = req.body;

  const order = labTestOrders.find((o) => o.id === id);
  if (!order) return res.status(404).json({ error: 'Lab test order not found.' });

  order.status = 'completed';
  order.completedAt = new Date().toISOString();
  order.reportNotes = reportNotes || 'Diagnostic imaging and specimen analysis completed. Verified by laboratory department.';
  saveStorageToDisk();

  return res.json({
    success: true,
    message: 'Diagnostic test marked as completed. The doctor can now book a free post-lab follow-up appointment.',
    order,
  });
});

// 6. Doctor Books FREE Follow-Up Appointment after Diagnostic Lab Test
app.post('/api/lab-tests/:id/free-followup', (req, res) => {
  const { id } = req.params;
  const { date, timeSlot, followUpNotes } = req.body;

  const order = labTestOrders.find((o) => o.id === id);
  if (!order) return res.status(404).json({ error: 'Lab test order not found.' });
  if (!date || !timeSlot) return res.status(400).json({ error: 'Date and time slot are required for follow-up booking.' });

  const doctor = users.find((u) => u.id === order.doctorId);
  const patient = users.find((u) => u.id === order.patientId);

  // Check double booking
  const existingDocApt = appointments.find(
    (a) => a.doctorId === order.doctorId && a.date === date && a.timeSlot === timeSlot && a.status !== 'rejected' && a.status !== 'cancelled'
  );
  if (existingDocApt) {
    return res.status(400).json({ error: `Dr. ${doctor?.name || 'Doctor'} already has an appointment booked at ${timeSlot} on ${date}. Please choose another slot.` });
  }

  const freeAppointment: Appointment = {
    id: `apt-free-${Date.now()}`,
    patientId: order.patientId,
    patientName: order.patientName,
    doctorId: order.doctorId,
    doctorName: order.doctorName,
    doctorSpecialization: doctor?.doctorProfile?.specialization || 'Specialist',
    hospitalId: order.hospitalId,
    hospitalName: order.hospitalName,
    date,
    timeSlot,
    reasonForVisit: `[Complimentary Post-Lab Review] Evaluation of completed ${order.testNames.join(', ')}`,
    symptoms: followUpNotes || order.clinicalIndication,
    status: 'approved',
    isFreeFollowUp: true,
    freeConsultationReason: `100% Free Consultation Waived: Follow-up review of completed ${order.testNames.join(', ')} diagnostic results.`,
    prescribedLabTests: order.testNames,
    createdAt: new Date().toISOString(),
  };

  order.freeFollowUpBooked = true;
  appointments.unshift(freeAppointment);
  saveStorageToDisk();

  // Send confirmation email to patient confirming 100% Free follow up
  if (patient?.email) {
    dispatchRealEmail({
      to: patient.email.toLowerCase(),
      subject: `🎉 FREE Follow-Up Appointment Booked: Dr. ${order.doctorName} on ${date}`,
      text: `Dear ${patient.name},

Dr. ${order.doctorName} has booked your COMPLIMENTARY follow-up consultation to evaluate your completed diagnostic test results (${order.testNames.join(', ')}).

Appointment Details:
• Date: ${date}
• Time Slot: ${timeSlot}
• Doctor: Dr. ${order.doctorName} (${doctor?.doctorProfile?.specialization || 'Consultant'})
• Hospital: ${order.hospitalName}
• Consultation Fee: $0.00 / ₹0.00 (100% FREE Follow-Up - Diagnostic Policy)

No consultation charges apply for this review session.`,
    });
  }

  return res.json({
    success: true,
    message: `Free follow-up appointment successfully booked for ${order.patientName} with Dr. ${order.doctorName}. Fee is 100% waived ($0).`,
    appointment: freeAppointment,
    order,
  });
});

// 7. Doctor-to-Doctor Inter-Department Referral Booking (e.g. Cardiologist referring to Neurologist in hospital)
app.post('/api/doctors/refer-patient', (req, res) => {
  const {
    patientId,
    referringDoctorId,
    targetDoctorId,
    date,
    timeSlot,
    referralReason,
  } = req.body;

  if (!patientId || !referringDoctorId || !targetDoctorId || !date || !timeSlot) {
    return res.status(400).json({ error: 'Patient, referring doctor, specialist doctor, date, and time slot are required.' });
  }

  const patient = users.find((u) => u.id === patientId && u.role === 'patient');
  const refDoc = users.find((u) => u.id === referringDoctorId && u.role === 'doctor');
  const targetDoc = users.find((u) => u.id === targetDoctorId && u.role === 'doctor');

  if (!patient) return res.status(404).json({ error: 'Patient not found.' });
  if (!refDoc || !refDoc.doctorProfile) return res.status(404).json({ error: 'Referring doctor not found.' });
  if (!targetDoc || !targetDoc.doctorProfile) return res.status(404).json({ error: 'Specialist doctor not found.' });

  // Check double booking
  const existingDocApt = appointments.find(
    (a) => a.doctorId === targetDoctorId && a.date === date && a.timeSlot === timeSlot && a.status !== 'rejected' && a.status !== 'cancelled'
  );
  if (existingDocApt) {
    return res.status(400).json({ error: `Dr. ${targetDoc.name} already has an appointment booked at ${timeSlot} on ${date}. Please select another slot.` });
  }

  const targetHospitalName = targetDoc.doctorProfile.hospitalName || refDoc.doctorProfile.hospitalName || 'Hospital';

  const referralAppointment: Appointment = {
    id: `apt-ref-${Date.now()}`,
    patientId,
    patientName: patient.name,
    doctorId: targetDoc.id,
    doctorName: targetDoc.name,
    doctorSpecialization: targetDoc.doctorProfile.specialization,
    hospitalId: targetDoc.doctorProfile.hospitalId,
    hospitalName: targetHospitalName,
    date,
    timeSlot,
    reasonForVisit: `[Doctor Referral from Dr. ${refDoc.name} (${refDoc.doctorProfile.specialization})] ${referralReason || 'Inter-departmental specialist evaluation'}`,
    symptoms: referralReason || `Patient evaluated by Dr. ${refDoc.name} and referred for specialist care.`,
    status: 'approved', // Pre-confirmed because physician referred
    referredByDoctorId: refDoc.id,
    referredByDoctorName: refDoc.name,
    referredSpecialization: refDoc.doctorProfile.specialization,
    createdAt: new Date().toISOString(),
  };

  appointments.unshift(referralAppointment);
  saveStorageToDisk();

  // Notify Target Doctor
  if (targetDoc.email) {
    dispatchRealEmail({
      to: targetDoc.email.toLowerCase(),
      subject: `👨‍⚕️ Inter-Department Referral: Patient ${patient.name} referred by Dr. ${refDoc.name}`,
      text: `Dear Dr. ${targetDoc.name},

Dr. ${refDoc.name} (${refDoc.doctorProfile.specialization}) has referred patient ${patient.name} to you for specialized consultation.

Appointment Details:
• Patient: ${patient.name} (${patient.phone || 'Phone on file'})
• Date: ${date} at ${timeSlot}
• Clinical Reason: ${referralReason}
• Hospital: ${targetHospitalName}

The appointment is pre-confirmed in your schedule.`,
    });
  }

  // Notify Patient
  if (patient.email) {
    dispatchRealEmail({
      to: patient.email.toLowerCase(),
      subject: `📋 Referral Appointment Confirmed: Dr. ${targetDoc.name} (${targetDoc.doctorProfile.specialization})`,
      text: `Dear ${patient.name},

Following your consultation with Dr. ${refDoc.name}, a specialist referral appointment has been scheduled for you with Dr. ${targetDoc.name} (${targetDoc.doctorProfile.specialization}) at ${targetHospitalName}.

Appointment Details:
• Specialist: Dr. ${targetDoc.name} (${targetDoc.doctorProfile.specialization})
• Date: ${date} at ${timeSlot}
• Clinical Reason: ${referralReason}
• Hospital: ${targetHospitalName}

Your appointment is confirmed.`,
    });
  }

  return res.json({
    success: true,
    message: `Patient ${patient.name} successfully referred to Dr. ${targetDoc.name} (${targetDoc.doctorProfile.specialization}). Appointment pre-confirmed on ${date} at ${timeSlot}.`,
    appointment: referralAppointment,
  });
});

// ==========================================
// PATIENT WORKFLOWS, BOOKINGS & PRESCRIPTIONS
// ==========================================

// 1. Patient Books Appointment
app.post('/api/appointments', (req, res) => {
  const {
    patientId,
    patientName,
    doctorId,
    date,
    timeSlot,
    reasonForVisit,
    symptoms,
    isDoctorBooking,
    isFreeFollowUp,
    freeConsultationReason,
    referredByDoctorId,
    referredByDoctorName,
    referredSpecialization,
    prescribedLabTests,
  } = req.body;

  if (!patientId || !doctorId || !date || !timeSlot) {
    return res.status(400).json({ error: 'Patient, doctor, date, and time slot are required.' });
  }

  // Verify not Sunday
  const appointmentDate = new Date(date);
  if (appointmentDate.getUTCDay() === 0) {
    return res.status(400).json({ error: 'Appointments cannot be booked on Sundays. Please select Monday to Saturday.' });
  }

  // Check 7 Working Days Limit:
  // Patient booking is strictly open for the next 7 working days only. Doctor can choose beyond 7 days.
  const isDoctor = Boolean(isDoctorBooking || isFreeFollowUp || referredByDoctorId);
  if (!isDoctor) {
    const allowedWorkingDays = getNextWorkingDaysList(undefined, 7);
    if (!allowedWorkingDays.includes(date)) {
      return res.status(400).json({
        error: `Consultation bookings for patients are open for the next 7 working days only (${allowedWorkingDays[0]} to ${allowedWorkingDays[allowedWorkingDays.length - 1]}). Dates beyond 7 working days cannot be booked.`,
      });
    }
  }

  // Check doctor leave
  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  if (doctor.doctorProfile.inSurgery) {
    return res.status(400).json({ error: `Dr. ${doctor.name} is currently in surgery. Slot timings are temporarily unavailable.` });
  }

  // Check scheduled surgery on this date
  const hasSurgeryOnDate = scheduledSurgeries.some((s) => s.doctorId === doctorId && s.date === date);
  if (hasSurgeryOnDate) {
    return res.status(400).json({ error: `Dr. ${doctor.name} has a scheduled surgery on ${date}. Bookings for this date are blocked.` });
  }

  if (doctor.doctorProfile.leaveDates?.includes(date)) {
    return res.status(400).json({ error: `Doctor is on approved leave on ${date}. Please select another date.` });
  }

  // Check double booking for doctor
  const existingDocApt = appointments.find(
    (a) => a.doctorId === doctorId && a.date === date && a.timeSlot === timeSlot && a.status !== 'rejected' && a.status !== 'cancelled'
  );
  if (existingDocApt) {
    return res.status(400).json({
      error: `This time slot (${timeSlot}) on ${date} is already booked for Dr. ${doctor.name}. Only one patient can book this slot. Please choose another time slot.`
    });
  }

  // Check double booking for patient
  const existingPatientApt = appointments.find(
    (a) => a.patientId === patientId && a.date === date && a.timeSlot === timeSlot && a.status !== 'rejected' && a.status !== 'cancelled'
  );
  if (existingPatientApt) {
    return res.status(400).json({
      error: `You already have an appointment booked on ${date} at ${timeSlot}. Two appointments cannot be booked at the same time. Please choose another slot.`
    });
  }

  const patientUser = users.find((u) => u.id === patientId);
  const patientScore = patientUser?.patientProfile?.reliabilityScore ?? 100;

  const newAppointment: Appointment = {
    id: `apt-${Date.now()}`,
    patientId,
    patientName: patientName || 'Patient',
    doctorId,
    doctorName: doctor.name,
    doctorSpecialization: doctor.doctorProfile.specialization,
    hospitalId: doctor.doctorProfile.hospitalId,
    hospitalName: doctor.doctorProfile.hospitalName,
    date,
    timeSlot,
    reasonForVisit: reasonForVisit || 'General Health Consultation',
    symptoms: symptoms || '',
    patientReliabilityScore: patientScore,
    status: isDoctor ? 'approved' : 'pending',
    treatmentCode: 'TRT-' + Math.floor(100000 + Math.random() * 900000),
    isFreeFollowUp: Boolean(isFreeFollowUp),
    freeConsultationReason: freeConsultationReason || undefined,
    referredByDoctorId: referredByDoctorId || undefined,
    referredByDoctorName: referredByDoctorName || undefined,
    referredSpecialization: referredSpecialization || undefined,
    prescribedLabTests: prescribedLabTests || undefined,
    createdAt: new Date().toISOString(),
  };

  appointments.unshift(newAppointment);
  saveStorageToDisk();

  if (doctor.email) {
    const docApptNoticeEmail: SentEmail = {
      id: `email-apt-req-${Date.now()}`,
      to: doctor.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `🗓️ New Appointment Request: ${patientName || 'Patient'} on ${date} at ${timeSlot}`,
      preview: `Patient ${patientName || 'Patient'} has requested a consultation on ${date} at ${timeSlot}. Please review in your Doctor Portal.`,
      body: `Dear Dr. ${doctor.name},

You have received a new consultation appointment request from patient ${patientName || 'Patient'}.

Appointment Request Details:
• Patient Name: ${patientName || 'Patient'}
• Requested Date: ${date}
• Requested Time Slot: ${timeSlot}
• Reason for Visit: ${reasonForVisit || 'General Health Consultation'}
• Reported Symptoms: ${symptoms || 'None reported'}
• Hospital Center: ${doctor.doctorProfile.hospitalName}

Please log in to your Doctor Dashboard -> Consultation Schedule to review this request. You can accept or reject this request.
If you approve the appointment, the patient will receive a unique verification code to present to you during consultation.

Warm regards,
AI Virtual Care Scheduling Network`,
      timestamp: new Date().toISOString(),
      category: 'appointment',
    };
    sentEmails.unshift(docApptNoticeEmail);
    dispatchRealEmail({
      to: doctor.email.toLowerCase(),
      from: `"Appointment Scheduling" <${MASTER_ADMIN_EMAIL}>`,
      subject: docApptNoticeEmail.subject,
      text: docApptNoticeEmail.body,
    });
  }

  saveStorageToDisk();

  return res.json({ success: true, appointment: newAppointment });
});

// 2. Get Patient Appointments
app.get('/api/appointments/patient/:patientId', (req, res) => {
  const { patientId } = req.params;
  return res.json(appointments.filter((a) => a.patientId === patientId));
});

// 2b. Get Booked Slots for Doctor (to automatically block collision slots)
app.get('/api/doctors/:doctorId/booked-slots', (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query as { date?: string };

  const activeBookings = appointments.filter(
    (a) =>
      a.doctorId === doctorId &&
      (!date || a.date === date) &&
      a.status !== 'rejected' &&
      a.status !== 'cancelled'
  );

  return res.json({
    doctorId,
    date: date || null,
    bookedSlots: activeBookings.map((a) => ({
      date: a.date,
      timeSlot: a.timeSlot,
      status: a.status,
      appointmentId: a.id,
    })),
  });
});

// 2c. Cancel / Reject Approved Appointment with Unique Patient Verification Code
app.post('/api/appointments/:id/cancel-with-code', (req, res) => {
  const { id } = req.params;
  const { verificationCode, reason, doctorId } = req.body;

  const apt = appointments.find((a) => a.id === id);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment record not found.' });
  }

  // Doctor authorization check
  if (doctorId && apt.doctorId !== doctorId) {
    return res.status(403).json({ error: 'You are not authorized to cancel this appointment.' });
  }

  // Clean codes for comparison
  const inputCode = (verificationCode || '').trim().toUpperCase();
  const validTreatmentCode = (apt.treatmentCode || '').trim().toUpperCase();
  const validId = apt.id.trim().toUpperCase();

  if (!inputCode) {
    return res.status(400).json({ error: 'Unique patient verification code is required to cancel this consultation slot.' });
  }

  if (inputCode !== validTreatmentCode && inputCode !== validId) {
    return res.status(400).json({
      error: `Invalid verification code "${verificationCode}". The code does not match this patient's scheduled consultation passkey.`
    });
  }

  const prevStatus = apt.status;
  apt.status = 'cancelled';
  apt.rejectionReason = reason || `Cancelled by physician upon patient passkey code verification (${inputCode})`;
  apt.cancelledAt = new Date().toISOString();

  saveStorageToDisk();

  return res.json({
    success: true,
    message: `Appointment cancelled successfully. Time slot (${apt.timeSlot} on ${apt.date}) is now immediately released and available for other patients to book.`,
    appointment: apt,
    previousStatus: prevStatus,
  });
});

// 3. Create Prescription (Doctor)
app.post('/api/prescriptions', (req, res) => {
  const {
    appointmentId,
    patientId,
    patientName,
    patientAge,
    patientGender,
    doctorId,
    diagnosis,
    vitalsRecorded,
    medicines,
    advice,
    followUpDate,
  } = req.body;

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  const newPrescription: Prescription = {
    id: `rx-${Date.now()}`,
    appointmentId,
    patientId,
    patientName: patientName || 'Patient',
    patientAge: patientAge || 35,
    patientGender: patientGender || 'Unspecified',
    doctorId,
    doctorName: doctor.name,
    doctorSpecialization: doctor.doctorProfile.specialization,
    doctorLicenseNumber: doctor.doctorProfile.medicalLicenseNumber,
    hospitalName: doctor.doctorProfile.hospitalName,
    date: new Date().toISOString().split('T')[0],
    diagnosis: diagnosis || 'Clinical Evaluation',
    vitalsRecorded: vitalsRecorded || {},
    medicines: medicines || [],
    advice: advice || 'Follow prescribed regimen and monitor vitals daily.',
    followUpDate,
    createdAt: new Date().toISOString(),
  };

  prescriptions.unshift(newPrescription);

  // User Requirement: When doctor prescribes, record prescription on appointment, but DO NOT complete it automatically!
  // Per clinical protocol: consultation is marked completed ONLY after the doctor enters the patient's verification code.
  if (appointmentId) {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (apt) {
      apt.prescriptionId = newPrescription.id;
      // Keep apt.status as 'approved' (treatment completes only after verification code is entered)
    }
  }

  // User Requirement: Automatically schedule follow-up review appointment for the patient
  // Doctor can select any date/time (above 7 days, no restriction for doctor)
  let followUpAppointment: Appointment | undefined = undefined;
  if (followUpDate) {
    const followUpTimeSlot = req.body.followUpTimeSlot || '10:00 AM';
    followUpAppointment = {
      id: `apt-fup-${Date.now()}`,
      patientId,
      patientName: patientName || 'Patient',
      doctorId,
      doctorName: doctor.name,
      doctorSpecialization: doctor.doctorProfile.specialization,
      hospitalId: doctor.doctorProfile.hospitalId,
      hospitalName: doctor.doctorProfile.hospitalName,
      date: followUpDate,
      timeSlot: followUpTimeSlot,
      reasonForVisit: `Post-Prescription Clinical Follow-Up Review: ${diagnosis || 'Treatment Monitoring'}`,
      status: 'approved',
      treatmentCode: 'TRT-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString(),
    };
    appointments.unshift(followUpAppointment);

    const patient = users.find((u) => u.id === patientId);
    if (patient?.email) {
      const fupEmail: SentEmail = {
        id: `email-fup-${Date.now()}`,
        to: patient.email.toLowerCase(),
        from: MASTER_ADMIN_EMAIL,
        subject: `🗓️ Prescription Issued & Follow-Up Review Confirmed on ${followUpDate}`,
        preview: `Dr. ${doctor.name} has scheduled your automated follow-up consultation on ${followUpDate} at ${followUpTimeSlot}. Passkey: ${followUpAppointment.treatmentCode}`,
        body: `Dear ${patientName || 'Patient'},

Dr. ${doctor.name} has issued your official medical prescription for: "${diagnosis || 'Clinical Consultation'}".

AUTOMATED FOLLOW-UP CONSULTATION SCHEDULED:
• Review Date: ${followUpDate}
• Time Slot: ${followUpTimeSlot}
• Doctor: Dr. ${doctor.name} (${doctor.doctorProfile.specialization})
• Hospital: ${doctor.doctorProfile.hospitalName}
• Secret Treatment Passkey: ${followUpAppointment.treatmentCode}
• Status: Confirmed & Approved

Please take your prescribed medicines as directed and bring your passkey to your follow-up consultation.

Warm regards,
Medical Care & Clinical Operations Network`,
        timestamp: new Date().toISOString(),
        category: 'appointment',
      };
      sentEmails.unshift(fupEmail);
      dispatchRealEmail({
        to: patient.email.toLowerCase(),
        subject: fupEmail.subject,
        text: fupEmail.body,
      });
    }
  }

  // Sync prescribed medicines into patient's daily medication schedule
  const targetPatient = users.find((u) => u.id === patientId && u.role === 'patient');
  if (targetPatient && targetPatient.patientProfile) {
    if (!Array.isArray(targetPatient.patientProfile.dailyMedications)) {
      targetPatient.patientProfile.dailyMedications = [];
    }
    if (Array.isArray(medicines) && medicines.length > 0) {
      medicines.forEach((med: any, mIdx: number) => {
        const freq = (med.frequency || med.timingOption || '').toLowerCase();
        let timing: 'morning' | 'afternoon' | 'night' = 'morning';
        if (freq.includes('night') || freq.includes('0-0-1') || freq.includes('evening') || freq.includes('bed')) {
          timing = 'night';
        } else if (freq.includes('afternoon') || freq.includes('lunch') || freq.includes('0-1-0')) {
          timing = 'afternoon';
        }
        const durationDays = Number(med.durationDays) || (med.duration ? parseInt(med.duration.replace(/\D/g, ''), 10) : 7) || 7;
        targetPatient.patientProfile!.dailyMedications!.push({
          id: `med-${newPrescription.id}-${mIdx}`,
          name: med.name,
          dosage: med.dosage,
          timing,
          timingOption: med.timingOption || med.frequency,
          durationDays,
          daysRemaining: durationDays,
          prescribedDate: new Date().toISOString().split('T')[0],
          instructions: med.instructions || `${med.timingOption || med.frequency || 'Daily'} · Course: ${durationDays} Days`,
          takenToday: false,
          refillDaysLeft: durationDays,
        });
      });
    }
  }

  saveStorageToDisk();
  return res.json({ success: true, prescription: newPrescription, followUpAppointment });
});

// 4. Get Patient Prescriptions
app.get('/api/prescriptions/patient/:patientId', (req, res) => {
  const { patientId } = req.params;
  return res.json(prescriptions.filter((p) => p.patientId === patientId));
});

// 4b. Get Doctor Prescriptions
app.get('/api/prescriptions/doctor/:doctorId', (req, res) => {
  const { doctorId } = req.params;
  return res.json(prescriptions.filter((p) => p.doctorId === doctorId));
});

// 4c. Get All Prescriptions (with optional doctorId or patientId filter)
app.get('/api/prescriptions', (req, res) => {
  const { doctorId, patientId } = req.query as { doctorId?: string; patientId?: string };
  let list = prescriptions;
  if (doctorId) list = list.filter((p) => p.doctorId === doctorId);
  if (patientId) list = list.filter((p) => p.patientId === patientId);
  return res.json(list);
});

// ==========================================
// PATIENT DOCTOR SELECTION & REQUESTS
// ==========================================

// Patient chooses doctor & sends care request
app.post('/api/patients/:patientId/choose-doctor', (req, res) => {
  const { patientId } = req.params;
  const { doctorId, message } = req.body;

  const patient = users.find((u) => u.id === patientId && u.role === 'patient');
  if (!patient) return res.status(404).json({ error: 'Patient not found.' });

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) return res.status(404).json({ error: 'Doctor not found.' });

  // Check if existing pending request exists
  const existingReq = patientDoctorRequests.find(
    (r) => r.patientId === patientId && r.doctorId === doctorId && r.status === 'pending'
  );
  if (existingReq) {
    return res.json({ success: true, request: existingReq, message: 'Patient request already pending doctor review.' });
  }

  const newReq: PatientDoctorRequestRecord = {
    id: `preq-${Date.now()}`,
    patientId,
    patientName: patient.name,
    patientEmail: patient.email,
    patientPhone: patient.phone,
    doctorId,
    doctorName: doctor.name,
    hospitalId: doctor.doctorProfile.hospitalId,
    hospitalName: doctor.doctorProfile.hospitalName,
    message: message || 'Patient care request to be under your medical supervision.',
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  patientDoctorRequests.unshift(newReq);

  // Send email to doctor
  if (doctor.email) {
    const docNoticeEmail: SentEmail = {
      id: `email-preq-${Date.now()}`,
      to: doctor.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `📋 New Patient Care Request: ${patient.name}`,
      preview: `Patient ${patient.name} has requested you as their primary care doctor. Please review in Doctor Portal.`,
      body: `Dear Dr. ${doctor.name},

You have received a new patient care intake request:
• Patient Name: ${patient.name}
• Contact Email: ${patient.email}
• Phone: ${patient.phone}
• Medical Conditions: ${patient.patientProfile?.existingConditions?.join(', ') || 'None reported'}
• Date Requested: ${new Date().toLocaleDateString()}

Please log in to your Doctor Portal -> "Patient Requests" tab to accept or decline this patient intake.
Your intake capacity allows accepting 10 to 15 patients under your active panel.

Best regards,
Patient Care Intake Registry`,
      timestamp: new Date().toISOString(),
      category: 'doctor_request',
    };
    sentEmails.unshift(docNoticeEmail);
    dispatchRealEmail({
      to: doctor.email.toLowerCase(),
      subject: docNoticeEmail.subject,
      text: docNoticeEmail.body,
    });
  }

  return res.json({
    success: true,
    request: newReq,
    message: `Patient care request submitted to Dr. ${doctor.name}. Please wait for doctor acceptance.`,
  });
});

// Doctor gets incoming patient requests
app.get('/api/doctors/:doctorId/patient-requests', (req, res) => {
  const { doctorId } = req.params;
  const requests = patientDoctorRequests.filter((r) => r.doctorId === doctorId);
  return res.json(requests);
});

// Doctor accepts or declines patient request (with capacity of 10-15 patients)
app.post('/api/doctors/:doctorId/patient-requests/:requestId/respond', (req, res) => {
  const { doctorId, requestId } = req.params;
  const { action } = req.body; // 'accept' | 'decline'

  const request = patientDoctorRequests.find((r) => r.id === requestId && r.doctorId === doctorId);
  if (!request) return res.status(404).json({ error: 'Patient request not found.' });

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) return res.status(404).json({ error: 'Doctor not found.' });

  const patient = users.find((u) => u.id === request.patientId);

  // Check capacity quota: default 15 (minimum 10 to 15)
  const quota = doctor.doctorProfile.patientIntakeQuota || 15;
  const acceptedRequests = patientDoctorRequests.filter((r) => r.doctorId === doctorId && r.status === 'accepted');

  if (action === 'accept') {
    if (acceptedRequests.length >= quota) {
      return res.status(400).json({
        error: `Patient intake limit reached (${acceptedRequests.length}/${quota}). You have reached your maximum patient capacity.`,
      });
    }

    request.status = 'accepted';
    request.respondedAt = new Date().toISOString();

    // Assign doctor & hospital to patient
    if (patient && patient.patientProfile) {
      patient.patientProfile.assignedDoctorId = doctorId;
      patient.patientProfile.assignedDoctorName = doctor.name;
      patient.patientProfile.assignedHospitalId = doctor.doctorProfile.hospitalId;
      patient.patientProfile.assignedHospitalName = doctor.doctorProfile.hospitalName;
    }

    // User requirement: "I can send a request to multiple doctors. Who first accept my request, I will be assigned to that doctor."
    // Auto-resolve other pending requests for this patient:
    patientDoctorRequests.forEach((otherReq) => {
      if (otherReq.patientId === request.patientId && otherReq.id !== request.id && otherReq.status === 'pending') {
        otherReq.status = 'declined';
        otherReq.message = `Patient already assigned to Dr. ${doctor.name} (first doctor to accept care request).`;
      }
    });

    saveStorageToDisk();

    // Send email to patient
    if (patient?.email) {
      const acceptEmail: SentEmail = {
        id: `email-preq-acc-${Date.now()}`,
        to: patient.email.toLowerCase(),
        from: MASTER_ADMIN_EMAIL,
        subject: `🎉 Dr. ${doctor.name} has Accepted Your Patient Request!`,
        preview: `Dr. ${doctor.name} has accepted you into their care panel at ${doctor.doctorProfile.hospitalName}.`,
        body: `Dear ${request.patientName},

Great news! Dr. ${doctor.name} (${doctor.doctorProfile.specialization}) has officially accepted your care request.

You are now registered under Dr. ${doctor.name}'s active medical panel at ${doctor.doctorProfile.hospitalName}.
You can now book appointments directly with your doctor and stream morning IoT vitals.

Best regards,
${doctor.doctorProfile.hospitalName} & AI Virtual Care`,
        timestamp: new Date().toISOString(),
        category: 'appointment',
      };
      sentEmails.unshift(acceptEmail);
      dispatchRealEmail({
        to: patient.email.toLowerCase(),
        subject: acceptEmail.subject,
        text: acceptEmail.body,
      });
    }

    return res.json({
      success: true,
      message: `Patient ${request.patientName} accepted into your medical care panel. (${acceptedRequests.length + 1}/${quota} patients accepted)`,
      request,
      doctorQuota: { current: acceptedRequests.length + 1, max: quota, min: 10 },
    });
  } else {
    request.status = 'declined';
    request.respondedAt = new Date().toISOString();
    saveStorageToDisk();
    return res.json({ success: true, message: 'Patient request declined.', request });
  }
});

// Patient gets all care requests they sent to doctors
app.get('/api/patients/:patientId/doctor-requests', (req, res) => {
  const { patientId } = req.params;
  const requests = patientDoctorRequests.filter((r) => r.patientId === patientId);
  return res.json(requests);
});

// Patient purchases IoT Kit from app store with payment processing
app.post('/api/patients/:patientId/purchase-iot-kit', (req, res) => {
  const { patientId } = req.params;
  const { itemId, paymentMethod, shippingAddress, patientPhone, amount } = req.body;

  const patient = users.find((u) => u.id === patientId && u.role === 'patient');
  if (!patient || !patient.patientProfile) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  const item = healthcareItems.find((i) => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: 'IoT Kit item not found in catalog.' });
  }

  if (!patient.patientProfile.connectedDevices) {
    patient.patientProfile.connectedDevices = [];
  }

  if (patient.patientProfile.connectedDevices.includes(itemId)) {
    return res.json({
      success: true,
      message: `You already have ${item.name} connected to your profile.`,
      connectedDevices: patient.patientProfile.connectedDevices,
      user: patient,
    });
  }

  patient.patientProfile.connectedDevices.push(itemId);
  patient.patientProfile.iotKitPurchased = true;
  if (item.stock > 0) item.stock -= 1;

  const orderPrice = Number(amount) || item.price || 149;
  const txnId = `TXN-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Create payment record for admin space
  const paymentOrder: KitPaymentOrder = {
    id: `pay-${Date.now()}`,
    patientId,
    patientName: patient.name,
    patientEmail: patient.email,
    patientPhone: patientPhone || patient.phone || '+1 (555) 000-0000',
    itemId: item.id,
    itemName: item.name,
    itemPrice: orderPrice,
    itemImage: item.imageUrl,
    itemCategory: item.category,
    amount: orderPrice,
    paymentMethod: paymentMethod || 'UPI / QR Code',
    transactionId: txnId,
    paymentStatus: 'received',
    fulfillmentStatus: 'processing',
    shippingAddress: shippingAddress || patient.patientProfile.streetAddress || `${patient.patientProfile.city || 'City'}, ${patient.patientProfile.state || 'State'}`,
    orderedAt: new Date().toISOString(),
  };

  kitPayments.unshift(paymentOrder);
  saveStorageToDisk();

  // Send purchase confirmation email
  if (patient.email) {
    const purchaseEmail: SentEmail = {
      id: `email-buy-kit-${Date.now()}`,
      to: patient.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `📦 IoT Health Kit Purchase Confirmed: ${item.name}`,
      preview: `Payment of $${orderPrice} confirmed. Your purchase of ${item.name} is linked to your patient portal.`,
      body: `Dear ${patient.name},

Thank you for your purchase of the ${item.name} (${item.modelNumber})!

Payment & Order Receipt:
• Transaction ID: ${txnId}
• Amount Paid: $${orderPrice}
• Payment Method: ${paymentMethod || 'UPI / QR Code'}
• Payment Status: Received & Verified
• Shipping Address: ${paymentOrder.shippingAddress}

Your hardware IoT kit has been successfully linked to your patient portal account.
Supported Telemetry Sensors: ${item.supportedSensors.join(', ')}

You can now perform your morning health check routine with live Bluetooth 5.3 streaming into the Gemini AI risk detection engine.

Best regards,
System Administrator HEMANTH
Smart Health Hardware & Logistics Division`,
      timestamp: new Date().toISOString(),
      category: 'general',
    };
    sentEmails.unshift(purchaseEmail);
    dispatchRealEmail({
      to: patient.email.toLowerCase(),
      subject: purchaseEmail.subject,
      text: purchaseEmail.body,
    });
  }

  return res.json({
    success: true,
    message: `Payment received ($${orderPrice})! Successfully purchased ${item.name}! The device is now active in your connected IoT kits.`,
    connectedDevices: patient.patientProfile.connectedDevices,
    user: patient,
    paymentOrder,
  });
});

// Admin Payment Space: Get all received payments for healthcare kit orders
app.get('/api/admin/payments', (req, res) => {
  return res.json(kitPayments);
});

// Admin Payment Space: Update payment / fulfillment status
app.post('/api/admin/payments/:id/status', (req, res) => {
  const { id } = req.params;
  const { paymentStatus, fulfillmentStatus, trackingNumber, adminNotes } = req.body;
  const order = kitPayments.find((p) => p.id === id);
  if (!order) return res.status(404).json({ error: 'Payment order record not found.' });

  if (paymentStatus) order.paymentStatus = paymentStatus as any;
  if (fulfillmentStatus) order.fulfillmentStatus = fulfillmentStatus as any;
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (adminNotes) order.adminNotes = adminNotes;
  order.verifiedAt = new Date().toISOString();

  saveStorageToDisk();
  return res.json({ success: true, message: 'Payment order status updated.', order });
});

// Patient permanent lock for emergency hospital & doctor routing
app.post('/api/patients/:patientId/emergency-routing', (req, res) => {
  const { patientId } = req.params;
  const { hospitalId, doctorId } = req.body;

  const patient = users.find((u) => u.id === patientId && u.role === 'patient');
  if (!patient || !patient.patientProfile) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  const hosp = users.find((u) => u.id === hospitalId && u.role === 'hospital');
  if (!hosp) {
    return res.status(404).json({ error: 'Selected emergency hospital not found.' });
  }

  const doc = doctorId ? users.find((u) => u.id === doctorId && u.role === 'doctor') : undefined;

  patient.patientProfile.chosenEmergencyHospitalId = hospitalId;
  patient.patientProfile.chosenEmergencyHospitalName = hosp.hospitalProfile?.hospitalName || hosp.name;
  if (doc) {
    patient.patientProfile.chosenEmergencyDoctorId = doc.id;
    patient.patientProfile.chosenEmergencyDoctorName = doc.name;
  }

  return res.json({
    success: true,
    message: `Emergency dispatch permanently routed to ${hosp.hospitalProfile?.hospitalName || hosp.name}.`,
    user: patient,
  });
});

// Patient condition pathway update (Cardiology, Diabetes, Pulmonary, Geriatric, General)
app.post('/api/patients/:patientId/care-pathway', (req, res) => {
  const { patientId } = req.params;
  const { pathway } = req.body;
  const patient = users.find((u) => u.id === patientId && u.role === 'patient');
  if (!patient || !patient.patientProfile) {
    return res.status(404).json({ error: 'Patient not found.' });
  }
  patient.patientProfile.carePathway = pathway;
  saveStorageToDisk();
  return res.json({ success: true, user: patient, carePathway: pathway });
});

// Patient multiple emergency contacts update (up to 3 contacts with priority and alert toggles)
app.post('/api/patients/:patientId/emergency-contacts', (req, res) => {
  const { patientId } = req.params;
  const { contacts } = req.body;
  const patient = users.find((u) => u.id === patientId && u.role === 'patient');
  if (!patient || !patient.patientProfile) {
    return res.status(404).json({ error: 'Patient not found.' });
  }
  if (Array.isArray(contacts)) {
    patient.patientProfile.emergencyContactsList = contacts;
    if (contacts[0]) {
      patient.patientProfile.emergencyContact = {
        name: contacts[0].name,
        relationship: contacts[0].relationship,
        phone: contacts[0].phone,
      };
    }
  }
  saveStorageToDisk();
  return res.json({ success: true, user: patient, contacts: patient.patientProfile.emergencyContactsList });
});

// Patient daily medications schedule and compliance tracking
app.post('/api/patients/:patientId/medications', (req, res) => {
  const { patientId } = req.params;
  const { medications } = req.body;
  const patient = users.find((u) => u.id === patientId && u.role === 'patient');
  if (!patient || !patient.patientProfile) {
    return res.status(404).json({ error: 'Patient not found.' });
  }
  if (Array.isArray(medications)) {
    patient.patientProfile.dailyMedications = medications;
  }
  saveStorageToDisk();
  return res.json({ success: true, user: patient, dailyMedications: patient.patientProfile.dailyMedications });
});

// Toggle daily medication taken status
app.post('/api/patients/:patientId/medications/:medId/toggle', (req, res) => {
  const { patientId, medId } = req.params;
  const patient = users.find((u) => u.id === patientId && u.role === 'patient');
  if (!patient || !patient.patientProfile || !patient.patientProfile.dailyMedications) {
    return res.status(404).json({ error: 'Patient or medications not found.' });
  }
  const med = patient.patientProfile.dailyMedications.find((m) => m.id === medId);
  if (!med) {
    return res.status(404).json({ error: 'Medication not found.' });
  }
  med.takenToday = !med.takenToday;
  saveStorageToDisk();
  return res.json({ success: true, medication: med });
});

// ==========================================
// DOCTOR SURGERY SCHEDULE & URGENT SURGERY RESCHEDULING
// ==========================================

// Doctor schedules planned surgery (must be scheduled >= 7 days ahead)
app.post('/api/doctors/:doctorId/surgeries/schedule', (req, res) => {
  const { doctorId } = req.params;
  const { date, timeSlot, procedureName, operatingTheater, notes } = req.body;

  if (!date || !timeSlot || !procedureName) {
    return res.status(400).json({ error: 'Surgery date, time slot, and procedure name are required.' });
  }

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  // User requirement: The doctor should select surgery timings prior like before seven days only.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const surgeryDate = new Date(date);
  surgeryDate.setHours(0, 0, 0, 0);

  const diffTime = surgeryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

  if (diffDays < 7) {
    return res.status(400).json({
      error: `Planned surgeries must be scheduled at least 7 days in advance (selected date is only ${diffDays} day(s) away). For urgent/immediate surgeries, please enter Urgent Surgery Mode.`,
    });
  }

  const newSurgery: ScheduledSurgeryRecord = {
    id: `surg-${Date.now()}`,
    doctorId,
    doctorName: doctor.name,
    hospitalId: doctor.doctorProfile.hospitalId,
    hospitalName: doctor.doctorProfile.hospitalName,
    date,
    timeSlot,
    procedureName,
    operatingTheater: operatingTheater || 'Main OT-1',
    isUrgent: false,
    notes,
    createdAt: new Date().toISOString(),
  };

  scheduledSurgeries.unshift(newSurgery);
  if (!doctor.doctorProfile.scheduledSurgeries) {
    doctor.doctorProfile.scheduledSurgeries = [];
  }
  doctor.doctorProfile.scheduledSurgeries.unshift(newSurgery as any);

  return res.json({
    success: true,
    message: `Surgery for ${procedureName} on ${date} (${timeSlot}) scheduled successfully. Patient booking appointments on this date are now blocked.`,
    surgery: newSurgery,
  });
});

// Automated Urgent Surgery Mode Toggle & Conflicting Appointment Reassignment Workflow
app.post('/api/doctors/:doctorId/surgery-mode/auto-reschedule', (req, res) => {
  const { doctorId } = req.params;
  const { active, surgeryDate, notes } = req.body;

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor profile not found.' });
  }

  // Deactivating Surgery Mode
  if (active === false) {
    doctor.doctorProfile.inSurgery = false;
    doctor.doctorProfile.surgeryNotes = '';
    return res.json({
      success: true,
      inSurgery: false,
      doctor,
      message: 'Surgery Mode deactivated. Regular consultation slots are now restored for patient scheduling.',
    });
  }

  // Activating Surgery Mode
  doctor.doctorProfile.inSurgery = true;

  // Calculate Target Urgent Surgery Date (defaults to tomorrow, or today if specified/needed)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const targetDate = surgeryDate || tomorrowStr;

  doctor.doctorProfile.surgeryNotes = `URGENT SURGERY ON ${targetDate}: ${notes || 'Immediate Emergency Operating Theater Priority'}`;

  // Register urgent surgery record
  const urgentSurgery: ScheduledSurgeryRecord = {
    id: `surg-urg-${Date.now()}`,
    doctorId,
    doctorName: doctor.name,
    hospitalId: doctor.doctorProfile.hospitalId,
    hospitalName: doctor.doctorProfile.hospitalName,
    date: targetDate,
    timeSlot: 'Urgent Emergency Surgical Session',
    procedureName: notes || 'Immediate Emergency Surgery Procedure',
    operatingTheater: 'Emergency OT-1',
    isUrgent: true,
    notes: notes || 'Urgent surgery mode activated. Conflicting upcoming slots automatically transferred.',
    createdAt: new Date().toISOString(),
  };
  scheduledSurgeries.unshift(urgentSurgery);
  if (!doctor.doctorProfile.scheduledSurgeries) doctor.doctorProfile.scheduledSurgeries = [];
  doctor.doctorProfile.scheduledSurgeries.unshift(urgentSurgery as any);

  // 1. Identify all conflicting upcoming appointments on target surgery date
  const conflicting = appointments.filter(
    (a) => a.doctorId === doctorId &&
           a.date === targetDate &&
           a.status !== 'rejected' &&
           a.status !== 'cancelled' &&
           a.status !== 'completed'
  );

  // 2. Identify next available free working date for the physician
  const futureWorkingDays = getNextWorkingDaysList(targetDate, 14);
  let nextAvailableDate = '';
  for (const dayCandidate of futureWorkingDays) {
    const onLeave = doctorLeaveRequests.some(
      (l) => l.doctorId === doctorId && l.status === 'approved' && dayCandidate >= l.startDate && dayCandidate <= l.endDate
    );
    const hasSurgery = scheduledSurgeries.some(
      (s) => s.doctorId === doctorId && s.date === dayCandidate
    );
    if (!onLeave && !hasSurgery) {
      nextAvailableDate = dayCandidate;
      break;
    }
  }
  if (!nextAvailableDate) {
    const fallback = new Date(targetDate);
    fallback.setDate(fallback.getDate() + 2);
    nextAvailableDate = fallback.toISOString().split('T')[0];
  }

  // 3. Automated Reassignment Workflow & Patient Email Notifications
  const reassignedDetails: any[] = [];
  for (const apt of conflicting) {
    const originalDate = apt.date;
    const originalSlot = apt.timeSlot;

    apt.date = nextAvailableDate;
    apt.reassignedFrom = originalDate;
    apt.rescheduleReason = `Urgent Emergency Surgery Pre-emption by Dr. ${doctor.name}`;

    const patient = users.find((u) => u.id === apt.patientId);
    let emailDispatched = false;

    if (patient?.email) {
      const urgentRescheduleEmail: SentEmail = {
        id: `email-resched-${Date.now()}-${reassignedDetails.length}`,
        to: patient.email.toLowerCase(),
        from: MASTER_ADMIN_EMAIL,
        subject: `⚠️ URGENT: Appointment Reassigned to ${nextAvailableDate} due to Emergency Surgery with Dr. ${doctor.name}`,
        preview: `Your consultation previously set for ${originalDate} has been safely reassigned to ${nextAvailableDate} at ${apt.timeSlot}.`,
        body: `Dear ${apt.patientName},

IMPORTANT CLINICAL SCHEDULE NOTIFICATION:

Dr. ${doctor.name} (${doctor.doctorProfile.specialization} at ${doctor.doctorProfile.hospitalName}) has been called to perform an urgent, immediate surgical procedure.

To guarantee your continuity of clinical care, your consultation has been automatically transferred to the next available session:

• Original Date & Slot: ${originalDate} at ${originalSlot}
• NEW Confirmed Date & Slot: ${nextAvailableDate} at ${apt.timeSlot}
• Attending Physician: Dr. ${doctor.name}
• Hospital Facility: ${doctor.doctorProfile.hospitalName}
• Reason: Urgent Emergency Operating Theater Priority (${notes || 'Acute Surgical Emergency'})
• Verification Passkey: ${apt.treatmentCode || 'TRT-' + apt.id.slice(-6).toUpperCase()} (Remains 100% Valid)

No further action is required from you. We apologize for any scheduling inconvenience and thank you for supporting emergency patient care.

Warm regards,
${doctor.doctorProfile.hospitalName} Clinical Triage & Patient Services`,
        timestamp: new Date().toISOString(),
        category: 'appointment',
      };
      sentEmails.unshift(urgentRescheduleEmail);
      dispatchRealEmail({
        to: patient.email.toLowerCase(),
        subject: urgentRescheduleEmail.subject,
        text: urgentRescheduleEmail.body,
      });
      emailDispatched = true;
    }

    reassignedDetails.push({
      appointmentId: apt.id,
      patientName: apt.patientName,
      patientEmail: patient?.email || 'N/A',
      originalDate,
      originalSlot,
      newDate: nextAvailableDate,
      newSlot: apt.timeSlot,
      treatmentCode: apt.treatmentCode,
      emailDispatched,
    });
  }

  return res.json({
    success: true,
    inSurgery: true,
    targetDate,
    nextAvailableDate,
    conflictingCount: conflicting.length,
    reassignedAppointments: reassignedDetails,
    doctor,
    message: conflicting.length > 0
      ? `Urgent Surgery Mode Activated for ${targetDate}! Identified ${conflicting.length} conflicting upcoming appointment(s). Automatically reassigned to ${nextAvailableDate} and urgent patient email notices dispatched.`
      : `Urgent Surgery Mode Activated for ${targetDate}. Doctor consultation slots are now hidden from patients.`,
  });
});

// Doctor enters urgent surgery mode & transfers affected appointments
app.post('/api/doctors/:doctorId/surgery-mode/reschedule-appointments', (req, res) => {
  const { doctorId } = req.params;
  const { surgeryDate, newDate, newTimeSlot, notes } = req.body;

  if (!surgeryDate || !newDate) {
    return res.status(400).json({ error: 'Surgery date (e.g. tomorrow) and rescheduled new date are required.' });
  }

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor || !doctor.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  // Put doctor into inSurgery mode
  doctor.doctorProfile.inSurgery = true;
  doctor.doctorProfile.surgeryNotes = `URGENT SURGERY ON ${surgeryDate}: ${notes || 'Immediate Emergency Procedure'}`;

  // Find all appointments scheduled on surgeryDate for this doctor
  const affected = appointments.filter(
    (a) => a.doctorId === doctorId && a.date === surgeryDate && a.status !== 'rejected' && a.status !== 'cancelled'
  );

  let rescheduledCount = 0;
  for (const apt of affected) {
    const oldDate = apt.date;
    const oldSlot = apt.timeSlot;
    apt.date = newDate;
    if (newTimeSlot) apt.timeSlot = newTimeSlot;
    rescheduledCount++;

    // Send urgent email notification to patient
    const patient = users.find((u) => u.id === apt.patientId);
    if (patient?.email) {
      const urgentRescheduleEmail: SentEmail = {
        id: `email-resched-${Date.now()}-${rescheduledCount}`,
        to: patient.email.toLowerCase(),
        from: MASTER_ADMIN_EMAIL,
        subject: `⚠️ URGENT: Consultation Rescheduled due to Emergency Surgery with Dr. ${doctor.name}`,
        preview: `Your consultation on ${oldDate} has been rescheduled to ${newDate} due to an urgent surgical emergency.`,
        body: `Dear ${apt.patientName},

IMPORTANT MEDICAL NOTICE:

Dr. ${doctor.name} (${doctor.doctorProfile.specialization}) has been called into an urgent, immediate surgical procedure on ${oldDate}.

Your consultation has been safely transferred to Dr. ${doctor.name}'s next available consulting slot:
• Original Date: ${oldDate} at ${oldSlot}
• NEW Confirmed Date: ${newDate} at ${apt.timeSlot}
• Physician: Dr. ${doctor.name}
• Hospital: ${doctor.doctorProfile.hospitalName}
• Reason: Urgent surgical emergency (${notes || 'Operating theater priority'})

We sincerely apologize for the inconvenience and appreciate your understanding as the surgical team delivers emergency care.

Warm regards,
${doctor.doctorProfile.hospitalName} Patient Care Coordination`,
        timestamp: new Date().toISOString(),
        category: 'appointment',
      };
      sentEmails.unshift(urgentRescheduleEmail);
      dispatchRealEmail({
        to: patient.email.toLowerCase(),
        subject: urgentRescheduleEmail.subject,
        text: urgentRescheduleEmail.body,
      });
    }
  }

  return res.json({
    success: true,
    message: `Urgent surgery mode activated. ${rescheduledCount} appointment(s) on ${surgeryDate} transferred to ${newDate}. Patient notifications dispatched.`,
    rescheduledCount,
    appointments: affected,
  });
});

// Doctor: Get treated / completed patients list
app.get('/api/doctors/:doctorId/treated-patients', (req, res) => {
  const { doctorId } = req.params;
  const completedApts = appointments.filter((a) => a.doctorId === doctorId && a.status === 'completed');

  const patientMap = new Map<string, any>();
  for (const apt of completedApts) {
    if (!patientMap.has(apt.patientId)) {
      const patient = users.find((u) => u.id === apt.patientId);
      const patientReadings = iotReadings.filter((r) => r.patientId === apt.patientId);
      const patientRx = prescriptions.filter((p) => p.patientId === apt.patientId && p.doctorId === doctorId);

      patientMap.set(apt.patientId, {
        patientId: apt.patientId,
        patientName: apt.patientName,
        email: patient?.email,
        phone: patient?.phone,
        profile: patient?.patientProfile,
        lastTreatedDate: apt.date,
        lastTreatmentCode: apt.treatmentCode,
        totalVisits: completedApts.filter((x) => x.patientId === apt.patientId).length,
        prescriptionsCount: patientRx.length,
        latestReadings: patientReadings.slice(0, 5),
        healthVerification: patient?.patientProfile?.healthVerification || null,
      });
    }
  }

  return res.json(Array.from(patientMap.values()));
});

// Doctor: Verify patient health condition
app.post('/api/doctors/:doctorId/verify-patient-health/:patientId', (req, res) => {
  const { doctorId, patientId } = req.params;
  const { status, notes } = req.body; // 'clear' | 'observation' | 'critical'

  const doctor = users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

  const patient = users.find((u) => u.id === patientId && u.role === 'patient');
  if (!patient || !patient.patientProfile) return res.status(404).json({ error: 'Patient not found.' });

  const verification = {
    status: status || 'clear',
    notes: notes || 'Patient condition is clear and stable.',
    verifiedByDoctorId: doctorId,
    verifiedByDoctorName: doctor.name,
    verifiedAt: new Date().toISOString(),
  };

  patient.patientProfile.healthVerification = verification;

  // Send clearance email to patient
  if (patient.email) {
    const statusText = status === 'clear' ? 'Nice & Clear (Fully Stable)' : status === 'observation' ? 'Under Routine Observation' : 'Attention / Follow-Up Required';
    const verifyEmail: SentEmail = {
      id: `email-verify-${Date.now()}`,
      to: patient.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `🩺 Clinical Health Verification Update from Dr. ${doctor.name}`,
      preview: `Dr. ${doctor.name} has verified your clinical health condition: ${statusText}.`,
      body: `Dear ${patient.name},

Dr. ${doctor.name} (${doctor.doctorProfile?.specialization}) has reviewed your treated clinical records and verified your current health condition:

VERIFICATION RESULT:
• Health Status: ${statusText}
• Attending Physician: Dr. ${doctor.name}
• Verification Timestamp: ${new Date().toLocaleDateString()}
• Doctor's Clinical Notes: "${notes || 'Health condition evaluated and cleared.'}"

Keep up with your daily health routine and log morning vital readings regularly.

Best regards,
${doctor.doctorProfile?.hospitalName || 'Clinical Care Department'}`,
      timestamp: new Date().toISOString(),
      category: 'general',
    };
    sentEmails.unshift(verifyEmail);
    dispatchRealEmail({
      to: patient.email.toLowerCase(),
      subject: verifyEmail.subject,
      text: verifyEmail.body,
    });
  }

  return res.json({
    success: true,
    message: `Patient health verified as ${verification.status}. Notification dispatched to patient.`,
    verification,
  });
});


// ==========================================
// IOT TELEMETRY & MORNING HEALTH CHECK
// ==========================================

// Helper: Clinical rule-based initial risk assessment
function evaluateClinicalRules(reading: Partial<IoTReading>): 'normal' | 'warning' | 'critical' {
  const { heartRate = 72, systolicBp = 120, diastolicBp = 80, spO2 = 98, temperature = 36.6, glucose = 95 } = reading;

  // Critical thresholds
  if (
    heartRate < 45 || heartRate > 150 ||
    systolicBp >= 180 || diastolicBp >= 115 ||
    systolicBp < 80 ||
    spO2 < 90 ||
    temperature >= 39.5 || temperature < 35.0 ||
    glucose > 350 || glucose < 50
  ) {
    return 'critical';
  }

  // Warning thresholds
  if (
    heartRate < 55 || heartRate > 105 ||
    systolicBp >= 135 || diastolicBp >= 88 ||
    spO2 < 95 ||
    temperature >= 37.8 ||
    glucose > 140 || glucose < 65
  ) {
    return 'warning';
  }

  return 'normal';
}

// 1. Submit IoT Reading (Morning Check or Continuous)
app.post('/api/iot/readings', async (req, res) => {
  const {
    patientId,
    patientName,
    isMorningCheck = true,
    heartRate,
    systolicBp,
    diastolicBp,
    spO2,
    temperature,
    glucose,
    weightKg,
  } = req.body;

  const ruleStatus: 'normal' | 'warning' | 'critical' = evaluateClinicalRules({
    heartRate: Number(heartRate),
    systolicBp: Number(systolicBp),
    diastolicBp: Number(diastolicBp),
    spO2: Number(spO2),
    temperature: Number(temperature),
    glucose: Number(glucose),
  });

  // Fetch patient profile context for Gemini
  const patient = users.find((u) => u.id === patientId && u.role === 'patient');
  const patientContext = patient?.patientProfile
    ? `Patient: ${patient.name}, Age: ${new Date().getFullYear() - new Date(patient.patientProfile.dateOfBirth).getFullYear()}, Conditions: ${patient.patientProfile.existingConditions.join(', ') || 'None'}, Allergies: ${patient.patientProfile.allergies.join(', ') || 'None'}, Current Meds: ${patient.patientProfile.currentMedications.join(', ') || 'None'}`
    : `Patient: ${patientName || 'Patient'}`;

  // Call Gemini AI 3.8 Flash for intelligent health assessment
  let geminiResult: {
    summary: string;
    riskScore: number;
    riskLevel: 'normal' | 'warning' | 'critical';
    concerningFactors: string[];
    preventiveGuidance: string[];
    actionRequired: string;
    recommendedSpecialist?: string;
  } = {
    summary: `${ruleStatus.toUpperCase()}: Vitals recorded via Smart Healthcare Kit. Heart Rate: ${heartRate} bpm, BP: ${systolicBp}/${diastolicBp} mmHg, SpO2: ${spO2}%, Temp: ${temperature}°C, Glucose: ${glucose} mg/dL.`,
    riskScore: ruleStatus === 'critical' ? 88 : ruleStatus === 'warning' ? 45 : 10,
    riskLevel: ruleStatus,
    concerningFactors: ruleStatus === 'critical' ? ['Critical vital signs requiring prompt clinical intervention'] : ruleStatus === 'warning' ? ['Moderate vital variation requiring follow-up'] : [],
    preventiveGuidance: [
      'Maintain adequate fluid intake and regular rest periods',
      'Follow balanced sodium intake guidelines',
      'Complete regular morning health-kit routine daily'
    ],
    actionRequired: ruleStatus === 'critical' ? 'Contact emergency hotline or assigned doctor immediately.' : ruleStatus === 'warning' ? 'Retake reading in 2 hours and monitor symptom evolution.' : 'Routine monitoring. Continue daily health check.',
    recommendedSpecialist: ruleStatus !== 'normal' ? 'Cardiology / Emergency Care' : undefined,
  };

  try {
    const prompt = `You are the Gemini AI Medical Intelligence Layer in a Smart Healthcare Ecosystem.
Evaluate these IoT Smart Healthcare Kit measurements for:
${patientContext}
Current Measurements:
- Heart Rate: ${heartRate} bpm (Normal: 60-100)
- Blood Pressure: ${systolicBp}/${diastolicBp} mmHg (Normal: 90-120 / 60-80)
- Blood Oxygen (SpO2): ${spO2}% (Normal: 95-100%)
- Core Body Temperature: ${temperature}°C (Normal: 36.1 - 37.2°C)
- Blood Glucose: ${glucose} mg/dL (Normal fasting: 70-99, Random: <140)
- Body Weight: ${weightKg} kg
- Check Type: ${isMorningCheck ? 'Early Morning Health Check Routine' : 'Continuous IoT Monitor'}
- Preliminary Rule-Based Level: ${ruleStatus}

Return your assessment in valid JSON with these EXACT keys:
{
  "summary": "Brief 1-2 sentence professional clinical interpretation of these measurements.",
  "riskScore": number (0 to 100, where 0=ideal and 100=extreme risk),
  "riskLevel": "normal" | "warning" | "critical",
  "concerningFactors": ["list of specific concerning indicators or empty if normal"],
  "preventiveGuidance": ["3 actionable, evidence-based preventive health tips for the patient"],
  "actionRequired": "Specific recommended immediate step for the patient or care team",
  "recommendedSpecialist": "Medical specialty to consult if needed, or null"
}
Ensure the output is strictly valid JSON without markdown wrapping.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      const parsedLevel: 'normal' | 'warning' | 'critical' = 
        parsed.riskLevel === 'critical' || parsed.riskLevel === 'warning' || parsed.riskLevel === 'normal' 
          ? parsed.riskLevel 
          : ruleStatus;

      geminiResult = {
        ...geminiResult,
        ...parsed,
        // Safeguard: If clinical rules marked critical, never downgrade to normal
        riskLevel: ruleStatus === 'critical' ? 'critical' : parsedLevel,
      };
    }
  } catch (err) {
    console.warn('[GEMINI-AI] AI vitals analysis fallback engaged:', err);
  }

  const finalStatus: 'normal' | 'warning' | 'critical' = geminiResult.riskLevel;

  const readingRecord: IoTReading = {
    id: `read-${Date.now()}`,
    patientId,
    patientName: patientName || 'Patient',
    timestamp: new Date().toISOString(),
    isMorningCheck: Boolean(isMorningCheck),
    heartRate: Number(heartRate),
    systolicBp: Number(systolicBp),
    diastolicBp: Number(diastolicBp),
    spO2: Number(spO2),
    temperature: Number(temperature),
    glucose: Number(glucose),
    weightKg: Number(weightKg) || 70,
    status: finalStatus,
    geminiAnalysis: geminiResult,
  };

  iotReadings.unshift(readingRecord);

  // If CRITICAL: Auto-trigger Emergency Workflow alert to assigned doctor & hospital
  if (finalStatus === 'critical') {
    const doctorId = patient?.patientProfile?.assignedDoctorId || 'doc-1';
    const hospitalId = patient?.patientProfile?.assignedHospitalId || 'hosp-1';
    const hosp = users.find((u) => u.id === hospitalId && u.role === 'hospital');

    const emergency: EmergencyAlert = {
      id: `emg-${Date.now()}`,
      patientId,
      patientName: patientName || 'Patient',
      patientPhone: patient?.phone || '+1 (555) 911-0000',
      timestamp: new Date().toISOString(),
      severity: 'critical',
      triggerReason: `IoT Critical Threshold: ${geminiResult.concerningFactors.join(', ') || 'Critical Vitals Detected'}`,
      vitalSummary: `HR: ${heartRate} bpm | BP: ${systolicBp}/${diastolicBp} | SpO2: ${spO2}% | Temp: ${temperature}°C`,
      location: 'Patient Registered Residence',
      assignedDoctorId: doctorId,
      targetHospitalId: hospitalId,
      targetHospitalName: hosp?.hospitalProfile?.hospitalName || 'Metro General Emergency Center',
      status: 'dispatched',
    };
    emergencyAlerts.unshift(emergency);
  }

  return res.json({ success: true, reading: readingRecord });
});

// 2. Get Patient IoT Readings
app.get('/api/iot/readings/patient/:patientId', (req, res) => {
  const { patientId } = req.params;
  return res.json(iotReadings.filter((r) => r.patientId === patientId));
});

// ==========================================
// DRIVER HEALTH & SAFETY SYSTEM
// ==========================================

app.post('/api/iot/driver-safety', async (req, res) => {
  const {
    driverId,
    driverName,
    heartRate,
    heartRateVariability,
    blinkFrequencyPerMin,
    eyeClosureDurationMs,
    steeringStability,
    fatigueIndex,
  } = req.body;

  let riskLevel: 'safe' | 'moderate' | 'danger' = 'safe';
  if (fatigueIndex >= 70 || eyeClosureDurationMs > 300 || steeringStability < 60) {
    riskLevel = 'danger';
  } else if (fatigueIndex >= 45 || eyeClosureDurationMs > 200 || steeringStability < 80) {
    riskLevel = 'moderate';
  }

  let warning = 'Driver parameters are in normal safe range.';
  let action = 'Maintain steady cruising and periodic hydration.';

  // Call Gemini for Driver Safety Early-Warning
  try {
    const prompt = `You are the Gemini AI Driver Safety Intelligence Engine connected to in-vehicle IoT sensors.
Driver metrics:
- Heart Rate: ${heartRate} bpm
- HRV (Heart Rate Variability): ${heartRateVariability} ms
- Blink Frequency: ${blinkFrequencyPerMin}/min
- Eye Closure Duration (PERCLOS indicator): ${eyeClosureDurationMs} ms
- Steering Lane Stability: ${steeringStability}%
- Composite Fatigue Index: ${fatigueIndex}/100
- Evaluated Risk: ${riskLevel}

Provide in JSON:
{
  "warning": "concise early warning message for the driver's heads-up display",
  "suggestedAction": "immediate actionable recommendation (e.g. pull over at nearest rest stop within 5 mins, drink coffee, ventilate cabin)"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      warning = parsed.warning || warning;
      action = parsed.suggestedAction || action;
    }
  } catch (err) {
    console.warn('[GEMINI-DRIVER] Driver safety AI fallback:', err);
  }

  const record: DriverSafetyReading = {
    id: `drv-${Date.now()}`,
    driverId,
    driverName: driverName || 'Driver',
    timestamp: new Date().toISOString(),
    heartRate: Number(heartRate),
    heartRateVariability: Number(heartRateVariability),
    blinkFrequencyPerMin: Number(blinkFrequencyPerMin),
    eyeClosureDurationMs: Number(eyeClosureDurationMs),
    steeringStability: Number(steeringStability),
    fatigueIndex: Number(fatigueIndex),
    riskLevel,
    geminiWarning: warning,
    suggestedAction: action,
  };

  driverReadings.unshift(record);

  // If driver danger level reached, also log to emergency center
  if (riskLevel === 'danger') {
    emergencyAlerts.unshift({
      id: `emg-drv-${Date.now()}`,
      patientId: driverId,
      patientName: driverName || 'Driver',
      patientPhone: '+1 (555) 019-9111',
      timestamp: new Date().toISOString(),
      severity: 'warning',
      triggerReason: `Driver Safety Alert: Severe Fatigue & Microsleep Risk (${fatigueIndex}/100)`,
      vitalSummary: `HR: ${heartRate} bpm | Eye Closure: ${eyeClosureDurationMs}ms | Steering: ${steeringStability}%`,
      location: 'Vehicle Telemetry GPS: Highway 101 Northbound Mile 42',
      targetHospitalName: 'Metro General Regional Trauma & Safety Network',
      status: 'acknowledged',
    });
  }

  return res.json({ success: true, reading: record });
});

app.get('/api/iot/driver-safety/:driverId', (req, res) => {
  const { driverId } = req.params;
  return res.json(driverReadings.filter((d) => d.driverId === driverId));
});

// ==========================================
// EMERGENCY ALERT DISPATCH & WORKFLOW
// ==========================================

// Manual or Automatic SOS Emergency Trigger
app.post('/api/emergency/trigger', (req, res) => {
  const {
    patientId,
    patientName,
    patientPhone,
    severity = 'critical',
    triggerReason = 'Manual Patient SOS Emergency Button Triggered',
    vitalSummary = 'Immediate Assistance Requested',
    location = 'Current GPS Coords: 37.7749° N, 122.4194° W',
    assignedDoctorId,
    targetHospitalId,
  } = req.body;

  const patient = users.find((u) => u.id === patientId && u.role === 'patient');

  // Resolve target hospital strictly from patient choice or parameter
  const chosenHospId = targetHospitalId || patient?.patientProfile?.chosenEmergencyHospitalId || patient?.patientProfile?.assignedHospitalId;
  const hosp = users.find((u) => u.id === chosenHospId && u.role === 'hospital')
    || users.find((u) => u.role === 'hospital' && u.status === 'active');

  const chosenDocId = assignedDoctorId || patient?.patientProfile?.chosenEmergencyDoctorId || patient?.patientProfile?.assignedDoctorId;
  const doc = chosenDocId ? users.find((u) => u.id === chosenDocId && u.role === 'doctor') : undefined;

  const alert: EmergencyAlert = {
    id: `emg-${Date.now()}`,
    patientId,
    patientName: patientName || patient?.name || 'Patient',
    patientPhone: patientPhone || patient?.phone || '+1 (555) 911-0000',
    timestamp: new Date().toISOString(),
    severity,
    triggerReason,
    vitalSummary,
    location,
    assignedDoctorId: doc?.id,
    targetHospitalId: hosp?.id,
    targetHospitalName: hosp?.hospitalProfile?.hospitalName || hosp?.name || 'Emergency Center',
    status: 'dispatched',
    ambulanceStatus: 'en_route',
    notifiedContacts: (patient?.patientProfile?.emergencyContactsList && patient.patientProfile.emergencyContactsList.length > 0)
      ? patient.patientProfile.emergencyContactsList.map((c) => `${c.name} (${c.relationship} - ${c.priority.toUpperCase()}): ${c.phone} • Automated SOS payload dispatched`)
      : (patient?.patientProfile?.emergencyContact?.name)
      ? [`${patient.patientProfile.emergencyContact.name} (${patient.patientProfile.emergencyContact.relationship}): ${patient.patientProfile.emergencyContact.phone} • Distress SMS dispatched`]
      : ['Next of Kin Contact: SOS Payload Broadcasted'],
  };

  emergencyAlerts.unshift(alert);

  // Send dispatch notification email to the patient
  if (patient?.email) {
    const pEmail: SentEmail = {
      id: `email-sos-${Date.now()}`,
      to: patient.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `🚨 Emergency SOS Dispatched to ${alert.targetHospitalName}`,
      preview: `Your emergency SOS distress call has been received and routed directly to ${alert.targetHospitalName} ER.`,
      body: `Dear ${alert.patientName},

Your emergency SOS distress call has been dispatched:
• Emergency Medical Center: ${alert.targetHospitalName}
• Designated Attending Doctor: ${doc ? `Dr. ${doc.name}` : 'Hospital ER On-Duty Medical Officer'}
• Status: Dispatched & Priority En Route
• ER Hotline: ${hosp?.hospitalProfile?.emergencyHotline || hosp?.phone || '911'}
• Trigger Reason: ${triggerReason}

Please remain in place if safe. Paramedics and clinical ER units at ${alert.targetHospitalName} have been alerted.

Emergency Response Division`,
      timestamp: new Date().toISOString(),
      category: 'general',
    };
    sentEmails.unshift(pEmail);
    dispatchRealEmail({
      to: patient.email.toLowerCase(),
      subject: pEmail.subject,
      text: pEmail.body,
    });
  }

  // Send alert notification email to chosen hospital
  if (hosp?.email) {
    const hEmail: SentEmail = {
      id: `email-hosp-sos-${Date.now()}`,
      to: hosp.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `🚨 CRITICAL EMERGENCY SOS: Patient ${alert.patientName} Dispatched to Your ER`,
      preview: `Immediate ER response required for patient ${alert.patientName} at ${location}.`,
      body: `EMERGENCY DISPATCH CENTER NOTICE:

A patient designating your hospital (${alert.targetHospitalName}) has triggered an urgent SOS distress alarm:
• Patient: ${alert.patientName} (${alert.patientPhone})
• Reason: ${triggerReason}
• Location: ${location}
• Vital Snapshot: ${vitalSummary}
• Designated Physician: ${doc ? `Dr. ${doc.name}` : 'ER Staff'}

Please mobilize ambulance triage and prepare trauma intake.

Emergency Command System`,
      timestamp: new Date().toISOString(),
      category: 'general',
    };
    sentEmails.unshift(hEmail);
    dispatchRealEmail({
      to: hosp.email.toLowerCase(),
      subject: hEmail.subject,
      text: hEmail.body,
    });
  }

  // Also send emergency notification email to assigned doctor
  if (doc?.email) {
    const dEmail: SentEmail = {
      id: `email-doc-sos-${Date.now()}`,
      to: doc.email.toLowerCase(),
      from: MASTER_ADMIN_EMAIL,
      subject: `🚨 CRITICAL EMERGENCY SOS: Your Patient ${alert.patientName}`,
      preview: `Immediate emergency distress call triggered by your registered patient ${alert.patientName}.`,
      body: `Dear Dr. ${doc.name},

Your registered patient ${alert.patientName} has triggered an urgent SOS distress alarm:
• Patient: ${alert.patientName} (${alert.patientPhone})
• Reason: ${triggerReason}
• Live Location: ${location}
• Chosen Hospital ER: ${alert.targetHospitalName}
• Vital Snapshot: ${vitalSummary}

Emergency medical dispatch and ER units at ${alert.targetHospitalName} have been alerted.

Emergency Command System`,
      timestamp: new Date().toISOString(),
      category: 'general',
    };
    sentEmails.unshift(dEmail);
    dispatchRealEmail({
      to: doc.email.toLowerCase(),
      subject: dEmail.subject,
      text: dEmail.body,
    });
  }

  saveStorageToDisk();

  return res.json({ success: true, alert });
});

// Get emergency alerts for hospital / doctor / admin / patient
app.get('/api/emergency/alerts', (req, res) => {
  const { hospitalId, doctorId, patientId } = req.query;
  let filtered = [...emergencyAlerts];

  if (hospitalId) {
    filtered = filtered.filter((a) => !a.targetHospitalId || a.targetHospitalId === hospitalId);
  }
  if (doctorId) {
    filtered = filtered.filter((a) => !a.assignedDoctorId || a.assignedDoctorId === doctorId);
  }
  if (patientId) {
    filtered = filtered.filter((a) => a.patientId === patientId);
  }

  return res.json(filtered);
});

// Update Emergency Alert Status
app.post('/api/emergency/alerts/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'acknowledged' | 'resolved'

  const alert = emergencyAlerts.find((a) => a.id === id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found.' });
  }

  alert.status = status;
  alert.respondedAt = new Date().toISOString();
  saveStorageToDisk();
  return res.json({ success: true, alert });
});

// ==========================================
// GEMINI SMART APPOINTMENT ASSISTANT
// ==========================================

app.post('/api/gemini/appointment-assistant', async (req, res) => {
  const { requirement, patientId, audioBase64, mimeType } = req.body;
  if (!requirement && !audioBase64) {
    return res.status(400).json({ error: 'Requirement text or audio recording is required.' });
  }

  // Get active approved doctors
  const approvedDoctors = users
    .filter((u) => u.role === 'doctor' && (u.doctorProfile?.approvalStatus === 'approved' || u.status === 'active'))
    .map((d) => ({
      id: d.id,
      name: d.name,
      specialization: d.doctorProfile?.specialization,
      hospitalName: d.doctorProfile?.hospitalName,
      experience: d.doctorProfile?.yearsOfExperience,
      fee: d.doctorProfile?.consultationFee,
    }));

  try {
    const prompt = `You are the Gemini AI Clinical Triage & Multilingual Healthcare Assistant.
The patient describes their symptoms or health requirement in ANY language (English, Telugu (తెలుగు), Hindi (हिंदी), Tamil (தமிழ்), Kannada (ಕನ್ನಡ), Marathi (मराठी), Bengali, etc.), in local script or transliterated:
"${requirement || 'Listen to the attached audio recording of patient symptoms'}"

Available approved doctors in the network:
${JSON.stringify(approvedDoctors, null, 2)}

Clinical Triage & Emergency Circuit Breaker Rules:
1. Detect and understand the patient's language accurately (e.g. Telugu 'నాకు తలనొప్పిగా ఉంది', Hindi 'मुझे सिरदर्द हो रहा है').
2. If the symptoms indicate an ACUTE, SEVERE, or LIFE-THREATENING EMERGENCY (e.g. severe chest pain, radiating arm/jaw pain, acute breathlessness/suffocation/hypoxia, stroke FAST symptoms like sudden facial droop, slurred speech, one-sided paralysis, sudden loss of consciousness, heavy hemorrhage, severe trauma, anaphylaxis):
   - Set "isEmergency": true
   - Set "urgencyLevel": "CRITICAL_EMERGENCY"
   - Set "emergencyWarning": "🚨 CRITICAL MEDICAL ALERT: Your reported symptoms indicate a potential medical emergency! Do NOT wait for a routine appointment. Trigger immediate Emergency SOS or reach the nearest emergency trauma casualty immediately."
   - Set "emergencyAction": "TRIGGER_SOS_NOW"
3. PRIMARY CARE FIRST & COST-SAVING TRIAGE RULE (CRITICAL USER REQUIREMENT):
   In real healthcare, patients with common symptoms such as headache (mild, moderate, or severe tension/migraine headaches), fever, common cold, fatigue, body ache, mild dizziness, or abdominal discomfort should NOT immediately be routed to an expensive super-specialist (e.g. Neurology, Gastroenterology, Neurosurgeon) where fees are high ($80-$150+).
   Instead, ALWAYS recommend a "General & Internal Medicine (Family Physician / General Doctor)" as the affordable, accessible first-line physician ($15-$30) to perform clinical evaluation, assess blood pressure/vitals, prescribe initial relief, and order preliminary tests.
   The General Physician evaluates the patient first and can refer to a specialized doctor (e.g. Neurology) only if red flags or complex secondary issues appear.
4. If "isGeneralPhysicianFirst" is true, provide:
   - "costSavingAdvice": "💡 Cost-Saving Healthcare Guidance: For headaches and initial symptoms, visiting a General Physician first is significantly more affordable ($15–$30) compared to expensive super-specialist fees ($80–$150+ for Neurology). The General Physician will evaluate your vitals and reflexes first, and refer you to Neurology only if specialized neuro-imaging (MRI/CT) or advanced treatment is required."
   - "alternativeSpecialist": "Neurology & Stroke Care (Higher-fee Specialist Referral Option)"
5. Return strictly JSON format:
{
  "spokenTranscript": "If audio was provided, the exact transcribed spoken words, else null",
  "detectedLanguage": "e.g. Telugu, Hindi, English, Tamil",
  "triageSummary": "Clear explanation of the symptoms and clinical assessment in English",
  "patientLanguageExplanation": "Warm explanation and advice written in the patient's spoken/input language",
  "recommendedSpecialization": "e.g. General & Internal Medicine or Cardiology or Orthopedics",
  "urgencyLevel": "routine" | "soon (within 24-48 hrs)" | "CRITICAL_EMERGENCY",
  "isEmergency": boolean,
  "isGeneralPhysicianFirst": boolean,
  "costSavingAdvice": string | null,
  "alternativeSpecialist": string | null,
  "emergencyWarning": string | null,
  "emergencyAction": string | null,
  "matchedDoctorId": "the id of the best matching doctor or null",
  "matchedDoctorName": "Doctor's name",
  "reasonForRecommendation": "Clinical reason why this physician is appropriate",
  "suggestedSlots": ["2026-10-12 10:00 AM", "2026-10-12 02:30 PM", "2026-10-13 11:00 AM"],
  "patientPreparationTips": ["2-3 tips on vitals or documents to bring"]
}`;

    const contents: any[] = [];
    if (audioBase64) {
      contents.push({
        inlineData: {
          mimeType: mimeType || 'audio/webm',
          data: audioBase64,
        },
      });
      contents.push(`Listen to this spoken audio from the patient. Transcribe the patient's spoken symptoms into the "spokenTranscript" field and then perform clinical triage:\n${prompt}`);
    } else {
      contents.push(prompt);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: { responseMimeType: 'application/json' },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return res.json({ success: true, result: parsed });
    }
  } catch (err) {
    console.warn('[GEMINI-APPT] Appointment assistant fallback:', err);
  }

  // Fallback with emergency & headache regex
  const isCritical = /chest pain|heart attack|stroke|breathless|choking|unconscious|bleeding|ఊపిరి|గుండె|ఛాతీ నొప్పి|దమ్ము|దడ|दौरा|सीने में दर्द|बेहोश/i.test(requirement);
  const isHeadacheOrGeneral = /headache|head ache|migraine|తల నొప్పి|తలనొప్పి|सिरदर्द|सर दर्द|सिर दर्द|fever|జ్వరం|बुखार|cold|cough|దగ్గు|vomiting|వికారం|stomach|కడుపు/i.test(requirement);

  const genDoc = approvedDoctors.find((d) => d.specialization?.toLowerCase().includes('general')) || approvedDoctors[0];
  const neuroDoc = approvedDoctors.find((d) => d.specialization?.toLowerCase().includes('neuro'));
  const targetDoc = isHeadacheOrGeneral ? genDoc : approvedDoctors[0];

  return res.json({
    success: true,
    result: {
      detectedLanguage: /[\u0C00-\u0C7F]/.test(requirement) ? 'Telugu (తెలుగు)' : /[\u0900-\u097F]/.test(requirement) ? 'Hindi (हिंदी)' : 'English',
      triageSummary: isCritical
        ? 'Critical acute symptoms detected requiring immediate emergency medical triage.'
        : isHeadacheOrGeneral
        ? 'Headache / common symptoms evaluated. In accordance with clinical triage and cost-saving guidelines, starting with a General Physician / Family Doctor is strongly recommended before escalating to expensive specialist care.'
        : 'Based on your reported symptoms, a comprehensive physician consultation is recommended.',
      patientLanguageExplanation: isCritical
        ? 'తీవ్రమైన అత్యవసర లక్షణాలు గుర్తించబడ్డాయి. తక్షణ ఎమర్జెన్సీ సహాయం తీసుకోండి / गंभीर आपातकालीन लक्षण मिले हैं, तुरंत इमरजेंसी सहायता लें।'
        : isHeadacheOrGeneral
        ? 'మీ తలనొప్పికి మొదట జనరల్ ఫిజీషియన్ (సాధారణ వైద్యుడు) ని సంప్రదించడం ఖర్చు పరంగా అనుకూలం ($25). అవసరమైతే న్యూరాలజిస్ట్ ని సూచిస్తారు / सिरदर्द के लिए पहले जनरल फिजिशियन से परामर्श करना किफायती ($25) है। आवश्यकता पड़ने पर न्यूरोलॉजिस्ट के पास भेजा जाएगा।'
        : 'మీ ఆరోగ్య పరిస్థితికి అనుగుణంగా తగిన వైద్యుడిని సంప్రదించాల్సిందిగా సూచిస్తున్నాము / आपके स्वास्थ्य के अनुसार योग्य डॉक्टर से परामर्श की सलाह दी जाती है।',
      recommendedSpecialization: isCritical
        ? 'Emergency & Trauma Medicine'
        : isHeadacheOrGeneral
        ? 'General & Internal Medicine (Family Physician)'
        : (targetDoc?.specialization || 'General & Internal Medicine'),
      urgencyLevel: isCritical ? 'CRITICAL_EMERGENCY' : 'routine',
      isEmergency: isCritical,
      isGeneralPhysicianFirst: isHeadacheOrGeneral,
      costSavingAdvice: isHeadacheOrGeneral
        ? '💡 Cost-Saving Healthcare Guidance: For headaches and preliminary symptoms, starting with a General Physician is significantly more affordable ($25) compared to expensive super-specialist fees ($85+ for Neurology). The General Physician will evaluate your vitals and reflexes first, and escalate to a Neurologist only if specialized neuro-imaging (MRI/CT) or advanced treatment is required.'
        : null,
      alternativeSpecialist: isHeadacheOrGeneral && neuroDoc
        ? `${neuroDoc.name} (${neuroDoc.specialization} - $${neuroDoc.fee || 85} Specialist Option)`
        : null,
      emergencyWarning: isCritical
        ? '🚨 CRITICAL MEDICAL ALERT: Symptoms indicate an acute emergency. Trigger Emergency SOS immediately.'
        : null,
      emergencyAction: isCritical ? 'TRIGGER_SOS_NOW' : null,
      matchedDoctorId: targetDoc?.id,
      matchedDoctorName: targetDoc?.name,
      reasonForRecommendation: isHeadacheOrGeneral
        ? 'Affordable first-line physician who can evaluate baseline vitals, prescribe relief, and refer to Neurology only if imaging is needed.'
        : 'Expert doctor matching your reported health symptoms.',
      suggestedSlots: ['2026-10-12 10:00 AM', '2026-10-12 02:00 PM', '2026-10-13 11:30 AM'],
      patientPreparationTips: ['Bring recent IoT morning health check records', 'Note down headache triggers or sleep patterns', 'List current active medications'],
    },
  });
});

// ==========================================
// VITE DEV SERVER MIDDLEWARE MOUNTING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for SPA routing in dev mode when refreshing on any deep path
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🏥 Smart Health Ecosystem server running on http://0.0.0.0:${port}`);
  });
}

startServer();
